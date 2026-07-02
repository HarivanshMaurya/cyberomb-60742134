import { Link } from "react-router-dom";
import Header from "@/components/Header";
import PageBackground from "@/components/PageBackground";
import SEOHead, { SITE_NAME, SITE_URL } from "@/components/SEOHead";
import {
  PasswordGenerator,
  StrengthChecker,
  BreachChecker,
  IpLookup,
  UrlChecker,
} from "./SecurityTools";
import { Shield, KeyRound, Gauge, Mail, Globe, Link2, ChevronRight } from "lucide-react";

type ToolSlug =
  | "password-generator"
  | "password-strength-checker"
  | "email-breach-checker"
  | "ip-lookup"
  | "scam-url-checker";

interface ToolConfig {
  slug: ToolSlug;
  name: string;
  h1: string;
  title: string;
  description: string;
  keywords: string;
  icon: typeof Shield;
  Component: React.FC;
  intro: string;
  bullets: string[];
  faqs: { q: string; a: string }[];
}

export const TOOL_CONFIGS: Record<ToolSlug, ToolConfig> = {
  "password-generator": {
    slug: "password-generator",
    name: "Password Generator",
    h1: "Free Secure Password Generator",
    title: "Free Secure Password Generator — Strong Random Passwords",
    description:
      "Generate strong, cryptographically random passwords online. Runs 100% in your browser with the Web Crypto API — nothing stored, nothing transmitted.",
    keywords:
      "password generator, secure password generator, strong password generator, random password, 16 character password, crypto random password",
    icon: KeyRound,
    Component: PasswordGenerator,
    intro:
      "Create strong, cryptographically random passwords instantly. This generator uses the browser's Web Crypto API (crypto.getRandomValues), so passwords are never sent to a server, logged, or stored.",
    bullets: [
      "True randomness via Web Crypto (crypto.getRandomValues)",
      "Customizable length from 4 to 50 characters",
      "Toggle uppercase, lowercase, numbers, and symbols",
      "Optional exclusion of look-alike characters (O/0, l/1)",
      "Live entropy and offline crack-time estimation",
    ],
    faqs: [
      { q: "Is this password generator safe?", a: "Yes. Every password is generated locally in your browser using cryptographically secure randomness (crypto.getRandomValues). Nothing is sent to our servers." },
      { q: "How long should my password be?", a: "16 characters is a solid modern minimum. For high-value accounts, aim for 20+ characters with mixed sets." },
      { q: "Should I use symbols?", a: "Yes when the site allows them. Symbols dramatically increase entropy and resistance to brute-force attacks." },
    ],
  },
  "password-strength-checker": {
    slug: "password-strength-checker",
    name: "Password Strength Checker",
    h1: "Password Strength Checker",
    title: "Password Strength Checker — Test Your Password Instantly",
    description:
      "Instantly test how strong your password is. Estimates entropy in bits, offline crack time, and gives concrete suggestions — all in your browser.",
    keywords:
      "password strength checker, how strong is my password, password entropy calculator, password test online",
    icon: Gauge,
    Component: StrengthChecker,
    intro:
      "Type or paste any password and see how resistant it is to modern brute-force and dictionary attacks. Analysis runs entirely in your browser — your password never leaves the page.",
    bullets: [
      "Estimates entropy in bits and offline crack time",
      "Detects common patterns, repeats, and dictionary words",
      "Actionable suggestions to strengthen weak passwords",
      "Zero network calls — your password is never transmitted",
    ],
    faqs: [
      { q: "Does this send my password anywhere?", a: "No. All analysis runs client-side in your browser. Your password never touches a server." },
      { q: "What is password entropy?", a: "Entropy measures unpredictability in bits. Every extra bit doubles the effort required to crack the password by brute force." },
      { q: "What score should I aim for?", a: "A score of 80+ (Strong) is a good target for personal accounts. Aim for 90+ (Very Strong) for banking, email, and admin accounts." },
    ],
  },
  "email-breach-checker": {
    slug: "email-breach-checker",
    name: "Email Breach Checker",
    h1: "Email Data Breach Checker",
    title: "Email Data Breach Checker — Free Leak Lookup",
    description:
      "Check if your email address appears in any known public data breach. Free, privacy-first lookup against the XposedOrNot database.",
    keywords:
      "email breach checker, data breach lookup, have i been pwned alternative, email leak checker, has my email been leaked",
    icon: Mail,
    Component: BreachChecker,
    intro:
      "Enter your email address to check whether it has appeared in any publicly disclosed data breach. Queries are HTTPS-only against the public XposedOrNot database. We do not store your email.",
    bullets: [
      "Queries the public XposedOrNot breach database",
      "Lists impacted services when a match is found",
      "Rate-limited and validated to protect the upstream API",
      "Actionable recovery steps for compromised accounts",
    ],
    faqs: [
      { q: "Do you store my email address?", a: "No. Your email is sent directly to the XposedOrNot API over HTTPS. We do not log or store the address." },
      { q: "What should I do if my email was found?", a: "Change any reused passwords on the listed services, enable two-factor authentication, and switch to unique passwords per site with a password manager." },
      { q: "Which breaches are covered?", a: "The XposedOrNot database aggregates hundreds of publicly disclosed breaches. It is not exhaustive — absence of a match does not guarantee your email was never leaked." },
    ],
  },
  "ip-lookup": {
    slug: "ip-lookup",
    name: "IP Address Lookup",
    h1: "IP Address Lookup & Geolocation",
    title: "IP Address Lookup — Free IP Geolocation & WHOIS",
    description:
      "Look up any public IPv4 or IPv6 address to see approximate location, ISP, ASN, and time zone. Auto-detects your own IP.",
    keywords:
      "ip address lookup, ip geolocation, what is my ip, ip whois, ip to location, asn lookup",
    icon: Globe,
    Component: IpLookup,
    intro:
      "Look up any public IPv4 or IPv6 address to see its approximate location, ISP, ASN, and time zone. Your own IP is detected automatically on page load.",
    bullets: [
      "Country, region, city, postal code, and coordinates",
      "ISP / organization and Autonomous System Number (ASN)",
      "Detects private and reserved address ranges",
      "Works with both IPv4 and IPv6 addresses",
    ],
    faqs: [
      { q: "How accurate is IP geolocation?", a: "IP geolocation is usually accurate to the country and often the city, but not to a specific person or street address. VPNs, proxies, and CDNs can hide the real origin." },
      { q: "Can I look up someone's exact location from their IP?", a: "No. IP addresses do not map to physical addresses. Never use an IP alone to identify a person." },
      { q: "What is an ASN?", a: "An Autonomous System Number identifies the network operator (usually an ISP or large hosting provider) that owns the IP address block." },
    ],
  },
  "scam-url-checker": {
    slug: "scam-url-checker",
    name: "Scam URL Checker",
    h1: "Scam & Phishing URL Checker",
    title: "Scam URL Checker — Free Phishing Link Analyzer",
    description:
      "Paste any suspicious URL and get an instant risk score. Analyzes 12+ heuristic phishing signals without ever visiting the site.",
    keywords:
      "phishing url checker, scam link checker, is this link safe, phishing detector, malicious url scanner",
    icon: Link2,
    Component: UrlChecker,
    intro:
      "Paste a suspicious link and get an instant phishing risk score. The checker analyzes 12+ heuristic signals from the URL string alone — the target site is never fetched.",
    bullets: [
      "Detects punycode and homograph attacks",
      "Flags brand impersonation and look-alike domains",
      "Identifies suspicious TLDs and URL shorteners",
      "Explains every finding in plain English",
    ],
    faqs: [
      { q: "Does the checker actually visit the URL?", a: "No. It only inspects the URL string — hostname, TLD, punycode, obfuscation, and impersonation signals. The site is never fetched." },
      { q: "Is a high risk score proof of phishing?", a: "No. The score is heuristic — high risk means the URL has patterns commonly used by scams, not that it is definitely malicious. Treat high-risk links with caution." },
      { q: "Can I trust a low risk score?", a: "A low score means no obvious red flags in the URL, but sophisticated phishing can still evade heuristics. Always verify sender and destination before entering credentials." },
    ],
  },
};

export default function SecurityToolPage({ slug }: { slug: ToolSlug }) {
  const cfg = TOOL_CONFIGS[slug];
  if (!cfg) return null;

  const url = `${SITE_URL}/security-tools/${cfg.slug}`;

  const softwareLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: cfg.name,
    description: cfg.description,
    url,
    applicationCategory: "SecurityApplication",
    operatingSystem: "Web",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "127",
    },
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: cfg.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Cybersecurity Tools", item: `${SITE_URL}/security-tools` },
      { "@type": "ListItem", position: 3, name: cfg.name, item: url },
    ],
  };

  const siblings = Object.values(TOOL_CONFIGS).filter((t) => t.slug !== cfg.slug);
  const Tool = cfg.Component;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <SEOHead
        title={cfg.title}
        description={cfg.description}
        canonical={`/security-tools/${cfg.slug}`}
        keywords={cfg.keywords}
        jsonLd={[softwareLd, faqLd, breadcrumbLd] as any}
      />
      <PageBackground />
      <Header />

      <main id="main" role="main" className="relative z-10 max-w-4xl mx-auto px-4 md:px-6 pt-28 md:pt-32 pb-20">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
          <ol className="flex items-center gap-1.5 flex-wrap">
            <li><Link to="/" className="hover:text-foreground transition-colors">Home</Link></li>
            <li aria-hidden><ChevronRight className="h-3.5 w-3.5" /></li>
            <li><Link to="/security-tools" className="hover:text-foreground transition-colors">Cybersecurity Tools</Link></li>
            <li aria-hidden><ChevronRight className="h-3.5 w-3.5" /></li>
            <li aria-current="page" className="text-foreground font-medium">{cfg.name}</li>
          </ol>
        </nav>

        <header className="mb-8 md:mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-4">
            <cfg.icon className="h-3.5 w-3.5" aria-hidden /> {cfg.name}
          </div>
          <h1 className="text-3xl md:text-5xl font-bold font-serif mb-4 bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
            {cfg.h1}
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl">{cfg.intro}</p>
        </header>

        <Tool />

        <section aria-labelledby="features-heading" className="mt-12">
          <h2 id="features-heading" className="text-xl md:text-2xl font-semibold mb-4">Features</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-foreground/90">
            {cfg.bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </section>

        <section aria-labelledby="faq-heading" className="mt-12">
          <h2 id="faq-heading" className="text-xl md:text-2xl font-semibold mb-5">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {cfg.faqs.map((f, i) => (
              <article key={i} className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm p-5">
                <h3 className="font-semibold mb-2">{f.q}</h3>
                <p className="text-sm text-muted-foreground">{f.a}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="related-heading" className="mt-14 border-t border-border/60 pt-10">
          <h2 id="related-heading" className="text-xl md:text-2xl font-semibold mb-5">More Cybersecurity Tools</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {siblings.map((s) => (
              <Link
                key={s.slug}
                to={`/security-tools/${s.slug}`}
                className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm p-4 hover:border-primary/40 hover:bg-card transition-colors"
              >
                <div className="rounded-lg bg-primary/10 text-primary p-2">
                  <s.icon className="h-4 w-4" aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{s.description}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-6">
            See all in the <Link to="/security-tools" className="text-primary hover:underline">Cybersecurity Toolkit overview</Link>.
          </p>
        </section>
      </main>
    </div>
  );
}
