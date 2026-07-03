// Shared helpers for security tool edge functions:
// - CORS headers
// - server-side rate limiting via public.sec_rate_limits (per IP hash)
// - safe error responses

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") || "";
  const ip = xff.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "";
  return ip || "unknown";
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

/**
 * Server-side sliding-window rate limit.
 * Returns { allowed, retryAfter } — retryAfter in seconds when blocked.
 */
export async function rateLimit(
  req: Request,
  bucket: string,
  maxCalls: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; retryAfter: number }> {
  const ip = getClientIp(req);
  const salt = Deno.env.get("SUPABASE_JWT_SECRET") || "sec-rl";
  const ipHash = await sha256Hex(`${salt}:${ip}`);
  const supabase = serviceClient();
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();

  const { count } = await supabase
    .from("sec_rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("bucket", bucket)
    .eq("ip_hash", ipHash)
    .gte("created_at", since);

  if ((count ?? 0) >= maxCalls) {
    return { allowed: false, retryAfter: windowSeconds };
  }

  // Best-effort insert (don't fail the request if analytics fails)
  await supabase.from("sec_rate_limits").insert({ bucket, ip_hash: ipHash });

  // Opportunistic cleanup of old rows (>1h) — cheap and keeps table small.
  const cutoff = new Date(Date.now() - 3600 * 1000).toISOString();
  supabase.from("sec_rate_limits").delete().lt("created_at", cutoff).then(() => {});

  return { allowed: true, retryAfter: 0 };
}

export function rateLimitResponse(retryAfter: number) {
  return new Response(
    JSON.stringify({ error: "rate_limited", message: "Too many requests. Please slow down." }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    },
  );
}
