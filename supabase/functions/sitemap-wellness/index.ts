import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const SITE_URL = "https://cyberom.in";

Deno.serve(async () => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data } = await supabase.from("wellness_articles").select("slug, updated_at").eq("status", "published");
  const rows = data || [];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows.map((a: any) => `  <url><loc>${SITE_URL}/wellness/${a.slug}</loc><lastmod>${new Date(a.updated_at).toISOString()}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`).join("\n")}
</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=1800" } });
});
