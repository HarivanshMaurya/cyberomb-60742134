import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { PageBlock, BlockStyleSettings, DEFAULT_STYLE, BlockAnimation } from '@/components/admin/page-builder/types';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

// Intersection Observer hook for scroll-triggered animations
function useScrollAnimation(animation: BlockAnimation) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (animation === 'none') { setIsVisible(true); return; }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setIsVisible(true); obs.unobserve(el); }
    }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [animation]);

  return { ref, isVisible };
}

const ANIMATION_CLASSES: Record<BlockAnimation, { initial: string; visible: string }> = {
  'none': { initial: '', visible: '' },
  'fade-in': { initial: 'opacity-0 translate-y-6', visible: 'opacity-100 translate-y-0' },
  'slide-up': { initial: 'opacity-0 translate-y-12', visible: 'opacity-100 translate-y-0' },
  'slide-left': { initial: 'opacity-0 -translate-x-12', visible: 'opacity-100 translate-x-0' },
  'slide-right': { initial: 'opacity-0 translate-x-12', visible: 'opacity-100 translate-x-0' },
  'scale-in': { initial: 'opacity-0 scale-90', visible: 'opacity-100 scale-100' },
  'zoom-in': { initial: 'opacity-0 scale-75', visible: 'opacity-100 scale-100' },
};

function BlockWrapper({ style, children }: { style?: BlockStyleSettings; children: React.ReactNode }) {
  const s = style || DEFAULT_STYLE;
  const animation = s.animation || 'none';
  const { ref, isVisible } = useScrollAnimation(animation);
  const animClass = ANIMATION_CLASSES[animation];

  const shadowMap: Record<string, string> = {
    none: '', sm: '0 1px 3px rgba(0,0,0,0.12)', md: '0 4px 12px rgba(0,0,0,0.1)',
    lg: '0 10px 30px rgba(0,0,0,0.12)', xl: '0 20px 50px rgba(0,0,0,0.15)',
  };

  const widthClass = s.width === 'narrow' ? 'max-w-3xl mx-auto' : s.width === 'contained' ? 'max-w-6xl mx-auto' : '';

  const inlineStyle: React.CSSProperties = {
    paddingTop: s.spacing.paddingTop ? `${s.spacing.paddingTop}px` : undefined,
    paddingBottom: s.spacing.paddingBottom ? `${s.spacing.paddingBottom}px` : undefined,
    marginTop: s.spacing.marginTop ? `${s.spacing.marginTop}px` : undefined,
    marginBottom: s.spacing.marginBottom ? `${s.spacing.marginBottom}px` : undefined,
    backgroundColor: s.backgroundColor || undefined,
    borderStyle: s.borderStyle && s.borderStyle !== 'none' ? s.borderStyle : undefined,
    borderWidth: s.borderWidth && s.borderStyle !== 'none' ? `${s.borderWidth}px` : undefined,
    borderColor: s.borderColor && s.borderStyle !== 'none' ? s.borderColor : undefined,
    borderRadius: s.borderRadius ? `${s.borderRadius}px` : undefined,
    boxShadow: s.shadow && s.shadow !== 'none' ? shadowMap[s.shadow] : undefined,
  };

  return (
    <div
      ref={ref}
      style={inlineStyle}
      className={`${widthClass} transition-all duration-700 ease-out ${isVisible ? animClass.visible : animClass.initial}`}
    >
      {children}
    </div>
  );
}

function HeroRenderer({ block }: { block: any }) {
  return (
    <section
      className="relative flex items-center justify-center min-h-[70vh] bg-cover bg-center overflow-hidden"
      style={{ backgroundImage: block.image ? `url(${block.image})` : undefined }}
    >
      {/* Ambient gradient orbs */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-accent/20 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />

      {block.overlay && (
        <div className="absolute inset-0 bg-gradient-to-br from-foreground/70 via-foreground/50 to-foreground/70 backdrop-blur-[2px]" />
      )}

      <div className="relative z-10 text-center px-6 py-24 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-background/10 backdrop-blur-md border border-background/20 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-primary-foreground/90">Featured</span>
        </div>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold text-primary-foreground mb-6 leading-[1.05] tracking-tight">
          {block.title}
        </h1>
        <p className="text-lg md:text-xl text-primary-foreground/85 mb-10 max-w-2xl mx-auto leading-relaxed font-light">
          {block.subtitle}
        </p>
        {block.buttonText && (
          <Link to={block.buttonLink || '#'}>
            <Button
              size="lg"
              className="rounded-full px-8 py-6 text-base bg-accent hover:bg-accent/90 text-accent-foreground shadow-[0_20px_50px_-12px_hsl(var(--accent)/0.5)] hover:scale-105 transition-all duration-500"
            >
              {block.buttonText}
            </Button>
          </Link>
        )}
      </div>
    </section>
  );
}

function RichTextRenderer({ block }: { block: any }) {
  return (
    <section className="max-w-3xl mx-auto px-6 py-16 md:py-24">
      <div
        className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-serif prose-headings:tracking-tight prose-a:text-accent prose-a:no-underline hover:prose-a:underline"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.content) }}
      />
    </section>
  );
}

function TextImageRenderer({ block }: { block: any }) {
  const isLeft = block.imagePosition === 'left';
  return (
    <section className="max-w-6xl mx-auto px-6 py-16 md:py-24">
      <div className={`flex flex-col ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'} gap-10 md:gap-16 items-center`}>
        <div className="flex-1 w-full">
          {block.image && (
            <div className="relative group">
              <div className="absolute -inset-3 rounded-[2rem] border border-accent/20 hidden md:block" />
              <div className="absolute -inset-6 rounded-[2.5rem] border border-border/30 hidden md:block" />
              <img
                src={block.image}
                alt={block.imageAlt || ''}
                className="relative rounded-[1.5rem] w-full object-cover shadow-[0_30px_80px_-20px_hsl(var(--foreground)/0.25)] transition-transform duration-700 group-hover:scale-[1.02]"
              />
            </div>
          )}
        </div>
        <div className="flex-1">
          <div
            className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-serif prose-headings:tracking-tight"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.text) }}
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCardsRenderer({ block }: { block: any }) {
  const cols = block.columns === 2 ? 'md:grid-cols-2' : block.columns === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-3';
  return (
    <section className="relative max-w-6xl mx-auto px-6 py-16 md:py-24">
      {block.heading && (
        <>
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="w-8 h-px bg-accent" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-accent">Features</span>
            <span className="w-8 h-px bg-accent" />
          </div>
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-center mb-4 tracking-tight">{block.heading}</h2>
        </>
      )}
      {block.subtitle && <p className="text-center text-muted-foreground mb-14 max-w-2xl mx-auto text-lg font-light">{block.subtitle}</p>}
      <div className={`grid grid-cols-1 ${cols} gap-6`}>
        {block.cards?.map((card: any, i: number) => (
          <div
            key={i}
            className="group relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-8 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_50px_-15px_hsl(var(--accent)/0.25)] hover:border-accent/30 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-accent/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center text-3xl mb-5 group-hover:scale-110 transition-transform duration-500">
                {card.icon}
              </div>
              <h3 className="text-lg font-bold mb-3 group-hover:text-accent transition-colors">{card.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{card.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ImageGalleryRenderer({ block }: { block: any }) {
  const cols = block.columns === 2 ? 'md:grid-cols-2' : block.columns === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-3';
  return (
    <section className="max-w-6xl mx-auto px-6 py-16 md:py-24">
      {block.heading && (
        <h2 className="text-3xl md:text-5xl font-serif font-bold text-center mb-12 tracking-tight">{block.heading}</h2>
      )}
      <div className={`grid grid-cols-1 ${cols} gap-5`}>
        {block.images?.map((img: any, i: number) => (
          <div key={i} className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-shadow duration-500">
            <img
              src={img.url}
              alt={img.alt || ''}
              className="w-full aspect-square object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            {img.caption && (
              <div className="absolute bottom-0 inset-x-0 p-5 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
                <p className="text-primary-foreground text-sm font-medium">{img.caption}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function TestimonialsRenderer({ block }: { block: any }) {
  return (
    <section className="max-w-5xl mx-auto px-6 py-16 md:py-24">
      {block.heading && (
        <>
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="w-8 h-px bg-accent" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-accent">Testimonials</span>
            <span className="w-8 h-px bg-accent" />
          </div>
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-center mb-14 tracking-tight">{block.heading}</h2>
        </>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {block.testimonials?.map((t: any, i: number) => (
          <div
            key={i}
            className="group relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-8 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_50px_-15px_hsl(var(--accent)/0.2)] hover:border-accent/30"
          >
            <div className="absolute top-6 right-6 text-6xl font-serif text-accent/15 leading-none select-none">"</div>
            <p className="relative text-foreground mb-6 text-base md:text-lg leading-relaxed font-light">"{t.quote}"</p>
            <div className="flex items-center gap-3 pt-4 border-t border-border/40">
              {t.avatar ? (
                <img src={t.avatar} alt={t.author} className="w-11 h-11 rounded-full object-cover ring-2 ring-accent/20" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center text-sm font-bold text-accent">
                  {t.author?.[0] || '?'}
                </div>
              )}
              <div>
                <p className="font-semibold text-sm">{t.author}</p>
                {t.role && <p className="text-muted-foreground text-xs">{t.role}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FAQRenderer({ block }: { block: any }) {
  return (
    <section className="max-w-3xl mx-auto px-6 py-16 md:py-24">
      {block.heading && (
        <>
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="w-8 h-px bg-accent" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-accent">FAQ</span>
            <span className="w-8 h-px bg-accent" />
          </div>
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-center mb-4 tracking-tight">{block.heading}</h2>
        </>
      )}
      {block.subtitle && <p className="text-center text-muted-foreground mb-12 text-lg font-light">{block.subtitle}</p>}
      <Accordion type="single" collapsible className="space-y-3">
        {block.items?.map((item: any, i: number) => (
          <AccordionItem
            key={i}
            value={`faq-${i}`}
            className="border border-border/50 rounded-2xl px-6 bg-card/60 backdrop-blur-xl hover:border-accent/30 transition-colors duration-300 data-[state=open]:border-accent/40 data-[state=open]:shadow-[0_10px_30px_-12px_hsl(var(--accent)/0.2)]"
          >
            <AccordionTrigger className="text-left font-semibold py-5 hover:no-underline hover:text-accent transition-colors">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

function CTARenderer({ block }: { block: any }) {
  const isAccent = block.variant === 'accent';
  const isDark = block.variant === 'dark';

  const bgClass = isAccent
    ? 'bg-gradient-to-br from-accent via-accent to-accent/80 text-accent-foreground'
    : isDark
      ? 'bg-gradient-to-br from-primary via-primary to-primary/85 text-primary-foreground'
      : 'bg-gradient-to-br from-muted via-card to-muted';

  return (
    <section className="px-6 py-12 md:py-16">
      <div className={`relative ${bgClass} rounded-[2rem] py-16 md:py-24 px-6 max-w-6xl mx-auto overflow-hidden shadow-[0_30px_80px_-20px_hsl(var(--foreground)/0.25)]`}>
        {/* Decorative orbs */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-background/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-background/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-serif font-bold mb-5 tracking-tight leading-tight">{block.title}</h2>
          <p className="text-lg md:text-xl opacity-85 mb-10 font-light leading-relaxed">{block.subtitle}</p>
          {block.buttonText && (
            <Link to={block.buttonLink || '#'}>
              <Button
                size="lg"
                variant={isDark || isAccent ? 'secondary' : 'default'}
                className="rounded-full px-10 py-6 text-base font-semibold hover:scale-105 transition-transform duration-500 shadow-xl"
              >
                {block.buttonText}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

interface BlockRendererProps {
  blocks: PageBlock[];
}

export function BlockRenderer({ blocks }: BlockRendererProps) {
  return (
    <div>
      {blocks.map((block) => {
        const content = (() => {
          switch (block.type) {
            case 'hero': return <HeroRenderer block={block} />;
            case 'richtext': return <RichTextRenderer block={block} />;
            case 'text_image': return <TextImageRenderer block={block} />;
            case 'feature_cards': return <FeatureCardsRenderer block={block} />;
            case 'image_gallery': return <ImageGalleryRenderer block={block} />;
            case 'testimonials': return <TestimonialsRenderer block={block} />;
            case 'faq': return <FAQRenderer block={block} />;
            case 'cta': return <CTARenderer block={block} />;
            default: return null;
          }
        })();
        return (
          <BlockWrapper key={block.id} style={block.style}>
            {content}
          </BlockWrapper>
        );
      })}
    </div>
  );
}
