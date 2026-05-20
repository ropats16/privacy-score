"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { createPortal } from "react-dom";
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

const BAND_SOFT: Record<Band, string> = {
  high: "var(--score-high-soft)",
  mid: "var(--score-mid-soft)",
  low: "var(--score-low-soft)",
};

export function FactorModal({
  factor,
  onClose,
}: {
  factor: Factor | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!factor) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [factor, onClose]);

  if (typeof window === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {factor && <FactorModalInner factor={factor} onClose={onClose} />}
    </AnimatePresence>,
    document.body
  );
}

function FactorModalInner({
  factor,
  onClose,
}: {
  factor: Factor;
  onClose: () => void;
}) {
  const rubric = RUBRIC_BY_FACTOR[factor.key];
  const band = scoreBand(factor.score);
  const color = BAND_COLOR[band];
  const soft = BAND_SOFT[band];
  const signals = Object.entries(factor.signals).filter(
    ([k]) => k !== "windowDays"
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center px-4 py-6 md:p-10"
      style={{
        background: "rgba(20,17,13,0.32)",
        backdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="card-soft w-full max-w-[640px] max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${factor.title} details`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 md:p-8 pb-5 border-b border-rule-soft">
          <div className="flex items-center gap-3 min-w-0">
            <span
              aria-hidden
              className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full"
              style={{ background: soft, color }}
            >
              <FactorIcon k={factor.key} size={20} />
            </span>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[10.5px] tracking-[0.22em] lowercase text-muted">
                factor · weight {factor.weight}%
              </span>
              <h3 className="font-display text-[22px] md:text-[26px] leading-tight tracking-[-0.015em] text-ink">
                {factor.title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full border border-rule text-muted hover:border-ink hover:text-ink transition-colors focus-ring"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
          </button>
        </div>

        {/* Score + band */}
        <div className="px-6 md:px-8 py-5 flex items-baseline gap-4 border-b border-rule-soft">
          <span
            className="score-numeral text-[64px] leading-none tabular"
            style={{ color: "var(--ink)" }}
          >
            {factor.score}
          </span>
          <span className="text-[14px] text-muted tabular">/ 100</span>
          <span
            className="ml-auto inline-flex items-center gap-1.5 text-[12px] tracking-[0.14em] lowercase px-2.5 py-1 rounded-full"
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

        {/* Signals from this scan */}
        <section className="px-6 md:px-8 py-5 flex flex-col gap-3 border-b border-rule-soft">
          <span className="text-[10.5px] tracking-[0.22em] lowercase text-muted">
            signals from this scan
          </span>
          <ul className="flex flex-col">
            {signals.map(([k, v]) => (
              <li
                key={k}
                className="grid grid-cols-[1fr_max-content] gap-3 py-2 text-[13px] border-b border-rule-soft last:border-b-0"
              >
                <span className="text-muted leading-snug">{humanize(k)}</span>
                <span className="tabular text-ink-soft whitespace-nowrap text-right max-w-[40ch] truncate">
                  {String(v)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Rubric */}
        {rubric && (
          <section
            className="px-6 md:px-8 py-5 flex flex-col gap-3 border-b border-rule-soft"
            style={{ background: "var(--paper)" }}
          >
            <span className="text-[10.5px] tracking-[0.22em] lowercase text-muted">
              how this is scored
            </span>
            <p className="text-[13.5px] leading-[1.55] text-ink-soft max-w-[58ch]">
              {rubric.measures}
            </p>
            <ul className="flex flex-col mt-1">
              {rubric.steps.map((s, i) => (
                <li
                  key={i}
                  className="grid grid-cols-[1fr_max-content] gap-3 py-2 text-[13px] border-b border-rule-soft last:border-b-0"
                >
                  <span className="text-ink-soft leading-snug">{s.when}</span>
                  <span className="tabular text-muted whitespace-nowrap">
                    {s.effect}
                  </span>
                </li>
              ))}
            </ul>
            {rubric.note && (
              <p className="text-[12px] leading-[1.6] text-muted max-w-[58ch] mt-1">
                {rubric.note}
              </p>
            )}
          </section>
        )}
      </motion.div>
    </motion.div>
  );
}

function humanize(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
