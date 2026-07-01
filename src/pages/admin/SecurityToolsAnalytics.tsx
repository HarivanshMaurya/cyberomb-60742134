import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Activity, AlertTriangle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Row {
  tool_id: string;
  event_type: "use" | "error";
  error_code: string | null;
  created_at: string;
}

const TOOL_LABELS: Record<string, string> = {
  generator: "Password Generator",
  strength: "Strength Checker",
  breach: "Email Breach",
  ip: "IP Lookup",
  url: "Scam URL Checker",
};

export default function SecurityToolsAnalytics() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("security_tool_events")
        .select("tool_id,event_type,error_code,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (!error && data) setRows(data as Row[]);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const map = new Map<string, { uses: number; errors: number; last?: string; codes: Record<string, number> }>();
    for (const r of rows) {
      const s = map.get(r.tool_id) || { uses: 0, errors: 0, codes: {} };
      if (r.event_type === "use") s.uses++;
      else {
        s.errors++;
        if (r.error_code) s.codes[r.error_code] = (s.codes[r.error_code] || 0) + 1;
      }
      if (!s.last || r.created_at > s.last) s.last = r.created_at;
      map.set(r.tool_id, s);
    }
    return Array.from(map.entries()).sort((a, b) => (b[1].uses + b[1].errors) - (a[1].uses + a[1].errors));
  }, [rows]);

  const totalUses = rows.filter((r) => r.event_type === "use").length;
  const totalErrors = rows.filter((r) => r.event_type === "error").length;
  const errorRate = totalUses + totalErrors > 0 ? ((totalErrors / (totalUses + totalErrors)) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-7 w-7 text-primary" /> Security Tools Analytics
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Anonymous usage over the last 30 days. No user inputs (passwords, emails, URLs, IPs) are stored.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={Activity} label="Total uses" value={totalUses.toLocaleString()} />
        <StatCard icon={AlertTriangle} label="Total errors" value={totalErrors.toLocaleString()} />
        <StatCard icon={Clock} label="Error rate" value={`${errorRate}%`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By tool</CardTitle>
          <CardDescription>Usage counts, error rates, and last-used timestamps per tool.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : stats.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-4">Tool</th>
                    <th className="py-2 pr-4">Uses</th>
                    <th className="py-2 pr-4">Errors</th>
                    <th className="py-2 pr-4">Error rate</th>
                    <th className="py-2 pr-4">Top error</th>
                    <th className="py-2 pr-4">Last used</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map(([tool, s]) => {
                    const total = s.uses + s.errors;
                    const rate = total ? ((s.errors / total) * 100).toFixed(1) : "0";
                    const topErr = Object.entries(s.codes).sort((a, b) => b[1] - a[1])[0];
                    return (
                      <tr key={tool} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium">{TOOL_LABELS[tool] || tool}</td>
                        <td className="py-3 pr-4">{s.uses}</td>
                        <td className="py-3 pr-4">{s.errors}</td>
                        <td className="py-3 pr-4">
                          <Badge variant={Number(rate) > 20 ? "destructive" : "secondary"}>{rate}%</Badge>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground font-mono text-xs">
                          {topErr ? `${topErr[0]} (${topErr[1]})` : "—"}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground text-xs">
                          {s.last ? new Date(s.last).toLocaleString() : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5"><Icon className="h-5 w-5 text-primary" /></div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
            <div className="text-2xl font-bold">{value}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
