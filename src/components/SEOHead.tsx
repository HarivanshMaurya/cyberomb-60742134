import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogType?: "website" | "article";
  ogImage?: string;
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    category?: string;
    tags?: string[];
  };
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noindex?: boolean;
  keywords?: string;
}

const SITE_NAME = "Cyberom";
const SITE_URL = "https://cyberom.in";
const DEFAULT_DESCRIPTION =
  "A space for exploring ideas, finding inspiration, and discovering new ways of seeing the world through lifestyle, wellness, travel, and personal growth.";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

export default function SEOHead({
  title,
  description = DEFAULT_DESCRIPTION,
  canonical,
  ogType = "website",
  ogImage,
  article,
  jsonLd,
  noindex = false,
  keywords,
}: SEOHeadProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} – Exploring Ideas, Finding Inspiration`;
  const resolvedImage = ogImage || DEFAULT_OG_IMAGE;
  const resolvedCanonical = canonical ? `${SITE_URL}${canonical}` : undefined;

  // Support array of JSON-LD objects
  const jsonLdArray = jsonLd
    ? Array.isArray(jsonLd) ? jsonLd : [jsonLd]
    : [];

  return (
    <Helmet>
      {/* Basic */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      {noindex ? (
        <meta name="robots" content="noindex,nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}
      {resolvedCanonical && <link rel="canonical" href={resolvedCanonical} />}

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={resolvedImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title || SITE_NAME} />
      <meta property="og:locale" content="en_US" />
      {resolvedCanonical && <meta property="og:url" content={resolvedCanonical} />}

      {/* Article-specific OG */}
      {article?.publishedTime && (
        <meta property="article:published_time" content={article.publishedTime} />
      )}
      {article?.modifiedTime && (
        <meta property="article:modified_time" content={article.modifiedTime} />
      )}
      {article?.author && <meta property="article:author" content={article.author} />}
      {article?.category && <meta property="article:section" content={article.category} />}
      {article?.tags?.map((tag) => (
        <meta key={tag} property="article:tag" content={tag} />
      ))}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={resolvedImage} />
      <meta name="twitter:image:alt" content={title || SITE_NAME} />

      {/* JSON-LD */}
      {jsonLdArray.map((ld, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(ld)}</script>
      ))}
    </Helmet>
  );
}

/** Helpers to build common JSON-LD schemas */

export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/favicon.png`,
      },
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/articles?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.png`,
    description: DEFAULT_DESCRIPTION,
    sameAs: [],
  };
}

export function buildArticleJsonLd(article: {
  title: string;
  description?: string;
  image?: string;
  slug: string;
  publishedAt?: string;
  updatedAt?: string;
  authorName?: string;
  category?: string;
  readTime?: string;
  tags?: string[];
}) {
  const cleanTags = (article.tags || []).map((t) => t?.trim()).filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description || "",
    image: article.image || DEFAULT_OG_IMAGE,
    url: `${SITE_URL}/blog/${article.slug}`,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    author: {
      "@type": "Person",
      name: article.authorName || SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/favicon.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/blog/${article.slug}`,
    },
    ...(article.category && { articleSection: article.category }),
    ...(article.readTime && { timeRequired: `PT${parseInt(article.readTime) || 5}M` }),
    // Emit taxonomy consistently so search engines still receive tags even
    // when the frontend hides tag pills. Schema.org "keywords" accepts a
    // comma-separated string OR a string array — we ship both a joined
    // string and a `about[]` list for maximum crawler compatibility.
    ...(cleanTags.length > 0 && {
      keywords: cleanTags.join(", "),
      about: cleanTags.map((name) => ({ "@type": "Thing", name })),
    }),
  };
}

export function buildBreadcrumbJsonLd(
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };
}

export function buildItemListJsonLd(
  name: string,
  items: { name: string; url: string; image?: string; position: number }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item) => ({
      "@type": "ListItem",
      position: item.position,
      url: `${SITE_URL}${item.url}`,
      name: item.name,
      ...(item.image && { image: item.image }),
    })),
  };
}

export function buildProductJsonLd(product: {
  title: string;
  description?: string;
  image?: string;
  price: number;
  slug: string;
  author?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Book",
    name: product.title,
    description: product.description || "",
    image: product.image || DEFAULT_OG_IMAGE,
    url: `${SITE_URL}/product/${product.slug}`,
    author: {
      "@type": "Person",
      name: product.author || SITE_NAME,
    },
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/product/${product.slug}`,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
    },
  };
}

export function buildCollectionPageJsonLd(
  name: string,
  description: string,
  url: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: `${SITE_URL}${url}`,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

export { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE };
