// Auto-fetch a unique, topic-relevant image for an article (no API key required).
// Tries Openverse (CC images, includes Flickr/Wikimedia/etc.), falls back to
// Wikimedia Commons search. Verifies uniqueness against every image already
// used in any article (by URL and by normalized filename/ID), and automatically
// refines the search using topic + keywords with multiple query strategies.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

interface Body {
  topic: string;
  keywords?: string;
  excludeUrls?: string[];
}

interface ImageResult {
  url: string;
  thumbnail?: string;
  source?: string;
  creator?: string;
  credit?: string;
  provider: 'openverse' | 'wikimedia';
}

// Normalize a URL to a stable fingerprint so two URLs pointing at the same
// underlying image (different CDN params, different thumb sizes, etc.) still
// collide. We strip the query string and reduce to the last path segment
// without size suffixes like "-1600px" or "/640px-".
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
  const kws = (b.keywords || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const queries: string[] = [];
  // 1. Most specific: topic + first 2 keywords
  if (topic && kws.length) queries.push(`${topic} ${kws.slice(0, 2).join(' ')}`);
  // 2. Topic + single strongest keyword
  if (topic && kws[0]) queries.push(`${topic} ${kws[0]}`);
  // 3. Just the topic
  if (topic) queries.push(topic);
  // 4. Each keyword as fallback
  for (const k of kws.slice(0, 3)) queries.push(k);
  // 5. Topic minus stopwords (last resort)
  if (topic) {
    const stop = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'in', 'to', 'for', 'how', 'why', 'what', 'is', 'with']);
    const stripped = topic.split(/\s+/).filter((w) => !stop.has(w.toLowerCase())).join(' ');
    if (stripped && stripped !== topic) queries.push(stripped);
  }
  return Array.from(new Set(queries)).filter(Boolean);
}

async function searchOpenverse(query: string, exclude: Set<string>): Promise<ImageResult | null> {
  try {
    const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=40&license_type=commercial&mature=false`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CyberomCMS/1.0 (admin auto image)' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const results: any[] = Array.isArray(data?.results) ? data.results : [];
    const shuffled = results.sort(() => Math.random() - 0.5);
    for (const r of shuffled) {
      const u: string = r?.url || '';
      if (!u || !/^https?:\/\//.test(u)) continue;
      if (exclude.has(u) || exclude.has(fingerprint(u))) continue;
      return {
        url: u,
        thumbnail: r?.thumbnail || u,
        source: r?.foreign_landing_url || r?.source || '',
        creator: r?.creator || '',
        credit: `Photo by ${r?.creator || 'Unknown'} on ${r?.source || 'Openverse'}`,
        provider: 'openverse',
      };
    }
  } catch (_e) { /* fall through */ }
  return null;
}

async function searchWikimedia(query: string, exclude: Set<string>): Promise<ImageResult | null> {
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=40&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1600&format=json&origin=*`;
    const res = await fetch(url, { headers: { 'User-Agent': 'CyberomCMS/1.0' } });
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.query?.pages ? Object.values<any>(data.query.pages) : [];
    const shuffled = pages.sort(() => Math.random() - 0.5);
    for (const p of shuffled) {
      const info = p?.imageinfo?.[0];
      const u: string = info?.thumburl || info?.url || '';
      if (!u || !/^https?:\/\//.test(u)) continue;
      if (!/\.(jpe?g|png|webp|gif)(\?|$)/i.test(u)) continue;
      if (exclude.has(u) || exclude.has(fingerprint(u))) continue;
      const meta = info?.extmetadata || {};
      const artist = (meta?.Artist?.value || '').replace(/<[^>]+>/g, '').trim();
      return {
        url: u,
        thumbnail: info?.thumburl || u,
        source: info?.descriptionurl || 'https://commons.wikimedia.org',
        creator: artist || 'Wikimedia Commons',
        credit: `Image via Wikimedia Commons${artist ? ` — ${artist}` : ''}`,
        provider: 'wikimedia',
      };
    }
  } catch (_e) { /* fall through */ }
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
    if (!body?.topic) {
      return new Response(JSON.stringify({ error: 'Topic required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build exclusion set: caller-passed URLs + every featured_image / og_image
    // already attached to any article. Add both the raw URL and its fingerprint
    // so resized/CDN variants of the same source image still get rejected.
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
    // Also check wellness_articles if that table has a featured_image column
    try {
      const { data: usedWell } = await admin
        .from('wellness_articles').select('featured_image').limit(2000);
      for (const r of usedWell || []) {
        const v = (r as Record<string, string | null>)?.featured_image;
        if (v) { exclude.add(v); exclude.add(fingerprint(v)); }
      }
    } catch { /* table may not exist or have column; ignore */ }

    // Try every refined query, on both providers, until we find a unique match
    const queries = buildQueries(body);
    let image: ImageResult | null = null;
    for (const q of queries) {
      image = await searchOpenverse(q, exclude);
      if (image) break;
      image = await searchWikimedia(q, exclude);
      if (image) break;
    }

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
