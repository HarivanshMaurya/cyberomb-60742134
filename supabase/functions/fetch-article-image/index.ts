// Auto-fetch unique, topic-relevant images. Returns per-slot results with
// detailed `logs` (queries tried, candidate counts, scores, errors) so the
// admin UI can show diagnostics and let the user retry / swap individual
// images. Includes per-request timeout + retry-with-backoff.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

interface Body {
  topic: string;
  keywords?: string;
  excludeUrls?: string[];
  count?: number;
  queries?: string[];
  // Minimum relevance score (0..1) to accept a candidate. Default 0.34
  minScore?: number;
}

interface ImageResult {
  url: string;
  thumbnail?: string;
  source?: string;
  creator?: string;
  credit?: string;
  provider: 'openverse' | 'wikimedia';
  score?: number;
  query?: string;
}

interface SlotLog {
  slot: number;
  baseQuery: string;
  attempts: { query: string; provider: string; candidates: number; topScore: number; picked?: string; error?: string }[];
  picked?: string;
  pickedScore?: number;
  status: 'ok' | 'fallback' | 'failed';
}

const STOP = new Set([
  'the','a','an','and','or','of','in','to','for','how','why','what','is','with',
  'on','at','by','from','your','my','best','top','guide','tips','vs','&',
]);

function tokens(s: string): string[] {
  return (s || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

function scoreCandidate(queryTokens: string[], text: string): number {
  if (!queryTokens.length) return 0;
  const t = (text || '').toLowerCase();
  let hits = 0;
  for (const q of queryTokens) if (t.includes(q)) hits++;
  return hits / queryTokens.length;
}

function fingerprint(url: string): string {
  try {
    const u = new URL(url);
    let p = u.pathname.toLowerCase();
    p = p.replace(/\/\d{2,4}px-/g, '/');
    p = p.replace(/[-_]\d{2,4}(px|w|h)?(?=\.[a-z0-9]+$)/g, '');
    const last = p.split('/').filter(Boolean).pop() || p;
    return last;
  } catch { return url.toLowerCase(); }
}

// Iterative refinement: progressively broaden a single slot query
function refineQueries(base: string, body: Body): string[] {
  const out: string[] = [];
  const baseTrim = (base || '').trim();
  if (baseTrim) out.push(baseTrim);
  const kws = (body.keywords || '').split(',').map((s) => s.trim()).filter(Boolean);
  // Tighten with topic context
  if (baseTrim && body.topic) out.push(`${baseTrim} ${body.topic.split(/\s+/).slice(0, 2).join(' ')}`);
  // Broaden by removing trailing words
  const parts = baseTrim.split(/\s+/);
  if (parts.length > 2) out.push(parts.slice(0, 2).join(' '));
  if (parts.length > 1) out.push(parts[0]);
  // Fall back to topic / keywords
  if (body.topic) out.push(body.topic);
  for (const k of kws.slice(0, 2)) out.push(k);
  // Strip stopwords
  if (baseTrim) {
    const stripped = baseTrim.split(/\s+/).filter((w) => !STOP.has(w.toLowerCase())).join(' ');
    if (stripped && stripped !== baseTrim) out.push(stripped);
  }
  return Array.from(new Set(out)).filter(Boolean);
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'CyberomCMS/1.0' } });
  } catch { return null; } finally { clearTimeout(t); }
}

async function searchOpenverse(query: string): Promise<{ items: any[]; error?: string }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetchWithTimeout(
      `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=40&license_type=commercial&mature=false`,
      8000,
    );
    if (!res) { await new Promise((r) => setTimeout(r, 400 * (attempt + 1))); continue; }
    if (!res.ok) { await res.text().catch(() => ''); return { items: [], error: `openverse ${res.status}` }; }
    const data = await res.json().catch(() => null);
    const results: any[] = Array.isArray(data?.results) ? data.results : [];
    return {
      items: results.map((r) => ({
        url: r?.url || '',
        thumbnail: r?.thumbnail || r?.url || '',
        source: r?.foreign_landing_url || r?.source || '',
        creator: r?.creator || '',
        credit: `Photo by ${r?.creator || 'Unknown'} on ${r?.source || 'Openverse'}`,
        provider: 'openverse' as const,
        _text: `${r?.title || ''} ${(r?.tags || []).map((t: any) => t?.name || t).join(' ')}`,
      })),
    };
  }
  return { items: [], error: 'openverse timeout' };
}

async function searchWikimedia(query: string): Promise<{ items: any[]; error?: string }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetchWithTimeout(
      `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=40&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1600&format=json&origin=*`,
      8000,
    );
    if (!res) { await new Promise((r) => setTimeout(r, 400 * (attempt + 1))); continue; }
    if (!res.ok) { await res.text().catch(() => ''); return { items: [], error: `wikimedia ${res.status}` }; }
    const data = await res.json().catch(() => null);
    const pages = data?.query?.pages ? Object.values<any>(data.query.pages) : [];
    return {
      items: pages.map((p) => {
        const info = p?.imageinfo?.[0];
        const u: string = info?.thumburl || info?.url || '';
        const meta = info?.extmetadata || {};
        const artist = (meta?.Artist?.value || '').replace(/<[^>]+>/g, '').trim();
        const desc = (meta?.ImageDescription?.value || '').replace(/<[^>]+>/g, '').trim();
        return {
          url: u, thumbnail: info?.thumburl || u,
          source: info?.descriptionurl || 'https://commons.wikimedia.org',
          creator: artist || 'Wikimedia Commons',
          credit: `Image via Wikimedia Commons${artist ? ` — ${artist}` : ''}`,
          provider: 'wikimedia' as const,
          _text: `${p?.title || ''} ${desc}`,
        };
      }).filter((r: any) => r.url && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(r.url)),
    };
  }
  return { items: [], error: 'wikimedia timeout' };
}

async function findForQuery(
  baseQuery: string, body: Body, exclude: Set<string>, slotNum: number, minScore: number,
): Promise<{ image: ImageResult | null; log: SlotLog }> {
  const log: SlotLog = { slot: slotNum, baseQuery, attempts: [], status: 'failed' };
  const queries = refineQueries(baseQuery, body);
  let bestFallback: any = null;

  for (const q of queries) {
    const qTok = tokens(q);
    const [ov, wm] = await Promise.all([searchOpenverse(q), searchWikimedia(q)]);
    const all = [...ov.items, ...wm.items]
      .filter((c) => c.url && /^https?:\/\//.test(c.url))
      .filter((c) => !exclude.has(c.url) && !exclude.has(fingerprint(c.url)))
      .map((c) => ({ ...c, score: scoreCandidate(qTok, c._text) }))
      .sort((a, b) => b.score - a.score);

    const topScore = all[0]?.score ?? 0;
    const errMsg = ov.error || wm.error;
    log.attempts.push({
      query: q, provider: 'openverse+wikimedia', candidates: all.length,
      topScore, error: errMsg,
    });
    console.log(`[fetch-article-image] slot=${slotNum} q="${q}" cands=${all.length} top=${topScore.toFixed(2)}${errMsg ? ' err=' + errMsg : ''}`);

    const strong = all.find((c) => c.score >= minScore);
    if (strong) {
      log.attempts[log.attempts.length - 1].picked = strong.url;
      log.picked = strong.url; log.pickedScore = strong.score; log.status = 'ok';
      return {
        image: {
          url: strong.url, thumbnail: strong.thumbnail, source: strong.source,
          creator: strong.creator, credit: strong.credit, provider: strong.provider,
          score: strong.score, query: q,
        }, log,
      };
    }
    if (!bestFallback && all[0]) bestFallback = { ...all[0], query: q };
  }

  if (bestFallback) {
    log.picked = bestFallback.url; log.pickedScore = bestFallback.score; log.status = 'fallback';
    return {
      image: {
        url: bestFallback.url, thumbnail: bestFallback.thumbnail, source: bestFallback.source,
        creator: bestFallback.creator, credit: bestFallback.credit, provider: bestFallback.provider,
        score: bestFallback.score, query: bestFallback.query,
      }, log,
    };
  }
  return { image: null, log };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
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
    if (!body?.topic && !(body?.queries?.length)) {
      return new Response(JSON.stringify({ error: 'Topic or queries required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const minScore = typeof body.minScore === 'number' ? body.minScore : 0.34;

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const exclude = new Set<string>();
    for (const u of body.excludeUrls || []) {
      if (u) { exclude.add(u); exclude.add(fingerprint(u)); }
    }
    const { data: usedFeatured } = await admin
      .from('articles').select('featured_image, og_image').limit(2000);
    for (const r of usedFeatured || []) {
      for (const key of ['featured_image', 'og_image'] as const) {
        const v = (r as Record<string, string | null>)?.[key];
        if (v) { exclude.add(v); exclude.add(fingerprint(v)); }
      }
    }
    try {
      const { data: usedWell } = await admin
        .from('wellness_articles').select('featured_image').limit(2000);
      for (const r of usedWell || []) {
        const v = (r as Record<string, string | null>)?.featured_image;
        if (v) { exclude.add(v); exclude.add(fingerprint(v)); }
      }
    } catch { /* ignore */ }

    // Batch mode
    if (body.queries?.length || (body.count && body.count > 1)) {
      const slotQueries: string[] = body.queries?.length
        ? body.queries
        : Array.from({ length: body.count || 4 }, () => body.topic);
      const images: (ImageResult | null)[] = [];
      const logs: SlotLog[] = [];
      for (let i = 0; i < slotQueries.length; i++) {
        const { image, log } = await findForQuery(slotQueries[i], body, exclude, i + 1, minScore);
        logs.push(log);
        images.push(image);
        if (image) { exclude.add(image.url); exclude.add(fingerprint(image.url)); }
      }
      return new Response(JSON.stringify({ ok: true, images, logs }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Single image mode (cover)
    const { image, log } = await findForQuery(body.topic, body, exclude, 0, minScore);
    if (!image) {
      return new Response(JSON.stringify({ ok: false, error: 'No unique image found', log }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ ok: true, image, log }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[fetch-article-image] fatal', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
