import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useHeroContent } from "@/hooks/useHeroContent";
import { Skeleton } from "@/components/ui/skeleton";

const HeroSection = () => {
  const { data: hero, isLoading } = useHeroContent();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (isLoading) {
    return (
      <section className="relative min-h-[90vh] flex items-center justify-center">
        <div className="w-full max-w-4xl mx-auto px-6 space-y-6 text-center">
          <Skeleton className="h-6 w-48 mx-auto rounded-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-12 w-2/3 mx-auto" />
        </div>
      </section>
    );
  }

  const title = hero?.title || "Think Beyond. Feel More.";
  const subtitle = hero?.subtitle || "A space for ideas, stories, and inspiration that move you forward.";
  const buttonText = hero?.button_text || "Start Reading";
  const buttonLink = hero?.button_link || "#articles";
  const backgroundImage = hero?.background_image;

  return (
    <section className="relative min-h-[92vh] flex flex-col items-center justify-center overflow-hidden bg-background">
      {/* Subtle radial gradient backdrop — Apple-style clean */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, hsl(var(--accent) / 0.08), transparent 70%)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, hsl(var(--border)), transparent)",
          }}
        />
      </div>

      {/* Centered content */}
      <div className="relative w-full max-w-5xl mx-auto px-6 text-center pt-24 pb-16">
        {/* Eyebrow */}
        <p
          className={`apple-eyebrow mb-4 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          New
        </p>

        {/* Massive headline */}
        <h1
          className={`apple-headline text-[44px] sm:text-[64px] md:text-[80px] lg:text-[96px] text-foreground transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {title}
        </h1>

        {/* Subtitle */}
        <p
          className={`mt-6 text-xl md:text-2xl lg:text-[28px] text-muted-foreground font-medium tracking-[-0.015em] max-w-3xl mx-auto leading-snug transition-all duration-1000 delay-200 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {subtitle}
        </p>

        {/* CTA links — Apple-style blue inline links */}
        <div
          className={`mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-lg md:text-xl transition-all duration-1000 delay-[400ms] ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <a
            href={buttonLink}
            className="text-accent hover:underline font-normal inline-flex items-center gap-1"
          >
            {buttonText}
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
              ›
            </span>
          </a>
          <a
            href="#articles"
            className="text-accent hover:underline font-normal inline-flex items-center gap-1"
          >
            Browse articles
            <span aria-hidden="true">›</span>
          </a>
        </div>

        {/* Hero image — full-bleed below */}
        {backgroundImage && (
          <div
            className={`mt-16 md:mt-20 mx-auto max-w-5xl transition-all duration-[1.2s] delay-[600ms] ${
              isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"
            }`}
          >
            <div className="relative rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.25)] bg-secondary">
              <img
                src={backgroundImage}
                alt={title}
                className="w-full aspect-[16/10] object-cover"
                loading="eager"
                // @ts-ignore
                fetchpriority="high"
              />
            </div>
          </div>
        )}
      </div>

      {/* Scroll indicator */}
      <div
        className={`absolute bottom-6 left-1/2 -translate-x-1/2 transition-opacity duration-1000 delay-[1200ms] ${
          isVisible ? "opacity-60" : "opacity-0"
        }`}
      >
        <ChevronDown className="w-5 h-5 text-muted-foreground animate-bounce" />
      </div>
    </section>
  );
};

export default HeroSection;
