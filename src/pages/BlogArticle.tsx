import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { useState, useCallback } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import ArticleCard from "@/components/ArticleCard";
import ArticleHeader from "@/components/blog/ArticleHeader";
import CategorySidebar from "@/components/blog/CategorySidebar";
import ShareButtons from "@/components/blog/ShareButtons";
import LanguageToggle from "@/components/blog/LanguageToggle";
import SEOHead, { buildArticleJsonLd, buildBreadcrumbJsonLd } from "@/components/SEOHead";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const BlogArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const [translated, setTranslated] = useState<{ title: string; content: string; excerpt: string } | null>(null);
  const [isTranslatingContent, setIsTranslatingContent] = useState(false);
  
  const { data: article, isLoading, error } = useQuery({
    queryKey: ['article', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: author } = useQuery({
    queryKey: ['article-author', article?.author_id, article?.author_name],
    queryFn: async () => {
      let query = supabase.from('authors').select('*');
      if (article?.author_id) {
        query = query.eq('id', article.author_id);
      } else if (article?.author_name) {
        query = query.eq('name', article.author_name);
      } else {
        return null;
      }
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!(article?.author_id || article?.author_name),
  });

  const { data: relatedArticles } = useQuery({
    queryKey: ['related-articles', article?.category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('status', 'published')
        .eq('category', article?.category || '')
        .neq('slug', slug)
        .limit(3);
      if (error) throw error;
      return data;
    },
    enabled: !!article?.category,
  });

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

  const handleTranslated = useCallback((data: { title: string; content: string; excerpt: string }) => {
    setTranslated(data);
  }, []);

  const handleReset = useCallback(() => {
    setTranslated(null);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !article) {
    return <Navigate to="/404" replace />;
  }

  const formattedDate = article.published_at 
    ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : new Date(article.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const articleJsonLd = buildArticleJsonLd({
    title: article.title,
    description: article.meta_description || article.excerpt || undefined,
    image: article.og_image || article.featured_image || undefined,
    slug: article.slug,
    publishedAt: article.published_at || article.created_at,
    updatedAt: article.updated_at,
    authorName: article.author_name || undefined,
    category: article.category,
    readTime: article.read_time || undefined,
  });

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Articles", url: "/articles" },
    { name: article.title, url: `/blog/${article.slug}` },
  ]);

  const displayTitle = translated?.title || article.title;
  const displayContent = translated?.content || article.content;
  const displayExcerpt = translated?.excerpt || article.excerpt;

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <SEOHead
        title={article.meta_title || article.title}
        description={article.meta_description || article.excerpt || `Read ${article.title} on Cyberom.`}
        canonical={`/blog/${article.slug}`}
        ogType="article"
        ogImage={article.og_image || article.featured_image || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-image?slug=${article.slug}`}
        keywords={`${article.category}, ${article.title.split(' ').slice(0, 5).join(', ')}`}
        article={{
          publishedTime: article.published_at || article.created_at,
          modifiedTime: article.updated_at,
          author: article.author_name || undefined,
          category: article.category,
        }}
        jsonLd={[articleJsonLd, breadcrumbJsonLd]}
      />
      <Header />
      
      <main>
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" aria-label="Breadcrumb">
          <a href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to articles
          </a>
        </nav>

        {article.featured_image && (
          <div className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] mb-12">
            <img src={article.featured_image} alt={article.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          </div>
        )}

        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${article.featured_image ? '-mt-32 relative z-10' : 'pt-8'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <article className="lg:col-span-8">
              {/* Language Toggle */}
              <div className="mb-6 flex justify-end">
                <LanguageToggle
                  articleId={article.id}
                  title={article.title}
                  content={article.content || ""}
                  excerpt={article.excerpt}
                  onTranslated={handleTranslated}
                  onReset={handleReset}
                  onLoadingChange={setIsTranslatingContent}
                />
              </div>

              <ArticleHeader
                title={displayTitle}
                excerpt={displayExcerpt}
                category={article.category}
                authorName={article.author_name}
                authorImage={author?.image || null}
                authorId={author?.id || null}
                formattedDate={formattedDate}
                readTime={article.read_time}
                getCategoryClass={getCategoryClass}
              />

              {isTranslatingContent ? (
                <div className="space-y-4 mb-16 animate-pulse">
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-5/6" />
                  <div className="h-6 bg-muted rounded w-2/3 mt-6" />
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-4/5" />
                  <div className="h-6 bg-muted rounded w-1/2 mt-6" />
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <p className="text-sm text-muted-foreground text-center pt-4">Translating to Hindi… please wait</p>
                </div>
              ) : displayContent ? (
                <div 
                  className="article-content max-w-none mb-16 animate-slide-up stagger-2"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(displayContent) }}
                />
              ) : null}

              <ShareButtons title={article.title} variant="floating" />

              <aside className="mb-16 rounded-2xl bg-card p-8 md:p-12 text-center">
                <h3 className="text-2xl md:text-3xl font-bold mb-4">Enjoyed this article?</h3>
                <p className="text-muted-foreground mb-6">
                  Subscribe to receive more insights like this directly in your inbox.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                  <input type="email" placeholder="Your email" aria-label="Email address" className="flex-1 px-4 py-3 rounded-full border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8">
                    Subscribe
                  </Button>
                </div>
              </aside>
            </article>

            <aside className="lg:col-span-4">
              <CategorySidebar currentCategory={article.category} currentSlug={slug || ''} />
            </aside>
          </div>
        </div>

        {relatedArticles && relatedArticles.length > 0 && (
          <section className="bg-muted py-16 animate-fade-in" aria-label="Related articles">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl font-bold mb-8 animate-slide-up">You might also like</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedArticles.map((relatedArticle, index) => (
                  <div key={relatedArticle.id} className={`animate-slide-up stagger-${Math.min(index + 1, 3)}`}>
                    <ArticleCard
                      id={relatedArticle.slug}
                      title={relatedArticle.title}
                      category={relatedArticle.category}
                      date={new Date(relatedArticle.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      image={relatedArticle.featured_image || 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&q=80'}
                      size="small"
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default BlogArticle;
