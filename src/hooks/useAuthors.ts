import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Author {
  id: string;
  name: string;
  role: string | null;
  bio: string | null;
  image: string | null;
  email: string | null;
  twitter: string | null;
  instagram: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useAuthors() {
  return useQuery({
    queryKey: ['authors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('authors')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Author[];
    },
  });
}

export function useActiveAuthors() {
  return useQuery({
    queryKey: ['authors', 'active'],
    queryFn: async () => {
      // Public view excludes sensitive fields like email
      const { data, error } = await (supabase as any)
        .from('public_authors')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Author[];
    },
  });
}

export function useCreateAuthor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (author: Omit<Author, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('authors').insert(author).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['authors'] });
      toast.success('Author created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateAuthor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: Partial<Author> & { id: string }) => {
      const { error } = await supabase.from('authors').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['authors'] });
      toast.success('Author updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteAuthor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('authors').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['authors'] });
      toast.success('Author deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
