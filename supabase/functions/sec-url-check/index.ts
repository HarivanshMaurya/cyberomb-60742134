import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, jsonResponse, rateLimit, rateLimitResponse } from "../_shared/security.ts";

// Server-side mirror of client heuristic scan (defense in depth + protects from client bypass).
const BodySchema = z.object({
  url: z.string().trim().min(4).max(2048),
});

const SUSPICIOUS_TLDS = ["zip","mov","xyz","top","click","country","gq","tk","cf","ml","work","loan"];
const BRAND_KEYWORDS = ["paypal","apple","microsoft","google","facebook","amazon","netflix","bank","wallet","secure","login","verify"];

function scan(rawInput: string) {
  let u: URL;
  try { u = new URL(rawInput.startsWith("http") ? rawInput : `http://${rawInput}`); }
  catch { return { score: 0, verdict: "invalid" as const, reasons: ["Invalid URL"] }; }

  const host = u.hostname.toLowerCase();
  const reasons: string[] = [];
  let score = 100;

  if (u.protocol !== "https:") { score -= 20; reasons.push("Not HTTPS"); }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) { score -= 25; reasons.push("Raw IP address in host"); }
  const tld = host.split(".").pop() || "";
  if (SUSPICIOUS_TLDS.includes(tld)) { score -= 20; reasons.push(`Suspicious TLD .${tld}`); }
  if (host.length > 40) { score -= 10; reasons.push("Very long hostname"); }
  if ((host.match(/-/g) || []).length >= 3) { score -= 10; reasons.push("Many hyphens in host"); }
  for (const brand of BRAND_KEYWORDS) {
    if (host.includes(brand) && !host.endsWith(`${brand}.com`)) { score -= 15; reasons.push(`Brand impersonation: "${brand}"`); break; }
  }
  if (u.username || u.password) { score -= 30; reasons.push("Credentials embedded in URL"); }
  if (u.pathname.length > 100) { score -= 5; reasons.push("Unusually long path"); }
  score = Math.max(0, Math.min(100, score));

  const verdict = score >= 75 ? "safe" : score >= 45 ? "suspicious" : "dangerous";
  return { score, verdict, reasons: reasons.length ? reasons : ["No obvious risk signals"], host };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const rl = await rateLimit(req, "url", 20, 60);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

  let payload: unknown;
  try { payload = await req.json(); } catch { return jsonResponse({ error: "invalid_json" }, 400); }
  const parsed = BodySchema.safeParse(payload);
  if (!parsed.success) {
    return jsonResponse({ error: "invalid_input", fields: parsed.error.flatten().fieldErrors }, 400);
  }

  return jsonResponse(scan(parsed.data.url));
});
