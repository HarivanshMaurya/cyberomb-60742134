import { ArrowUpRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ArticleCardProps {
  id: string;
  title: string;
  category: string;
  date: string;
  image: string;
  excerpt?: string | null;
  tags?: string[] | null;
  size?: "small" | "large";
  featured?: boolean;
}

const ArticleCard = ({
  id,
  title,
  category,
  date,
  image,
  excerpt,
  tags,
  size = "small",
  featured = false,
}: ArticleCardProps) => {
  const getCategoryClass = (cat: string) => {
    const normalized = cat.toLowerCase();
    if (normalized.includes("financ")) return "tag-financing";
    if (normalized.includes("lifestyle")) return "tag-lifestyle";
    if (normalized.includes("community")) return "tag-community";
    if (normalized.includes("wellness")) return "tag-wellness";
    if (normalized.includes("travel")) return "tag-travel";
    if (normalized.includes("creativ")) return "tag-creativity";
    if (normalized.includes("growth")) return "tag-growth";
    return "tag-lifestyle";
  };

  // Tags are intentionally not rendered on the frontend — they are kept in
  // the data model / meta tags for SEO (article:tag, keywords) only.
  void tags;

  return (
    <Link
      to={`/blog/${id}`}
      aria-label={`Read article: ${title}`}
      className={cn(
        "group relative block rounded-[2rem] overflow-hidden bg-card border border-border/50",
        "transition-all duration-500 ease-out",
        "hover:-translate-y-1 hover:shadow-[0_24px_60px_-20px_hsl(var(--shadow-soft)/0.25)] hover:border-border",
        size === "large" ? "col-span-1 md:col-span-2" : ""
      )}
    >
      {/* Enforced 4:3 image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={image}
          alt={title}
          loading="lazy"
          width={800}
          height={600}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />

        {/* Subtle bottom gradient for legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />

        {/* Top badges */}
        <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-2">
          <span
            className={cn(
              "px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider backdrop-blur-md ring-1 ring-white/20",
              getCategoryClass(category)
            )}
          >
            {category}
          </span>
          {featured && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-accent text-accent-foreground text-[11px] font-semibold uppercase tracking-wider shadow-[0_4px_14px_hsl(var(--accent)/0.45)]">
              <Sparkles className="w-3 h-3" />
              Featured
            </span>
          )}
        </div>

        {/* Bottom title + date */}
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <div className="flex items-end justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-white/70 text-[11px] font-medium tracking-wider mb-1.5">
                {date}
              </p>
              <h3 className="text-white text-lg sm:text-xl md:text-2xl font-semibold leading-tight tracking-tight line-clamp-2">
                {title}
              </h3>
            </div>
            <div
              aria-hidden="true"
              className="flex-shrink-0 w-10 h-10 rounded-full bg-white/95 text-foreground flex items-center justify-center transition-transform duration-500 group-hover:rotate-45"
            >
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Body: excerpt only. Tags are omitted from the UI on purpose (SEO-only). */}
      {excerpt && (
        <div className="p-5 sm:p-6">
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {excerpt}
          </p>
        </div>
      )}
    </Link>
  );
};

export default ArticleCard;

