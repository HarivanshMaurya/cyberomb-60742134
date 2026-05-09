import Header from "@/components/Header";
import ArticleCard from "@/components/ArticleCard";
import HeroSection from "@/components/HeroSection";
import IntroSection from "@/components/IntroSection";
import SEOHead, { buildWebsiteJsonLd, buildOrganizationJsonLd, buildItemListJsonLd } from "@/components/SEOHead";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import NewsletterForm from "@/components/NewsletterForm";
import { useSiteSection } from "@/hooks/useSiteSections";
import { useArticles } from "@/hooks/useArticles";
import { useActiveProducts } from "@/hooks/useProducts";
import { articles as staticArticles } from "@/data/articles";
import { ArrowUpRight, BookOpen } from "lucide-react";
import PageBackground from "@/components/PageBackground";
import { Link } from "react-router-dom";

const Index = () => {
  const { data: dbArticles } = useArticles('published');
  const { data: newsletterSection } = useSiteSection('newsletter');
  const { data: footerSection } = useSiteSection('footer');
  const { data: products, isLoading: productsLoading } = useActiveProducts();

  const featuredArticles = dbArticles?.length
    ? dbArticles.slice(0, 6).map((article) => ({
        id: article.slug,
        title: article.title,
        excerpt: article.excerpt || '',
        image: article.featured_image || 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&q=80',
        category: article.category,
        author: article.author_name || 'Anonymous',
        date: new Date(article.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        readTime: article.read_time || '5 min read',
      }))
    : staticArticles.slice(0, 6);

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
          ...(featuredArticles.length > 0
            ? [buildItemListJsonLd(
                "Featured Articles",
                featuredArticles.map((a, i) => ({
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

        <section id="articles" className="py-12" aria-label="Featured Articles">
          <div className="flex items-center justify-between mb-12 animate-slide-up">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.3em] text-accent">
                <span className="w-6 h-px bg-accent" /> 01 / Articles
              </span>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                Featured <span className="text-gradient">Articles</span>
              </h2>
            </div>
            <Link to="/articles" className="text-sm font-medium text-muted-foreground hover:text-accent transition-colors px-4 py-2 rounded-full border border-border/60 hover:border-accent/60">
              View all →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredArticles.map((article, index) => (
              <div key={article.id} className={`animate-slide-up stagger-${Math.min(index + 1, 6)}`}>
                <ArticleCard {...article} size="small" />
              </div>
            ))}
          </div>
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
            <form onSubmit={(e) => { e.preventDefault(); handleSubscribe(newsletterEmail, setNewsletterEmail, setIsSubscribing); }} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input type="email" placeholder="Your email" aria-label="Email address for newsletter" value={newsletterEmail} onChange={e => setNewsletterEmail(e.target.value)} className="flex-1 px-6 py-4 rounded-full border border-border bg-background/80 backdrop-blur focus:outline-none focus:ring-2 focus:ring-accent transition-all" />
              <button type="submit" disabled={isSubscribing} className="px-10 py-4 rounded-full bg-accent text-accent-foreground font-semibold hover:scale-105 transition-all disabled:opacity-50 shadow-[0_10px_40px_-10px_hsl(var(--accent)/0.6)]">
                {isSubscribing ? 'Subscribing...' : (newsletterContent?.button_text || 'Subscribe')}
              </button>
            </form>
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
              <form onSubmit={(e) => { e.preventDefault(); handleSubscribe(footerEmail, setFooterEmail, setIsFooterSubscribing); }} className="flex gap-2 max-w-xs">
                 <input
                   type="email"
                   placeholder={footerContent?.newsletter_placeholder || "Your email"}
                   aria-label="Email address for footer newsletter"
                   value={footerEmail}
                   onChange={e => setFooterEmail(e.target.value)}
                   className="flex-1 px-4 py-2.5 rounded-full border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                 />
                 <button type="submit" disabled={isFooterSubscribing} aria-label="Subscribe to newsletter" className="px-4 py-2.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50">
                   <Mail className="w-4 h-4" />
                 </button>
              </form>
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
