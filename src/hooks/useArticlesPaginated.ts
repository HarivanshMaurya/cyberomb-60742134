import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Article } from './useArticles';

export type ArticleSort = 'latest' | 'featured';

export const ARTICLES_PAGE_SIZE = 6;

export function useArticlesPaginated(sort: ArticleSort = 'latest', pageSize = ARTICLES_PAGE_SIZE) {
  return useInfiniteQuery({
    queryKey: ['articles-paginated', sort, pageSize],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const from = (pageParam as number) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('articles')
        .select('*', { count: 'exact' })
        .eq('status', 'published');

      if (sort === 'featured') {
        // Featured-first: order by published_at desc as a proxy (DB has no featured flag).
        // First item on page 0 is treated as featured by the UI.
        query = query
          .order('published_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error, count } = await query.range(from, to);
      if (error) throw error;
      return {
        items: (data || []) as Article[],
        nextPage: (data?.length || 0) === pageSize ? (pageParam as number) + 1 : null,
        total: count ?? 0,
      };
    },
    getNextPageParam: (last) => last.nextPage,
  });
}
