import { useState, useEffect, useRef } from "react";
import { Instagram, Facebook, Linkedin, Twitter, ArrowRight, Play, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHeroContent } from "@/hooks/useHeroContent";
import { Skeleton } from "@/components/ui/skeleton";

const useAnimatedCounter = (target: number, duration = 2000, startDelay = 1000) => {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const delayTimer = setTimeout(() => setStarted(true), startDelay);
    return () => clearTimeout(delayTimer);
  }, [startDelay]);

  useEffect(() => {
    if (!started) return;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [started, target, duration]);

  return count;
};

const SocialLink = ({ url, icon: Icon, label }: { url: string; icon: typeof Instagram; label: string }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="group/social relative w-11 h-11 rounded-full border border-foreground/10 hover:border-accent/50 bg-foreground/5 hover:bg-accent/10 backdrop-blur-md transition-all duration-500 flex items-center justify-center hover:scale-110 hover:-translate-y-1 hover:shadow-[0_8px_30px_-8px_hsl(var(--accent)/0.3)]"
    aria-label={label}
  >
    <Icon className="w-[18px] h-[18px] text-foreground/40 group-hover/social:text-accent transition-colors duration-300" />
  </a>
);

const HeroSection = () => {
  const { data: hero, isLoading } = useHeroContent();
  const [isVisible, setIsVisible] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const readerCount = useAnimatedCounter(5000, 2500, 1300);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!sectionRef.current) return;
    const rect = sectionRef.current.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width - 0.5) * 40,
      y: ((e.clientY - rect.top) / rect.height - 0.5) * 40,
    });
  };

  if (isLoading) {
    return (
      <section className="relative min-h-screen flex items-center justify-center">
        <div className="w-full max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <Skeleton className="h-5 w-40 rounded-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-16 w-3/4" />
            <Skeleton className="h-14 w-56 rounded-full" />
          </div>
          <Skeleton className="aspect-[4/5] rounded-[2.5rem]" />
        </div>
      </section>
    );
  }

  const title = hero?.title || "Think Beyond the Obvious.";
  const subtitle = hero?.subtitle || "Cyberom is a journey through ideas, experiences, and insights that challenge the way you think, feel, and grow.";
  const backgroundImage = hero?.background_image || "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=1920&q=80";
  const buttonText = hero?.button_text || "Start Reading";
  const buttonLink = hero?.button_link || "#articles";
  const instagramUrl = hero?.instagram_url || "";
  const facebookUrl = hero?.facebook_url || "";
  const linkedinUrl = hero?.linkedin_url || "";
  const twitterUrl = hero?.twitter_url || "";
  const hasSocials = !!(instagramUrl || facebookUrl || linkedinUrl || twitterUrl);

  const socialLinks = [
    { url: instagramUrl, icon: Instagram, label: "Instagram" },
    { url: facebookUrl, icon: Facebook, label: "Facebook" },
    { url: linkedinUrl, icon: Linkedin, label: "LinkedIn" },
    { url: twitterUrl, icon: Twitter, label: "Twitter / X" },
  ].filter(s => !!s.url);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen overflow-hidden flex items-center"
      onMouseMove={handleMouseMove}
    >
      {/* ─── Cinematic Animated Background ─── */}
      <div className="absolute inset-0 -z-10 bg-background">
        {/* Animated conic gradient aurora */}
        <div
          className="absolute inset-0 opacity-[0.55] dark:opacity-[0.45]"
          style={{
            background: `conic-gradient(from 0deg at 50% 50%, hsl(var(--accent)/0.18), hsl(var(--primary)/0.14), hsl(var(--secondary)/0.16), hsl(var(--accent)/0.18))`,
            animation: 'heroSpin 30s linear infinite',
            filter: 'blur(80px)',
          }}
        />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.07] dark:opacity-[0.12]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
            maskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, #000 30%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, #000 30%, transparent 80%)',
          }}
        />

        {/* Mouse-tracking gradient orbs */}
        <div
          className="absolute w-[800px] h-[800px] rounded-full opacity-30 blur-[120px] transition-transform duration-[2s]"
          style={{
            background: `radial-gradient(circle, hsl(var(--accent)/0.6), transparent 70%)`,
            top: '-20%',
            right: '-10%',
            transform: `translate(${mousePos.x * -0.4}px, ${mousePos.y * -0.4}px)`,
          }}
        />
        <div
          className="absolute w-[700px] h-[700px] rounded-full opacity-25 blur-[110px] transition-transform duration-[2.5s]"
          style={{
            background: `radial-gradient(circle, hsl(var(--primary)/0.5), transparent 70%)`,
            bottom: '-20%',
            left: '-10%',
            transform: `translate(${mousePos.x * 0.3}px, ${mousePos.y * 0.3}px)`,
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-20 blur-[90px] transition-transform duration-[3s]"
          style={{
            background: `radial-gradient(circle, hsl(var(--secondary)/0.6), transparent 70%)`,
            top: '40%',
            left: '45%',
            transform: `translate(${mousePos.x * -0.2}px, ${mousePos.y * -0.2}px)`,
          }}
        />

        {/* Floating particles */}
        {[
          { s: 6, t: '15%', l: '12%', d: '0s', dur: '14s' },
          { s: 4, t: '25%', l: '82%', d: '2s', dur: '18s' },
          { s: 8, t: '60%', l: '20%', d: '4s', dur: '16s' },
          { s: 3, t: '75%', l: '70%', d: '1s', dur: '20s' },
          { s: 5, t: '45%', l: '90%', d: '3s', dur: '22s' },
          { s: 4, t: '85%', l: '45%', d: '5s', dur: '17s' },
        ].map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-accent/40"
            style={{
              width: p.s, height: p.s, top: p.t, left: p.l,
              boxShadow: `0 0 ${p.s * 3}px hsl(var(--accent)/0.5)`,
              animation: `pageFloat ${p.dur} ease-in-out ${p.d} infinite`,
            }}
          />
        ))}

        {/* Soft top vignette so text stays readable */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/60" />

        {/* Noise texture */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }} />

        {/* Subtle horizontal line */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      </div>

      {/* ─── Main Content ─── */}
      <div className="w-full max-w-[1400px] mx-auto px-6 md:px-10 lg:px-16 py-20 md:py-0">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-6 items-center">

          {/* ─── Left: Text Content ─── */}
          <div className="lg:col-span-6 xl:col-span-6 space-y-8 md:space-y-10 relative z-10">

            {/* Eyebrow / Label */}
            <div
              className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
            >
              <div className="inline-flex items-center gap-3">
                <span className="w-8 h-px bg-accent" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-accent">
                  Featured Story
                </span>
              </div>
            </div>

            {/* Title — word-by-word cinematic reveal */}
            <h1
              className="text-[3rem] sm:text-[3.5rem] md:text-[4.5rem] lg:text-[4rem] xl:text-[5rem] font-bold font-serif leading-[1.05] tracking-[-0.03em] text-foreground"
              style={{ perspective: '800px' }}
            >
              {title.split(' ').map((word, i) => (
                <span
                  key={i}
                  className="inline-block mr-[0.25em] transition-all duration-800 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-accent cursor-default"
                  style={{
                    transitionDelay: `${250 + i * 120}ms`,
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible
                      ? 'translateY(0) rotateX(0) scale(1)'
                      : 'translateY(50px) rotateX(15deg) scale(0.95)',
                    filter: isVisible ? 'blur(0px)' : 'blur(12px)',
                  }}
                >
                  {word}
                </span>
              ))}
            </h1>

            {/* Subtitle with decorative line */}
            <div
              className={`transition-all duration-1000 delay-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
            >
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-[1.8] max-w-[480px] font-light">
                {subtitle}
              </p>
            </div>

            {/* CTA Row */}
            <div
              className={`flex flex-wrap items-center gap-4 transition-all duration-1000 delay-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
            >
              <Button
                className="group/btn relative bg-accent hover:bg-accent/90 text-accent-foreground rounded-full pl-8 pr-6 py-7 text-[15px] font-semibold transition-all duration-500 hover:scale-[1.03] hover:shadow-[0_20px_50px_-12px_hsl(var(--accent)/0.4)] active:scale-[0.97] overflow-hidden"
                asChild
              >
                <a href={buttonLink}>
                  <span className="relative z-10 flex items-center gap-3">
                    {buttonText}
                    <span className="w-8 h-8 rounded-full bg-accent-foreground/15 flex items-center justify-center group-hover/btn:bg-accent-foreground/25 transition-colors duration-300">
                      <ArrowRight className="w-4 h-4 transition-transform duration-500 group-hover/btn:translate-x-0.5" />
                    </span>
                  </span>
                </a>
              </Button>

              <a
                href="#articles"
                className="group/link flex items-center gap-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-500 px-5 py-3.5 rounded-full border border-transparent hover:border-border/50 hover:bg-card/50 backdrop-blur-sm"
              >
                <Play className="w-4 h-4 fill-current opacity-60" />
                Browse Articles
              </a>
            </div>

            {/* Social + Stats Row */}
            <div
              className={`flex items-center gap-6 pt-4 transition-all duration-1000 delay-[1000ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
            >
              {hasSocials && (
                <div className="flex items-center gap-2.5">
                  {socialLinks.map(link => (
                    <SocialLink key={link.label} {...link} />
                  ))}
                </div>
              )}
              
              {hasSocials && (
                <div className="w-px h-8 bg-border/30" />
              )}

              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {['🌍', '✨', '📖'].map((emoji, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-card border-2 border-background flex items-center justify-center text-xs shadow-sm"
                      style={{
                        transitionDelay: `${1100 + i * 80}ms`,
                        opacity: isVisible ? 1 : 0,
                        transform: isVisible ? 'scale(1)' : 'scale(0)',
                        transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    >
                      {emoji}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground tabular-nums leading-tight">
                    {readerCount.toLocaleString()}+
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium">
                    Readers
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Right: Cinematic Image ─── */}
          <div className="lg:col-span-6 xl:col-span-6 relative">
            <div
              className={`relative transition-all duration-[1.4s] delay-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-20 scale-[0.92]'
              }`}
            >
              {/* Decorative frame elements */}
              <div
                className="absolute -inset-3 rounded-[2.5rem] border border-accent/10 transition-transform duration-[1.5s] hidden lg:block"
                style={{
                  transform: `translate(${mousePos.x * 0.1}px, ${mousePos.y * 0.1}px) rotate(1deg)`,
                }}
              />
              <div
                className="absolute -inset-7 rounded-[3rem] border border-border/5 transition-transform duration-[2s] hidden lg:block"
                style={{
                  transform: `translate(${mousePos.x * 0.18}px, ${mousePos.y * 0.18}px) rotate(-0.5deg)`,
                }}
              />

              {/* Main image container */}
              <div
                className="relative rounded-[2rem] lg:rounded-[2.5rem] overflow-hidden"
                style={{
                  transform: `perspective(1200px) rotateY(${mousePos.x * -0.08}deg) rotateX(${mousePos.y * 0.08}deg)`,
                  transition: 'transform 0.6s cubic-bezier(0.25, 0.1, 0.25, 1)',
                  boxShadow: `
                    0 40px 80px -20px hsl(var(--foreground) / 0.15),
                    0 0 0 1px hsl(var(--border) / 0.08),
                    ${mousePos.x * 0.2}px ${mousePos.y * 0.2}px 60px -15px hsl(var(--accent) / 0.05)
                  `,
                }}
              >
                {!imageLoaded && (
                  <div className="absolute inset-0 bg-muted animate-pulse" />
                )}

                {/* eslint-disable-next-line react/no-unknown-property */}
                <img
                  src={backgroundImage}
                  alt={title}
                  width={800}
                  height={1000}
                  // @ts-ignore
                  fetchpriority="high"
                  className={`w-full aspect-[3/4] lg:aspect-[4/5] object-cover transition-all duration-[2s] ease-out ${
                    imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-110'
                  }`}
                  onLoad={() => setImageLoaded(true)}
                />

                {/* Bottom glass card */}
                <div
                  className={`absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6 transition-all duration-1000 delay-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isVisible && imageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  }`}
                >
                  <div className="bg-background/60 dark:bg-background/40 backdrop-blur-2xl rounded-2xl border border-foreground/5 p-4 md:p-5 shadow-2xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-accent mb-0.5">Latest Post</p>
                        <p className="text-sm md:text-base font-bold text-foreground line-clamp-1">
                          Exploring New Horizons
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 group cursor-pointer hover:bg-accent/20 transition-colors duration-300">
                        <ArrowRight className="w-4 h-4 text-accent" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top corner tag */}
                <div
                  className={`absolute top-4 right-4 md:top-6 md:right-6 transition-all duration-700 delay-[1400ms] ${
                    isVisible && imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                  }`}
                >
                  <div className="bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full shadow-lg">
                    New
                  </div>
                </div>
              </div>

              {/* Floating accent dots */}
              <div
                className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-accent shadow-lg shadow-accent/30 transition-transform duration-700 hidden lg:block"
                style={{ transform: `translate(${mousePos.x * -0.35}px, ${mousePos.y * -0.35}px)` }}
              />
              <div
                className="absolute bottom-12 -left-3 w-2.5 h-2.5 rounded-full bg-secondary/50 transition-transform duration-1000 hidden lg:block"
                style={{ transform: `translate(${mousePos.x * 0.25}px, ${mousePos.y * 0.25}px)` }}
              />
              <div
                className="absolute top-1/3 -left-5 w-1.5 h-1.5 rounded-full bg-accent/40 transition-transform duration-[1.3s] hidden lg:block"
                style={{ transform: `translate(${mousePos.x * 0.4}px, ${mousePos.y * 0.4}px)` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Scroll indicator ─── */}
      <div
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 transition-all duration-1000 delay-[1500ms] ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/40 font-medium">
          Scroll
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground/30 animate-bounce" />
      </div>
    </section>
  );
};

export default HeroSection;
