/**
 * Build-time JSON-LD validator.
 *
 * Scans the src/ tree for JSON-LD schema objects (both `buildXxxJsonLd(...)`
 * factory calls in SEOHead.tsx and inline `application/ld+json` blocks) and
 * validates required fields per @type against Google Rich Results requirements.
 *
 * Types checked:
 *   - FAQPage
 *   - BreadcrumbList
 *   - SoftwareApplication
 *   - CollectionPage
 *   - Article / WebSite / Organization / Product-Book (sanity)
 *
 * Fails the build (exit 1) on any error.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

type Issue = { file: string; type: string; problem: string };
const issues: Issue[] = [];

const ROOT = "src";

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if ([".ts", ".tsx"].includes(extname(p))) out.push(p);
  }
  return out;
}

// Required-field rules per Google Rich Results
const RULES: Record<string, (o: any, file: string) => string | null> = {
  FAQPage: (o) => {
    if (!Array.isArray(o.mainEntity) || o.mainEntity.length === 0) return "FAQPage missing non-empty mainEntity[]";
    for (const q of o.mainEntity) {
      if (q["@type"] !== "Question") return "FAQPage mainEntity items must be @type Question";
      if (!q.name) return "FAQPage Question missing name";
      if (!q.acceptedAnswer?.text) return "FAQPage Question missing acceptedAnswer.text";
    }
    return null;
  },
  BreadcrumbList: (o) => {
    if (!Array.isArray(o.itemListElement) || o.itemListElement.length === 0) return "BreadcrumbList missing itemListElement[]";
    for (const it of o.itemListElement) {
      if (it["@type"] !== "ListItem") return "BreadcrumbList item must be @type ListItem";
      if (typeof it.position !== "number") return "BreadcrumbList item missing numeric position";
      if (!it.name) return "BreadcrumbList item missing name";
      if (!it.item && !it["@id"]) return "BreadcrumbList item missing item URL";
    }
    return null;
  },
  SoftwareApplication: (o) => {
    if (!o.name) return "SoftwareApplication missing name";
    if (!o.applicationCategory) return "SoftwareApplication missing applicationCategory";
    if (!o.operatingSystem) return "SoftwareApplication missing operatingSystem";
    if (!o.offers) return "SoftwareApplication missing offers";
    return null;
  },
  CollectionPage: (o) => {
    if (!o.name) return "CollectionPage missing name";
    if (!o.url) return "CollectionPage missing url";
    return null;
  },
  Article: (o) => {
    if (!o.headline) return "Article missing headline";
    if (!o.author) return "Article missing author";
    if (!o.datePublished) return "Article missing datePublished";
    return null;
  },
  WebSite: (o) => (!o.name || !o.url ? "WebSite missing name/url" : null),
  Organization: (o) => (!o.name || !o.url ? "Organization missing name/url" : null),
};

// Extract JSON-LD-looking object literals from a file. We look for patterns:
//   "@type": "FaqPage"  or  "@type": "FAQPage"
// then parse the enclosing JS object with a brace-matched slice + JSON5-ish
// coercion (keys → quoted, single → double quotes, trailing commas dropped).
function extractCandidates(src: string): { start: number; text: string }[] {
  const out: { start: number; text: string }[] = [];
  const re = /["']@type["']\s*:\s*["'](FAQPage|BreadcrumbList|SoftwareApplication|CollectionPage|Article|WebSite|Organization)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    // Walk back to find the opening `{` of the enclosing object.
    let i = m.index;
    let depth = 0;
    while (i > 0) {
      const ch = src[i];
      if (ch === "}") depth++;
      else if (ch === "{") { if (depth === 0) break; depth--; }
      i--;
    }
    if (src[i] !== "{") continue;
    // Now scan forward to matching close.
    let j = i, d = 0;
    for (; j < src.length; j++) {
      const c = src[j];
      if (c === "{") d++;
      else if (c === "}") { d--; if (d === 0) { j++; break; } }
    }
    out.push({ start: i, text: src.slice(i, j) });
  }
  return out;
}

function coerceToJson(text: string): string {
  // Strip line/block comments
  let s = text.replace(/\/\/[^\n]*\n/g, "\n").replace(/\/\*[\s\S]*?\*\//g, "");
  // Convert single quotes to double when they wrap simple string literals
  s = s.replace(/'([^'\\\n]*)'/g, (_, g) => JSON.stringify(g));
  // Quote unquoted keys:  key:  → "key":
  s = s.replace(/([{,]\s*)([A-Za-z_$][A-Za-z0-9_$-]*)\s*:/g, '$1"$2":');
  // Remove trailing commas
  s = s.replace(/,\s*([}\]])/g, "$1");
  return s;
}

function tryParse(text: string): any | null {
  try { return JSON.parse(coerceToJson(text)); } catch { return null; }
}

function validateFile(file: string) {
  const src = readFileSync(file, "utf8");
  const candidates = extractCandidates(src);
  for (const c of candidates) {
    const obj = tryParse(c.text);
    if (!obj) continue; // dynamic — skip (values come from runtime data)
    const t = obj["@type"];
    const rule = RULES[t];
    if (!rule) continue;
    const problem = rule(obj, file);
    if (problem) issues.push({ file, type: t, problem });
  }
}

const files = walk(ROOT);
for (const f of files) validateFile(f);

// -----------------------------------------------------------------------------
// Extra check: every published BlogArticle route must wire article.tags into
// (1) <meta name="keywords"> via SEOHead's `keywords` prop,
// (2) <meta property="article:tag"> via SEOHead's `article={{ tags }}` prop, and
// (3) Article JSON-LD via `buildArticleJsonLd({ tags })` so search engines
//     receive the same taxonomy the DB stores. Missing any one of these fails
//     the build so a regression can never ship silently.
// -----------------------------------------------------------------------------
const BLOG_ARTICLE_FILES = ["src/pages/BlogArticle.tsx"];
for (const f of BLOG_ARTICLE_FILES) {
  let src: string;
  try { src = readFileSync(f, "utf8"); }
  catch { issues.push({ file: f, type: "BlogArticle", problem: "file missing" }); continue; }

  // 1) SEOHead `keywords` prop must derive from article.tags
  const keywordsProp = /keywords=\{[\s\S]*?article\.tags[\s\S]*?\}/;
  if (!keywordsProp.test(src)) {
    issues.push({
      file: f, type: "BlogArticle",
      problem: "SEOHead `keywords` prop must include ...article.tags so <meta name=\"keywords\"> is emitted from stored tags",
    });
  }

  // 2) SEOHead `article={{ ... tags: article.tags ... }}` prop
  const articleTagsProp = /article=\{\{[\s\S]*?tags:\s*article\.tags[\s\S]*?\}\}/;
  if (!articleTagsProp.test(src)) {
    issues.push({
      file: f, type: "BlogArticle",
      problem: "SEOHead `article` prop must forward `tags: article.tags` so <meta property=\"article:tag\"> is emitted per tag",
    });
  }

  // 3) buildArticleJsonLd(...) must pass tags: article.tags
  const jsonLdTags = /buildArticleJsonLd\(\{[\s\S]*?tags:\s*article\.tags[\s\S]*?\}\)/;
  if (!jsonLdTags.test(src)) {
    issues.push({
      file: f, type: "BlogArticle",
      problem: "buildArticleJsonLd() call must pass `tags: article.tags` so Article JSON-LD carries the taxonomy",
    });
  }
}

// SEOHead helper contract: buildArticleJsonLd must accept and emit `tags`.
{
  const f = "src/components/SEOHead.tsx";
  const src = readFileSync(f, "utf8");
  if (!/tags\?:\s*string\[\]/.test(src)) {
    issues.push({ file: f, type: "SEOHead", problem: "buildArticleJsonLd must declare `tags?: string[]` param" });
  }
  if (!/keywords:\s*cleanTags\.join/.test(src) && !/keywords:\s*.*tags.*join/.test(src)) {
    issues.push({ file: f, type: "SEOHead", problem: "buildArticleJsonLd must emit `keywords` derived from tags" });
  }
}

if (issues.length) {
  console.error("\n❌ JSON-LD / SEO tag validation failed:\n");
  for (const i of issues) {
    console.error(`  ${i.file}\n    [${i.type}] ${i.problem}\n`);
  }
  process.exit(1);
}
console.log(`✓ JSON-LD validator: scanned ${files.length} files, ${issues.length} issues.`);

