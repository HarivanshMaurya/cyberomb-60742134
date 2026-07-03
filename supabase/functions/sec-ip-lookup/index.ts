import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, jsonResponse, rateLimit, rateLimitResponse } from "../_shared/security.ts";

const IP_REGEX = /^(?:\d{1,3}\.){3}\d{1,3}$|^[0-9a-fA-F:]{2,45}$/;

const BodySchema = z.object({
  ip: z.string().trim().max(45).regex(IP_REGEX).optional().or(z.literal("")),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const rl = await rateLimit(req, "ip", 8, 60);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

  let payload: unknown = {};
  try { payload = await req.json(); } catch { /* empty body is fine */ }
  const parsed = BodySchema.safeParse(payload || {});
  if (!parsed.success) {
    return jsonResponse({ error: "invalid_input", fields: parsed.error.flatten().fieldErrors }, 400);
  }
  const ip = (parsed.data.ip || "").trim();

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const url = ip ? `https://ipapi.co/${encodeURIComponent(ip)}/json/` : `https://ipapi.co/json/`;
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    const j = await res.json();
    if (j?.error) return jsonResponse({ error: "upstream_error", reason: j.reason || "lookup_failed" }, 502);
    return jsonResponse(j);
  } catch (err) {
    const code = err instanceof DOMException && err.name === "AbortError" ? "timeout" : "network";
    return jsonResponse({ error: code }, 504);
  }
});
