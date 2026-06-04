import { useState, useEffect, useRef, useMemo } from 'react';
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
  Undo2, Redo2, ExternalLink, HelpCircle, Link as LinkIcon, AlertTriangle,
  ListChecks, Share2, Image as ImageIcon, RotateCcw, Plus, Check, Download,
} from 'lucide-react';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';

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
  ogImage?: string;
  featuredImage?: string;
  imageCredit?: string;
  imageSource?: string;
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

interface VersionRow {
  id: string;
  created_at: string;
  label: string | null;
  payload: GeneratedArticle;
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

/** Extract FAQ Q/A pairs from a section whose H2 contains "FAQ". */
function extractFaqs(html: string): { q: string; a: string }[] {
  if (!html) return [];
  const sections = splitSections(html);
  const faqSec = sections.find((s) => /faq/i.test(s.label));
  if (!faqSec) return [];
  const body = faqSec.html.replace(/<h2[\s\S]*?<\/h2>/i, '');
  const re = /<h3[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3[\s>]|$)/gi;
  const out: { q: string; a: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const q = m[1].replace(/<[^>]+>/g, '').trim();
    const a = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (q) out.push({ q, a });
  }
  return out;
}

interface SectionHistoryEntry {
  before: string;
  after: string;
  label: string;
}

function validateForPublish(a: GeneratedArticle): string[] {
  return buildChecklist(a).filter((c) => !c.ok && c.id !== 'og').map((c) => c.label);
}

type CheckItem = { id: string; label: string; ok: boolean; group: 'SEO' | 'Content' | 'Tags & Slug' };

function buildChecklist(a: GeneratedArticle): CheckItem[] {
  const hasH1 = /<h1[\s>]/i.test(a.content || '');
  const h2Count = (a.content || '').match(/<h2[\s>]/gi)?.length ?? 0;
  const mt = a.metaTitle || '';
  const md = a.metaDescription || '';
  return [
    { id: 'title', group: 'Content', label: 'Title is at least 5 characters.', ok: !!a.title && a.title.trim().length >= 5 },
    { id: 'excerpt', group: 'Content', label: 'Excerpt has at least 20 characters.', ok: !!a.excerpt && a.excerpt.trim().length >= 20 },
    { id: 'h1', group: 'Content', label: 'Content includes an H1.', ok: hasH1 },
    { id: 'h2', group: 'Content', label: 'Content has at least 2 H2 sections.', ok: h2Count >= 2 },
    { id: 'mt', group: 'SEO', label: 'Meta title is set and ≤ 60 chars.', ok: !!mt && mt.length <= 60 },
    { id: 'md', group: 'SEO', label: 'Meta description is 50–160 chars.', ok: md.length >= 50 && md.length <= 160 },
    { id: 'og', group: 'SEO', label: 'OG image URL is set (optional but recommended).', ok: !!a.ogImage && /^https?:\/\//.test(a.ogImage) },
    { id: 'slug', group: 'Tags & Slug', label: 'Slug uses a-z, 0-9 and hyphens only.', ok: !!a.slug && /^[a-z0-9-]+$/.test(a.slug) },
    { id: 'tags', group: 'Tags & Slug', label: 'At least 2 tags added.', ok: (a.tags?.length ?? 0) >= 2 },
  ];
}

const STOPWORDS = new Set([
  'the','and','for','with','that','this','from','have','has','was','were','are','will','your','you','our','their','they',
  'about','into','onto','than','then','what','when','where','which','while','also','been','being','more','most','some',
  'such','only','very','just','like','over','under','after','before','because','between','during','these','those','here',
  'there','make','made','take','taken','using','use','used','can','could','should','would','may','might','one','two','three',
  'who','how','why','its','it\'s','isn\'t','don\'t','doesn\'t','not','but','any','all','own','out','off','too','via','per',
  'on','in','to','of','as','at','by','an','a','is','be','or','if','so','do','no','we','i','my','me'
]);

function suggestTagsFromContent(a: GeneratedArticle): string[] {
  const text = `${a.title} ${a.metaDescription || ''} ${(a.content || '').replace(/<[^>]+>/g, ' ')}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ');
  const tokens = text.split(/\s+/).filter((w) => w.length >= 4 && !STOPWORDS.has(w));
  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);
  // bigrams
  const words = tokens;
  for (let i = 0; i < words.length - 1; i++) {
    const bg = `${words[i]} ${words[i + 1]}`;
    if (bg.length <= 32) freq.set(bg, (freq.get(bg) || 0) + 2);
  }
  const existing = new Set((a.tags || []).map((t) => t.toLowerCase()));
  return Array.from(freq.entries())
    .filter(([w, c]) => c >= 3 && !existing.has(w))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([w]) => w);
}

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function wrapWords(s: string, maxChars: number, maxLines: number): string[] {
  const words = s.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars) {
      if (cur) lines.push(cur.trim());
      cur = w;
      if (lines.length === maxLines - 1) break;
    } else cur = cur ? cur + ' ' + w : w;
  }
  if (cur && lines.length < maxLines) lines.push(cur.trim());
  return lines;
}
function buildOgSvg(a: GeneratedArticle, site: string): string {
  const title = a.metaTitle || a.title || 'Untitled';
  const desc = a.metaDescription || a.excerpt || '';
  const titleLines = wrapWords(title, 28, 3);
  const descLines = wrapWords(desc, 60, 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0f172a"/><stop offset="1" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#c8a97e"/><stop offset="1" stop-color="#e8d5b5"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1080" cy="120" r="260" fill="#c8a97e" opacity="0.07"/>
  <rect x="70" y="80" width="6" height="60" rx="3" fill="url(#accent)"/>
  <text x="90" y="118" font-family="Inter,Arial,sans-serif" font-size="16" font-weight="700" fill="#c8a97e" letter-spacing="4">${escapeXml(site.toUpperCase())}</text>
  ${titleLines.map((l, i) => `<text x="70" y="${230 + i * 64}" font-family="Georgia,serif" font-size="54" font-weight="700" fill="#f8fafc">${escapeXml(l)}</text>`).join('')}
  ${descLines.map((l, i) => `<text x="70" y="${260 + titleLines.length * 64 + i * 32}" font-family="Inter,Arial,sans-serif" font-size="22" fill="#cbd5e1">${escapeXml(l)}</text>`).join('')}
  <line x1="70" y1="540" x2="1130" y2="540" stroke="#c8a97e" stroke-opacity="0.25"/>
  <text x="70" y="585" font-family="Inter,Arial,sans-serif" font-size="20" fill="#94a3b8">${escapeXml((a.tags || []).slice(0, 4).map((t) => '#' + t).join('  '))}</text>
</svg>`;
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
  const [sectionPast, setSectionPast] = useState<SectionHistoryEntry[]>([]);
  const [sectionFuture, setSectionFuture] = useState<SectionHistoryEntry[]>([]);

  // Plagiarism
  const [plagOpen, setPlagOpen] = useState(false);
  const [plagLoading, setPlagLoading] = useState(false);
  const [plagResult, setPlagResult] = useState<PlagiarismResult | null>(null);
  const [pendingStatus, setPendingStatus] = useState<'draft' | 'published' | null>(null);

  // Drafts list / resume
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [resumeOpen, setResumeOpen] = useState(false);

  // Version history
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const lastVersionAtRef = useRef<number>(0);

  // Tag suggestions
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);

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
        let activeDraftId = draftId;
        if (activeDraftId) {
          const { error } = await supabase
            .from('ai_writer_drafts')
            .update({ title: article.title || 'Untitled draft', payload: article as never })
            .eq('id', activeDraftId);
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
          activeDraftId = data.id;
          setDraftId(activeDraftId);
        }
        setSaveStatus('saved');
        setLastSavedAt(new Date());
        // Snapshot a version at most once every 60s
        const now = Date.now();
        if (activeDraftId && now - lastVersionAtRef.current > 60_000) {
          lastVersionAtRef.current = now;
          await supabase.from('ai_writer_draft_versions').insert({
            draft_id: activeDraftId,
            user_id: user.id,
            label: 'Auto-save',
            payload: article as never,
          });
        }
      } catch {
        setSaveStatus('error');
      }
    }, 1500);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [article, draftId, user]);

  // Load version list when a draft is active or panel opens
  const loadVersions = async (id: string) => {
    const { data } = await supabase
      .from('ai_writer_draft_versions')
      .select('id, created_at, label, payload')
      .eq('draft_id', id)
      .order('created_at', { ascending: false })
      .limit(30);
    if (data) setVersions(data as unknown as VersionRow[]);
  };
  useEffect(() => {
    if (draftId) loadVersions(draftId);
    else setVersions([]);
  }, [draftId]);

  const snapshotNow = async (label: string) => {
    if (!article || !user || !draftId) return;
    const { data } = await supabase
      .from('ai_writer_draft_versions')
      .insert({ draft_id: draftId, user_id: user.id, label, payload: article as never })
      .select('id, created_at, label, payload')
      .single();
    if (data) {
      setVersions((v) => [data as unknown as VersionRow, ...v]);
      lastVersionAtRef.current = Date.now();
      toast({ title: 'Snapshot saved', description: label });
    }
  };
  const restoreVersion = (v: VersionRow) => {
    setArticle(v.payload);
    setVersionsOpen(false);
    toast({ title: 'Version restored', description: new Date(v.created_at).toLocaleString() });
  };

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
  const fetchAutoImage = async (forArticle: GeneratedArticle): Promise<GeneratedArticle> => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-article-image', {
        body: {
          topic: forArticle.title || topic,
          keywords: (forArticle.tags || []).join(', ') || keywords,
        },
      });
      if (error || !data?.ok || !data?.image?.url) return forArticle;
      return {
        ...forArticle,
        featuredImage: data.image.url,
        imageCredit: data.image.credit || '',
        imageSource: data.image.source || '',
      };
    } catch {
      return forArticle;
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({ title: 'Topic required', variant: 'destructive' });
      return;
    }
    setLoading(true);
    startProgress();
    try {
      const result = await callAI({ topic, keywords, instruction, tone, language, length, mode: 'full' });
      const withImage = await fetchAutoImage(result);
      setArticle(withImage);
      setDraftId(null); // a fresh generation gets a new draft row
      setActiveTab('edit');
      toast({
        title: 'Article generated',
        description: withImage.featuredImage ? 'Cover image auto-attached.' : 'Cover image fetch skipped.',
      });
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
  const faqs = useMemo(() => (article ? extractFaqs(article.content) : []), [article]);
  // publishErrors are computed on-demand inside requestSave

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
      const beforeFull = article.content;
      const updatedSections = sections.map((s, i) => (i === idx ? { ...s, html: newHtml } : s));
      const afterFull = updatedSections.map((s) => s.html).join('');
      setArticle({ ...article, content: afterFull });
      // Push to history; clear future on a new branch
      setSectionPast((p) => [...p, { before: beforeFull, after: afterFull, label: section.label }]);
      setSectionFuture([]);
      setSectionInstruction('');
      toast({ title: 'Section regenerated', description: section.label });
    } catch (e) {
      toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
      stopProgress();
    }
  };

  const undoSectionRegen = () => {
    if (!article || sectionPast.length === 0) return;
    const entry = sectionPast[sectionPast.length - 1];
    setSectionPast((p) => p.slice(0, -1));
    setSectionFuture((f) => [...f, entry]);
    setArticle({ ...article, content: entry.before });
    toast({ title: 'Undid regeneration', description: entry.label });
  };

  const redoSectionRegen = () => {
    if (!article || sectionFuture.length === 0) return;
    const entry = sectionFuture[sectionFuture.length - 1];
    setSectionFuture((f) => f.slice(0, -1));
    setSectionPast((p) => [...p, entry]);
    setArticle({ ...article, content: entry.after });
    toast({ title: 'Redid regeneration', description: entry.label });
  };

  // -------- Publish validation (defined as outer helper below) --------

  // -------- Plagiarism check then save --------
  const requestSave = async (status: 'draft' | 'published') => {
    if (!article) return;
    if (status === 'published') {
      const errs = validateForPublish(article);
      if (errs.length > 0) {
        toast({
          title: 'Publish blocked',
          description: errs.slice(0, 4).join(' '),
          variant: 'destructive',
        });
        return;
      }
    }
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
        featured_image: article.featuredImage || null,
        og_image: article.ogImage || article.featuredImage || null,
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
          <div className="flex items-center gap-2 flex-wrap">
            {article && (
              <div className="px-2.5 py-1 rounded-full border bg-background/60 backdrop-blur">
                <SaveBadge />
              </div>
            )}
            {article && draftId && (
              <Button variant="outline" size="sm" onClick={() => setVersionsOpen(true)}>
                <History className="h-4 w-4 mr-1" /> Versions ({versions.length})
              </Button>
            )}
            {drafts.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setResumeOpen(true)}>
                <FileText className="h-4 w-4 mr-1" /> Drafts ({drafts.length})
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
                  <div className="flex gap-2">
                    <Button onClick={handleRegenSection} disabled={!!actionLoading || sectionIdx === ''}>
                      {actionLoading === 'section' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Wand2 className="h-4 w-4 mr-1" />}
                      Regenerate
                    </Button>
                  </div>
                </CardContent>
                <CardContent className="pt-0 flex flex-wrap items-center justify-between gap-2 border-t">
                  <div className="text-xs text-muted-foreground pt-3">
                    {sectionPast.length > 0
                      ? <>Last regen: <strong>{sectionPast[sectionPast.length - 1].label}</strong></>
                      : 'No regenerations yet — your other edits stay safe when you undo.'}
                  </div>
                  <div className="flex gap-2 pt-3">
                    <Button variant="outline" size="sm" onClick={undoSectionRegen}
                      disabled={sectionPast.length === 0 || !!actionLoading}
                      aria-label="Undo last section regeneration">
                      <Undo2 className="h-4 w-4 mr-1" /> Undo ({sectionPast.length})
                    </Button>
                    <Button variant="outline" size="sm" onClick={redoSectionRegen}
                      disabled={sectionFuture.length === 0 || !!actionLoading}
                      aria-label="Redo section regeneration">
                      <Redo2 className="h-4 w-4 mr-1" /> Redo ({sectionFuture.length})
                    </Button>
                  </div>
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
                        <Label className="text-xs flex items-center justify-between">
                          <span className="flex items-center gap-1"><LinkIcon className="h-3 w-3" /> URL slug</span>
                          <button type="button" className="text-[11px] text-primary hover:underline"
                            onClick={() => setArticle({ ...article, slug: slugify(article.title) })}>
                            Reset from title
                          </button>
                        </Label>
                        <Input value={article.slug}
                          onChange={(e) => setArticle({ ...article, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                          onBlur={(e) => setArticle({ ...article, slug: slugify(e.target.value) })}
                          placeholder="my-article-slug" />
                        <div className="text-[11px] text-muted-foreground truncate">
                          Final URL: {SITE_ORIGIN}/{article.slug || 'slug'}
                        </div>
                        {article.slug && !/^[a-z0-9-]+$/.test(article.slug) && (
                          <div className="text-[11px] text-destructive">Only a-z, 0-9 and hyphens allowed.</div>
                        )}
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
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" /> OG image URL
                          <span className="text-muted-foreground font-normal">(optional)</span>
                        </Label>
                        <Input
                          value={article.ogImage || ''}
                          placeholder="https://… or leave blank to use generated preview"
                          onChange={(e) => setArticle({ ...article, ogImage: e.target.value })}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* SEO Checklist with progress */}
                  {(() => {
                    const items = buildChecklist(article);
                    const passed = items.filter((i) => i.ok).length;
                    const pct = Math.round((passed / items.length) * 100);
                    const groups: ('Content' | 'SEO' | 'Tags & Slug')[] = ['Content', 'SEO', 'Tags & Slug'];
                    return (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1">
                              <ListChecks className="h-3 w-3" />
                              {pct === 100 ? 'Ready to publish' : 'SEO checklist'}
                            </span>
                            <span className="text-xs text-muted-foreground">{passed}/{items.length}</span>
                          </CardTitle>
                          <Progress value={pct} className="h-1.5 mt-2" />
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {groups.map((g) => (
                            <div key={g}>
                              <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{g}</div>
                              <ul className="space-y-1">
                                {items.filter((i) => i.group === g).map((i) => (
                                  <li key={i.id} className="flex items-start gap-2 text-xs">
                                    {i.ok
                                      ? <Check className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                      : <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />}
                                    <span className={i.ok ? 'text-muted-foreground line-through' : ''}>{i.label}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    );
                  })()}

                  {/* Social media preview */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-1"><Share2 className="h-3 w-3" /> Social preview</CardTitle>
                      <CardDescription className="text-[11px]">How your link will look when shared.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(() => {
                        const ogUrl = article.ogImage && /^https?:\/\//.test(article.ogImage)
                          ? article.ogImage
                          : `data:image/svg+xml;utf8,${encodeURIComponent(buildOgSvg(article, 'Cyberom'))}`;
                        const host = SITE_ORIGIN.replace(/^https?:\/\//, '');
                        return (
                          <>
                            {/* Facebook / LinkedIn style */}
                            <div className="rounded-lg border overflow-hidden bg-card">
                              <div className="aspect-[1200/630] bg-muted overflow-hidden">
                                <img src={ogUrl} alt="OG preview" className="w-full h-full object-cover" />
                              </div>
                              <div className="p-3 bg-muted/40 space-y-0.5">
                                <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{host}</div>
                                <div className="text-sm font-semibold leading-snug line-clamp-2">{article.metaTitle || article.title}</div>
                                <div className="text-xs text-muted-foreground line-clamp-2">{article.metaDescription || article.excerpt}</div>
                              </div>
                            </div>
                            {/* Twitter / X style summary_large_image */}
                            <div className="rounded-2xl border overflow-hidden bg-card">
                              <div className="aspect-[1200/630] bg-muted overflow-hidden">
                                <img src={ogUrl} alt="Twitter preview" className="w-full h-full object-cover" />
                              </div>
                              <div className="p-3 space-y-0.5">
                                <div className="text-sm font-semibold leading-snug line-clamp-1">{article.metaTitle || article.title}</div>
                                <div className="text-xs text-muted-foreground line-clamp-2">{article.metaDescription || article.excerpt}</div>
                                <div className="text-[11px] text-muted-foreground">🔗 {host}</div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm" variant="outline" className="flex-1"
                                onClick={() => {
                                  const svg = buildOgSvg(article, 'Cyberom');
                                  const blob = new Blob([svg], { type: 'image/svg+xml' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `${article.slug || 'og-image'}.svg`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                }}
                              >
                                <Download className="h-3.5 w-3.5 mr-1" /> Download OG image
                              </Button>
                              {!article.ogImage && (
                                <Button
                                  size="sm" variant="secondary"
                                  onClick={() => {
                                    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(buildOgSvg(article, 'Cyberom'))}`;
                                    setArticle({ ...article, ogImage: dataUrl });
                                    toast({ title: 'Generated OG image attached' });
                                  }}
                                >
                                  Use generated
                                </Button>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>

                  {/* FAQ Rich Result preview */}
                  {faqs.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-1">
                          <HelpCircle className="h-3 w-3" /> FAQ Rich Result
                        </CardTitle>
                        <CardDescription className="text-[11px]">
                          How your FAQs may appear in Google search.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-lg border bg-card p-3 space-y-1">
                          <div className="text-[11px] text-muted-foreground truncate">
                            {SITE_ORIGIN.replace(/^https?:\/\//, '')} › {article.slug || 'slug'}
                          </div>
                          <div className="text-[#1a0dab] dark:text-blue-400 text-sm leading-snug truncate">
                            {article.metaTitle || article.title}
                          </div>
                          <Accordion type="single" collapsible className="mt-1">
                            {faqs.slice(0, 5).map((f, i) => (
                              <AccordionItem key={i} value={`faq-${i}`} className="border-b last:border-0">
                                <AccordionTrigger className="py-2 text-xs text-left hover:no-underline">
                                  {f.q}
                                </AccordionTrigger>
                                <AccordionContent className="text-[11px] text-muted-foreground pb-2">
                                  {f.a.slice(0, 220)}{f.a.length > 220 ? '…' : ''}
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                          <div className="text-[10px] text-muted-foreground pt-1">
                            {faqs.length} FAQ{faqs.length === 1 ? '' : 's'} detected
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}


                  {article.summary && (
                    <Card>
                      <CardHeader className="pb-3"><CardTitle className="text-sm">Summary</CardTitle></CardHeader>
                      <CardContent><p className="text-sm text-muted-foreground leading-relaxed">{article.summary}</p></CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-1"><TagIcon className="h-3 w-3" /> Tags & Categories</CardTitle>
                      <Button
                        size="sm" variant="ghost" className="h-7 px-2 text-xs"
                        onClick={() => {
                          const s = suggestTagsFromContent(article);
                          setSuggestedTags(s);
                          if (s.length === 0) toast({ title: 'No new keyword tags found' });
                        }}
                      >
                        <Sparkles className="h-3 w-3 mr-1" /> Suggest
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {article.categorySuggestions && article.categorySuggestions.length > 0 && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Categories</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {article.categorySuggestions.map((c, i) => <Badge key={i} variant="secondary">{c}</Badge>)}
                          </div>
                        </div>
                      )}
                      <div>
                        <Label className="text-xs text-muted-foreground">Tags</Label>
                        <div className="flex flex-wrap gap-1 mt-1 min-h-6">
                          {(article.tags || []).length === 0 && (
                            <span className="text-[11px] text-muted-foreground">No tags yet — click Suggest.</span>
                          )}
                          {(article.tags || []).map((t, i) => (
                            <Badge
                              key={i} variant="outline"
                              className="cursor-pointer hover:bg-destructive/10"
                              onClick={() => setArticle({ ...article, tags: (article.tags || []).filter((_, x) => x !== i) })}
                              title="Click to remove"
                            >
                              #{t} ×
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {suggestedTags.length > 0 && (
                        <div>
                          <Label className="text-xs text-muted-foreground flex items-center justify-between">
                            <span>Suggested from content</span>
                            <button
                              type="button"
                              className="text-[11px] text-primary hover:underline"
                              onClick={() => {
                                const merged = Array.from(new Set([...(article.tags || []), ...suggestedTags])).slice(0, 12);
                                setArticle({ ...article, tags: merged });
                                setSuggestedTags([]);
                              }}
                            >
                              Add all
                            </button>
                          </Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {suggestedTags.map((t) => (
                              <button
                                key={t} type="button"
                                onClick={() => {
                                  const merged = Array.from(new Set([...(article.tags || []), t]));
                                  setArticle({ ...article, tags: merged });
                                  setSuggestedTags((s) => s.filter((x) => x !== t));
                                }}
                                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border bg-muted/40 hover:bg-muted"
                              >
                                <Plus className="h-3 w-3" /> {t}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
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

      {/* Version history dialog */}
      <Dialog open={versionsOpen} onOpenChange={setVersionsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Version history</DialogTitle>
            <DialogDescription>Restore any previously auto-saved snapshot of this draft.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{versions.length} snapshot{versions.length === 1 ? '' : 's'}</p>
            <Button size="sm" variant="outline" onClick={() => snapshotNow('Manual snapshot')} disabled={!article || !draftId}>
              <Save className="h-3.5 w-3.5 mr-1" /> Snapshot now
            </Button>
          </div>
          <div className="max-h-80 overflow-y-auto space-y-2 mt-2 relative">
            {versions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No versions yet. They appear automatically as you edit.</p>
            )}
            <div className="border-l-2 border-border ml-3 pl-4 space-y-3">
              {versions.map((v) => (
                <div key={v.id} className="relative">
                  <span className="absolute -left-[22px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{v.payload?.title || 'Untitled'}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(v.created_at).toLocaleString()} · {v.label || 'snapshot'}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => restoreVersion(v)}>
                      <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restore
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
                      <ul className="space-y-2 text-sm">
                        {plagResult.matches.map((m) => (
                          <li key={m.id} className="flex items-start justify-between gap-3 border-b pb-2 last:border-0">
                            <div className="min-w-0 flex-1">
                              <a
                                href={`/article/${m.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-medium text-foreground hover:text-primary hover:underline inline-flex items-center gap-1 truncate"
                              >
                                <span className="truncate">{m.title}</span>
                                <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                              </a>
                              <div className="text-[11px] text-muted-foreground truncate">/article/{m.slug}</div>
                            </div>
                            <span className={
                              m.similarity >= 0.45 ? 'text-destructive font-medium shrink-0'
                                : m.similarity >= 0.20 ? 'text-amber-600 font-medium shrink-0' : 'text-muted-foreground shrink-0'
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
