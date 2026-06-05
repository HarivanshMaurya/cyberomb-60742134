// Auto-fetch unique, topic-relevant images for an article (no API key required).
// Sources: Openverse (CC, includes Flickr/Wikimedia/etc.) + Wikimedia Commons.
// Returns either a single best image or a batch of N unique images (for inline
// usage). Results are SCORED by how well each candidate's title/tags overlap
// the search query, so the picked image actually matches the topic instead of
// being the first random hit.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

interface Body {
  topic: string;
  keywords?: string;
  excludeUrls?: string[];
  // When set, return up to `count` unique images (for inline article use).
  // When omitted, returns a single best image (back-compat for cover fetch).
  count?: number;
  // Optional list of per-slot queries to fetch tailored inline images for.
  queries?: string[];
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

const STOP = new Set([
  'the','a','an','and','or','of','in','to','for','how','why','what','is','with',
  'on','at','by','from','your','my','best','top','guide','tips','vs','&',
]);

function tokens(s: string): string[] {
  return (s || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
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
  } catch {
    return url.toLowerCase();
  }
}

function buildQueries(b: Body): string[] {
  const topic = (b.topic || '').trim();
  const kws = (b.keywords || '').split(',').map((s) => s.trim()).filter(Boolean);
  const queries: string[] = [];
  if (topic && kws.length) queries.push(`${topic} ${kws.slice(0, 2).join(' ')}`);
  if (topic && kws[0]) queries.push(`${topic} ${kws[0]}`);
  if (topic) queries.push(topic);
  for (const k of kws.slice(0, 3)) queries.push(k);
  if (topic) {
    const stripped = topic.split(/\s+/).filter((w) => !STOP.has(w.toLowerCase())).join(' ');
    if (stripped && stripped !== topic) queries.push(stripped);
  }
  return Array.from(new Set(queries)).filter(Boolean);
}

async function searchOpenverseAll(query: string): Promise<ImageResult[]> {
  try {
    const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=40&license_type=commercial&mature=false`;
    const res = await fetch(url, { headers: { 'User-Agent': 'CyberomCMS/1.0' } });
    if (!res.ok) return [];
    const data = await res.json();
    const results: any[] = Array.isArray(data?.results) ? data.results : [];
    return results.map((r) => ({
      url: r?.url || '',
      thumbnail: r?.thumbnail || r?.url || '',
      source: r?.foreign_landing_url || r?.source || '',
      creator: r?.creator || '',
      credit: `Photo by ${r?.creator || 'Unknown'} on ${r?.source || 'Openverse'}`,
      provider: 'openverse' as const,
      _text: `${r?.title || ''} ${(r?.tags || []).map((t: any) => t?.name || t).join(' ')}`,
    })) as any;
  } catch { return []; }
}

async function searchWikimediaAll(query: string): Promise<ImageResult[]> {
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=40&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1600&format=json&origin=*`;
    const res = await fetch(url, { headers: { 'User-Agent': 'CyberomCMS/1.0' } });
    if (!res.ok) return [];
    const data = await res.json();
    const pages = data?.query?.pages ? Object.values<any>(data.query.pages) : [];
    return pages.map((p) => {
      const info = p?.imageinfo?.[0];
      const u: string = info?.thumburl || info?.url || '';
      const meta = info?.extmetadata || {};
      const artist = (meta?.Artist?.value || '').replace(/<[^>]+>/g, '').trim();
      const desc = (meta?.ImageDescription?.value || '').replace(/<[^>]+>/g, '').trim();
      return {
        url: u,
        thumbnail: info?.thumburl || u,
        source: info?.descriptionurl || 'https://commons.wikimedia.org',
        creator: artist || 'Wikimedia Commons',
        credit: `Image via Wikimedia Commons${artist ? ` — ${artist}` : ''}`,
        provider: 'wikimedia' as const,
        _text: `${p?.title || ''} ${desc}`,
      };
    }).filter((r: any) => r.url && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(r.url)) as any;
  } catch { return []; }
}

async function findBestImage(query: string, exclude: Set<string>): Promise<ImageResult | null> {
  const qTok = tokens(query);
  const candidates: any[] = [];
  candidates.push(...await searchOpenverseAll(query));
  candidates.push(...await searchWikimediaAll(query));

  const scored = candidates
    .filter((c) => c.url && /^https?:\/\//.test(c.url))
    .filter((c) => !exclude.has(c.url) && !exclude.has(fingerprint(c.url)))
    .map((c) => ({ ...c, score: scoreCandidate(qTok, c._text) }))
    .sort((a, b) => b.score - a.score);

  // Prefer strong matches; if none scored, fall back to first available
  const best = scored.find((c) => c.score >= 0.5) || scored.find((c) => c.score > 0) || scored[0];
  if (!best) return null;
  return {
    url: best.url, thumbnail: best.thumbnail, source: best.source,
    creator: best.creator, credit: best.credit, provider: best.provider,
    score: best.score, query,
  };
}

async function fetchOne(b: Body, exclude: Set<string>, customQuery?: string): Promise<ImageResult | null> {
  const queries = customQuery ? [customQuery, ...buildQueries(b)] : buildQueries(b);
  for (const q of queries) {
    const img = await findBestImage(q, exclude);
    if (img) return img;
  }
  return null;
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
    if (!body?.topic && !(body?.queries?.length)) {
      return new Response(JSON.stringify({ error: 'Topic or queries required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
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

    // Batch mode — per-slot queries OR count
    if (body.queries?.length || (body.count && body.count > 1)) {
      const slotQueries: (string | undefined)[] = body.queries?.length
        ? body.queries
        : Array.from({ length: body.count || 3 }, () => undefined);
      const images: ImageResult[] = [];
      for (const sq of slotQueries) {
        const img = await fetchOne(body, exclude, sq);
        if (img) {
          images.push(img);
          exclude.add(img.url);
          exclude.add(fingerprint(img.url));
        } else {
          images.push(null as any);
        }
      }
      return new Response(JSON.stringify({ ok: true, images }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Single image mode (back-compat)
    const image = await fetchOne(body, exclude);
    if (!image) {
      return new Response(JSON.stringify({ ok: false, error: 'No unique image found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ ok: true, image }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
