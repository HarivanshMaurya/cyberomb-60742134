import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, jsonResponse, rateLimit, rateLimitResponse } from "../_shared/security.ts";

const BodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const rl = await rateLimit(req, "breach", 5, 60);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

  let payload: unknown;
  try { payload = await req.json(); } catch { return jsonResponse({ error: "invalid_json" }, 400); }
  const parsed = BodySchema.safeParse(payload);
  if (!parsed.success) {
    return jsonResponse({ error: "invalid_input", fields: parsed.error.flatten().fieldErrors }, 400);
  }
  const email = parsed.data.email;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(
      `https://api.xposedornot.com/v1/check-email/${encodeURIComponent(email)}`,
      { signal: ctrl.signal },
    );
    clearTimeout(timer);

    if (res.status === 404) {
      return jsonResponse({ found: false, count: 0, breaches: [] });
    }
    if (!res.ok) return jsonResponse({ error: "upstream_error", status: res.status }, 502);
    const j = await res.json();
    const sites: string[] = j?.breaches?.[0] ?? [];
    return jsonResponse({ found: sites.length > 0, count: sites.length, breaches: sites });
  } catch (err) {
    const code = err instanceof DOMException && err.name === "AbortError" ? "timeout" : "network";
    return jsonResponse({ error: code }, 504);
  }
});
