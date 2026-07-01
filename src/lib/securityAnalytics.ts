import { supabase } from "@/integrations/supabase/client";

/**
 * Log an anonymous security tool event.
 * NEVER pass user inputs (passwords, emails, URLs, IPs) — only tool id + event type + optional short error code.
 */
export async function logToolEvent(
  toolId: string,
  eventType: "use" | "error",
  errorCode?: string
) {
  try {
    const safeTool = String(toolId).slice(0, 40);
    const safeCode = errorCode ? String(errorCode).replace(/[^a-z0-9_\-]/gi, "").slice(0, 60) : null;
    await supabase.from("security_tool_events").insert({
      tool_id: safeTool,
      event_type: eventType,
      error_code: safeCode,
    });
  } catch {
    // Analytics must never break the tool. Swallow silently — no console.error on purpose (no PII leaks).
  }
}

/**
 * Simple per-tool client-side throttle to protect free public APIs from abuse.
 * Returns true if the call is allowed, false if rate-limited.
 */
const lastCallAt = new Map<string, number[]>();
export function rateLimit(key: string, maxCalls: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (lastCallAt.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= maxCalls) {
    lastCallAt.set(key, arr);
    return false;
  }
  arr.push(now);
  lastCallAt.set(key, arr);
  return true;
}

/** Convert unknown errors into a short, non-sensitive error code for logging. */
export function toErrorCode(err: unknown): string {
  if (!err) return "unknown";
  const msg = err instanceof Error ? err.message : String(err);
  if (/network|fetch|failed to fetch/i.test(msg)) return "network";
  if (/timeout/i.test(msg)) return "timeout";
  if (/rate|429/i.test(msg)) return "rate_limit";
  if (/404/.test(msg)) return "not_found";
  if (/5\d\d/.test(msg)) return "upstream_5xx";
  return "generic";
}
