// Pure scoring functions. Fully unit-testable. No I/O.

import type { DustWarning, Factor, LeakReason, Scan } from "./types";
import { WEIGHTS } from "./rubrics";
import { buildLeakReason } from "./leak-reasons";

/** Identity exposure rubric, codified from rubrics.ts.
 *  Start at 100 if no names. With names but no records, cap at 80.
 *  −25 per exposed record (twitter, url, email, telegram, discord, github).
 *  −25 if a name matches its declared social handle. −5 per extra name.
 *  Floor at 0. */
export function scoreIdentity(input: {
  nameCount: number;
  exposedRecordCount: number;
  nameMatchesHandle: boolean;
}): {
  score: number;
  signals: {
    namesOwned: number;
    exposedRecords: number;
    nameMatchesHandle: string;
  };
} {
  const { nameCount, exposedRecordCount, nameMatchesHandle } = input;
  let score: number;
  if (nameCount === 0) {
    score = 100;
  } else {
    score = 80;
    score -= exposedRecordCount * 25;
    if (nameMatchesHandle) score -= 25;
    score -= Math.max(0, nameCount - 1) * 5;
    if (score < 0) score = 0;
    if (score > 100) score = 100;
  }
  return {
    score,
    signals: {
      namesOwned: nameCount,
      exposedRecords: exposedRecordCount,
      nameMatchesHandle: nameMatchesHandle ? "yes" : "no",
    },
  };
}

/** Surveillance rubric: 100 with no flagged interactions. Inbound contact
 *  with a flagged address is informational (capped penalty). Outbound
 *  transfers are the material risk. */
export function scoreSurveillance(input: {
  inboundFlagged: number;
  outboundFlagged: number;
}): {
  score: number;
  signals: {
    inboundFlagged: number;
    outboundFlagged: number;
    severity: string;
  };
} {
  const { inboundFlagged, outboundFlagged } = input;
  const inboundPenalty = Math.min(40, inboundFlagged * 10);
  const outboundPenalty = outboundFlagged * 50;
  let score = 100 - inboundPenalty - outboundPenalty;
  if (score < 0) score = 0;
  if (score > 100) score = 100;
  const severity =
    outboundFlagged > 0
      ? "material"
      : inboundFlagged > 0
        ? "informational"
        : "none";
  return {
    score,
    signals: { inboundFlagged, outboundFlagged, severity },
  };
}

/** Cluster footprint rubric, codified from rubrics.ts:
 *  100 if ≤5 counterparties AND ≤5 dApps. Linear decay to 0 at ≥100 counterparties OR ≥50 dApps. */
export function scoreCluster(input: {
  uniqueCounterparties: number;
  uniqueDapps: number;
}): { score: number; signals: { uniqueCounterparties: number; uniqueDapps: number; windowDays: 90 } } {
  const { uniqueCounterparties, uniqueDapps } = input;

  const cpPenalty = clamp01((uniqueCounterparties - 5) / (100 - 5));
  const dappPenalty = clamp01((uniqueDapps - 5) / (50 - 5));
  const penalty = Math.max(cpPenalty, dappPenalty);
  const score = Math.round(100 * (1 - penalty));

  return {
    score,
    signals: { uniqueCounterparties, uniqueDapps, windowDays: 90 },
  };
}

/** KYC distance rubric: 0 at direct CEX, 25 / 50 / 75 at 1 / 2 / 3 hops,
 *  100 at 4+ hops or no detectable linkage. We only resolve hops 0 and 1
 *  in v1; everything else collapses to "100 / not detected". */
export function scoreKyc(input: {
  hops: number | null; // null = no link found
  nearestCex: string | null;
}): {
  score: number;
  signals: {
    hops: string;
    nearestCex: string;
    distanceLabel: string;
  };
} {
  const { hops, nearestCex } = input;
  let score: number;
  let distanceLabel: string;
  if (hops === null) {
    score = 100;
    distanceLabel = "4+ hops or unlinked";
  } else if (hops <= 0) {
    score = 0;
    distanceLabel = "direct CEX funding";
  } else if (hops === 1) {
    score = 25;
    distanceLabel = "1 hop";
  } else if (hops === 2) {
    score = 50;
    distanceLabel = "2 hops";
  } else if (hops === 3) {
    score = 75;
    distanceLabel = "3 hops";
  } else {
    score = 100;
    distanceLabel = "4+ hops or unlinked";
  }
  return {
    score,
    signals: {
      hops: hops === null ? "none detected" : String(hops),
      nearestCex: nearestCex ?? "none detected",
      distanceLabel,
    },
  };
}

/** Connected apps rubric:
 *  Start at 100. −10 per live (recently-used) delegation/authority. −20 per stale one.
 *  Floor at 0. Counts both SPL token delegations and stake-account authorities. */
export function scoreConnected(input: {
  activeDelegations: number;
  staleDelegations: number;
  activeStakeAuthorities: number;
  staleStakeAuthorities: number;
}): {
  score: number;
  signals: {
    activeDelegations: number;
    staleDelegations: number;
    activeStakeAuthorities: number;
    staleStakeAuthorities: number;
    totalLive: number;
  };
} {
  const active = input.activeDelegations + input.activeStakeAuthorities;
  const stale = input.staleDelegations + input.staleStakeAuthorities;
  const raw = 100 - active * 10 - stale * 20;
  const score = Math.max(0, Math.min(100, raw));
  return {
    score,
    signals: {
      activeDelegations: input.activeDelegations,
      staleDelegations: input.staleDelegations,
      activeStakeAuthorities: input.activeStakeAuthorities,
      staleStakeAuthorities: input.staleStakeAuthorities,
      totalLive: active + stale,
    },
  };
}

/** Visible wealth rubric, log-scaled between $1k and $10M.
 *  100 ≤ $1k, 75 ≈ $10k, 50 ≈ $100k, 25 ≈ $1M, 0 ≥ $10M. */
export function scoreWealth(input: {
  usdTotal: number;
  solUsd: number;
  splUsd: number;
  pricedAssets: number;
  unpricedAssets: number;
}): {
  score: number;
  signals: {
    usdTotal: string;
    solUsd: string;
    splUsd: string;
    pricedAssets: number;
    unpricedAssets: number;
  };
} {
  const v = Math.max(0, input.usdTotal);
  let score: number;
  if (v < 1_000) {
    score = 100;
  } else if (v >= 10_000_000) {
    score = 0;
  } else {
    // Linear in log10 between $1k (100) and $10M (0). 4 decades, 25 pts each.
    const t = (Math.log10(v) - 3) / 4;
    score = Math.round(100 * (1 - t));
    if (score < 0) score = 0;
    if (score > 100) score = 100;
  }
  return {
    score,
    signals: {
      usdTotal: formatUsd(v),
      solUsd: formatUsd(input.solUsd),
      splUsd: formatUsd(input.splUsd),
      pricedAssets: input.pricedAssets,
      unpricedAssets: input.unpricedAssets,
    },
  };
}

function formatUsd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

/** Weighted average across whatever factors are present.
 *  In Phase 1 there's only one (Cluster), so total === cluster score.
 *  As more factors come online, this naturally rebalances. */
export function totalScore(factors: Factor[]): number {
  if (factors.length === 0) return 0;
  let num = 0;
  let denom = 0;
  for (const f of factors) {
    num += f.score * f.weight;
    denom += f.weight;
  }
  return Math.round(num / denom);
}

/** Color band for a 0–100 score. Used by sub-score chips and the hero. */
export function scoreBand(score: number): "low" | "mid" | "high" {
  if (score < 40) return "low";
  if (score < 70) return "mid";
  return "high";
}

export function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

export function buildScan(input: {
  address: string;
  factors: Factor[];
  dustWarnings?: DustWarning[];
}): Scan {
  return {
    address: input.address,
    scannedAt: Date.now(),
    windowDays: 90,
    factors: input.factors,
    leakReasons: rankLeakReasons(input.factors),
    dustWarnings: input.dustWarnings ?? [],
    totalScore: totalScore(input.factors),
  };
}

/** Build leak reasons across all factors, sort by descending estimated lift,
 *  cap at the top 3 as per PRD. */
export function rankLeakReasons(factors: Factor[]): LeakReason[] {
  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const reasons: LeakReason[] = [];
  for (const f of factors) {
    const r = buildLeakReason(f, totalWeight);
    if (r) reasons.push(r);
  }
  reasons.sort((a, b) => b.estimatedLift - a.estimatedLift);
  return reasons.slice(0, 3);
}

export { WEIGHTS };
