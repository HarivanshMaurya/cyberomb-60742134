// AI Article Writer - generates SEO-optimized articles via Lovable AI Gateway
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

interface GenerateBody {
  topic: string;
  keywords?: string;
  tone?: 'Professional' | 'Casual' | 'Technical' | 'Friendly';
  language?: 'English' | 'Hindi' | 'Hinglish';
  length?: 'short' | 'medium' | 'long';
  mode?: 'full' | 'rewrite' | 'improve_seo' | 'grammar' | 'section';
  existingContent?: string;
  selection?: string;
  instruction?: string;
}

const LOVABLE_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

const lengthGuide: Record<string, string> = {
  short: '500-700 words',
  medium: '900-1300 words',
  long: '1600-2200 words',
};

function buildSystemPrompt(b: GenerateBody) {
  const tone = b.tone || 'Professional';
  const lang = b.language || 'English';
  const len = lengthGuide[b.length || 'medium'];
  return `You are a senior human journalist and SEO editor writing for a Google AdSense-monetised publication. Your #1 job: produce articles that read like a real, experienced human wrote them — not AI. They must comfortably pass AdSense content-quality review (original, helpful, substantive, E-E-A-T) AND rank well in Google Search.

HUMAN-WRITING RULES (critical — break any of these and the article is rejected):
- Vary sentence length aggressively. Mix short punchy lines with longer, flowing ones. No rhythmic monotony.
- Use real first-person/second-person voice where it fits ("I tested…", "you'll notice…"). Add small opinions, mild contradictions, and lived-in detail.
- Include concrete specifics: real numbers, dates, brand names, place names, prices, study citations (named, not "studies show"), short anecdotes.
- Zero AI tells. NEVER use: "In today's fast-paced world", "In conclusion", "It's important to note", "delve", "leverage", "navigate the landscape", "game-changer", "unlock the potential", "tapestry", "embark on a journey", "moreover", "furthermore", "in essence". Avoid em-dash overuse. Avoid tri-colon lists ("X, Y, and Z") in every paragraph.
- No filler, no repetition, no padded transitions. Cut anything that doesn't add information.
- Write at a Grade 7-9 reading level. Short paragraphs (1-3 sentences). Use contractions naturally ("you'll", "it's").

ADSENSE / E-E-A-T RULES:
- 100% original — do not paraphrase well-known articles. Bring a fresh angle or first-hand experience.
- Helpful, people-first content. Solve the searcher's actual problem in the first 100 words.
- Show Experience and Expertise: include a "How I researched this" or hands-on observation line where natural.
- No misleading claims, no fabricated stats. If unsure, hedge ("around 2024", "in most regions") instead of inventing.
- Family-safe. No gambling, adult, hate, or copyrighted lyrics.

SEO RULES:
- Primary keyword in: H1, first 100 words, one H2, meta title, meta description, slug, and naturally 4-7 times in the body (density ~1%, never stuffed).
- Use 3-6 semantically related LSI/secondary keywords across H2/H3 headings.
- Add internal-link anchor candidates inline as <strong> phrases (e.g. <strong>related: keyword phrase</strong>) so the editor can hyperlink later.
- Add 1 external authority mention by name (no fake links).
- Include a TL;DR / "Key takeaways" <ul> near the top.
- FAQ section uses question-style H3s that match real long-tail queries (think People Also Ask).
- Meta description must be a benefit-driven hook with the primary keyword in the first 120 chars.

Output STRICT JSON only — no markdown fences, no commentary — matching this TypeScript type:
{
  "title": string,                  // primary SEO title <= 70 chars, includes primary keyword, click-worthy not clickbait
  "titleVariations": string[],      // 4 alternates with different angles
  "slug": string,                   // kebab-case, <= 60 chars, primary keyword only
  "metaTitle": string,              // <= 60 chars
  "metaDescription": string,        // 140-160 chars, keyword in first half, CTA at end
  "excerpt": string,                // 1-2 sentence human hook, <= 220 chars
  "summary": string,                // 3-4 sentence TL;DR
  "tags": string[],                 // 6-10 lowercase tags incl. long-tail variants
  "categorySuggestions": string[],  // 2-3 category names
  "readTime": string,               // e.g. "7 min read"
  "content": string                 // full HTML article — see rules below
}

Rules for "content" HTML:
- Start with <h1> (primary keyword), then a 2-3 sentence human intro that names the problem and the payoff.
- Immediately after the intro: a <h2>Key takeaways</h2> with a 3-5 bullet <ul>.
- 5-7 main <h2> sections, each with 2-4 paragraphs and at least one <ul>/<ol>, <strong>, or <blockquote> for visual variety.
- One <h2>FAQs</h2> section with 4-6 real question H3s and concise <p> answers (40-80 words each).
- End with a <h2>Final thoughts</h2> (NOT "Conclusion") that gives a clear next step or opinion.
- INLINE IMAGE SLOTS (mandatory): insert EXACTLY 4 image placeholders, spaced evenly through the body (roughly after sections 1, 3, 5, and before FAQs). Each placeholder MUST be of this exact form and nothing else — the platform will replace them with real images:
  <figure data-img-slot="1" data-img-query="SHORT VISUAL SEARCH QUERY HERE"></figure>
  The data-img-query MUST be a concrete, photographable noun phrase (3-6 words) tied to that section's topic — e.g. "woman meditating sunrise beach" not "mindfulness concept". Number slots 1, 2, 3, 4 in order. Do NOT add <img> tags yourself.
  The data-img-query MUST be a concrete, photographable noun phrase (3-6 words) tied to that section's topic — e.g. "woman meditating sunrise beach" not "mindfulness concept". Number slots 1, 2, 3 in order. Do NOT add <img> tags yourself.
- Use <p>, <ul>/<ol>, <strong>, <em>, <blockquote>, <h2>, <h3>, <figure data-img-slot data-img-query> only. NO inline styles. NO <html>/<body>. NO markdown. NO real <img> tags (cover image and inline images are added separately).
- Target length: ${len}.
- Tone: ${tone}. Language: ${lang}${lang === 'Hinglish' ? ' (natural Hindi + English mix in Roman script, like a real desi blogger talking to a friend)' : ''}.
- It must read like it was written by a senior human expert who actually uses/lived the topic — not by an AI summarising the web.`;
}

function buildUserPrompt(b: GenerateBody) {
  if (b.mode === 'rewrite') {
    return `Rewrite the article below to feel more original, engaging, and human while preserving facts and structure. Return the same JSON shape.\n\nTopic: ${b.topic}\nKeywords: ${b.keywords || ''}\n\nEXISTING ARTICLE HTML:\n${b.existingContent || ''}`;
  }
  if (b.mode === 'improve_seo') {
    return `Improve the SEO of the article below: stronger title/meta, better headings, keyword placement, internal linking suggestions inline as <strong> phrases, schema-friendly structure. Return the same JSON shape.\n\nTarget keywords: ${b.keywords || ''}\nTopic: ${b.topic}\n\nEXISTING ARTICLE HTML:\n${b.existingContent || ''}`;
  }
  if (b.mode === 'grammar') {
    return `Fix all grammar, spelling, punctuation, and awkward phrasing in the article below. Keep meaning and HTML structure intact. Return the same JSON shape.\n\nEXISTING ARTICLE HTML:\n${b.existingContent || ''}\nTopic: ${b.topic}`;
  }
  if (b.mode === 'section') {
    return `Rewrite ONLY the selected section to be sharper and more engaging. Return JSON where "content" contains ONLY the rewritten HTML for that section (no full article).\n\nInstruction: ${b.instruction || 'Improve clarity and flow.'}\nTopic context: ${b.topic}\n\nSELECTED HTML:\n${b.selection || ''}`;
  }
  return `Write a complete, premium article.\n\nTopic / Title idea: ${b.topic}\nFocus keywords: ${b.keywords || '(infer from topic)'}\nExtra instructions: ${b.instruction || '(none)'}\n\nReturn the JSON now.`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Auth: must be an admin
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: roleRow } = await supabase
      .from('user_roles').select('role')
      .eq('user_id', userData.user.id).eq('role', 'admin').maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as GenerateBody;
    if (!body?.topic || typeof body.topic !== 'string' || body.topic.trim().length < 2) {
      return new Response(JSON.stringify({ error: 'Topic is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try primary model, then fall back to a different model on transient errors / bad JSON
    const models = ['google/gemini-2.5-flash', 'google/gemini-2.5-flash-lite', 'google/gemini-2.5-pro'];
    let lastErr = '';
    let parsed: Record<string, unknown> | null = null;

    for (const model of models) {
      // Retry the same model up to 2 times on 429 / 5xx
      for (let attempt = 0; attempt < 2; attempt++) {
        const aiRes = await fetch(LOVABLE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: buildSystemPrompt(body) },
              { role: 'user', content: buildUserPrompt(body) },
            ],
            response_format: { type: 'json_object' },
          }),
        });

        if (aiRes.status === 402) {
          return new Response(JSON.stringify({ error: 'AI credits exhausted. Add credits in Workspace Settings.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        if (aiRes.status === 429 || aiRes.status >= 500) {
          lastErr = `Model ${model} returned ${aiRes.status}`;
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
          continue; // retry same model
        }
        if (!aiRes.ok) {
          lastErr = await aiRes.text();
          break; // hard error → try next model
        }

        const aiJson = await aiRes.json().catch(() => null);
        const raw: string = aiJson?.choices?.[0]?.message?.content ?? '';
        if (!raw) {
          lastErr = 'Empty AI response';
          break;
        }
        // Robust JSON extraction
        const cleaned = raw
          .replace(/^\s*```(?:json)?/i, '')
          .replace(/```\s*$/i, '')
          .trim();
        try {
          parsed = JSON.parse(cleaned);
        } catch {
          const m = cleaned.match(/\{[\s\S]*\}/);
          if (m) {
            try { parsed = JSON.parse(m[0]); } catch { /* still bad */ }
          }
        }
        if (parsed && (parsed.content || parsed.title)) break; // success
        lastErr = 'AI returned unparsable content';
        parsed = null;
        break; // try next model
      }
      if (parsed) break;
    }

    if (!parsed) {
      return new Response(JSON.stringify({ error: 'AI generation failed', detail: lastErr }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ ok: true, article: parsed }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
