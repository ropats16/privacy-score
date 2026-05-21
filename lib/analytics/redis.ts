// Server-side analytics store — Upstash Redis.
//
// All keys live under the `a:` namespace. Counters use INCR/HINCRBY; unique
// counts use HyperLogLog (PFADD/PFCOUNT) so we get approximate uniques while
// storing nothing that can be inverted back to a person or an address.
// Dated keys carry a ~90-day TTL; all-time aggregates persist.

import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { FACTOR_KEYS, type ValidatedEvent } from "./events";

// ~90 days, in seconds. Dated keys expire to stay within the free tier.
const DAY_TTL = 60 * 60 * 24 * 90;

// Mirrors the leak-reason FLOOR in lib/leak-reasons.ts: a factor scoring below
// this is surfaced as a leak. Used to derive per-factor leak frequency.
const LEAK_FLOOR = 80;

// Per-IP event rate limit — keeps bot/spam traffic from inflating counters.
export const EVENT_RATE_LIMIT_PER_MIN = 20;

const PREFIX = "a:";
const k = (...parts: (string | number)[]) => PREFIX + parts.join(":");

let redisClient: Redis | null = null;
let redisResolved = false;

/** Lazily build the Redis client. Returns null when not configured — callers
 *  must degrade gracefully (the event endpoint still 204s, admin shows a note). */
export function getRedis(): Redis | null {
  if (redisResolved) return redisClient;
  redisResolved = true;
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (url && token) {
    redisClient = new Redis({ url, token });
  }
  return redisClient;
}

let ratelimiter: Ratelimit | null = null;

export function getRatelimit(redis: Redis): Ratelimit {
  if (!ratelimiter) {
    ratelimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(EVENT_RATE_LIMIT_PER_MIN, "60 s"),
      prefix: k("rl"),
      analytics: false,
    });
  }
  return ratelimiter;
}

/** UTC date bucket — `YYYY-MM-DD`. The UTC date is also a component of the
 *  visitor hash, making cross-day correlation impossible. */
export function utcDateString(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

type WriteContext = {
  date: string;
  visitorHash: string;
  country: string | null;
};

/** Apply one validated event to the store. One pipelined round-trip. */
export async function writeEvent(
  redis: Redis,
  { event, props }: ValidatedEvent,
  ctx: WriteContext,
): Promise<void> {
  const p = redis.pipeline();
  const { date } = ctx;

  const bumpDaily = (base: string) => {
    p.incr(k(base, date));
    p.expire(k(base, date), DAY_TTL);
  };

  // Every event: an all-time and a dated per-event counter.
  p.incr(k("ev", event));
  bumpDaily(`ev:${event}`);

  switch (event) {
    case "page_view": {
      const page = String(props.page);
      p.incr(k("pv", page));
      bumpDaily(`pv:${page}`);
      p.pfadd(k("hll", "v", "all"), ctx.visitorHash);
      p.pfadd(k("hll", "v", date), ctx.visitorHash);
      p.expire(k("hll", "v", date), DAY_TTL);
      if (ctx.country) p.hincrby(k("geo", "country"), ctx.country, 1);
      if (props.ref) p.hincrby(k("ref", "host"), String(props.ref), 1);
      if (props.utmCampaign) {
        p.hincrby(k("utm", "campaign"), String(props.utmCampaign), 1);
      }
      if (props.utmSource) {
        p.hincrby(k("utm", "source"), String(props.utmSource), 1);
      }
      break;
    }
    case "scan_started": {
      p.hincrby(k("input", "type"), String(props.inputType), 1);
      break;
    }
    case "scan_completed": {
      p.incr(k("scans", "total"));
      p.hincrby(k("score", "band"), String(props.scoreBand), 1);
      p.hincrby(k("score", "bucket"), String(props.scoreBucket), 1);
      p.hincrby(k("weakest", "factor"), String(props.weakestFactorKey), 1);
      for (const factor of FACTOR_KEYS) {
        const s = props[factor];
        if (typeof s === "number" && s < LEAK_FLOOR) {
          p.hincrby(k("leak", "factor"), factor, 1);
        }
      }
      if (typeof props.leakReasonCount === "number") {
        p.incrby(k("sum", "leakcount"), props.leakReasonCount);
      }
      if (typeof props.dustWarningCount === "number") {
        p.incrby(k("sum", "dustcount"), props.dustWarningCount);
      }
      if (props.durationBucket) {
        p.hincrby(k("scan", "duration"), String(props.durationBucket), 1);
      }
      if (props.walletHash) {
        const hash = String(props.walletHash);
        p.pfadd(k("hll", "w", "all"), hash);
        p.pfadd(k("hll", "w", date), hash);
        p.expire(k("hll", "w", date), DAY_TTL);
      }
      break;
    }
    case "scan_failed": {
      p.hincrby(k("error", "type"), String(props.errorType), 1);
      break;
    }
    case "share_clicked": {
      if (props.method) p.hincrby(k("share", "method"), String(props.method), 1);
      break;
    }
    case "comparison_run": {
      if (props.direction) {
        p.hincrby(k("comparison", "direction"), String(props.direction), 1);
      }
      break;
    }
  }

  await p.exec();
}

// --- Dashboard reads ------------------------------------------------------

export type HashEntry = { key: string; count: number };

export type DashboardData = {
  configured: true;
  generatedAt: number;
  windowDays: number;
  allTime: {
    scans: number;
    uniqueVisitors: number;
    uniqueWallets: number;
    pageViews: { landing: number; scan_result: number; methodology: number };
    events: {
      page_view: number;
      scan_started: number;
      scan_completed: number;
      scan_failed: number;
      share_clicked: number;
      comparison_run: number;
    };
    leakCountSum: number;
    dustCountSum: number;
  };
  series: {
    dates: string[];
    visitors: number[];
    scans: number[];
    failures: number[];
    landingViews: number[];
  };
  breakdowns: {
    countries: HashEntry[];
    referrers: HashEntry[];
    utmCampaigns: HashEntry[];
    utmSources: HashEntry[];
    inputTypes: HashEntry[];
    errorTypes: HashEntry[];
    scoreBands: HashEntry[];
    scoreBuckets: HashEntry[];
    weakestFactors: HashEntry[];
    leakFactors: HashEntry[];
    durations: HashEntry[];
    shareMethods: HashEntry[];
    comparisonDirections: HashEntry[];
  };
};

export type DashboardResult = DashboardData | { configured: false };

// Trend window. Capped at the dated-key TTL (~90d) — the full span the store
// retains, so the charts show everything that exists.
const SERIES_DAYS = 90;

function lastDates(n: number): string[] {
  const out: string[] = [];
  const now = Date.now();
  for (let i = n - 1; i >= 0; i--) {
    out.push(utcDateString(new Date(now - i * 86_400_000)));
  }
  return out;
}

function toInt(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function toEntries(v: unknown): HashEntry[] {
  if (!v || typeof v !== "object") return [];
  return Object.entries(v as Record<string, unknown>)
    .map(([key, count]) => ({ key, count: toInt(count) }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count);
}

/** Read every aggregate the admin dashboard needs. Two pipelined round-trips. */
export async function getDashboardData(): Promise<DashboardResult> {
  const redis = getRedis();
  if (!redis) return { configured: false };

  const dates = lastDates(SERIES_DAYS);

  // Pipeline A — scalars + hashes, parsed in push order.
  const a = redis.pipeline();
  a.get(k("scans", "total")); //                                0
  a.pfcount(k("hll", "v", "all")); //                           1
  a.pfcount(k("hll", "w", "all")); //                           2
  a.get(k("pv", "landing")); //                                 3
  a.get(k("pv", "scan_result")); //                             4
  a.get(k("pv", "methodology")); //                             5
  a.get(k("ev", "page_view")); //                               6
  a.get(k("ev", "scan_started")); //                            7
  a.get(k("ev", "scan_completed")); //                          8
  a.get(k("ev", "scan_failed")); //                             9
  a.get(k("ev", "share_clicked")); //                          10
  a.get(k("ev", "comparison_run")); //                         11
  a.get(k("sum", "leakcount")); //                             12
  a.get(k("sum", "dustcount")); //                             13
  a.hgetall(k("geo", "country")); //                           14
  a.hgetall(k("ref", "host")); //                              15
  a.hgetall(k("utm", "campaign")); //                          16
  a.hgetall(k("utm", "source")); //                            17
  a.hgetall(k("input", "type")); //                            18
  a.hgetall(k("error", "type")); //                            19
  a.hgetall(k("score", "band")); //                            20
  a.hgetall(k("score", "bucket")); //                          21
  a.hgetall(k("weakest", "factor")); //                        22
  a.hgetall(k("leak", "factor")); //                           23
  a.hgetall(k("scan", "duration")); //                         24
  a.hgetall(k("share", "method")); //                          25
  a.hgetall(k("comparison", "direction")); //                  26

  // Pipeline B — per-day series, four contiguous blocks of SERIES_DAYS.
  const b = redis.pipeline();
  for (const d of dates) b.pfcount(k("hll", "v", d));
  for (const d of dates) b.get(k("ev", "scan_completed", d));
  for (const d of dates) b.get(k("ev", "scan_failed", d));
  for (const d of dates) b.get(k("pv", "landing", d));

  const [ra, rb] = await Promise.all([a.exec(), b.exec()]);

  const block = (offset: number) =>
    rb.slice(offset, offset + SERIES_DAYS).map(toInt);

  return {
    configured: true,
    generatedAt: Date.now(),
    windowDays: SERIES_DAYS,
    allTime: {
      scans: toInt(ra[0]),
      uniqueVisitors: toInt(ra[1]),
      uniqueWallets: toInt(ra[2]),
      pageViews: {
        landing: toInt(ra[3]),
        scan_result: toInt(ra[4]),
        methodology: toInt(ra[5]),
      },
      events: {
        page_view: toInt(ra[6]),
        scan_started: toInt(ra[7]),
        scan_completed: toInt(ra[8]),
        scan_failed: toInt(ra[9]),
        share_clicked: toInt(ra[10]),
        comparison_run: toInt(ra[11]),
      },
      leakCountSum: toInt(ra[12]),
      dustCountSum: toInt(ra[13]),
    },
    series: {
      dates,
      visitors: block(0),
      scans: block(SERIES_DAYS),
      failures: block(SERIES_DAYS * 2),
      landingViews: block(SERIES_DAYS * 3),
    },
    breakdowns: {
      countries: toEntries(ra[14]),
      referrers: toEntries(ra[15]),
      utmCampaigns: toEntries(ra[16]),
      utmSources: toEntries(ra[17]),
      inputTypes: toEntries(ra[18]),
      errorTypes: toEntries(ra[19]),
      scoreBands: toEntries(ra[20]),
      scoreBuckets: toEntries(ra[21]),
      weakestFactors: toEntries(ra[22]),
      leakFactors: toEntries(ra[23]),
      durations: toEntries(ra[24]),
      shareMethods: toEntries(ra[25]),
      comparisonDirections: toEntries(ra[26]),
    },
  };
}
