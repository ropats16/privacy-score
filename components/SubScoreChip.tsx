"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { scoreBand } from "@/lib/scoring";
import type { Factor, FactorKey } from "@/lib/types";
import { FactorIcon } from "./FactorIcon";
import { FactorModal } from "./FactorModal";

type Band = "high" | "mid" | "low";

const BAND_LABEL: Record<Band, string> = {
  high: "private",
  mid: "moderate",
  low: "exposed",
};

const BAND_COLOR: Record<Band, string> = {
  high: "var(--score-high)",
  mid: "var(--score-mid)",
  low: "var(--score-low)",
};

const BAND_SOFT: Record<Band, string> = {
  high: "var(--score-high-soft)",
  mid: "var(--score-mid-soft)",
  low: "var(--score-low-soft)",
};

export function SubScoreChip({
  factor,
  previousScore,
}: {
  factor: Factor;
  previousScore?: number;
}) {
  const [open, setOpen] = useState(false);
  const band = scoreBand(factor.score);
  const color = BAND_COLOR[band];
  const soft = BAND_SOFT[band];
  const stats = subpointsFor(factor);

  return (
    <>
      <div className="card-soft is-interactive p-5 flex flex-col gap-4 relative overflow-hidden">
        {/* Header row */}
        <div className="flex items-center gap-2 min-w-0">
          <span
            aria-hidden
            className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full"
            style={{ background: soft, color }}
          >
            <FactorIcon k={factor.key} size={15} />
          </span>
          <span className="text-[13px] text-ink truncate">{factor.title}</span>
          <span className="ml-auto inline-flex items-center gap-2 text-[10.5px] tracking-[0.2em] lowercase text-muted-2 tabular">
            <span>w {factor.weight}</span>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={`Details for ${factor.title}`}
              className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-rule text-muted hover:border-ink hover:text-ink transition-colors focus-ring"
            >
              <svg
                aria-hidden
                width="11"
                height="11"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <circle cx="8" cy="4.5" r="0.6" fill="currentColor" />
                <path d="M8 7.5v5" />
              </svg>
            </button>
          </span>
        </div>

        {/* Body: score + band + vertical gauge */}
        <div className="grid grid-cols-[1fr_auto] gap-4 items-end">
          <div className="flex flex-col gap-2 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span
                className="score-numeral text-[48px] leading-none tabular"
                style={{ color: "var(--ink)" }}
              >
                {factor.score}
              </span>
              <span className="text-[13px] text-muted tabular">/ 100</span>
              <DeltaPill previousScore={previousScore} score={factor.score} />
            </div>
            <span
              className="inline-flex w-fit items-center gap-1.5 text-[11.5px] tracking-[0.14em] lowercase px-2 py-[3px] rounded-full"
              style={{
                color,
                background: soft,
                boxShadow: `inset 0 0 0 1px ${color}33`,
              }}
            >
              <span aria-hidden className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
              {BAND_LABEL[band]}
            </span>
          </div>
          <VerticalGauge value={factor.score} color={color} />
        </div>

        {/* Stat subpoints */}
        <ul className="flex flex-col mt-1" aria-label="stats">
          {stats.map((s, i) => (
            <li
              key={i}
              className="grid grid-cols-[1fr_max-content] gap-3 py-1.5 text-[12.5px] border-b border-rule-soft last:border-b-0"
            >
              <span className="text-muted leading-snug">{s.label}</span>
              <span
                className="tabular text-ink-soft whitespace-nowrap"
                style={{ color: s.tone === "warn" ? color : undefined }}
              >
                {s.value}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <FactorModal factor={open ? factor : null} onClose={() => setOpen(false)} />
    </>
  );
}

type StatPoint = { label: string; value: string; tone?: "warn" };

function subpointsFor(f: Factor): StatPoint[] {
  switch (f.key) {
    case "identity": {
      const names = Number(f.signals.namesOwned ?? 0);
      const records = Number(f.signals.exposedRecords ?? 0);
      const match = String(f.signals.nameMatchesHandle ?? "no") === "yes";
      return [
        {
          label: "names owned",
          value: names.toString(),
          tone: names > 0 ? "warn" : undefined,
        },
        {
          label: "public records",
          value: records.toString(),
          tone: records > 0 ? "warn" : undefined,
        },
        {
          label: "name → social",
          value: match ? "matched" : "—",
          tone: match ? "warn" : undefined,
        },
      ];
    }
    case "kyc": {
      const dist = String(f.signals.distanceLabel ?? "—");
      const cex = String(f.signals.nearestCex ?? "—");
      const hops = String(f.signals.hops ?? "—");
      const isClose = dist === "direct CEX funding" || dist === "1 hop";
      return [
        { label: "cex distance", value: dist, tone: isClose ? "warn" : undefined },
        { label: "nearest cex", value: cex },
        { label: "hops detected", value: hops },
      ];
    }
    case "cluster": {
      const cp = Number(f.signals.uniqueCounterparties ?? 0);
      const da = Number(f.signals.uniqueDapps ?? 0);
      const tx = Number(f.signals.txCount ?? 0);
      return [
        { label: "counterparties", value: cp.toString(), tone: cp > 30 ? "warn" : undefined },
        { label: "unique dapps", value: da.toString(), tone: da > 20 ? "warn" : undefined },
        { label: "transactions · 90d", value: tx.toString() },
      ];
    }
    case "connected": {
      const active =
        Number(f.signals.activeDelegations ?? 0) +
        Number(f.signals.activeStakeAuthorities ?? 0);
      const stale =
        Number(f.signals.staleDelegations ?? 0) +
        Number(f.signals.staleStakeAuthorities ?? 0);
      const total = Number(f.signals.totalLive ?? active + stale);
      return [
        { label: "active permissions", value: active.toString(), tone: active > 0 ? "warn" : undefined },
        { label: "stale permissions", value: stale.toString(), tone: stale > 0 ? "warn" : undefined },
        { label: "total live", value: total.toString() },
      ];
    }
    case "wealth": {
      const total = String(f.signals.usdTotal ?? "—");
      const sol = String(f.signals.solUsd ?? "—");
      const spl = String(f.signals.splUsd ?? "—");
      return [
        { label: "visible value", value: total },
        { label: "sol", value: sol },
        { label: "priced spl", value: spl },
      ];
    }
    case "surveillance": {
      const outbound = Number(f.signals.outboundFlagged ?? 0);
      const inbound = Number(f.signals.inboundFlagged ?? 0);
      const severity = String(f.signals.severity ?? "none");
      return [
        {
          label: "outbound flagged",
          value: outbound.toString(),
          tone: outbound > 0 ? "warn" : undefined,
        },
        {
          label: "inbound flagged",
          value: inbound.toString(),
          tone: inbound > 0 ? "warn" : undefined,
        },
        {
          label: "severity",
          value: severity,
          tone: severity === "material" ? "warn" : undefined,
        },
      ];
    }
  }
}

function VerticalGauge({ value, color }: { value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      aria-hidden
      className="relative rounded-full overflow-hidden flex items-end"
      style={{
        width: 18,
        height: 80,
        background: "rgba(20,17,13,0.05)",
        boxShadow: "inset 0 0 0 1px rgba(20,17,13,0.05)",
      }}
    >
      <motion.span
        initial={{ height: "0%" }}
        animate={{ height: `${pct}%` }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-x-0 bottom-0 rounded-full"
        style={{ background: color }}
      />
      <motion.span
        initial={{ bottom: "0%" }}
        animate={{ bottom: `calc(${pct}% - 5px)` }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 bg-paper"
        style={{ borderColor: color }}
      />
    </div>
  );
}

function DeltaPill({
  previousScore,
  score,
}: {
  previousScore?: number;
  score: number;
}) {
  if (typeof previousScore !== "number") return null;
  const delta = score - previousScore;
  if (delta === 0) return null;
  const up = delta > 0;
  const color = up ? "var(--score-high)" : "var(--score-low)";
  return (
    <motion.span
      key={`${previousScore}-${score}`}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="ml-1 inline-flex items-center gap-1 text-[10.5px] tabular px-1.5 py-[2px] rounded-full"
      style={{
        color,
        background: `${color}14`,
      }}
    >
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      <span>
        {up ? "+" : ""}
        {delta}
      </span>
    </motion.span>
  );
}

export type { FactorKey };
