import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import ArticleCard from "@/components/ArticleCard";
import HeroSection from "@/components/HeroSection";
import IntroSection from "@/components/IntroSection";
import SEOHead, { buildWebsiteJsonLd, buildOrganizationJsonLd, buildItemListJsonLd } from "@/components/SEOHead";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import NewsletterForm from "@/components/NewsletterForm";
import { useSiteSection } from "@/hooks/useSiteSections";
import { useArticlesPaginated, type ArticleSort } from "@/hooks/useArticlesPaginated";
import { useActiveProducts } from "@/hooks/useProducts";
import { ArrowUpRight, BookOpen, Loader2, Sparkles, Clock, Inbox, RefreshCw } from "lucide-react";
import PageBackground from "@/components/PageBackground";
import { Link, useSearchParams } from "react-router-dom";

const Index = () => {
  const { data: newsletterSection } = useSiteSection('newsletter');
  const { data: footerSection } = useSiteSection('footer');
  const { data: products, isLoading: productsLoading } = useActiveProducts();

  const [searchParams, setSearchParams] = useSearchParams();
  const sortParam = searchParams.get('sort');
  const sort: ArticleSort = sortParam === 'latest' ? 'latest' : 'featured';
  const setSort = (next: ArticleSort) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'featured') params.delete('sort');
    else params.set('sort', next);
    setSearchParams(params, { replace: false });
  };

  const {
    data,
    isLoading: articlesLoading,
    isError: articlesError,
    error: articlesErrorObj,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchArticles,
  } = useArticlesPaginated(sort);

  const articles = useMemo(
    () => (data?.pages.flatMap((p) => p.items) || []).map((article) => ({
      id: article.slug,
      title: article.title,
      excerpt: article.excerpt || '',
      image: article.featured_image || 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&q=80',
      category: article.category,
      author: article.author_name || 'Anonymous',
      date: new Date(article.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      readTime: article.read_time || '5 min read',
    })),
    [data]
  );

  const total = data?.pages[0]?.total ?? 0;
  const hasArticles = articles.length > 0;

  // Announce loading + appended count for screen readers when paginating
  const [loadMoreAnnouncement, setLoadMoreAnnouncement] = useState('');
  const prevCountRef = useRef(articles.length);
  const wasFetchingRef = useRef(false);
  useEffect(() => {
    if (isFetchingNextPage && !wasFetchingRef.current) {
      setLoadMoreAnnouncement('Loading more articles…');
    } else if (!isFetchingNextPage && wasFetchingRef.current) {
      const added = articles.length - prevCountRef.current;
      if (added > 0) {
        setLoadMoreAnnouncement(`Loaded ${added} more article${added === 1 ? '' : 's'}. Showing ${articles.length} of ${total || articles.length}.`);
      }
    }
    wasFetchingRef.current = isFetchingNextPage;
    if (!isFetchingNextPage) prevCountRef.current = articles.length;
  }, [isFetchingNextPage, articles.length, total]);

  const handleLoadMore = () => {
    prevCountRef.current = articles.length;
    fetchNextPage();
  };

  const newsletterContent = newsletterSection?.content as { heading?: string; description?: string; button_text?: string } | null;
  const footerContent = footerSection?.content as { copyright?: string; brand_description?: string; newsletter_placeholder?: string } | null;

  return (
    <div className="min-h-screen bg-background animate-fade-in relative">
      <PageBackground />
      <SEOHead
        canonical="/"
        keywords="wellness, travel, creativity, personal growth, articles, ebooks, inspiration, lifestyle"
        jsonLd={[
          buildWebsiteJsonLd(),
          buildOrganizationJsonLd(),
          ...(articles.length > 0
            ? [buildItemListJsonLd(
                "Featured Articles",
                articles.slice(0, 10).map((a, i) => ({
                  name: a.title,
                  url: `/blog/${a.id}`,
                  image: a.image,
                  position: i + 1,
                }))
              )]
            : []),
        ]}
      />
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <HeroSection />
        <IntroSection />

        <section id="articles" className="py-12" aria-label="Featured Articles" aria-busy={articlesLoading}>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12 animate-slide-up">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.3em] text-accent">
                <span className="w-6 h-px bg-accent" /> 01 / Articles
              </span>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                {sort === 'featured' ? <>Featured <span className="text-gradient">Articles</span></> : <>Latest <span className="text-gradient">Articles</span></>}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {/* Sort toggle */}
              <div
                role="tablist"
                aria-label="Sort articles"
                className="inline-flex items-center p-1 rounded-full border border-border/60 bg-card/60 backdrop-blur-sm"
              >
                <button
                  role="tab"
                  aria-selected={sort === 'featured'}
                  onClick={() => setSort('featured')}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    sort === 'featured'
                      ? 'bg-foreground text-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Featured
                </button>
                <button
                  role="tab"
                  aria-selected={sort === 'latest'}
                  onClick={() => setSort('latest')}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    sort === 'latest'
                      ? 'bg-foreground text-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Latest
                </button>
              </div>

              <Link to="/articles" className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-accent transition-colors px-4 py-2 rounded-full border border-border/60 hover:border-accent/60">
                View all →
              </Link>
            </div>
          </div>

          {/* Loading state */}
          {articlesLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" aria-live="polite" aria-busy="true">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-[4/3] rounded-[2rem] bg-muted animate-pulse" />
              ))}
              <span className="sr-only">Loading articles…</span>
            </div>
          )}

          {/* Error state */}
          {!articlesLoading && articlesError && (
            <div
              role="alert"
              className="rounded-[2rem] border border-destructive/30 bg-destructive/5 p-10 text-center flex flex-col items-center gap-4"
            >
              <div>
                <p className="text-base font-semibold text-destructive">Couldn't load articles</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {(articlesErrorObj as Error)?.message || 'Please try again in a moment.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => refetchArticles()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-destructive/40 bg-background hover:bg-destructive/10 text-sm font-semibold transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!articlesLoading && !articlesError && !hasArticles && (
            <div
              role="status"
              className="rounded-[2rem] border border-dashed border-border bg-card/40 p-12 text-center flex flex-col items-center gap-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <Inbox className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-semibold">No articles published yet</p>
                <p className="text-sm text-muted-foreground max-w-md">
                  Check back soon — new stories are on the way.
                </p>
              </div>
            </div>
          )}

          {/* Articles grid */}
          {!articlesLoading && hasArticles && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {articles.map((article, index) => (
                  <div key={article.id} className={`animate-slide-up stagger-${Math.min((index % 6) + 1, 6)}`}>
                    <ArticleCard {...article} size="small" featured={sort === 'featured' && index === 0} />
                  </div>
                ))}
              </div>

              <div className="mt-12 flex flex-col items-center gap-3" aria-live="polite">
                {hasNextPage ? (
                  <button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    aria-label="Load more articles"
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border border-border bg-background hover:bg-muted/60 hover:border-accent/60 text-sm font-semibold transition-all disabled:opacity-60"
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading…
                      </>
                    ) : (
                      <>
                        Load more
                        {total > 0 && (
                          <span className="text-muted-foreground text-xs">
                            ({Math.max(total - articles.length, 0)} more)
                          </span>
                        )}
                      </>
                    )}
                  </button>
                ) : (
                  <p
                    role="status"
                    className="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground/70 inline-flex items-center gap-2"
                  >
                    <span className="w-6 h-px bg-border" />
                    You've reached the end
                    <span className="w-6 h-px bg-border" />
                  </p>
                )}
              </div>
            </>
          )}
        </section>

        {/* eBooks Section */}
        <section className="py-12" aria-label="eBooks">
          <div className="flex items-center justify-between mb-12 animate-slide-up">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.3em] text-accent">
                <span className="w-6 h-px bg-accent" /> 02 / Library
              </span>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-primary/10 flex items-center justify-center border border-accent/20">
                  <BookOpen className="w-5 h-5 text-accent" />
                </div>
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                  <span className="text-gradient">eBooks</span>
                </h2>
              </div>
            </div>
            <Link to="/travel" className="text-sm font-medium text-muted-foreground hover:text-accent transition-colors px-4 py-2 rounded-full border border-border/60 hover:border-accent/60">
              View all →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {productsLoading ? (
              [...Array(4)].map((_, i) => <ProductCardSkeleton key={i} />)
            ) : products?.slice(0, 4).map((product, index) => (
              <div key={product.id} className={`animate-slide-up stagger-${Math.min(index + 1, 6)}`}>
                <ProductCard
                  title={product.title}
                  description={product.description}
                  image={product.image}
                  price={product.price}
                  slug={product.slug}
                  author={product.author}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="my-20 relative rounded-[2.5rem] overflow-hidden p-12 md:p-16 text-center animate-scale-in border border-accent/20" aria-label="Newsletter">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-accent/10 via-card to-primary/5" />
          <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-accent/20 blur-3xl -z-10" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-primary/10 blur-3xl -z-10" />
          <div className="max-w-2xl mx-auto space-y-8 relative">
            <span className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.3em] text-accent">
              <span className="w-6 h-px bg-accent" /> Newsletter
            </span>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
              {newsletterContent?.heading || (<>Stay <span className="text-gradient">inspired.</span></>)}
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              {newsletterContent?.description || 'Subscribe to receive our latest articles and insights directly in your inbox.'}
            </p>
            <NewsletterForm buttonText={newsletterContent?.button_text || 'Subscribe'} />
          </div>
        </section>
      </main>

      <footer className="relative mt-16 bg-card border-t border-border overflow-hidden">
        {/* Decorative blurs */}
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-accent/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main footer content */}
          <div className="py-16 grid grid-cols-1 md:grid-cols-12 gap-12">
            {/* Brand column */}
            <div className="md:col-span-4 space-y-5">
              <Link to="/" className="inline-block text-2xl font-bold tracking-tight hover:text-primary transition-colors">
                Cyberom
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                {footerContent?.brand_description || 'Exploring ideas, finding inspiration. A space for wellness, creativity, travel, and personal growth.'}
              </p>
              {/* Newsletter mini */}
              <NewsletterForm variant="compact" placeholder={footerContent?.newsletter_placeholder || 'Your email'} />
            </div>

            {/* Nav columns */}
            <nav className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8" aria-label="Footer navigation">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 mb-4">Explore</h3>
                <ul className="space-y-3">
                  {[
                    { label: "Wellness", href: "/wellness" },
                    { label: "Travel", href: "/travel" },
                    { label: "Creativity", href: "/creativity" },
                    { label: "Growth", href: "/growth" },
                  ].map(link => (
                    <li key={link.href}>
                      <a href={link.href} className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {link.label}
                        <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-0.5 group-hover:opacity-100 group-hover:translate-y-0 transition-all" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 mb-4">About</h3>
                <ul className="space-y-3">
                  {[
                    { label: "Our Story", href: "/about" },
                    { label: "Authors", href: "/authors" },
                    { label: "Contact", href: "/contact" },
                  ].map(link => (
                    <li key={link.href}>
                      <a href={link.href} className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {link.label}
                        <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-0.5 group-hover:opacity-100 group-hover:translate-y-0 transition-all" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 mb-4">Connect</h3>
                <ul className="space-y-3">
                  {[
                    { label: "Newsletter", href: "/newsletter" },
                    { label: "Shop", href: "/travel" },
                    { label: "All Articles", href: "/articles" },
                  ].map(link => (
                    <li key={link.href}>
                      <a href={link.href} className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {link.label}
                        <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-0.5 group-hover:opacity-100 group-hover:translate-y-0 transition-all" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 mb-4">Legal</h3>
                <ul className="space-y-3">
                  {[
                    { label: "Privacy Policy", href: "/privacy" },
                    { label: "Terms of Service", href: "/terms" },
                  ].map(link => (
                    <li key={link.href}>
                      <a href={link.href} className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {link.label}
                        <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-0.5 group-hover:opacity-100 group-hover:translate-y-0 transition-all" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          </div>

          {/* Bottom bar */}
          <div className="py-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              {footerContent?.copyright || `© ${new Date().getFullYear()} Cyberom. All rights reserved.`}
            </p>
            <div className="flex items-center gap-4">
              <a href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
              <span className="text-muted-foreground/30">·</span>
              <a href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</a>
              <span className="text-muted-foreground/30">·</span>
              <a href="/contact" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
