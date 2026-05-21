// First-party analytics client.
//
// Fire-and-forget: every call is best-effort, all errors are swallowed, and
// nothing here ever throws into application code. A scan must never slow down
// or break because of analytics.

import type { Scan } from "../types";
import {
  type DurationBucket,
  type ErrorType,
  type EventName,
  type EventProps,
  type InputType,
  type ScoreBand,
  FACTOR_KEYS,
} from "./events";

const ENDPOINT = "/api/event";

// Constant client-side pepper for the wallet hash. This is NOT a secret: the
// privacy guarantee is the server-side HyperLogLog (non-invertible), not the
// salt. The salt just keeps the digest from being a bare SHA-256 of the
// address. The raw address never leaves the browser.
const WALLET_HASH_SALT = "hpiyw:wallet:v1";

/** Send an event. Best-effort, never throws, never blocks. */
export function track(event: EventName, props: EventProps = {}): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({ event, props });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(ENDPOINT, blob)) return;
    }
    void fetch(ENDPOINT, {
      method: "POST",
      body,
      headers: { "content-type": "application/json" },
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Analytics is strictly non-blocking — swallow everything.
  }
}

/** Classify a raw landing-page input into an anonymous input-type bucket. */
export function classifyInput(raw: string): InputType {
  const v = raw.trim().toLowerCase();
  if (v.endsWith(".sol")) return "sns";
  // Any other name-service-style TLD (.abc, .bonk, .poor, …).
  if (/\.[a-z0-9]{2,}$/.test(v)) return "alt";
  return "address";
}

/** Map a scan error to one of the allowlisted error types. */
export function classifyScanError(
  err: unknown,
  fallback: ErrorType = "other",
): ErrorType {
  const msg = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();
  if (msg.includes("abort")) return "aborted";
  if (msg.includes("timeout") || msg.includes("timed out")) return "timeout";
  if (msg.includes("valid solana address")) return "invalid_address";
  if (msg.includes("resolve") && msg.includes(".sol")) return "sns_unresolved";
  if (
    msg.includes("rpc") ||
    msg.includes("fetch") ||
    msg.includes("network") ||
    msg.includes("helius") ||
    /\b(429|500|502|503|504)\b/.test(msg)
  ) {
    return "rpc_error";
  }
  return fallback;
}

/** 0–100 score → 10-point bucket (0, 10, … 100). */
export function bucketScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.floor(score / 10) * 10));
}

/** Coarse duration bucket for a scan, in ms. */
export function bucketDuration(ms: number): DurationBucket {
  if (!Number.isFinite(ms) || ms < 15_000) return "fast";
  if (ms < 30_000) return "normal";
  if (ms < 60_000) return "slow";
  return "very_slow";
}

function bandFor(score: number): ScoreBand {
  if (score < 40) return "low";
  if (score < 70) return "mid";
  return "high";
}

/** SHA-256(salt + address) as lowercase hex. Used only for the wallet HLL. */
export async function hashWallet(address: string): Promise<string | null> {
  try {
    if (typeof crypto === "undefined" || !crypto.subtle) return null;
    const data = new TextEncoder().encode(WALLET_HASH_SALT + address);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
}

// scan_completed is deduped per browser session: a /w/[address] page re-runs
// its full scan on every load (the scan store is in-memory), so without this a
// refresh or back-navigation would count as a fresh scan. sessionStorage is
// tab-scoped and cleared on tab close — not a cookie, not cross-day tracking.
// An explicit rescan clears the marker via clearScanCount() so it recounts.
const SCAN_COUNTED_PREFIX = "hpiyw:scan-counted:";

function scanAlreadyCounted(address: string): boolean {
  try {
    return sessionStorage.getItem(SCAN_COUNTED_PREFIX + address) !== null;
  } catch {
    return false;
  }
}

function markScanCounted(address: string): void {
  try {
    sessionStorage.setItem(SCAN_COUNTED_PREFIX + address, "1");
  } catch {
    // sessionStorage disabled / full — dedup is best-effort, never blocks.
  }
}

/** Drop the dedup marker for an address so its next completion counts again.
 *  Call on an explicit rescan — a rescan is a deliberate new scan. */
export function clearScanCount(address: string): void {
  try {
    sessionStorage.removeItem(SCAN_COUNTED_PREFIX + address);
  } catch {
    // best-effort
  }
}

/** Build and send a `scan_completed` event from a finished scan. */
export async function trackScanCompleted(
  scan: Scan,
  durationMs: number,
): Promise<void> {
  try {
    // Count once per address per session; an explicit rescan clears the
    // marker first (see clearScanCount) so deliberate rescans still count.
    if (scanAlreadyCounted(scan.address)) return;
    markScanCounted(scan.address);

    const scoreByKey = new Map(scan.factors.map((f) => [f.key, f.score]));

    let weakestKey = scan.factors[0]?.key ?? "identity";
    let weakestScore = Number.POSITIVE_INFINITY;
    for (const f of scan.factors) {
      if (f.score < weakestScore) {
        weakestScore = f.score;
        weakestKey = f.key;
      }
    }

    const props: EventProps = {
      scoreBand: bandFor(scan.totalScore),
      scoreBucket: bucketScore(scan.totalScore),
      weakestFactorKey: weakestKey,
      leakReasonCount: scan.leakReasons.length,
      dustWarningCount: scan.dustWarnings.length,
      durationBucket: bucketDuration(durationMs),
    };
    for (const k of FACTOR_KEYS) {
      const s = scoreByKey.get(k);
      if (s !== undefined) props[k] = s;
    }

    const walletHash = await hashWallet(scan.address);
    if (walletHash) props.walletHash = walletHash;

    track("scan_completed", props);
  } catch {
    // Never let analytics break the scan view.
  }
}
