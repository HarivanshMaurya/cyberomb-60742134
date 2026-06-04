// Auto-fetch a unique, topic-relevant image for an article (no API key required).
// Tries Openverse (CC images, includes Flickr/Wikimedia/etc.), falls back to
// Wikimedia Commons search. Excludes images already used in other articles.
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

function buildQuery(b: Body): string {
  const t = (b.topic || '').trim();
  const k = (b.keywords || '').split(',').map((s) => s.trim()).filter(Boolean);
  // Prefer first 1-2 keywords + topic for relevance
  const q = [t, ...k.slice(0, 2)].filter(Boolean).join(' ');
  return q || t || 'abstract';
}

async function searchOpenverse(query: string, exclude: Set<string>): Promise<ImageResult | null> {
  try {
    const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=30&license_type=commercial&mature=false`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CyberomCMS/1.0 (admin auto image)' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const results: any[] = Array.isArray(data?.results) ? data.results : [];
    // Shuffle for variety
    const shuffled = results.sort(() => Math.random() - 0.5);
    for (const r of shuffled) {
      const u: string = r?.url || '';
      if (!u || !/^https?:\/\//.test(u)) continue;
      if (exclude.has(u)) continue;
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
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=30&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1600&format=json&origin=*`;
    const res = await fetch(url, { headers: { 'User-Agent': 'CyberomCMS/1.0' } });
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.query?.pages ? Object.values<any>(data.query.pages) : [];
    const shuffled = pages.sort(() => Math.random() - 0.5);
    for (const p of shuffled) {
      const info = p?.imageinfo?.[0];
      const u: string = info?.thumburl || info?.url || '';
      if (!u || !/^https?:\/\//.test(u)) continue;
      // Skip non-image extensions
      if (!/\.(jpe?g|png|webp|gif)(\?|$)/i.test(u)) continue;
      if (exclude.has(u)) continue;
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
    // Auth: admin only
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

    // Build exclusion set: passed-in URLs + all existing featured_image URLs in the DB
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const exclude = new Set<string>((body.excludeUrls || []).filter(Boolean));
    const { data: used } = await admin
      .from('articles')
      .select('featured_image')
      .not('featured_image', 'is', null)
      .limit(1000);
    for (const r of used || []) {
      if (r?.featured_image) exclude.add(r.featured_image as string);
    }

    const query = buildQuery(body);

    // Try Openverse first, then Wikimedia. If both fail, try with just the topic word.
    let image =
      (await searchOpenverse(query, exclude)) ||
      (await searchWikimedia(query, exclude)) ||
      (await searchOpenverse(body.topic, exclude)) ||
      (await searchWikimedia(body.topic, exclude));

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
