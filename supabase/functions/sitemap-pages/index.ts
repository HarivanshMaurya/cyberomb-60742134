import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const SITE_URL = "https://cyberom.in";

Deno.serve(async () => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const [{ data: pages }, { data: categories }] = await Promise.all([
    supabase.from("pages").select("slug, updated_at").eq("is_published", true),
    supabase.from("categories").select("slug, created_at"),
  ]);
  const rows: string[] = [];
  for (const p of pages || []) {
    rows.push(`  <url><loc>${SITE_URL}/page/${p.slug}</loc><lastmod>${new Date(p.updated_at).toISOString()}</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>`);
  }
  for (const c of categories || []) {
    rows.push(`  <url><loc>${SITE_URL}/category/${c.slug}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>`);
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows.join("\n")}
</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=1800" } });
});
