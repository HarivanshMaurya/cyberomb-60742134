// Generate article images with Google Gemini (Nano Banana) via Lovable AI
// Gateway, upload the resulting PNGs to the `media` Storage bucket, and
// return public URLs. Admin-only. Supports one prompt or a batch of prompts.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

interface Body {
  prompt?: string;                     // single-image mode
  prompts?: string[];                  // batch mode
  topic?: string;                      // helps craft a better prompt
  keywords?: string;                   // "kw1, kw2" — appended for context
  style?: string;                      // optional style hint
  model?: string;                      // override model id
  aspect?: '16:9' | '4:3' | '1:1';     // hint injected into prompt
}

interface ImageResult {
  url: string;                         // public https URL in media bucket
  path: string;                        // storage path
  prompt: string;                      // exact prompt sent to model
  provider: 'gemini';
  model: string;
}

const AI_URL = 'https://ai.gateway.lovable.dev/v1/images/generations';
const DEFAULT_MODEL = 'google/gemini-2.5-flash-image';

function buildPrompt(base: string, body: Body): string {
  const bits: string[] = [base.trim()];
  if (body.topic && !base.toLowerCase().includes(body.topic.toLowerCase())) {
    bits.push(`Context: ${body.topic}`);
  }
  if (body.keywords) bits.push(`Related: ${body.keywords}`);
  const style = body.style ||
    'ultra-realistic editorial photograph, natural lighting, sharp focus, ' +
    'shallow depth of field, magazine-quality, no text, no watermark, no logo';
  bits.push(`Style: ${style}`);
  if (body.aspect) bits.push(`Aspect ratio: ${body.aspect}`);
  return bits.join('. ');
}

async function callGemini(prompt: string, model: string, apiKey: string): Promise<string> {
  // Retry up to 3 times on 429 / 5xx
  let lastErr = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(AI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image', 'text'],
      }),
    });
    if (res.status === 429 || res.status >= 500) {
      lastErr = `Gemini ${res.status}`;
      await new Promise((r) => setTimeout(r, 900 * (attempt + 1)));
      continue;
    }
    if (res.status === 402) throw new Error('AI credits exhausted');
    if (!res.ok) {
      lastErr = await res.text().catch(() => `HTTP ${res.status}`);
      throw new Error(`Image gen failed: ${lastErr.slice(0, 200)}`);
    }
    const json = await res.json().catch(() => null);
    const b64: string | undefined = json?.data?.[0]?.b64_json;
    if (!b64) throw new Error('No image data returned');
    return b64;
  }
  throw new Error(`Image gen failed after retries: ${lastErr}`);
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function slugify(s: string): string {
  return (s || 'image').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 40) || 'image';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
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

    const body = (await req.json().catch(() => ({}))) as Body;
    const prompts: string[] = body.prompts?.length
      ? body.prompts.filter((p) => typeof p === 'string' && p.trim().length > 1)
      : (body.prompt ? [body.prompt] : []);
    if (!prompts.length) {
      return new Response(JSON.stringify({ error: 'prompt or prompts required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const model = body.model || DEFAULT_MODEL;
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const results: (ImageResult | { error: string; prompt: string })[] = [];
    for (const rawPrompt of prompts) {
      const finalPrompt = buildPrompt(rawPrompt, body);
      try {
        const b64 = await callGemini(finalPrompt, model, apiKey);
        const bytes = b64ToBytes(b64);
        const stamp = Date.now();
        const rand = Math.random().toString(36).slice(2, 8);
        const path = `ai-generated/${new Date().getFullYear()}/${slugify(rawPrompt)}-${stamp}-${rand}.png`;
        const { error: upErr } = await admin.storage.from('media').upload(path, bytes, {
          contentType: 'image/png', upsert: false, cacheControl: '31536000',
        });
        if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
        const { data: pub } = admin.storage.from('media').getPublicUrl(path);
        results.push({
          url: pub.publicUrl, path, prompt: finalPrompt,
          provider: 'gemini', model,
        });
      } catch (e) {
        console.error('[generate-article-image] slot failed', rawPrompt, e);
        results.push({ error: (e as Error).message, prompt: finalPrompt });
      }
    }

    // Single-mode convenience
    if (body.prompt && !body.prompts) {
      const first = results[0];
      if ('error' in first) {
        return new Response(JSON.stringify({ ok: false, error: first.error }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ ok: true, image: first }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, images: results }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[generate-article-image] fatal', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
