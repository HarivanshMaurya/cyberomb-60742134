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
  return `You are an elite SEO content writer and journalist. Write 100% original, deeply researched, human-sounding articles. Avoid AI tells, repetition, and filler. Use natural rhythm, vivid examples, and second-person engagement where useful.

Output STRICT JSON only — no markdown fences, no commentary — matching this TypeScript type:
{
  "title": string,                  // primary SEO title <= 70 chars
  "titleVariations": string[],      // 4 alternates
  "slug": string,                   // kebab-case
  "metaTitle": string,              // <= 60 chars
  "metaDescription": string,        // 140-160 chars
  "excerpt": string,                // 1-2 sentence hook, <= 220 chars
  "summary": string,                // 3-4 sentence TL;DR
  "tags": string[],                 // 5-8 lowercase tags
  "categorySuggestions": string[],  // 2-3 category names
  "readTime": string,               // e.g. "7 min read"
  "content": string                 // full HTML article — see rules below
}

Rules for "content" HTML:
- Start with an <h1> followed by an engaging intro paragraph.
- Use <h2> for sections, <h3> for sub-sections.
- Include: Introduction, 4-6 main sections, an FAQ section (<h2>FAQs</h2> with <h3> questions and <p> answers), and a Conclusion.
- Use <p>, <ul>/<ol>, <strong>, <em>, <blockquote> tags. NO inline styles. NO <html>/<body> wrappers. NO markdown.
- Naturally weave the keywords; do NOT keyword-stuff.
- Target length: ${len}.
- Tone: ${tone}. Language: ${lang}${lang === 'Hinglish' ? ' (mix Hindi + English casually, Roman script)' : ''}.
- Make it feel written by a senior human expert — concrete data points, anecdotes, opinions.`;
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

    const aiRes = await fetch(LOVABLE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: buildSystemPrompt(body) },
          { role: 'user', content: buildUserPrompt(body) },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: 'Rate limit reached. Please try again shortly.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: 'AI credits exhausted. Add credits in Workspace Settings.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return new Response(JSON.stringify({ error: 'AI gateway error', detail: errText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiJson = await aiRes.json();
    const raw = aiJson?.choices?.[0]?.message?.content ?? '';
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      // try to extract a JSON object
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { content: raw };
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
