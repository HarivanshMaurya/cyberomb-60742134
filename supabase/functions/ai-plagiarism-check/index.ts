// Plagiarism / similarity check: compares a candidate against published articles
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

function shingles(text: string, k = 5): Set<string> {
  const words = text.split(/\s+/).filter(Boolean);
  const set = new Set<string>();
  if (words.length < k) {
    if (words.length) set.add(words.join(' '));
    return set;
  }
  for (let i = 0; i <= words.length - k; i++) {
    set.add(words.slice(i, i + k).join(' '));
  }
  return set;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const v of a) if (b.has(v)) inter++;
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
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

    const { content, excludeId } = await req.json();
    if (!content || typeof content !== 'string') {
      return new Response(JSON.stringify({ error: 'content required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role for unrestricted read of published articles
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    let query = admin
      .from('articles')
      .select('id, title, slug, content, excerpt')
      .eq('status', 'published')
      .limit(200);
    if (excludeId) query = query.neq('id', excludeId);
    const { data: articles, error } = await query;
    if (error) throw error;

    const candidateText = stripHtml(content);
    const candidateShingles = shingles(candidateText);

    const matches = (articles || [])
      .map((a) => {
        const txt = stripHtml(`${a.title ?? ''} ${a.excerpt ?? ''} ${a.content ?? ''}`);
        const score = jaccard(candidateShingles, shingles(txt));
        return { id: a.id, title: a.title, slug: a.slug, similarity: score };
      })
      .filter((m) => m.similarity > 0.05)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    const topScore = matches[0]?.similarity ?? 0;
    let verdict: 'clean' | 'warn' | 'block';
    if (topScore >= 0.45) verdict = 'block';
    else if (topScore >= 0.20) verdict = 'warn';
    else verdict = 'clean';

    return new Response(
      JSON.stringify({ ok: true, verdict, topScore, matches, scanned: articles?.length ?? 0 }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
