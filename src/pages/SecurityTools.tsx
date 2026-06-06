import { useEffect, useMemo, useRef, useState } from "react";
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

/* ------------------ Password Generator ------------------ */
const PasswordGenerator = () => {
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { toast.error("Enter a valid email"); return; }
    setLoading(true); setData(null);
    try {
      const res = await fetch(`https://api.xposedornot.com/v1/check-email/${encodeURIComponent(v)}`);
      if (res.status === 404) {
        setData({ found: false, count: 0, breaches: [] });
      } else if (res.ok) {
        const j = await res.json();
        const sites: string[] = j?.breaches?.[0] ?? [];
        setData({ found: sites.length > 0, count: sites.length, breaches: sites });
      } else {
        throw new Error(`Lookup service returned ${res.status}`);
      }
    } catch (err: any) {
      setData({ found: false, count: 0, breaches: [], error: err.message || "Lookup failed" });
      toast.error("Could not reach breach database. Try again later.");
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
    setLoading(true); setData(null);
    try {
      const url = target ? `https://ipapi.co/${encodeURIComponent(target)}/json/` : `https://ipapi.co/json/`;
      const res = await fetch(url);
      const j: IpInfo = await res.json();
      if (j.error) throw new Error(j.reason || "Lookup failed");
      setData(j);
    } catch (err: any) {
      toast.error(err.message || "Lookup failed");
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
    const valid = /^([0-9a-fA-F:.]+)$/.test(v);
    if (!valid) { toast.error("Enter a valid IP address"); return; }
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
    if (!v) { toast.error("Paste a URL to check"); return; }
    setData(scanUrl(v));
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

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <SEOHead
        title="Cybersecurity Tools — Password, Breach, IP & URL Checks"
        description="Free cybersecurity toolkit: secure password generator, strength checker, email breach lookup, IP geolocation, and phishing URL analyzer. Privacy-first and instant."
        canonical={`${SITE_URL}/security-tools`}
        keywords="password generator, password strength, email breach checker, ip lookup, phishing url checker, cybersecurity tools"
      />
      <PageBackground />
      <Header />

      <main className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 pt-28 md:pt-32 pb-20">
        <header className="text-center mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary mb-4">
            <Shield className="h-3.5 w-3.5" /> Cybersecurity Toolkit
          </div>
          <h1 className="text-4xl md:text-6xl font-bold font-serif mb-4 bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
            Stay Safe Online
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base md:text-lg">
            Five professional security tools in one place. Everything runs privately — your passwords and personal data never leave your browser.
          </p>
        </header>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 h-auto w-full bg-muted/50 p-1.5 rounded-xl mb-8 gap-1">
            {TOOLS.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="flex items-center gap-1.5 py-2.5 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <t.icon className="h-3.5 w-3.5" />
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

        <section className="mt-16 grid md:grid-cols-3 gap-4">
          {[
            { icon: Shield, title: "Privacy-first", text: "Passwords and inputs are processed in your browser. We don't log or store them." },
            { icon: ShieldCheck, title: "Real working tools", text: "Connected to live, free public databases — no fake data, no demo mode." },
            { icon: KeyRound, title: "Production-ready", text: "Cryptographically secure RNG, validated inputs, hardened heuristics." },
          ].map((f, i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm p-5">
              <f.icon className="h-5 w-5 text-primary mb-2" />
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};

export default SecurityTools;
