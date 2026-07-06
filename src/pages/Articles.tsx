import Header from "@/components/Header";
import ArticleCard from "@/components/ArticleCard";
import SEOHead, { buildCollectionPageJsonLd, buildBreadcrumbJsonLd } from "@/components/SEOHead";
import { useArticles } from "@/hooks/useArticles";
import { useCategories } from "@/hooks/useCategories";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Newspaper, Search } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import PageBackground from "@/components/PageBackground";
import FloatingIcons from "@/components/FloatingIcons";
import { BookOpen, FileText, PenTool, MessageSquare, Bookmark, Rss } from "lucide-react";

const Articles = () => {
  const { data: articles, isLoading: articlesLoading } = useArticles('published');
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredArticles = articles?.filter(article => {
    const matchesCategory = selectedCategory
      ? article.category.toLowerCase() === selectedCategory.toLowerCase()
      : true;
    const matchesSearch = searchQuery
      ? article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (article.excerpt || '').toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesCategory && matchesSearch;
  });

  const isLoading = articlesLoading || categoriesLoading;

  return (
    <div className="min-h-screen bg-background relative">
      <PageBackground />
      <SEOHead
        title="All Articles"
        description="Explore our collection of articles covering wellness, travel, creativity, personal growth, and more. Find inspiration and insights."
        canonical="/articles"
        keywords="articles, blog, wellness, travel, creativity, personal growth, inspiration"
        jsonLd={[
          buildCollectionPageJsonLd("All Articles", "Explore our collection of articles covering wellness, travel, creativity, personal growth, and more.", "/articles"),
          buildBreadcrumbJsonLd([
            { name: "Home", url: "/" },
            { name: "Articles", url: "/articles" },
          ]),
        ]}
      />
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-accent/10 to-secondary/20 py-20 md:py-28">
        <div className="absolute top-10 right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 left-10 w-56 h-56 bg-accent/10 rounded-full blur-3xl" />
        <FloatingIcons icons={[
          { icon: BookOpen, top: '10%', left: '5%', size: 32, delay: '0s', duration: '14s', rotate: -15 },
          { icon: FileText, top: '15%', left: '88%', size: 28, delay: '2s', duration: '18s', rotate: 12 },
          { icon: PenTool, top: '60%', left: '8%', size: 24, delay: '1s', duration: '16s', rotate: -8 },
          { icon: MessageSquare, top: '55%', left: '90%', size: 26, delay: '3s', duration: '20s', rotate: 10 },
          { icon: Bookmark, top: '25%', left: '92%', size: 22, delay: '4s', duration: '15s', rotate: -20 },
          { icon: Rss, top: '70%', left: '15%', size: 20, delay: '5s', duration: '17s', rotate: 5 },
        ]} />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-slide-down">
            <Newspaper className="w-4 h-4" />
            Our Blog
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 animate-slide-down" style={{ animationDelay: '0.1s' }}>
            All Articles
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Explore our collection of articles covering wellness, travel, creativity, personal growth, and more.
          </p>

          {/* Search */}
          <div className="mt-8 max-w-md mx-auto animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles..."
                className="w-full pl-12 pr-4 py-3.5 rounded-full border border-border/60 bg-background/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Category Filter */}
        <nav className="mb-10 flex flex-wrap gap-2 justify-center" aria-label="Category filter">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "rounded-full transition-all",
              selectedCategory === null && "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categoriesLoading ? (
            <>{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 w-20 rounded-full" />)}</>
          ) : (
            categories?.map(category => (
              <Button
                key={category.id}
                variant="outline"
                size="sm"
                className={cn(
                  "rounded-full transition-all",
                  selectedCategory?.toLowerCase() === category.slug.toLowerCase() && "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
                onClick={() => setSelectedCategory(category.slug)}
              >
                {category.name}
              </Button>
            ))
          )}
        </nav>

        {/* Results count */}
        {!isLoading && filteredArticles && (
          <p className="text-sm text-muted-foreground mb-6">
            {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''} found
            {selectedCategory ? ` in ${selectedCategory}` : ''}
            {searchQuery ? ` for "${searchQuery}"` : ''}
          </p>
        )}

        {/* Grid — ArticleCard untouched */}
        {isLoading ? (
          <div className="flex items-center justify-center h-[40vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredArticles && filteredArticles.length > 0 ? (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" aria-label="Articles list">
            {filteredArticles.map((article, index) => (
              <div key={article.id} className={`animate-slide-up stagger-${Math.min(index + 1, 6)}`}>
                <ArticleCard
                  id={article.slug}
                  title={article.title}
                  category={article.category}
                  date={new Date(article.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  image={article.featured_image || 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&q=80'}
                  excerpt={article.excerpt}
                  tags={article.tags}
                  size="small"
                />
              </div>
            ))}
          </section>
        ) : (
          <div className="text-center py-20">
            <Newspaper className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-xl text-muted-foreground mb-2">
              No articles found{selectedCategory ? ` in ${selectedCategory}` : ''}{searchQuery ? ` for "${searchQuery}"` : ''}.
            </p>
            {(selectedCategory || searchQuery) && (
              <Button
                className="mt-4"
                onClick={() => { setSelectedCategory(null); setSearchQuery(""); }}
              >
                View all articles
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Articles;
