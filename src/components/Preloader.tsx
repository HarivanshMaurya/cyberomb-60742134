import { useEffect, useState } from "react";
import cyberomLogo from "@/assets/cyberom-logo.png";

const SESSION_KEY = "cyberom_preloader_shown";

const Preloader = () => {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem(SESSION_KEY);
  });
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const fadeTimer = setTimeout(() => setFadeOut(true), 1800);
    const removeTimer = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem(SESSION_KEY, "1");
    }, 2400);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-background transition-opacity duration-700 ${
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
