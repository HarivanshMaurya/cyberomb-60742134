import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

/**
 * Loads Google Analytics 4, Microsoft Clarity, and injects a Google Search
 * Console verification meta tag — all driven purely by Vite env vars.
 *
 * Set in `.env` (see `.env.example`):
 *   VITE_GA4_MEASUREMENT_ID   e.g. G-XXXXXXXXXX
 *   VITE_CLARITY_PROJECT_ID   e.g. abcdefghij
 *   VITE_GSC_VERIFICATION     the raw Google-site-verification token value
 *
 * Trackers are only loaded in production (import.meta.env.PROD) so dev + preview
 * stay clean. Nothing renders when env vars are missing.
 */
const GA4_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined;
const CLARITY_ID = import.meta.env.VITE_CLARITY_PROJECT_ID as string | undefined;
const GSC_TOKEN = import.meta.env.VITE_GSC_VERIFICATION as string | undefined;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

export default function Analytics() {
  const enabled = import.meta.env.PROD;

  // Track SPA route changes for GA4 (page_view on history change).
  useEffect(() => {
    if (!enabled || !GA4_ID || typeof window === "undefined") return;
    const send = () => {
      window.gtag?.("event", "page_view", {
        page_path: window.location.pathname + window.location.search,
        page_location: window.location.href,
        page_title: document.title,
      });
    };
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function (...args) {
      const r = origPush.apply(this, args as Parameters<typeof history.pushState>);
      queueMicrotask(send);
      return r;
    };
    history.replaceState = function (...args) {
      const r = origReplace.apply(this, args as Parameters<typeof history.replaceState>);
      queueMicrotask(send);
      return r;
    };
    window.addEventListener("popstate", send);
    return () => {
      history.pushState = origPush;
      history.replaceState = origReplace;
      window.removeEventListener("popstate", send);
    };
  }, [enabled]);

  return (
    <Helmet>
      {GSC_TOKEN && <meta name="google-site-verification" content={GSC_TOKEN} />}

      {enabled && GA4_ID && (
        <script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
        />
      )}
      {enabled && GA4_ID && (
        <script>{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA4_ID}', { anonymize_ip: true, send_page_view: true });
        `}</script>
      )}

      {enabled && CLARITY_ID && (
        <script>{`
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${CLARITY_ID}");
        `}</script>
      )}
    </Helmet>
  );
}
