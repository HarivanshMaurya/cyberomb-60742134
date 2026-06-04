import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { BookPage } from "./useBookPagination";
import React, { useRef, useEffect } from "react";

interface BookPageViewProps {
  page: BookPage | null;
  totalPages: number;
  side?: "left" | "right" | "single";
  darkMode?: boolean;
  fontSize?: number;
  watermark?: string;
  highlightSentenceIndex?: number;
  sentences?: string[];
}

export function BookPageView({
  page, totalPages, side = "single", darkMode = false, fontSize = 16,
  watermark, highlightSentenceIndex = -1, sentences = [],
}: BookPageViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bg = darkMode ? "hsl(0 0% 11%)" : "hsl(38 40% 97%)";
  const fg = darkMode ? "hsl(36 30% 88%)" : "hsl(0 0% 15%)";
  const mutedFg = darkMode ? "hsl(0 0% 40%)" : "hsl(0 0% 55%)";
  const chapterAccent = darkMode ? "hsl(36 44% 55%)" : "hsl(var(--accent))";
  const innerShadow = darkMode ? "hsl(0 0% 0% / 0.2)" : "hsl(0 0% 0% / 0.06)";

  // Scroll to top whenever page changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [page?.pageNumber]);

  const borderRadius = side === "left" ? "6px 0 0 6px" : side === "right" ? "0 6px 6px 0" : "6px";

  if (!page) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        style={{
          background: bg,
          borderRadius,
        }}
      >
        <div className="text-center space-y-2">
          <span className="text-2xl">📖</span>
          <p className="text-sm font-medium" style={{ color: mutedFg }}>End of book</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden relative ebook-protected"
      style={{
        background: bg,
        borderRadius,
        boxShadow:
          side === "left"
            ? `inset -6px 0 12px -6px ${innerShadow}`
            : side === "right"
              ? `inset 6px 0 12px -6px ${innerShadow}`
              : "none",
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Top decorative line */}
      <div
        className="absolute top-0 left-6 right-6 h-[1px]"
        style={{
          background: `linear-gradient(to right, transparent, ${darkMode ? "hsl(36 30% 30% / 0.3)" : "hsl(36 30% 70% / 0.3)"}, transparent)`,
        }}
      />

      {/* Chapter header */}
      {page.isChapterStart && page.chapterTitle && (
        <div className="px-8 pt-10 pb-4 md:px-12 md:pt-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-[2px] rounded-full" style={{ background: chapterAccent }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: chapterAccent }}>
              Chapter
            </span>
          </div>
          <h2
            className="font-serif text-xl md:text-2xl font-bold leading-tight"
            style={{ color: fg }}
          >
            {page.chapterTitle}
          </h2>
          <div
            className="w-full h-[1px] mt-5"
            style={{
              background: `linear-gradient(to right, ${darkMode ? "hsl(0 0% 25%)" : "hsl(var(--border))"}, transparent 80%)`,
            }}
          />
        </div>
      )}

      {/* Page content */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto px-8 md:px-12 ${page.isChapterStart && page.chapterTitle ? "pt-2" : "pt-10 md:pt-12"} pb-16`}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>
        <div
          className="prose prose-sm md:prose-base max-w-none"
          style={{
            fontFamily: "'Georgia', 'Palatino Linotype', 'Book Antiqua', serif",
            fontSize: `${fontSize * 0.059}rem`,
            lineHeight: "2",
            letterSpacing: "0.01em",
            color: fg,
            ...(darkMode ? {
              '--tw-prose-headings': fg,
              '--tw-prose-body': fg,
              '--tw-prose-bold': fg,
              '--tw-prose-quotes': mutedFg,
              '--tw-prose-quote-borders': chapterAccent,
            } as React.CSSProperties : {}),
          }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.content) }}
        />
      </div>

      {/* Watermark */}
      {watermark && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
          style={{
            transform: "rotate(-30deg)",
            opacity: 0.03,
            fontSize: "3rem",
            fontFamily: "monospace",
            color: fg,
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          {watermark}
        </div>
      )}

      {/* Page number - refined */}
      <div className="absolute bottom-0 inset-x-0 py-3.5 flex items-center justify-center"
        style={{
          background: `linear-gradient(to top, ${bg}, ${bg}90, transparent)`,
        }}
      >
        <span
          className="text-[11px] font-mono tracking-[0.15em]"
          style={{ color: mutedFg }}
        >
          {page.pageNumber}
          <span style={{ opacity: 0.4 }}> / {totalPages}</span>
        </span>
      </div>
    </div>
  );
}
