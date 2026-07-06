import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useArticle, useCreateArticle, useUpdateArticle } from '@/hooks/useArticles';
import { useCategories } from '@/hooks/useCategories';
import { useActiveAuthors } from '@/hooks/useAuthors';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Save, ArrowLeft, Eye, CalendarIcon, Clock, Timer } from 'lucide-react';
import { format, isFuture, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
 
export default function ArticleEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = id === 'new';

  const { data: article, isLoading } = useArticle(id || '');
  const createArticle = useCreateArticle();
  const updateArticle = useUpdateArticle();
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories();
  const { data: authorsData } = useActiveAuthors();

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    featured_image: '',
    category: 'uncategorized',
    author_name: '',
    status: 'draft' as 'draft' | 'published' | 'archived' | 'scheduled',
    read_time: '5 min read',
    meta_title: '',
    meta_description: '',
    og_image: '',
  });
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState('09:00');

  const categoryOptions = (() => {
    const opts = new Map<string, string>();
    opts.set('uncategorized', 'Uncategorized');
    (categoriesData || []).forEach((c) => opts.set(c.slug, c.name));

    // If the current value is something legacy, keep it selectable
    const current = formData.category;
    if (current && !opts.has(current)) opts.set(current, current);

    return Array.from(opts.entries()).map(([value, label]) => ({ value, label }));
  })();
 
   useEffect(() => {
     if (article && !isNew) {
        setFormData({
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt || '',
          content: article.content || '',
          featured_image: article.featured_image || '',
          category: article.category,
          author_name: article.author_name || '',
          status: article.status as 'draft' | 'published' | 'archived' | 'scheduled',
          read_time: article.read_time || '5 min read',
          meta_title: article.meta_title || '',
          meta_description: article.meta_description || '',
          og_image: article.og_image || '',
        });
        // Load scheduled date if status is scheduled
        if (article.status === 'scheduled' && article.published_at) {
          const d = new Date(article.published_at);
          setScheduledDate(d);
          setScheduledTime(format(d, 'HH:mm'));
        }
      }
   }, [article, isNew]);
 
   const generateSlug = (title: string) => {
     return title
       .toLowerCase()
       .replace(/[^a-z0-9]+/g, '-')
       .replace(/(^-|-$)/g, '');
   };
 
   const handleTitleChange = (title: string) => {
     setFormData({
       ...formData,
       title,
       slug: isNew ? generateSlug(title) : formData.slug,
     });
   };
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
 
      let publishedAt: string | null = null;
      if (formData.status === 'published') {
        publishedAt = new Date().toISOString();
      } else if (formData.status === 'scheduled' && scheduledDate) {
        const [hours, minutes] = scheduledTime.split(':').map(Number);
        const scheduled = new Date(scheduledDate);
        scheduled.setHours(hours, minutes, 0, 0);
        publishedAt = scheduled.toISOString();
      }

      const articleData = {
        ...formData,
        published_at: publishedAt,
      };
 
     if (isNew) {
       createArticle.mutate(articleData, {
         onSuccess: (data) => {
           navigate(`/admin/articles/${data.id}`);
         },
       });
     } else {
       updateArticle.mutate({ id: id!, ...articleData });
     }
   };
 
   if (isLoading && !isNew) {
     return (
       <div className="flex items-center justify-center h-64">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
       </div>
     );
   }
 
   return (
     <div className="space-y-6">
       <div className="flex items-center justify-between">
         <div className="flex items-center gap-4">
           <Button variant="ghost" size="icon" onClick={() => navigate('/admin/articles')}>
             <ArrowLeft className="h-5 w-5" />
           </Button>
           <div>
             <h1 className="text-3xl font-bold">
               {isNew ? 'New Article' : 'Edit Article'}
             </h1>
             <p className="text-muted-foreground mt-1">
               {isNew ? 'Create a new blog post' : 'Edit your blog post'}
             </p>
           </div>
         </div>
          {!isNew && article?.status === 'published' && (
            <Button variant="outline" asChild>
              <a href={`/blog/${article.slug}`} target="_blank" rel="noopener noreferrer">
                <Eye className="mr-2 h-4 w-4" />
                View Live
              </a>
            </Button>
          )}
       </div>
 
       <form onSubmit={handleSubmit}>
         <Tabs defaultValue="content" className="space-y-6">
           <TabsList>
             <TabsTrigger value="content">Content</TabsTrigger>
             <TabsTrigger value="seo">SEO</TabsTrigger>
           </TabsList>
 
           <TabsContent value="content" className="space-y-6">
             <div className="grid lg:grid-cols-3 gap-6">
               {/* Main Content */}
               <div className="lg:col-span-2 space-y-6">
                 <Card>
                   <CardContent className="pt-6 space-y-4">
                     <div className="space-y-2">
                       <Label htmlFor="title">Title</Label>
                       <Input
                         id="title"
                         value={formData.title}
                         onChange={(e) => handleTitleChange(e.target.value)}
                         placeholder="Enter article title"
                         required
                       />
                     </div>
 
                     <div className="space-y-2">
                       <Label htmlFor="slug">Slug</Label>
                       <Input
                         id="slug"
                         value={formData.slug}
                         onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                         placeholder="article-url-slug"
                         required
                       />
                     </div>
 
                     <div className="space-y-2">
                       <Label htmlFor="excerpt">Excerpt</Label>
                       <Textarea
                         id="excerpt"
                         value={formData.excerpt}
                         onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                         placeholder="Brief description of the article"
                         rows={3}
                       />
                     </div>
                   </CardContent>
                 </Card>
 
                 <Card>
                   <CardHeader>
                     <CardTitle>Content</CardTitle>
                   </CardHeader>
                   <CardContent>
                     <RichTextEditor
                       content={formData.content}
                       onChange={(content) => setFormData({ ...formData, content })}
                       placeholder="Write your article content here..."
                     />
                   </CardContent>
                 </Card>
               </div>
 
               {/* Sidebar */}
               <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Timer className="h-4 w-4 text-primary" />
                        Publish
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={formData.status}
                          onValueChange={(value: 'draft' | 'published' | 'archived' | 'scheduled') => {
                            setFormData({ ...formData, status: value });
                            if (value === 'scheduled' && !scheduledDate) {
                              const tomorrow = new Date();
                              tomorrow.setDate(tomorrow.getDate() + 1);
                              setScheduledDate(tomorrow);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">📝 Draft</SelectItem>
                            <SelectItem value="published">✅ Published</SelectItem>
                            <SelectItem value="scheduled">📅 Scheduled</SelectItem>
                            <SelectItem value="archived">📦 Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Schedule Date/Time Picker */}
                      {formData.status === 'scheduled' && (
                        <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-primary">
                            <CalendarIcon className="h-4 w-4" />
                            Schedule Publication
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Date</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !scheduledDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {scheduledDate ? format(scheduledDate, 'PPP') : 'Pick a date'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={scheduledDate}
                                  onSelect={setScheduledDate}
                                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                  initialFocus
                                  className={cn("p-3 pointer-events-auto")}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Time</Label>
                            <div className="relative">
                              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="time"
                                value={scheduledTime}
                                onChange={(e) => setScheduledTime(e.target.value)}
                                className="pl-10"
                              />
                            </div>
                          </div>

                          {scheduledDate && (
                            <div className="text-xs text-muted-foreground bg-background rounded-md p-2 border">
                              Will publish on{' '}
                              <span className="font-semibold text-foreground">
                                {format(scheduledDate, 'MMM dd, yyyy')} at {scheduledTime}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
  
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={createArticle.isPending || updateArticle.isPending || (formData.status === 'scheduled' && !scheduledDate)}
                      >
                        {createArticle.isPending || updateArticle.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : formData.status === 'scheduled' ? (
                          <>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            Schedule Article
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            {isNew ? 'Create Article' : 'Save Changes'}
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
 
                 <Card>
                   <CardHeader>
                     <CardTitle>Details</CardTitle>
                   </CardHeader>
                   <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={categoriesLoading ? 'Loading categories…' : 'Select category'} />
                        </SelectTrigger>
                        <SelectContent>
                          {categoryOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
 
                      <div className="space-y-2">
                        <Label>Author Name</Label>
                        <Select
                          value={formData.author_name}
                          onValueChange={(value) => setFormData({ ...formData, author_name: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select author" />
                          </SelectTrigger>
                          <SelectContent>
                            {(authorsData || []).map((a) => (
                              <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
 
                     <div className="space-y-2">
                       <Label htmlFor="read_time">Read Time</Label>
                       <Input
                         id="read_time"
                         value={formData.read_time}
                         onChange={(e) => setFormData({ ...formData, read_time: e.target.value })}
                         placeholder="5 min read"
                       />
                     </div>
                   </CardContent>
                 </Card>
 
                 <Card>
                   <CardHeader>
                     <CardTitle>Featured Image</CardTitle>
                   </CardHeader>
                   <CardContent className="space-y-4">
                     <div className="space-y-2">
                       <Label htmlFor="featured_image">Image URL</Label>
                       <Input
                         id="featured_image"
                         value={formData.featured_image}
                         onChange={(e) => setFormData({ ...formData, featured_image: e.target.value })}
                         placeholder="https://example.com/image.jpg"
                       />
                     </div>
                     {formData.featured_image && (
                       <div className="rounded-lg overflow-hidden border border-border">
                         <img
                           src={formData.featured_image}
                           alt="Featured"
                           className="w-full h-40 object-cover"
                         />
                       </div>
                     )}
                   </CardContent>
                 </Card>
               </div>
             </div>
           </TabsContent>
 
           <TabsContent value="seo" className="space-y-6">
             <Card>
               <CardHeader>
                 <CardTitle>SEO Settings</CardTitle>
               </CardHeader>
               <CardContent className="space-y-6">
                 {/* Google Preview */}
                 <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1">
                   <p className="text-xs text-muted-foreground font-medium mb-2">Google Search Preview</p>
                   <p className="text-[#1a0dab] text-lg leading-snug font-medium truncate">
                     {formData.meta_title || formData.title || 'Article Title'} | Cyberom
                   </p>
                   <p className="text-[#006621] text-sm truncate">
                     cyberom.in/blog/{formData.slug || 'article-slug'}
                   </p>
                   <p className="text-sm text-[#545454] line-clamp-2">
                     {formData.meta_description || formData.excerpt || 'Add a meta description to improve click-through rates from search results.'}
                   </p>
                 </div>

                 <div className="space-y-2">
                   <div className="flex items-center justify-between">
                     <Label htmlFor="meta_title">Meta Title</Label>
                     <Button
                       type="button"
                       variant="ghost"
                       size="sm"
                       className="text-xs h-7"
                       onClick={() => setFormData({ ...formData, meta_title: formData.title.slice(0, 60) })}
                     >
                       Auto-fill from title
                     </Button>
                   </div>
                   <Input
                     id="meta_title"
                     value={formData.meta_title}
                     onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                     placeholder="SEO title (defaults to article title)"
                     maxLength={60}
                   />
                   <p className={cn("text-xs", formData.meta_title.length > 55 ? "text-destructive" : "text-muted-foreground")}>
                     {formData.meta_title.length}/60 characters {formData.meta_title.length === 0 && '— will use article title'}
                   </p>
                 </div>
 
                 <div className="space-y-2">
                   <div className="flex items-center justify-between">
                     <Label htmlFor="meta_description">Meta Description</Label>
                     <Button
                       type="button"
                       variant="ghost"
                       size="sm"
                       className="text-xs h-7"
                       onClick={() => setFormData({ ...formData, meta_description: formData.excerpt.slice(0, 160) })}
                     >
                       Auto-fill from excerpt
                     </Button>
                   </div>
                   <Textarea
                     id="meta_description"
                     value={formData.meta_description}
                     onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                     placeholder="SEO description (recommended 120-160 chars)"
                     maxLength={160}
                     rows={3}
                   />
                   <p className={cn("text-xs", formData.meta_description.length > 155 ? "text-destructive" : formData.meta_description.length > 0 && formData.meta_description.length < 120 ? "text-yellow-600" : "text-muted-foreground")}>
                     {formData.meta_description.length}/160 characters
                     {formData.meta_description.length > 0 && formData.meta_description.length < 120 && ' — consider adding more for better SEO'}
                     {formData.meta_description.length === 0 && ' — will use article excerpt'}
                   </p>
                 </div>
 
                 <div className="space-y-2">
                   <div className="flex items-center justify-between">
                     <Label htmlFor="og_image">Open Graph Image URL</Label>
                     <Button
                       type="button"
                       variant="ghost"
                       size="sm"
                       className="text-xs h-7"
                       onClick={() => setFormData({ ...formData, og_image: formData.featured_image })}
                       disabled={!formData.featured_image}
                     >
                       Use featured image
                     </Button>
                   </div>
                   <Input
                     id="og_image"
                     value={formData.og_image}
                     onChange={(e) => setFormData({ ...formData, og_image: e.target.value })}
                     placeholder="https://example.com/og-image.jpg (1200×630 recommended)"
                   />
                   {formData.og_image && (
                     <div className="rounded-lg overflow-hidden border border-border">
                       <img src={formData.og_image} alt="OG Preview" className="w-full h-32 object-cover" />
                     </div>
                   )}
                   <p className="text-xs text-muted-foreground">
                     {formData.og_image ? 'Image set ✓' : 'Will use featured image or auto-generated OG image'}
                   </p>
                 </div>
               </CardContent>
             </Card>
           </TabsContent>
         </Tabs>
       </form>
     </div>
   );
 }