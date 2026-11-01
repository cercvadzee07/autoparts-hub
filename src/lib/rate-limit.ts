import "server-only";
import { headers } from "next/headers";

/**
 * Best-effort, per-instance rate limiter for public forms (checkout, VIN).
 * On serverless platforms each instance has its own memory, so this only
 * blunts bursts; put a WAF / Vercel Firewall rule in front for real abuse.
 */
const buckets = new Map<string, number[]>();

export async function rateLimit(scope: string, limit: number, windowMs: number): Promise<boolean> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 10_000) buckets.clear();
  return true;
}
