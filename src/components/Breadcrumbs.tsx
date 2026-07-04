import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { SITE_URL } from "@/components/SEOHead";

export interface Crumb {
  name: string;
  href: string;
}

interface BreadcrumbsProps {
  items: Crumb[];
  className?: string;
}

/**
 * Accessible breadcrumb nav with matching BreadcrumbList JSON-LD.
 * The last item is rendered as `aria-current="page"` and not linked.
 */
export default function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  if (!items?.length) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${SITE_URL}${c.href}`,
    })),
  };

  return (
    <>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <nav
        aria-label="Breadcrumb"
        className={`text-sm text-muted-foreground ${className}`}
      >
        <ol className="flex flex-wrap items-center gap-1.5">
          {items.map((crumb, i) => {
            const isLast = i === items.length - 1;
            return (
              <li key={crumb.href} className="inline-flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="w-3.5 h-3.5 opacity-60" aria-hidden />}
                {isLast ? (
                  <span
                    aria-current="page"
                    className="text-foreground font-medium truncate max-w-[240px]"
                  >
                    {crumb.name}
                  </span>
                ) : (
                  <Link
                    to={crumb.href}
                    className="inline-flex items-center gap-1 hover:text-accent transition-colors"
                  >
                    {i === 0 && <Home className="w-3.5 h-3.5" aria-hidden />}
                    {crumb.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
