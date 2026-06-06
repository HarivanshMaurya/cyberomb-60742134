// Heuristic phishing/scam URL analyzer. Pure client-side, no API key needed.

const SHORTENERS = new Set([
  "bit.ly","tinyurl.com","t.co","goo.gl","ow.ly","is.gd","buff.ly","adf.ly",
  "shorte.st","cutt.ly","rebrand.ly","s.id","rb.gy","tiny.cc","bl.ink",
]);

const BRANDS = [
  "google","facebook","instagram","whatsapp","paypal","apple","microsoft",
  "amazon","netflix","linkedin","twitter","x.com","github","dropbox",
  "binance","coinbase","metamask","sbi","hdfc","icici","axis","payu","phonepe",
  "gpay","razorpay","flipkart","myntra","irctc","aadhaar","uidai",
];

const SUSPICIOUS_TLDS = new Set([
  "zip","mov","xyz","top","tk","ml","ga","cf","gq","work","click","loan",
  "country","kim","cricket","science","party","gdn","rest","fit","review",
]);

const SUSPICIOUS_WORDS = [
  "login","verify","secure","account","update","confirm","banking","wallet",
  "free","bonus","gift","prize","winner","claim","urgent","alert","password",
  "support","unlock","suspend",
];

export interface UrlScanResult {
  input: string;
  normalizedUrl: string | null;
  hostname: string | null;
  score: number; // 0 safe, 100 dangerous
  verdict: "Safe" | "Suspicious" | "High Risk";
  reasons: { label: string; level: "info" | "warn" | "danger" }[];
  recommendations: string[];
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
  return d[m][n];
}

export function scanUrl(raw: string): UrlScanResult {
  const reasons: UrlScanResult["reasons"] = [];
  const recommendations: string[] = [];
  let score = 0;
  let url: URL | null = null;
  let normalized = raw.trim();
  if (!/^https?:\/\//i.test(normalized)) normalized = "http://" + normalized;
  try { url = new URL(normalized); } catch {
    return {
      input: raw, normalizedUrl: null, hostname: null, score: 100,
      verdict: "High Risk", reasons: [{ label: "Invalid URL format", level: "danger" }],
      recommendations: ["Re-check the link before clicking."],
    };
  }
  const host = url.hostname.toLowerCase();
  const path = url.pathname + url.search;

  // HTTPS
  if (url.protocol !== "https:") {
    score += 20;
    reasons.push({ label: "Not using HTTPS (insecure)", level: "warn" });
    recommendations.push("Only enter credentials on HTTPS sites.");
  } else {
    reasons.push({ label: "Uses HTTPS encryption", level: "info" });
  }

  // IP-as-host
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    score += 30;
    reasons.push({ label: "URL uses a raw IP address instead of a domain", level: "danger" });
  }

  // Too many subdomains
  const parts = host.split(".");
  if (parts.length >= 5) {
    score += 15;
    reasons.push({ label: `Unusually deep subdomain chain (${parts.length} parts)`, level: "warn" });
  }

  // Hyphen-heavy
  const hyphens = (host.match(/-/g) || []).length;
  if (hyphens >= 3) {
    score += 10;
    reasons.push({ label: `Domain contains many hyphens (${hyphens})`, level: "warn" });
  }

  // Suspicious TLD
  const tld = parts[parts.length - 1];
  if (SUSPICIOUS_TLDS.has(tld)) {
    score += 15;
    reasons.push({ label: `Suspicious top-level domain ".${tld}"`, level: "warn" });
  }

  // URL shortener
  const rootTwo = parts.slice(-2).join(".");
  if (SHORTENERS.has(rootTwo) || SHORTENERS.has(host)) {
    score += 20;
    reasons.push({ label: "URL shortener detected — destination is hidden", level: "warn" });
    recommendations.push("Expand the short URL first (e.g. via unshorten.it).");
  }

  // Brand impersonation / typosquatting
  const sld = parts.length >= 2 ? parts[parts.length - 2] : host;
  for (const b of BRANDS) {
    if (sld === b) break;
    if (host.includes(b) && sld !== b) {
      score += 25;
      reasons.push({ label: `Possible brand impersonation: mentions "${b}" but isn't the official domain`, level: "danger" });
      break;
    }
    const dist = levenshtein(sld, b);
    if (b.length >= 5 && dist > 0 && dist <= 2) {
      score += 25;
      reasons.push({ label: `Typosquatting suspected — "${sld}" is 1-2 chars off from "${b}"`, level: "danger" });
      break;
    }
  }

  // Suspicious keywords
  const lowerAll = (host + path).toLowerCase();
  const hits = SUSPICIOUS_WORDS.filter((w) => lowerAll.includes(w));
  if (hits.length >= 2) {
    score += 15;
    reasons.push({ label: `Contains phishing-style keywords: ${hits.slice(0, 4).join(", ")}`, level: "warn" });
  }

  // @ in URL (credentials injection)
  if (normalized.includes("@") && normalized.indexOf("@") < normalized.length - 1) {
    score += 25;
    reasons.push({ label: "Contains '@' symbol — may redirect to a different host", level: "danger" });
  }

  // Excessive length
  if (normalized.length > 100) {
    score += 10;
    reasons.push({ label: `Very long URL (${normalized.length} chars)`, level: "warn" });
  }

  // Punycode / IDN
  if (host.startsWith("xn--") || parts.some((p) => p.startsWith("xn--"))) {
    score += 20;
    reasons.push({ label: "Internationalized domain (punycode) — may impersonate familiar names", level: "warn" });
  }

  // Port specified
  if (url.port && !["80", "443", ""].includes(url.port)) {
    score += 10;
    reasons.push({ label: `Non-standard port (${url.port})`, level: "warn" });
  }

  score = Math.min(100, score);
  if (reasons.length === (url.protocol === "https:" ? 1 : 0)) {
    reasons.push({ label: "No common phishing indicators detected", level: "info" });
  }

  let verdict: UrlScanResult["verdict"] = "Safe";
  if (score >= 55) verdict = "High Risk";
  else if (score >= 25) verdict = "Suspicious";

  if (verdict !== "Safe") {
    recommendations.push("Don't enter passwords, OTPs, or payment info.");
    recommendations.push("Verify the official domain via a trusted search.");
  } else {
    recommendations.push("Always double-check the address bar before logging in.");
  }

  return { input: raw, normalizedUrl: normalized, hostname: host, score, verdict, reasons, recommendations };
}
