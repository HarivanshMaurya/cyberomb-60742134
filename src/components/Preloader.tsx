import { useEffect, useState } from "react";
import cyberomLogo from "@/assets/cyberom-logo.png";

const SESSION_KEY = "cyberom_preloader_shown";
const FAST_LOAD_THRESHOLD_MS = 400; // if page is ready within this, skip entirely
const MIN_VISIBLE_MS = 600;          // minimum time to show preloader if shown
const MAX_VISIBLE_MS = 1800;         // maximum time before forcing fade
const FADE_DURATION_MS = 500;

const Preloader = () => {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    if (sessionStorage.getItem(SESSION_KEY)) return false;
    // If document is already loaded (cached/fast), don't show
    if (document.readyState === "complete") return false;
    return true;
  });
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!visible) {
      sessionStorage.setItem(SESSION_KEY, "1");
      return;
    }

    const startTime = performance.now();
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    let removeTimer: ReturnType<typeof setTimeout> | undefined;
    let maxTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = (delay = 0) => {
      if (fadeTimer || removeTimer) return;
      fadeTimer = setTimeout(() => setFadeOut(true), delay);
      removeTimer = setTimeout(() => {
        setVisible(false);
        sessionStorage.setItem(SESSION_KEY, "1");
      }, delay + FADE_DURATION_MS);
    };

    const handleReady = () => {
      const elapsed = performance.now() - startTime;
      if (elapsed < FAST_LOAD_THRESHOLD_MS) {
        // Page loaded super fast — skip nearly instantly
        finish(0);
      } else {
        // Ensure minimum visible time for smooth UX
        const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
        finish(remaining);
      }
    };

    if (document.readyState === "complete") {
      handleReady();
    } else {
      window.addEventListener("load", handleReady, { once: true });
    }

    // Hard cap so it never sticks
    maxTimer = setTimeout(() => finish(0), MAX_VISIBLE_MS);

    return () => {
      window.removeEventListener("load", handleReady);
      if (fadeTimer) clearTimeout(fadeTimer);
      if (removeTimer) clearTimeout(removeTimer);
      if (maxTimer) clearTimeout(maxTimer);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-background transition-opacity duration-500 ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-hidden="true"
    >
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full opacity-30 blur-3xl"
          style={{
            background: "radial-gradient(circle, hsl(var(--accent)) 0%, transparent 70%)",
            animation: "preloaderOrb 4s ease-in-out infinite",
          }}
        />
        <div
          className="absolute -bottom-1/4 -right-1/4 w-[600px] h-[600px] rounded-full opacity-30 blur-3xl"
          style={{
            background: "radial-gradient(circle, hsl(var(--secondary)) 0%, transparent 70%)",
            animation: "preloaderOrb 4s ease-in-out infinite 1s",
          }}
        />
      </div>

      <div className="relative flex flex-col items-center gap-8">
        {/* Logo with rotating ring */}
        <div className="relative w-32 h-32 flex items-center justify-center">
          {/* Outer rotating ring */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            style={{ animation: "preloaderSpin 2s linear infinite" }}
          >
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="1.5"
              strokeDasharray="20 280"
              strokeLinecap="round"
              opacity="0.9"
            />
          </svg>
          {/* Inner counter-rotating ring */}
          <svg
            className="absolute inset-2 w-[calc(100%-1rem)] h-[calc(100%-1rem)]"
            viewBox="0 0 100 100"
            style={{ animation: "preloaderSpinReverse 3s linear infinite" }}
          >
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="hsl(var(--accent))"
              strokeWidth="1"
              strokeDasharray="10 290"
              strokeLinecap="round"
              opacity="0.7"
            />
          </svg>

          {/* Logo with pulse */}
          <img
            src={cyberomLogo}
            alt="Cyberom"
            className="w-20 h-20 object-contain relative z-10"
            style={{ animation: "preloaderPulse 1.6s ease-in-out infinite" }}
          />
        </div>

        {/* Brand name with shimmer */}
        <div className="flex flex-col items-center gap-3">
          <h1
            className="text-3xl font-serif font-bold tracking-wide"
            style={{
              background:
                "linear-gradient(90deg, hsl(var(--foreground)) 0%, hsl(var(--accent)) 50%, hsl(var(--foreground)) 100%)",
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "preloaderShimmer 2s linear infinite",
            }}
          >
            Cyberom
          </h1>

          {/* Loading bar */}
          <div className="w-40 h-[2px] bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent, hsl(var(--accent)), transparent)",
                animation: "preloaderBar 1.4s ease-in-out infinite",
              }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes preloaderSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes preloaderSpinReverse {
          to { transform: rotate(-360deg); }
        }
        @keyframes preloaderPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.85; }
        }
        @keyframes preloaderShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes preloaderBar {
          0% { transform: translateX(-100%); width: 40%; }
          50% { width: 80%; }
          100% { transform: translateX(250%); width: 40%; }
        }
        @keyframes preloaderOrb {
          0%, 100% { transform: scale(1) translate(0, 0); }
          50% { transform: scale(1.2) translate(30px, -20px); }
        }
      `}</style>
    </div>
  );
};

export default Preloader;
