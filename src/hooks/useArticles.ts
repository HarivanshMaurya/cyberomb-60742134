 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from '@/hooks/use-toast';
 
 export interface Article {
   id: string;
   title: string;
   slug: string;
   excerpt: string | null;
   content: string | null;
   featured_image: string | null;
   category: string;
   author_id: string | null;
   author_name: string | null;
   status: 'draft' | 'published' | 'archived' | 'scheduled';
   read_time: string | null;
   meta_title: string | null;
   meta_description: string | null;
   og_image: string | null;
   tags: string[] | null;
   published_at: string | null;
   created_at: string;
   updated_at: string;
 }
 
 export function useArticles(status?: string) {
   return useQuery({
     queryKey: ['articles', status],
     queryFn: async () => {
       let query = supabase.from('articles').select('*').order('created_at', { ascending: false });
       
       if (status) {
         query = query.eq('status', status);
       }
 
       const { data, error } = await query;
       if (error) throw error;
       return data as Article[];
     },
   });
 }
 
 export function useArticle(id: string) {
   return useQuery({
     queryKey: ['article', id],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('articles')
         .select('*')
         .eq('id', id)
         .maybeSingle();
 
       if (error) throw error;
       return data as Article | null;
     },
     enabled: !!id,
   });
 }
 
 export function useCreateArticle() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async (article: { title: string; slug: string; category?: string; excerpt?: string; content?: string; featured_image?: string; author_name?: string; status?: string; read_time?: string; meta_title?: string; meta_description?: string; og_image?: string }) => {
       const { data, error } = await supabase
         .from('articles')
         .insert([article])
         .select()
         .single();
 
       if (error) throw error;
       return data as Article;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['articles'] });
       toast({
         title: 'Article Created',
         description: 'Your article has been created successfully.',
       });
     },
     onError: (error) => {
       toast({
         title: 'Error',
         description: error.message,
         variant: 'destructive',
       });
     },
   });
 }
 
 export function useUpdateArticle() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async (updates: Partial<Article> & { id: string }) => {
       const { id, ...data } = updates;
       const { error } = await supabase
         .from('articles')
         .update(data)
         .eq('id', id);
 
       if (error) throw error;
     },
     onSuccess: (_, variables) => {
       queryClient.invalidateQueries({ queryKey: ['articles'] });
       queryClient.invalidateQueries({ queryKey: ['article', variables.id] });
       toast({
         title: 'Article Updated',
         description: 'Your article has been saved successfully.',
       });
     },
     onError: (error) => {
       toast({
         title: 'Error',
         description: error.message,
         variant: 'destructive',
       });
     },
   });
 }
 
 export function useDeleteArticle() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async (id: string) => {
       const { error } = await supabase.from('articles').delete().eq('id', id);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['articles'] });
       toast({
         title: 'Article Deleted',
         description: 'The article has been deleted.',
       });
     },
     onError: (error) => {
       toast({
         title: 'Error',
         description: error.message,
         variant: 'destructive',
       });
     },
   });
 }