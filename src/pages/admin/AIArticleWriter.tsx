import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { toast } from '@/hooks/use-toast';
import {
  Sparkles, Wand2, RefreshCw, Search, SpellCheck, Save, Send,
  Loader2, Copy, FileText, Tag as TagIcon, Languages as LangIcon,
} from 'lucide-react';

type Tone = 'Professional' | 'Casual' | 'Technical' | 'Friendly';
type Language = 'English' | 'Hindi' | 'Hinglish';
type Length = 'short' | 'medium' | 'long';

interface GeneratedArticle {
  title: string;
  titleVariations?: string[];
  slug: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  summary?: string;
  tags?: string[];
  categorySuggestions?: string[];
  readTime?: string;
  content: string;
}

const slugify = (s: string) =>
  s.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);

export default function AIArticleWriter() {
  const navigate = useNavigate();

  // Form inputs
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [instruction, setInstruction] = useState('');
  const [tone, setTone] = useState<Tone>('Professional');
  const [language, setLanguage] = useState<Language>('English');
  const [length, setLength] = useState<Length>('medium');

  // Generation
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Result
  const [article, setArticle] = useState<GeneratedArticle | null>(null);
  const [activeTab, setActiveTab] = useState('input');
  const [saving, setSaving] = useState<'draft' | 'publish' | null>(null);

  // Auto-save draft to localStorage
  useEffect(() => {
    if (article) {
      localStorage.setItem('ai-writer-draft', JSON.stringify(article));
    }
  }, [article]);

  useEffect(() => {
    const saved = localStorage.getItem('ai-writer-draft');
    if (saved) {
      try { setArticle(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  const startProgress = () => {
    setProgress(8);
    progressTimer.current = setInterval(() => {
      setProgress((p) => (p < 90 ? p + Math.random() * 6 : p));
    }, 400);
  };
  const stopProgress = () => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    setProgress(100);
    setTimeout(() => setProgress(0), 600);
  };

  const callAI = async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('ai-write-article', { body: payload });
    if (error) throw new Error(error.message);
    if (!data?.ok) throw new Error(data?.error || 'Generation failed');
    return data.article as GeneratedArticle;
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({ title: 'Topic required', description: 'Please enter a topic or title.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    startProgress();
    try {
      const result = await callAI({
        topic, keywords, instruction, tone, language, length, mode: 'full',
      });
      setArticle(result);
      setActiveTab('edit');
      toast({ title: 'Article generated', description: 'Review, edit, and publish when ready.' });
    } catch (e) {
      toast({ title: 'Generation failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
      stopProgress();
    }
  };

  const handleAction = async (mode: 'rewrite' | 'improve_seo' | 'grammar') => {
    if (!article) return;
    setActionLoading(mode);
    startProgress();
    try {
      const result = await callAI({
        topic: article.title || topic, keywords, tone, language, length, mode,
        existingContent: article.content,
      });
      setArticle({ ...article, ...result });
      toast({ title: 'Updated', description: `Applied ${mode.replace('_', ' ')}.` });
    } catch (e) {
      toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
      stopProgress();
    }
  };

  const saveArticle = async (status: 'draft' | 'published') => {
    if (!article) return;
    setSaving(status === 'published' ? 'publish' : 'draft');
    try {
      const slug = article.slug?.trim() || slugify(article.title);
      const payload = {
        title: article.title,
        slug,
        excerpt: article.excerpt,
        content: article.content,
        category: article.categorySuggestions?.[0]?.toLowerCase() || 'uncategorized',
        status,
        read_time: article.readTime || '5 min read',
        meta_title: article.metaTitle,
        meta_description: article.metaDescription,
        published_at: status === 'published' ? new Date().toISOString() : null,
      };
      const { data, error } = await supabase.from('articles').insert(payload).select('id').single();
      if (error) throw error;
      toast({ title: status === 'published' ? 'Published!' : 'Draft saved' });
      localStorage.removeItem('ai-writer-draft');
      navigate(`/admin/articles/${data.id}`);
    } catch (e) {
      toast({ title: 'Save failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-accent/10 p-6 md:p-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/15 grid place-items-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">AI Article Writer</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Generate SEO-optimized, human-quality articles in seconds. Powered by Lovable AI.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Wand2 className="h-3 w-3" /> Gemini 2.5 Flash
          </Badge>
        </div>
        {(loading || actionLoading) && (
          <div className="mt-6 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {actionLoading ? `Running ${actionLoading.replace('_', ' ')}…` : 'Researching and writing your article…'}
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="input"><FileText className="h-4 w-4 mr-2" />Input</TabsTrigger>
          <TabsTrigger value="edit" disabled={!article}><Wand2 className="h-4 w-4 mr-2" />Editor</TabsTrigger>
        </TabsList>

        {/* INPUT */}
        <TabsContent value="input" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Article Brief</CardTitle>
              <CardDescription>Give the AI a topic; the more context, the better the output.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="topic">Topic or Title *</Label>
                <Input
                  id="topic" value={topic} onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. The Ultimate Guide to Cold Brew Coffee at Home"
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="keywords">Focus Keywords <span className="text-muted-foreground">(comma-separated, optional)</span></Label>
                <Input
                  id="keywords" value={keywords} onChange={(e) => setKeywords(e.target.value)}
                  placeholder="cold brew, slow extraction, coffee ratio"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Professional">Professional</SelectItem>
                      <SelectItem value="Casual">Casual</SelectItem>
                      <SelectItem value="Technical">Technical</SelectItem>
                      <SelectItem value="Friendly">Friendly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><LangIcon className="h-3 w-3" /> Language</Label>
                  <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Hindi">Hindi</SelectItem>
                      <SelectItem value="Hinglish">Hinglish</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Length</Label>
                  <Select value={length} onValueChange={(v) => setLength(v as Length)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short (500–700)</SelectItem>
                      <SelectItem value="medium">Medium (900–1300)</SelectItem>
                      <SelectItem value="long">Long (1600–2200)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inst">Extra Instructions <span className="text-muted-foreground">(optional)</span></Label>
                <Textarea
                  id="inst" value={instruction} onChange={(e) => setInstruction(e.target.value)}
                  placeholder="Audience, angle, must-include points, sources…"
                  rows={3}
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={loading}
                size="lg"
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:opacity-95 transition-all"
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</>
                  : <><Sparkles className="h-4 w-4 mr-2" />Generate Article</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EDIT */}
        <TabsContent value="edit" className="space-y-6">
          {article && (
            <>
              {/* Action toolbar */}
              <Card>
                <CardContent className="p-4 flex flex-wrap gap-2 items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" disabled={!!actionLoading}
                      onClick={() => handleAction('rewrite')}>
                      {actionLoading === 'rewrite'
                        ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        : <RefreshCw className="h-4 w-4 mr-1" />} Rewrite
                    </Button>
                    <Button variant="outline" size="sm" disabled={!!actionLoading}
                      onClick={() => handleAction('improve_seo')}>
                      {actionLoading === 'improve_seo'
                        ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        : <Search className="h-4 w-4 mr-1" />} Improve SEO
                    </Button>
                    <Button variant="outline" size="sm" disabled={!!actionLoading}
                      onClick={() => handleAction('grammar')}>
                      {actionLoading === 'grammar'
                        ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        : <SpellCheck className="h-4 w-4 mr-1" />} Fix Grammar
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => saveArticle('draft')} disabled={!!saving}>
                      {saving === 'draft' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                      Save Draft
                    </Button>
                    <Button size="sm" onClick={() => saveArticle('published')} disabled={!!saving}>
                      {saving === 'publish' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                      Publish
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid lg:grid-cols-[1fr_320px] gap-6">
                {/* Main editor */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Title</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <Input value={article.title}
                        onChange={(e) => setArticle({ ...article, title: e.target.value })}
                        className="text-lg font-semibold" />
                      {article.titleVariations && article.titleVariations.length > 0 && (
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Variations — click to use</Label>
                          <div className="flex flex-wrap gap-2">
                            {article.titleVariations.map((t, i) => (
                              <button key={i} type="button"
                                onClick={() => setArticle({ ...article, title: t })}
                                className="text-xs px-2 py-1 rounded-md border bg-muted/40 hover:bg-muted transition-colors text-left">
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-base">Content</CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => {
                        navigator.clipboard.writeText(article.content);
                        toast({ title: 'HTML copied' });
                      }}>
                        <Copy className="h-3 w-3 mr-1" /> Copy HTML
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <RichTextEditor
                        content={article.content}
                        onChange={(html) => setArticle({ ...article, content: html })}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader><CardTitle className="text-sm">SEO</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Slug</Label>
                        <Input value={article.slug} onChange={(e) => setArticle({ ...article, slug: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Meta Title <span className="text-muted-foreground">({article.metaTitle?.length || 0}/60)</span></Label>
                        <Input value={article.metaTitle} onChange={(e) => setArticle({ ...article, metaTitle: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Meta Description <span className="text-muted-foreground">({article.metaDescription?.length || 0}/160)</span></Label>
                        <Textarea rows={3} value={article.metaDescription}
                          onChange={(e) => setArticle({ ...article, metaDescription: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Excerpt</Label>
                        <Textarea rows={2} value={article.excerpt}
                          onChange={(e) => setArticle({ ...article, excerpt: e.target.value })} />
                      </div>
                    </CardContent>
                  </Card>

                  {article.summary && (
                    <Card>
                      <CardHeader><CardTitle className="text-sm">Summary</CardTitle></CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{article.summary}</p>
                      </CardContent>
                    </Card>
                  )}

                  {(article.tags?.length || article.categorySuggestions?.length) && (
                    <Card>
                      <CardHeader><CardTitle className="text-sm flex items-center gap-1"><TagIcon className="h-3 w-3" /> Tags & Categories</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        {article.categorySuggestions && article.categorySuggestions.length > 0 && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Categories</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {article.categorySuggestions.map((c, i) => <Badge key={i} variant="secondary">{c}</Badge>)}
                            </div>
                          </div>
                        )}
                        {article.tags && article.tags.length > 0 && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Tags</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {article.tags.map((t, i) => <Badge key={i} variant="outline">#{t}</Badge>)}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
