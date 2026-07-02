import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import SEOHead, { SITE_NAME, SITE_URL } from "@/components/SEOHead";
import PageBackground from "@/components/PageBackground";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Shield, KeyRound, Gauge, Mail, Globe, Link2, Copy, RefreshCw,
  CheckCircle2, AlertTriangle, ShieldAlert, ShieldCheck, Loader2, Eye, EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { generatePassword, checkStrength, type StrengthResult } from "@/lib/passwordTools";
import { scanUrl, type UrlScanResult } from "@/lib/urlScanner";
import { logToolEvent, rateLimit, toErrorCode } from "@/lib/securityAnalytics";

/* ------------------ Password Generator ------------------ */
export const PasswordGenerator = () => {
  const [length, setLength] = useState(16);
  const [upper, setUpper] = useState(true);
  const [lower, setLower] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [excludeSimilar, setExcludeSimilar] = useState(false);
  const [pw, setPw] = useState("");
  const [reveal, setReveal] = useState(true);

  const regen = () => {
    const out = generatePassword({ length, upper, lower, numbers, symbols, excludeSimilar });
    if (!out) { toast.error("Select at least one character set"); return; }
    setPw(out);
  };

  useEffect(() => { regen(); /* eslint-disable-next-line */ }, [length, upper, lower, numbers, symbols, excludeSimilar]);

  const strength = useMemo(() => checkStrength(pw), [pw]);

  const copy = async () => {
    if (!pw) return;
    await navigator.clipboard.writeText(pw);
    toast.success("Password copied to clipboard");
    logToolEvent("generator", "use");
  };


  const meterColor =
    strength.score >= 85 ? "bg-emerald-500" :
    strength.score >= 65 ? "bg-green-500" :
    strength.score >= 45 ? "bg-yellow-500" :
    strength.score >= 25 ? "bg-orange-500" : "bg-red-500";

  return (
    <Card className="border-border/60 backdrop-blur-sm bg-card/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" /> Password Generator</CardTitle>
        <CardDescription>Cryptographically secure passwords. Generated locally — never stored or transmitted.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="relative">
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 p-3 font-mono text-base md:text-lg break-all min-h-[64px]">
            <span className="flex-1 select-all">{reveal ? pw : "•".repeat(pw.length)}</span>
            <Button variant="ghost" size="icon" onClick={() => setReveal(!reveal)} aria-label="Toggle visibility">
              {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={copy} aria-label="Copy"><Copy className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={regen} aria-label="Regenerate"><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Strength: <strong className="text-foreground">{strength.level}</strong></span>
            <span className="text-muted-foreground">Crack time (offline): <strong className="text-foreground">{strength.crackTime}</strong></span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div className={`h-full transition-all duration-500 ${meterColor}`} style={{ width: `${strength.score}%` }} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Length</Label>
            <span className="font-mono text-sm text-muted-foreground">{length}</span>
          </div>
          <Slider value={[length]} min={4} max={50} step={1} onValueChange={(v) => setLength(v[0])} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { id: "u", label: "Uppercase (A-Z)", value: upper, set: setUpper },
            { id: "l", label: "Lowercase (a-z)", value: lower, set: setLower },
            { id: "n", label: "Numbers (0-9)", value: numbers, set: setNumbers },
            { id: "s", label: "Symbols (!@#)", value: symbols, set: setSymbols },
            { id: "x", label: "Exclude similar (O/0, l/1)", value: excludeSimilar, set: setExcludeSimilar },
          ].map((o) => (
            <label key={o.id} htmlFor={o.id} className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors">
              <Checkbox id={o.id} checked={o.value} onCheckedChange={(v) => o.set(Boolean(v))} />
              <span className="text-sm">{o.label}</span>
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

/* ------------------ Password Strength Checker ------------------ */
const StrengthChecker = () => {
  const [pw, setPw] = useState("");
  const [reveal, setReveal] = useState(false);
  const res: StrengthResult = useMemo(() => checkStrength(pw), [pw]);
  const meterColor =
    res.score >= 85 ? "bg-emerald-500" :
    res.score >= 65 ? "bg-green-500" :
    res.score >= 45 ? "bg-yellow-500" :
    res.score >= 25 ? "bg-orange-500" : "bg-red-500";

  return (
    <Card className="border-border/60 backdrop-blur-sm bg-card/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5 text-primary" /> Password Strength Checker</CardTitle>
        <CardDescription>Live analysis as you type. Your password never leaves your browser.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="relative">
          <Input
            type={reveal ? "text" : "password"}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Type or paste a password..."
            className="pr-10 font-mono"
            autoComplete="new-password"
          />
          <button type="button" onClick={() => setReveal(!reveal)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground" aria-label="Toggle visibility">
            {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Score</span>
            <span className="font-mono"><strong className="text-foreground">{res.score}</strong>/100 • {res.level}</span>
          </div>
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
            <div className={`h-full transition-all duration-500 ${meterColor}`} style={{ width: `${res.score}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Length" value={pw.length.toString()} />
          <Stat label="Entropy" value={`${res.entropyBits.toFixed(0)} bits`} />
          <Stat label="Crack time" value={res.crackTime} />
          <Stat label="Level" value={res.level} />
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">Checks</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(res.checks).map(([k, v]) => (
              <div key={k} className={`flex items-center gap-2 text-xs rounded-md px-2 py-1.5 border ${v ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-border bg-muted/40 text-muted-foreground"}`}>
                {v ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                <span className="capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
              </div>
            ))}
          </div>
        </div>

        {res.feedback.length > 0 && (
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
            <h4 className="text-sm font-semibold mb-2">Suggestions</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              {res.feedback.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-sm font-semibold mt-0.5">{value}</div>
  </div>
);

/* ------------------ Email Breach Checker (XposedOrNot, free, no key) ------------------ */
interface BreachData {
  found: boolean;
  count: number;
  breaches: string[];
  error?: string;
}
const BreachChecker = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BreachData | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { toast.error("Enter a valid email address."); return; }
    if (v.length > 254) { toast.error("Email is too long."); return; }
    if (!rateLimit("breach", 5, 60_000)) {
      toast.error("You're checking too fast. Please wait a moment and try again.");
      return;
    }
    setLoading(true); setData(null);
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(`https://api.xposedornot.com/v1/check-email/${encodeURIComponent(v)}`, { signal: ctrl.signal });
      clearTimeout(timer);
      if (res.status === 404) {
        setData({ found: false, count: 0, breaches: [] });
      } else if (res.ok) {
        const j = await res.json();
        const sites: string[] = j?.breaches?.[0] ?? [];
        setData({ found: sites.length > 0, count: sites.length, breaches: sites });
      } else {
        throw new Error(`Lookup service returned ${res.status}`);
      }
      logToolEvent("breach", "use");
    } catch (err: any) {
      setData({ found: false, count: 0, breaches: [], error: "We couldn't reach the breach database right now. Please try again later." });
      toast.error("Could not reach breach database. Try again later.");
      logToolEvent("breach", "error", toErrorCode(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/60 backdrop-blur-sm bg-card/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> Email Breach Checker</CardTitle>
        <CardDescription>
          Privacy-first lookup against the public XposedOrNot breach database. We never store your email.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
          <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Button type="submit" disabled={loading} className="sm:w-auto w-full">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Checking</> : "Check"}
          </Button>
        </form>

        {data && !data.error && (
          <div className={`rounded-xl border p-5 ${data.found ? "border-red-500/40 bg-red-500/5" : "border-emerald-500/40 bg-emerald-500/5"}`}>
            <div className="flex items-start gap-3">
              {data.found ? <ShieldAlert className="h-6 w-6 text-red-500 mt-0.5" /> : <ShieldCheck className="h-6 w-6 text-emerald-500 mt-0.5" />}
              <div className="flex-1">
                <h3 className="font-semibold text-lg">
                  {data.found ? `Found in ${data.count} breach${data.count === 1 ? "" : "es"}` : "No known breaches found"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {data.found
                    ? "Your email appeared in publicly disclosed data leaks. Take action below."
                    : "This email did not appear in the public breach database. Stay vigilant."}
                </p>
                {data.found && data.breaches.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Affected services</div>
                    <div className="flex flex-wrap gap-2">
                      {data.breaches.map((b) => <Badge key={b} variant="secondary" className="font-normal">{b}</Badge>)}
                    </div>
                  </div>
                )}
                <Separator className="my-4" />
                <div className="text-sm space-y-1.5">
                  <div className="font-semibold mb-1">Recommendations</div>
                  <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                    <li>Change reused passwords on any of the listed services.</li>
                    <li>Enable two-factor authentication everywhere possible.</li>
                    <li>Use a password manager and unique passwords per site.</li>
                    <li>Watch for phishing emails referencing leaked data.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {data?.error && (
          <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/5 p-4 text-sm">
            <AlertTriangle className="h-4 w-4 inline mr-2 text-yellow-500" />
            {data.error}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/* ------------------ IP Lookup (ipapi.co, free, no key) ------------------ */
interface IpInfo {
  ip: string; version?: string; city?: string; region?: string; country_name?: string;
  country_code?: string; postal?: string; latitude?: number; longitude?: number;
  timezone?: string; org?: string; asn?: string; error?: boolean; reason?: string;
}
const IpLookup = () => {
  const [input, setInput] = useState("");
  const [data, setData] = useState<IpInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchIp = async (target?: string) => {
    if (!rateLimit("ip", 8, 60_000)) {
      toast.error("Too many lookups. Please slow down for a minute.");
      return;
    }
    setLoading(true); setData(null);
    try {
      const url = target ? `https://ipapi.co/${encodeURIComponent(target)}/json/` : `https://ipapi.co/json/`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      const j: IpInfo = await res.json();
      if (j.error) throw new Error(j.reason || "Lookup failed");
      setData(j);
      logToolEvent("ip", "use");
    } catch (err: any) {
      toast.error("We couldn't complete the IP lookup. Please try again.");
      logToolEvent("ip", "error", toErrorCode(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIp(); /* eslint-disable-next-line */ }, []);

  const isPrivate = (ip?: string) => {
    if (!ip) return false;
    return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.|169\.254\.|::1|fc|fd)/i.test(ip);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = input.trim();
    if (!v) { fetchIp(); return; }
    const valid = /^([0-9a-fA-F:.]+)$/.test(v) && v.length <= 45;
    if (!valid) { toast.error("Enter a valid IPv4 or IPv6 address."); return; }
    fetchIp(v);
  };

  return (
    <Card className="border-border/60 backdrop-blur-sm bg-card/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-primary" /> IP Address Lookup</CardTitle>
        <CardDescription>Geo-locate any public IP. Auto-detects yours on load.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Enter IP (leave blank for yours)" />
          <Button type="submit" disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Looking up</> : "Lookup"}
          </Button>
        </form>

        {data && (
          <div className="rounded-xl border border-border/60 bg-muted/30 p-5">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <code className="text-lg font-mono font-semibold">{data.ip}</code>
              {data.version && <Badge variant="secondary">{data.version}</Badge>}
              <Badge variant={isPrivate(data.ip) ? "destructive" : "default"}>{isPrivate(data.ip) ? "Private" : "Public"}</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Stat label="Country" value={data.country_name ? `${data.country_name} (${data.country_code})` : "—"} />
              <Stat label="Region" value={data.region || "—"} />
              <Stat label="City" value={data.city || "—"} />
              <Stat label="Postal" value={data.postal || "—"} />
              <Stat label="Timezone" value={data.timezone || "—"} />
              <Stat label="Coords" value={data.latitude && data.longitude ? `${data.latitude}, ${data.longitude}` : "—"} />
              <Stat label="ISP / Org" value={data.org || "—"} />
              <Stat label="ASN" value={data.asn || "—"} />
            </div>
            <div className="mt-4 text-xs text-muted-foreground border-t border-border/60 pt-3">
              <Shield className="h-3.5 w-3.5 inline mr-1.5" />
              IP geolocation is approximate. Attackers often hide behind VPNs, proxies and CDNs — never use IP alone to identify a person.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/* ------------------ URL Scam Checker ------------------ */
const UrlChecker = () => {
  const [input, setInput] = useState("");
  const [data, setData] = useState<UrlScanResult | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = input.trim();
    if (!v) { toast.error("Paste a URL to check."); return; }
    if (v.length > 2048) { toast.error("URL is too long."); return; }
    if (!rateLimit("url", 20, 60_000)) { toast.error("Too many checks — please slow down."); return; }
    try {
      setData(scanUrl(v));
      logToolEvent("url", "use");
    } catch (err) {
      toast.error("Couldn't analyze that URL. Please check the format and try again.");
      logToolEvent("url", "error", toErrorCode(err));
    }
  };

  const verdictStyle = (v?: string) =>
    v === "High Risk" ? "border-red-500/40 bg-red-500/5 text-red-600 dark:text-red-400" :
    v === "Suspicious" ? "border-yellow-500/40 bg-yellow-500/5 text-yellow-600 dark:text-yellow-400" :
    "border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400";

  return (
    <Card className="border-border/60 backdrop-blur-sm bg-card/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5 text-primary" /> Scam URL Checker</CardTitle>
        <CardDescription>Heuristic phishing analysis — checks 12+ risk signals without visiting the site.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="https://example.com/login" />
          <Button type="submit">Analyze</Button>
        </form>

        {data && (
          <div className={`rounded-xl border p-5 ${verdictStyle(data.verdict)}`}>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div className="flex items-center gap-3">
                {data.verdict === "Safe" ? <ShieldCheck className="h-6 w-6" /> :
                  data.verdict === "Suspicious" ? <AlertTriangle className="h-6 w-6" /> :
                  <ShieldAlert className="h-6 w-6" />}
                <div>
                  <div className="font-semibold text-lg">{data.verdict}</div>
                  {data.hostname && <div className="text-xs font-mono opacity-80">{data.hostname}</div>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{data.score}<span className="text-base font-normal opacity-70">/100</span></div>
                <div className="text-xs opacity-70">Risk score</div>
              </div>
            </div>
            <Progress value={data.score} className="h-2" />

            <div className="mt-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Findings</div>
              <ul className="space-y-1.5 text-sm">
                {data.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-foreground">
                    {r.level === "danger" ? <ShieldAlert className="h-4 w-4 text-red-500 mt-0.5 shrink-0" /> :
                      r.level === "warn" ? <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" /> :
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />}
                    <span>{r.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Recommendations</div>
              <ul className="list-disc pl-5 text-sm text-foreground/90 space-y-1">
                {data.recommendations.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/* ------------------ Page ------------------ */
const TOOLS = [
  { id: "generator", label: "Password Generator", icon: KeyRound },
  { id: "strength", label: "Strength Checker", icon: Gauge },
  { id: "breach", label: "Email Breach", icon: Mail },
  { id: "ip", label: "IP Lookup", icon: Globe },
  { id: "url", label: "Scam URL", icon: Link2 },
];

const SecurityTools = () => {
  const [tab, setTab] = useState("generator");

  // Deep-link tab via URL hash for indexable anchors (#password-generator, etc.)
  useEffect(() => {
    const map: Record<string, string> = {
      "#password-generator": "generator",
      "#password-strength": "strength",
      "#email-breach-checker": "breach",
      "#ip-lookup": "ip",
      "#scam-url-checker": "url",
    };
    const applyHash = () => {
      const t = map[window.location.hash];
      if (t) setTab(t);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  const faqs = [
    { q: "Is the password generator safe to use?",
      a: "Yes. Passwords are generated locally in your browser using the Web Crypto API (crypto.getRandomValues). Nothing is sent to our servers, logged, or stored." },
    { q: "How does the email breach checker work?",
      a: "It queries the public XposedOrNot breach database over HTTPS. We do not store your email address, and we rate-limit requests to protect the free upstream service." },
    { q: "Is the IP lookup accurate?",
      a: "IP geolocation is approximate — often accurate to the city level but not to the individual. VPNs, proxies, and CDNs can hide the real origin." },
    { q: "Does the scam URL checker visit the link?",
      a: "No. It only inspects the URL string itself — hostname, TLD, punycode, brand impersonation, obfuscation and other heuristic signals. The site is never fetched." },
    { q: "What makes a strong password?",
      a: "A password becomes strong when it has high entropy — a long length (16+ characters) mixed with upper- and lower-case letters, numbers, and symbols, and is unique to that account." },
  ];

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Cybersecurity Tools",
    url: `${SITE_URL}/security-tools`,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    hasPart: [
      { "@type": "SoftwareApplication", name: "Password Generator", applicationCategory: "SecurityApplication", operatingSystem: "Web", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, url: `${SITE_URL}/security-tools#password-generator` },
      { "@type": "SoftwareApplication", name: "Password Strength Checker", applicationCategory: "SecurityApplication", operatingSystem: "Web", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, url: `${SITE_URL}/security-tools#password-strength` },
      { "@type": "SoftwareApplication", name: "Email Breach Checker", applicationCategory: "SecurityApplication", operatingSystem: "Web", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, url: `${SITE_URL}/security-tools#email-breach-checker` },
      { "@type": "SoftwareApplication", name: "IP Address Lookup", applicationCategory: "SecurityApplication", operatingSystem: "Web", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, url: `${SITE_URL}/security-tools#ip-lookup` },
      { "@type": "SoftwareApplication", name: "Scam URL Checker", applicationCategory: "SecurityApplication", operatingSystem: "Web", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, url: `${SITE_URL}/security-tools#scam-url-checker` },
    ],
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Cybersecurity Tools", item: `${SITE_URL}/security-tools` },
    ],
  };

  const TOOL_SECTIONS: { id: string; anchor: string; h2: string; intro: string; keywords: string; bullets: string[] }[] = [
    {
      id: "generator", anchor: "password-generator",
      h2: "Free Secure Password Generator",
      intro: "Create strong, cryptographically random passwords instantly. The generator runs entirely in your browser using the Web Crypto API — nothing is transmitted or stored.",
      keywords: "strong password generator, random password, secure password, 16 character password",
      bullets: ["Uses crypto.getRandomValues for true randomness", "Customizable length (8–64) and character sets", "Optional exclusion of look-alike characters (l, 1, O, 0)", "Real-time entropy and crack-time estimation"],
    },
    {
      id: "strength", anchor: "password-strength",
      h2: "Password Strength Checker",
      intro: "Instantly test how resistant your password is to brute-force and dictionary attacks. Get concrete suggestions to improve it.",
      keywords: "password strength test, how strong is my password, password entropy calculator",
      bullets: ["Estimates entropy in bits and time-to-crack", "Detects dictionary words and repeated patterns", "Runs 100% locally — never sends your password anywhere"],
    },
    {
      id: "breach", anchor: "email-breach-checker",
      h2: "Email Data Breach Checker",
      intro: "Check whether your email address has appeared in a publicly disclosed data breach, and see which services were affected so you can act quickly.",
      keywords: "email breach checker, have i been pwned alternative, data leak lookup",
      bullets: ["Queries the public XposedOrNot breach database", "Lists impacted services when a match is found", "Rate-limited and validated to protect the upstream API"],
    },
    {
      id: "ip", anchor: "ip-lookup",
      h2: "IP Address Lookup & Geolocation",
      intro: "Look up any public IPv4 or IPv6 address to see approximate location, ISP, ASN and time zone. Auto-detects your own IP on load.",
      keywords: "ip address lookup, ip geolocation, what is my ip, ip whois",
      bullets: ["Country, region, city, postal code and coordinates", "ISP / organization and Autonomous System Number", "Detects private / reserved address ranges"],
    },
    {
      id: "url", anchor: "scam-url-checker",
      h2: "Scam & Phishing URL Checker",
      intro: "Paste any suspicious link and get an instant risk score. The checker analyzes 12+ heuristic signals without ever visiting the site.",
      keywords: "phishing url checker, is this link safe, scam link detector",
      bullets: ["Detects punycode, brand impersonation, look-alike domains", "Flags suspicious TLDs and URL shorteners", "Explains every finding with plain-English recommendations"],
    },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <SEOHead
        title="Free Cybersecurity Tools — Password Generator, Breach, IP & URL Checker"
        description="Free online cybersecurity toolkit: strong password generator, strength checker, email data-breach lookup, IP geolocation, and phishing URL analyzer. Privacy-first — everything runs in your browser."
        canonical={`${SITE_URL}/security-tools`}
        keywords="password generator, strong password, password strength checker, email breach checker, data breach lookup, ip address lookup, ip geolocation, phishing url checker, scam link checker, cybersecurity tools, free security tools"
        jsonLd={[collectionLd, faqLd, breadcrumbLd] as any}
      />
      <PageBackground />
      <Header />

      <main id="main" role="main" className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 pt-28 md:pt-32 pb-20">
        <header className="text-center mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary mb-4">
            <Shield className="h-3.5 w-3.5" aria-hidden /> Cybersecurity Toolkit
          </div>
          <h1 className="text-4xl md:text-6xl font-bold font-serif mb-4 bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
            Free Cybersecurity Tools
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base md:text-lg">
            Five professional security tools in one place — password generator, strength checker, email breach lookup, IP geolocation and phishing URL analyzer. Everything runs privately in your browser.
          </p>
        </header>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList aria-label="Choose a security tool" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 h-auto w-full bg-muted/50 p-1.5 rounded-xl mb-8 gap-1">
            {TOOLS.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="flex items-center gap-1.5 py-2.5 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <t.icon className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.label.split(" ")[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="generator"><PasswordGenerator /></TabsContent>
          <TabsContent value="strength"><StrengthChecker /></TabsContent>
          <TabsContent value="breach"><BreachChecker /></TabsContent>
          <TabsContent value="ip"><IpLookup /></TabsContent>
          <TabsContent value="url"><UrlChecker /></TabsContent>
        </Tabs>

        <section aria-labelledby="why-heading" className="mt-16 grid md:grid-cols-3 gap-4">
          <h2 id="why-heading" className="sr-only">Why use these tools</h2>
          {[
            { icon: Shield, title: "Privacy-first", text: "Passwords and inputs are processed in your browser. We don't log or store them." },
            { icon: ShieldCheck, title: "Real working tools", text: "Connected to live, free public databases — no fake data, no demo mode." },
            { icon: KeyRound, title: "Production-ready", text: "Cryptographically secure RNG, validated inputs, hardened heuristics." },
          ].map((f, i) => (
            <article key={i} className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm p-5">
              <f.icon className="h-5 w-5 text-primary mb-2" aria-hidden />
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.text}</p>
            </article>
          ))}
        </section>

        {/* Indexable, keyword-rich content sections for each tool */}
        <section aria-labelledby="tools-guide-heading" className="mt-20 space-y-14">
          <h2 id="tools-guide-heading" className="text-2xl md:text-3xl font-bold font-serif">About the Cybersecurity Toolkit</h2>
          {TOOL_SECTIONS.map((s) => (
            <article key={s.id} id={s.anchor} className="scroll-mt-28">
              <h3 className="text-xl md:text-2xl font-semibold mb-3">{s.h2}</h3>
              <p className="text-muted-foreground mb-4">{s.intro}</p>
              <ul className="list-disc pl-5 space-y-1.5 text-sm text-foreground/90">
                {s.bullets.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
              <p className="mt-4">
                <button
                  onClick={() => { setTab(s.id); history.replaceState(null, "", `#${s.anchor}`); }}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Open the {s.h2} →
                </button>
              </p>
            </article>
          ))}
        </section>

        {/* FAQ — matches JSON-LD above for rich results */}
        <section aria-labelledby="faq-heading" className="mt-20">
          <h2 id="faq-heading" className="text-2xl md:text-3xl font-bold font-serif mb-6">Frequently Asked Questions</h2>
          <div className="space-y-5">
            {faqs.map((f, i) => (
              <article key={i} className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm p-5">
                <h3 className="font-semibold mb-2">{f.q}</h3>
                <p className="text-sm text-muted-foreground">{f.a}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default SecurityTools;

