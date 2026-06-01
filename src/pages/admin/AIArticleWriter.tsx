import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  Sparkles, Wand2, RefreshCw, Search, SpellCheck, Save, Send,
  Loader2, Copy, FileText, Tag as TagIcon, Languages as LangIcon,
  Cloud, CloudOff, ShieldCheck, ShieldAlert, History, Trash2,
} from 'lucide-react';

type Tone = 'Professional' | 'Casual' | 'Technical' | 'Friendly';
type Language = 'English' | 'Hindi' | 'Hinglish';
type Length = 'short' | 'medium' | 'long';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

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

interface PlagiarismMatch {
  id: string;
  title: string;
  slug: string;
  similarity: number;
}
interface PlagiarismResult {
  verdict: 'clean' | 'warn' | 'block';
  topScore: number;
  matches: PlagiarismMatch[];
  scanned: number;
}

interface DraftRow {
  id: string;
  title: string;
  payload: GeneratedArticle;
  updated_at: string;
}

const SITE_ORIGIN = 'https://cyberomb.lovable.app';

const slugify = (s: string) =>
  s.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);

/** Split HTML into sections by top-level h2 (intro = pre-first-h2 chunk). */
function splitSections(html: string): { label: string; html: string }[] {
  if (!html) return [];
  const parts = html.split(/(?=<h2[\s>])/i);
  return parts.map((chunk, i) => {
    const m = chunk.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    const label = m ? m[1].replace(/<[^>]+>/g, '').trim() : i === 0 ? 'Introduction' : `Section ${i}`;
    return { label: label || `Section ${i + 1}`, html: chunk };
  });
}

export default function AIArticleWriter() {
  const navigate = useNavigate();
  const { user } = useAuth();

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

  // Result + autosave
  const [article, setArticle] = useState<GeneratedArticle | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeTab, setActiveTab] = useState('input');
  const [saving, setSaving] = useState<'draft' | 'publish' | null>(null);

  // Section regen
  const [sectionIdx, setSectionIdx] = useState<string>('');
  const [sectionInstruction, setSectionInstruction] = useState('');

  // Plagiarism
  const [plagOpen, setPlagOpen] = useState(false);
  const [plagLoading, setPlagLoading] = useState(false);
  const [plagResult, setPlagResult] = useState<PlagiarismResult | null>(null);
  const [pendingStatus, setPendingStatus] = useState<'draft' | 'published' | null>(null);

  // Drafts list / resume
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [resumeOpen, setResumeOpen] = useState(false);

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

  // -------- Drafts: load list on mount, prompt resume --------
  const fetchDrafts = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('ai_writer_drafts')
      .select('id, title, payload, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(20);
    if (!error && data) setDrafts(data as unknown as DraftRow[]);
  }, [user]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from('ai_writer_drafts')
        .select('id, title, payload, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(20);
      if (data && data.length > 0) {
        setDrafts(data as unknown as DraftRow[]);
        setResumeOpen(true);
      }
    })();
  }, [user]);

  // -------- Server-side autosave (debounced) --------
  useEffect(() => {
    if (!article || !user) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    setSaveStatus('saving');
    autosaveTimer.current = setTimeout(async () => {
      try {
        if (draftId) {
          const { error } = await supabase
            .from('ai_writer_drafts')
            .update({ title: article.title || 'Untitled draft', payload: article as never })
            .eq('id', draftId);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from('ai_writer_drafts')
            .insert({
              user_id: user.id,
              title: article.title || 'Untitled draft',
              payload: article as never,
            })
            .select('id')
            .single();
          if (error) throw error;
          setDraftId(data.id);
        }
        setSaveStatus('saved');
        setLastSavedAt(new Date());
      } catch {
        setSaveStatus('error');
      }
    }, 1500);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [article, draftId, user]);

  const resumeDraft = (d: DraftRow) => {
    setArticle(d.payload);
    setDraftId(d.id);
    setActiveTab('edit');
    setResumeOpen(false);
    toast({ title: 'Draft resumed', description: d.title });
  };
  const startFresh = () => {
    setResumeOpen(false);
    setArticle(null);
    setDraftId(null);
  };
  const deleteDraft = async (id: string) => {
    await supabase.from('ai_writer_drafts').delete().eq('id', id);
    setDrafts((d) => d.filter((x) => x.id !== id));
    if (draftId === id) setDraftId(null);
    toast({ title: 'Draft deleted' });
  };

  // -------- Generation --------
  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({ title: 'Topic required', variant: 'destructive' });
      return;
    }
    setLoading(true);
    startProgress();
    try {
      const result = await callAI({ topic, keywords, instruction, tone, language, length, mode: 'full' });
      setArticle(result);
      setDraftId(null); // a fresh generation gets a new draft row
      setActiveTab('edit');
      toast({ title: 'Article generated' });
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

  // -------- Section regeneration --------
  const sections = useMemo(() => (article ? splitSections(article.content) : []), [article]);

  const handleRegenSection = async () => {
    if (!article || sectionIdx === '') return;
    const idx = parseInt(sectionIdx, 10);
    const section = sections[idx];
    if (!section) return;
    setActionLoading('section');
    startProgress();
    try {
      const result = await callAI({
        topic: article.title || topic,
        keywords, tone, language, mode: 'section',
        selection: section.html,
        instruction: sectionInstruction || 'Make it sharper, more engaging, and more original.',
      });
      const newHtml = (result.content || '').trim();
      if (!newHtml) throw new Error('Empty response');
      const updatedSections = sections.map((s, i) => (i === idx ? { ...s, html: newHtml } : s));
      setArticle({ ...article, content: updatedSections.map((s) => s.html).join('') });
      setSectionInstruction('');
      toast({ title: 'Section regenerated', description: section.label });
    } catch (e) {
      toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
      stopProgress();
    }
  };

  // -------- Plagiarism check then save --------
  const requestSave = async (status: 'draft' | 'published') => {
    if (!article) return;
    setPendingStatus(status);
    setPlagLoading(true);
    setPlagOpen(true);
    setPlagResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('ai-plagiarism-check', {
        body: { content: article.content },
      });
      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.error || 'Check failed');
      setPlagResult(data as PlagiarismResult);
    } catch (e) {
      toast({ title: 'Similarity check failed', description: (e as Error).message, variant: 'destructive' });
      setPlagOpen(false);
    } finally {
      setPlagLoading(false);
    }
  };

  const doSave = async () => {
    if (!article || !pendingStatus) return;
    const status = pendingStatus;
    setPlagOpen(false);
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
      // Clean up the working draft now that it's saved as an article
      if (draftId) await supabase.from('ai_writer_drafts').delete().eq('id', draftId);
      toast({ title: status === 'published' ? 'Published!' : 'Draft saved' });
      navigate(`/admin/articles/${data.id}`);
    } catch (e) {
      toast({ title: 'Save failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(null);
      setPendingStatus(null);
    }
  };

  // -------- Derived UI helpers --------
  const SaveBadge = () => {
    if (saveStatus === 'saving') return <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Saving…</span>;
    if (saveStatus === 'saved') return <span className="text-xs text-emerald-600 flex items-center gap-1"><Cloud className="h-3 w-3" /> Saved{lastSavedAt ? ` · ${lastSavedAt.toLocaleTimeString()}` : ''}</span>;
    if (saveStatus === 'error') return <span className="text-xs text-destructive flex items-center gap-1"><CloudOff className="h-3 w-3" /> Offline</span>;
    return null;
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
                Generate SEO-optimized articles. Drafts auto-save to the cloud.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {drafts.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setResumeOpen(true)}>
                <History className="h-4 w-4 mr-1" /> Drafts ({drafts.length})
              </Button>
            )}
            <Badge variant="secondary" className="gap-1"><Wand2 className="h-3 w-3" /> Gemini 2.5</Badge>
          </div>
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

        {/* INPUT TAB */}
        <TabsContent value="input" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Article Brief</CardTitle>
              <CardDescription>Give the AI a topic; more context = better output.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="topic">Topic or Title *</Label>
                <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. The Ultimate Guide to Cold Brew Coffee at Home" className="text-base" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="keywords">Focus Keywords <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="keywords" value={keywords} onChange={(e) => setKeywords(e.target.value)}
                  placeholder="cold brew, slow extraction, coffee ratio" />
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
                <Label htmlFor="inst">Extra Instructions</Label>
                <Textarea id="inst" value={instruction} onChange={(e) => setInstruction(e.target.value)}
                  placeholder="Audience, angle, must-include points…" rows={3} />
              </div>
              <Button onClick={handleGenerate} disabled={loading} size="lg"
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:opacity-95">
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</>
                  : <><Sparkles className="h-4 w-4 mr-2" />Generate Article</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EDIT TAB */}
        <TabsContent value="edit" className="space-y-6">
          {article && (
            <>
              {/* Action toolbar */}
              <Card>
                <CardContent className="p-4 flex flex-wrap gap-2 items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" disabled={!!actionLoading} onClick={() => handleAction('rewrite')}>
                      {actionLoading === 'rewrite' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />} Rewrite
                    </Button>
                    <Button variant="outline" size="sm" disabled={!!actionLoading} onClick={() => handleAction('improve_seo')}>
                      {actionLoading === 'improve_seo' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Search className="h-4 w-4 mr-1" />} Improve SEO
                    </Button>
                    <Button variant="outline" size="sm" disabled={!!actionLoading} onClick={() => handleAction('grammar')}>
                      {actionLoading === 'grammar' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <SpellCheck className="h-4 w-4 mr-1" />} Fix Grammar
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    <SaveBadge />
                    <Button variant="outline" size="sm" onClick={() => requestSave('draft')} disabled={!!saving || plagLoading}>
                      {saving === 'draft' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save Draft
                    </Button>
                    <Button size="sm" onClick={() => requestSave('published')} disabled={!!saving || plagLoading}>
                      {saving === 'publish' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />} Publish
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Regenerate section card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Regenerate Section</CardTitle>
                  <CardDescription>Pick a heading; AI rewrites only that section.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-[1fr_2fr_auto] gap-3 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Section</Label>
                    <Select value={sectionIdx} onValueChange={setSectionIdx}>
                      <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                      <SelectContent>
                        {sections.map((s, i) => (
                          <SelectItem key={i} value={String(i)}>{i + 1}. {s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Instruction (optional)</Label>
                    <Input value={sectionInstruction} onChange={(e) => setSectionInstruction(e.target.value)}
                      placeholder="e.g. add an example, make it more concise…" />
                  </div>
                  <Button onClick={handleRegenSection} disabled={!!actionLoading || sectionIdx === ''}>
                    {actionLoading === 'section' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Wand2 className="h-4 w-4 mr-1" />}
                    Regenerate
                  </Button>
                </CardContent>
              </Card>

              <div className="grid lg:grid-cols-[1fr_340px] gap-6">
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
                                className="text-xs px-2 py-1 rounded-md border bg-muted/40 hover:bg-muted text-left">
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
                  {/* SEO Preview */}
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-sm">Google Search Preview</CardTitle></CardHeader>
                    <CardContent>
                      <div className="rounded-lg border bg-card p-3 space-y-1 font-sans">
                        <div className="text-[11px] text-muted-foreground truncate">
                          {SITE_ORIGIN.replace(/^https?:\/\//, '')} › {article.slug || 'slug'}
                        </div>
                        <div className="text-[#1a0dab] dark:text-blue-400 text-base leading-snug truncate hover:underline cursor-default">
                          {article.metaTitle || article.title || 'Page title'}
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-2 leading-snug">
                          {article.metaDescription || article.excerpt || 'Meta description will appear here…'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* SEO Fields */}
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-sm">SEO</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Slug</Label>
                        <Input value={article.slug} onChange={(e) => setArticle({ ...article, slug: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs flex justify-between">
                          <span>Meta Title</span>
                          <span className={(article.metaTitle?.length || 0) > 60 ? 'text-destructive' : 'text-muted-foreground'}>
                            {article.metaTitle?.length || 0}/60
                          </span>
                        </Label>
                        <Input value={article.metaTitle} onChange={(e) => setArticle({ ...article, metaTitle: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs flex justify-between">
                          <span>Meta Description</span>
                          <span className={(article.metaDescription?.length || 0) > 160 ? 'text-destructive' : 'text-muted-foreground'}>
                            {article.metaDescription?.length || 0}/160
                          </span>
                        </Label>
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
                      <CardHeader className="pb-3"><CardTitle className="text-sm">Summary</CardTitle></CardHeader>
                      <CardContent><p className="text-sm text-muted-foreground leading-relaxed">{article.summary}</p></CardContent>
                    </Card>
                  )}

                  {(article.tags?.length || article.categorySuggestions?.length) && (
                    <Card>
                      <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-1"><TagIcon className="h-3 w-3" /> Tags & Categories</CardTitle></CardHeader>
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

      {/* Resume drafts dialog */}
      <Dialog open={resumeOpen} onOpenChange={setResumeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Resume a draft?</DialogTitle>
            <DialogDescription>You have {drafts.length} auto-saved draft{drafts.length === 1 ? '' : 's'}.</DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {drafts.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-2 p-3 border rounded-lg hover:bg-muted/40 transition-colors">
                <button onClick={() => resumeDraft(d)} className="flex-1 text-left min-w-0">
                  <div className="font-medium truncate">{d.title}</div>
                  <div className="text-xs text-muted-foreground">{new Date(d.updated_at).toLocaleString()}</div>
                </button>
                <Button variant="ghost" size="icon" onClick={() => deleteDraft(d.id)} aria-label="Delete draft">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={startFresh}>Start fresh</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plagiarism dialog */}
      <AlertDialog open={plagOpen} onOpenChange={setPlagOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {plagResult?.verdict === 'block'
                ? <><ShieldAlert className="h-5 w-5 text-destructive" /> High similarity detected</>
                : plagResult?.verdict === 'warn'
                  ? <><ShieldAlert className="h-5 w-5 text-amber-500" /> Possible overlap</>
                  : <><ShieldCheck className="h-5 w-5 text-emerald-600" /> Content looks original</>}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {plagLoading && (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Comparing against your published articles…
                  </span>
                )}
                {plagResult && (
                  <div className="space-y-3 mt-1">
                    <div className="text-sm">
                      Top similarity: <strong>{(plagResult.topScore * 100).toFixed(1)}%</strong>
                      <span className="text-muted-foreground"> (scanned {plagResult.scanned} articles)</span>
                    </div>
                    {plagResult.matches.length > 0 ? (
                      <ul className="space-y-1 text-sm">
                        {plagResult.matches.map((m) => (
                          <li key={m.id} className="flex justify-between gap-3 border-b pb-1 last:border-0">
                            <span className="truncate">{m.title}</span>
                            <span className={
                              m.similarity >= 0.45 ? 'text-destructive font-medium'
                                : m.similarity >= 0.20 ? 'text-amber-600 font-medium' : 'text-muted-foreground'
                            }>
                              {(m.similarity * 100).toFixed(1)}%
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No meaningful overlap with existing articles.</p>
                    )}
                    {plagResult.verdict === 'block' && (
                      <p className="text-sm text-destructive">
                        Similarity exceeds 45%. Rewrite the article before saving.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={plagLoading || plagResult?.verdict === 'block'}
              onClick={doSave}
            >
              {pendingStatus === 'published' ? 'Publish anyway' : 'Save draft'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
