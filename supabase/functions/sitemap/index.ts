// Sitemap index — points at split sub-sitemaps (blog, wellness, tools, pages, static).
const SITE_URL = "https://cyberomb.lovable.app";
const FN_BASE = `${SITE_URL}/functions/v1`;

const CHILDREN = [
  "sitemap-static",
  "sitemap-blog",
  "sitemap-wellness",
  "sitemap-tools",
  "sitemap-pages",
  "sitemap-products",
];

Deno.serve(() => {
  const now = new Date().toISOString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${CHILDREN.map((c) => `  <sitemap><loc>${FN_BASE}/${c}</loc><lastmod>${now}</lastmod></sitemap>`).join("\n")}
</sitemapindex>`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
});
