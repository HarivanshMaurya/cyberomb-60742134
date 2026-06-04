import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { useParams } from 'react-router-dom';
import { useWellnessArticleBySlug } from '@/hooks/useWellnessArticles';
import Header from '@/components/Header';
import SEOHead, { buildArticleJsonLd, buildBreadcrumbJsonLd } from '@/components/SEOHead';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Clock, User } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function WellnessArticle() {
  const { slug } = useParams();
  const { data: article, isLoading } = useWellnessArticleBySlug(slug || '');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-12">
          <Skeleton className="h-10 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <Skeleton className="h-80 w-full rounded-2xl mb-8" />
          <Skeleton className="h-40 w-full" />
        </main>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold mb-4">Article Not Found</h1>
          <p className="text-muted-foreground mb-8">This wellness article doesn't exist or hasn't been published yet.</p>
          <Link to="/wellness" className="inline-flex items-center gap-2 text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to Wellness
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <SEOHead
        title={article.meta_title || article.title}
        description={article.meta_description || article.excerpt || `Read ${article.title} — wellness insights on Cyberom.`}
        canonical={`/wellness/${article.slug}`}
        ogType="article"
        ogImage={article.og_image || article.featured_image || undefined}
        keywords={`wellness, self-care, ${article.title.split(' ').slice(0, 4).join(', ')}`}
        article={{
          publishedTime: article.published_at || article.created_at,
          modifiedTime: article.updated_at,
          author: article.author_name || undefined,
          category: "Wellness",
        }}
        jsonLd={[
          buildArticleJsonLd({
            title: article.title,
            description: article.meta_description || article.excerpt || undefined,
            image: article.og_image || article.featured_image || undefined,
            slug: article.slug,
            publishedAt: article.published_at || article.created_at,
            updatedAt: article.updated_at,
            authorName: article.author_name || undefined,
            category: "Wellness",
            readTime: article.read_time || undefined,
          }),
          buildBreadcrumbJsonLd([
            { name: "Home", url: "/" },
            { name: "Wellness", url: "/wellness" },
            { name: article.title, url: `/wellness/${article.slug}` },
          ]),
        ]}
      />
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back link */}
        <Link to="/wellness" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to Wellness
        </Link>

        {/* Article Header */}
        <header className="mb-10">
          <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4">{article.title}</h1>
          {article.excerpt && (
            <p className="text-lg text-muted-foreground mb-6">{article.excerpt}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {article.author_name && (
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4" /> {article.author_name}
              </span>
            )}
            {article.read_time && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> {article.read_time}
              </span>
            )}
            {article.published_at && (
              <span>{new Date(article.published_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            )}
          </div>
        </header>

        {/* Featured Image */}
        {article.featured_image && (
          <div className="rounded-2xl overflow-hidden mb-10 border border-border">
            <img src={article.featured_image} alt={article.title} className="w-full h-auto object-cover" />
          </div>
        )}

        {/* Article Content */}
        <article
          className="prose prose-lg max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }}
        />
      </main>
    </div>
  );
}
