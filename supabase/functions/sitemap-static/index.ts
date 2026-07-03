const SITE_URL = "https://cyberom.in";
const STATIC = [
  { loc: "/", priority: "1.0", changefreq: "daily" },
  { loc: "/articles", priority: "0.9", changefreq: "daily" },
  { loc: "/wellness", priority: "0.8", changefreq: "daily" },
  { loc: "/travel", priority: "0.8", changefreq: "weekly" },
  { loc: "/creativity", priority: "0.8", changefreq: "weekly" },
  { loc: "/growth", priority: "0.8", changefreq: "weekly" },
  { loc: "/about", priority: "0.6", changefreq: "monthly" },
  { loc: "/authors", priority: "0.6", changefreq: "monthly" },
  { loc: "/contact", priority: "0.5", changefreq: "monthly" },
  { loc: "/newsletter", priority: "0.5", changefreq: "monthly" },
  { loc: "/privacy", priority: "0.3", changefreq: "yearly" },
  { loc: "/terms", priority: "0.3", changefreq: "yearly" },
];

Deno.serve(() => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${STATIC.map((p) => `  <url><loc>${SITE_URL}${p.loc}</loc><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`).join("\n")}
</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
});
