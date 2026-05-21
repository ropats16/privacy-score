// First-party analytics ingestion.
//
// Accepts a JSON event, validates it against a strict allowlist, derives the
// anonymous visitor hash and country server-side, and writes aggregates to
// Redis. ALWAYS responds 204 — even on validation failure, rate-limit, a
// missing datastore, or an internal error. A scan must never wait on or fail
// because of analytics.

import { validateEvent } from "@/lib/analytics/events";
import {
  getRatelimit,
  getRedis,
  utcDateString,
  writeEvent,
} from "@/lib/analytics/redis";

export const runtime = "edge";

function noContent(): Response {
  return new Response(null, { status: 204 });
}

// Most bots won't run the client JS that fires events, but cheap UA filtering
// keeps the obvious ones from inflating traction numbers.
const BOT_UA =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|monitor|headlesschrome|curl|wget|python-requests|node-fetch|axios/i;

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(req: Request): Promise<Response> {
  try {
    const ua = req.headers.get("user-agent") ?? "";
    if (BOT_UA.test(ua)) return noContent();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return noContent();
    }

    const event = validateEvent(body);
    if (!event) return noContent();

    const redis = getRedis();
    if (!redis) return noContent();

    const ip = clientIp(req);
    const { success } = await getRatelimit(redis).limit(ip);
    if (!success) return noContent();

    const date = utcDateString();

    // Anonymous visitor hash: SHA-256(secret salt + IP + UA + UTC date).
    // IP and UA are never stored; the date component makes any cross-day
    // correlation impossible. Only the digest reaches the HyperLogLog.
    const salt = process.env.ANALYTICS_SALT ?? "hpiyw:analytics:dev-salt";
    const visitorHash = await sha256Hex(`${salt}|${ip}|${ua}|${date}`);

    const country = req.headers.get("x-vercel-ip-country");

    await writeEvent(redis, event, {
      date,
      visitorHash,
      country: country && country !== "XX" ? country : null,
    });
  } catch {
    // Swallow everything — the endpoint is fire-and-forget by contract.
  }
  return noContent();
}
