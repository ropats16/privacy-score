"use client";

import { useState, useId } from "react";
import { motion, AnimatePresence } from "motion/react";
import { scoreBand } from "@/lib/scoring";
import { RUBRIC_BY_FACTOR } from "@/lib/rubrics";
import type { Factor } from "@/lib/types";

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
  const swatch =
    band === "high"
      ? "var(--score-high)"
      : band === "mid"
        ? "var(--score-mid)"
        : "var(--score-low)";

  return (
    <div className="flex flex-col gap-3 p-5 border border-rule bg-paper-2/40 rounded-sm min-w-0">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] tracking-[0.2em] lowercase text-muted">
          {factor.title}
        </span>
        <span
          aria-hidden
          className="w-2 h-2 rounded-full"
          style={{ background: swatch }}
        />
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className="score-numeral text-[56px] leading-none"
          style={{ color: "var(--ink)" }}
        >
          {factor.score}
        </span>
        <span className="text-[14px] text-muted tabular">/ 100</span>
        <DeltaPill previousScore={previousScore} score={factor.score} />
      </div>
      <div className="flex flex-col gap-1 text-[12px] text-muted">
        {Object.entries(factor.signals)
          .filter(([k]) => k !== "windowDays")
          .map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2">
              <span className="capitalize">{humanize(k)}</span>
              <span className="tabular text-ink-soft">{String(v)}</span>
            </div>
          ))}
      </div>

      {rubric && (
        <div className="pt-3 border-t border-rule-soft -mx-1 px-1">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={panelId}
            className="w-full flex items-center justify-between gap-2 text-[11px] tracking-[0.18em] lowercase text-muted hover:text-ink transition-colors focus-ring rounded-sm"
          >
            <span>{open ? "Hide rubric" : "Show rubric"}</span>
            <span
              aria-hidden
              className={`inline-block transition-transform ${open ? "rotate-180" : ""}`}
            >
              ⌄
            </span>
          </button>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                id={panelId}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p className="text-[12px] text-ink-soft leading-relaxed mt-3 max-w-[44ch]">
                  {rubric.measures}
                </p>
                <ul className="flex flex-col mt-3 border-t border-rule-soft">
                  {rubric.steps.map((s, i) => (
                    <li
                      key={i}
                      className="grid grid-cols-[1fr_max-content] gap-3 py-2 border-b border-rule-soft text-[12px]"
                    >
                      <span className="text-ink-soft leading-snug">{s.when}</span>
                      <span className="tabular text-muted whitespace-nowrap">
                        {s.effect}
                      </span>
                    </li>
                  ))}
                </ul>
                {rubric.note && (
                  <p className="text-[11px] text-muted leading-relaxed mt-2 max-w-[44ch]">
                    {rubric.note}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
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
      className="ml-auto inline-flex items-center gap-1 text-[11px] tabular px-1.5 py-0.5 rounded-full border"
      style={{ color, borderColor: color, background: "transparent" }}
    >
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      <span>
        {up ? "+" : ""}
        {delta}
      </span>
    </motion.span>
  );
}
