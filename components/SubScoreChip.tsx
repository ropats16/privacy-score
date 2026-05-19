"use client";

import { useState, useId } from "react";
import { motion, AnimatePresence } from "motion/react";
import { scoreBand } from "@/lib/scoring";
import { RUBRIC_BY_FACTOR } from "@/lib/rubrics";
import type { Factor } from "@/lib/types";
import { FactorIcon } from "./FactorIcon";

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

const BAND_ARROW: Record<Band, string> = {
  high: "✓",
  mid: "↓",
  low: "↓",
};

export function SubScoreChip({
  factor,
  previousScore,
}: {
  factor: Factor;
  previousScore?: number;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rubric = RUBRIC_BY_FACTOR[factor.key];
  const band = scoreBand(factor.score);
  const color = BAND_COLOR[band];

  return (
    <div className="card-soft p-5 flex flex-col gap-4 relative">
      {/* Header row: icon + title + info button */}
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-muted-2 shrink-0">
            <FactorIcon k={factor.key} size={18} />
          </span>
          <span className="text-[13px] text-ink truncate">{factor.title}</span>
        </div>
        {rubric && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? "Hide details" : "Show details"}
            className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full border border-rule text-muted hover:border-ink hover:text-ink transition-colors focus-ring"
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
        )}
      </div>

      {/* Body: score + vertical gauge */}
      <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex items-baseline gap-1">
            <span
              className="score-numeral text-[44px] leading-none tabular"
              style={{ color: "var(--ink)" }}
            >
              {factor.score}
            </span>
            <span className="text-[13px] text-muted tabular">/ 100</span>
            <DeltaPill previousScore={previousScore} score={factor.score} />
          </div>
          <div
            className="inline-flex items-center gap-1.5 text-[13px]"
            style={{ color }}
          >
            <span
              aria-hidden
              className="inline-flex items-center justify-center w-4 h-4 rounded-full"
              style={{ background: `${color}22` }}
            >
              <span className="text-[10px] leading-none">{BAND_ARROW[band]}</span>
            </span>
            <span>{BAND_LABEL[band]}</span>
          </div>
        </div>
        <VerticalGauge value={factor.score} color={color} />
      </div>

      {/* Expandable info panel (triggered by 'i' button) */}
      {rubric && (
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id={panelId}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-1 border-t border-rule-soft flex flex-col gap-3">
                <p className="text-[12.5px] text-ink-soft leading-relaxed max-w-[44ch]">
                  {rubric.measures}
                </p>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] tracking-[0.2em] lowercase text-muted">
                    rubric
                  </span>
                  <ul className="flex flex-col">
                    {rubric.steps.map((s, i) => (
                      <li
                        key={i}
                        className="grid grid-cols-[1fr_max-content] gap-3 py-1.5 text-[12px] border-b border-rule-soft last:border-b-0"
                      >
                        <span className="text-ink-soft leading-snug">
                          {s.when}
                        </span>
                        <span className="tabular text-muted whitespace-nowrap">
                          {s.effect}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] tracking-[0.2em] lowercase text-muted">
                    signals from this scan
                  </span>
                  <ul className="flex flex-col">
                    {Object.entries(factor.signals)
                      .filter(([k]) => k !== "windowDays")
                      .map(([k, v]) => (
                        <li
                          key={k}
                          className="grid grid-cols-[1fr_max-content] gap-3 py-1.5 text-[12px] border-b border-rule-soft last:border-b-0"
                        >
                          <span className="capitalize text-muted">
                            {humanize(k)}
                          </span>
                          <span className="tabular text-ink-soft whitespace-nowrap">
                            {String(v)}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
                {rubric.note && (
                  <p className="text-[11px] text-muted leading-relaxed max-w-[44ch]">
                    {rubric.note}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

function VerticalGauge({ value, color }: { value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      aria-hidden
      className="relative rounded-full overflow-hidden flex items-end"
      style={{
        width: 18,
        height: 64,
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

function humanize(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
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
