import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import SEOHead from '@/components/SEOHead';
import { BlockRenderer } from '@/components/page-blocks/BlockRenderer';
import { PageBlock } from '@/components/admin/page-builder/types';
import { Loader2 } from 'lucide-react';

export default function DynamicPage() {
  const { slug } = useParams();

  const { data: page, isLoading, error } = useQuery({
    queryKey: ['dynamic-page', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

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

  if (error || !page) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
          <p className="text-muted-foreground">
            The page you're looking for doesn't exist.
          </p>
        </main>
      </div>
    );
  }

  const raw = page as any;
  const sections: PageBlock[] = Array.isArray(raw.sections) && raw.sections.length > 0 ? raw.sections : [];
  const hasBuilder = sections.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={page.meta_title || page.title}
        description={page.meta_description || `${page.title} - Cyberom`}
        canonical={`/page/${page.slug}`}
        ogImage={page.og_image || undefined}
      />
      <Header />

      {hasBuilder ? (
        <main>
          <BlockRenderer blocks={sections} />
        </main>
      ) : (
        <main className="max-w-4xl mx-auto px-4 py-12">
          <article>
            <h1 className="text-4xl md:text-5xl font-bold mb-8">{page.title}</h1>
            {page.content && (
              <div
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.content) }}
              />
            )}
          </article>
        </main>
      )}
    </div>
  );
}
