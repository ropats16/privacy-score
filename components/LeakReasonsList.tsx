"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { LeakReason } from "@/lib/types";
import { FactorIcon } from "./FactorIcon";
import { ToolIcon } from "./ToolIcon";

type Severity = LeakReason["severity"];

const SEV_COLOR: Record<Severity, string> = {
  high: "var(--score-low)",
  medium: "var(--score-mid)",
  low: "var(--score-high)",
};

const SEV_DOT: Record<Severity, string> = {
  high: "exposed",
  medium: "moderate",
  low: "minor",
};

export function LeakReasonsList({ reasons }: { reasons: LeakReason[] }) {
  if (reasons.length === 0) {
    return (
      <div className="card-soft px-6 py-7">
        <p className="font-display text-[20px] text-ink-soft">
          nothing pressing to fix.
        </p>
        <p className="text-[13px] text-muted mt-2 max-w-[52ch]">
          no factor scored below the leak threshold this scan. re scan after
          future activity to keep an eye on drift.
        </p>
      </div>
    );
  }

  return (
    <ol className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {reasons.map((r, i) => (
        <LeakReasonCard key={r.factorKey} index={i + 1} reason={r} />
      ))}
    </ol>
  );
}

function LeakReasonCard({ index, reason }: { index: number; reason: LeakReason }) {
  const [actionOpen, setActionOpen] = useState(false);
  const sev = reason.severity;
  const sevColor = SEV_COLOR[sev];

  return (
    <li
      className="relative card-soft overflow-hidden transition-all duration-300 hover:-translate-y-0.5 group"
      style={{
        // hover state nudges the layered shadow downward
      }}
    >
      {/* Left severity strip */}
      <span
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: sevColor }}
      />

      <div className="pl-5 pr-5 py-5 flex flex-col gap-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 text-[11px] tracking-[0.22em] lowercase text-muted">
            <span className="tabular text-muted-2">
              {String(index).padStart(2, "0")}
            </span>
            <span aria-hidden className="text-muted-2">·</span>
            <span style={{ color: sevColor }}>{SEV_DOT[sev]}</span>
          </div>
          <LiftBadge value={reason.estimatedLift} />
        </div>

        {/* Title + body */}
        <div className="flex items-start gap-3">
          <span className="text-muted-2 mt-1 shrink-0">
            <FactorIcon k={reason.factorKey} size={18} />
          </span>
          <div className="flex flex-col gap-1.5 min-w-0">
            <h3 className="font-display text-[17px] md:text-[18px] leading-snug tracking-[-0.01em] text-ink">
              {reason.title}
            </h3>
            <p className="text-[13px] leading-[1.5] text-ink-soft">
              {reason.plainEnglish}
            </p>
          </div>
        </div>

        {/* Recommended action — collapsed by default */}
        <div className="mt-1 border-t border-rule-soft pt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setActionOpen((v) => !v)}
            aria-expanded={actionOpen}
            className="flex items-center justify-between gap-3 text-left w-full focus-ring rounded-sm"
          >
            <span className="flex items-center gap-2 text-[11px] tracking-[0.2em] lowercase text-muted group-hover:text-ink transition-colors">
              <span aria-hidden className="w-4 h-px bg-rule" />
              <span>recommended action</span>
            </span>
            <span
              aria-hidden
              className={`text-muted text-[12px] transition-transform ${actionOpen ? "rotate-180" : ""}`}
            >
              ⌄
            </span>
          </button>
          <h4 className="text-[14px] text-ink leading-snug">
            {reason.recommendation.headline}
          </h4>
          <AnimatePresence initial={false}>
            {actionOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-3 pt-1">
                  <p className="text-[12.5px] text-muted leading-[1.55]">
                    {reason.recommendation.detail}
                  </p>
                  {reason.recommendation.links.length > 0 && (
                    <ul className="flex flex-col gap-2">
                      {reason.recommendation.links.map((link) => (
                        <li key={link.url}>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-2.5 group/link p-2 -mx-2 rounded-md hover:bg-[rgba(20,17,13,0.04)] transition-colors"
                          >
                            <ToolIcon url={link.url} size={26} />
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className="text-[13px] text-ink group-hover/link:underline decoration-rule decoration-1 underline-offset-[4px]">
                                {link.label}
                              </span>
                              {link.blurb && (
                                <span className="text-[11.5px] text-muted leading-[1.45]">
                                  {link.blurb}
                                </span>
                              )}
                            </div>
                            <span aria-hidden className="text-muted-2 text-[11px] mt-0.5">
                              ↗
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </li>
  );
}

function LiftBadge({ value }: { value: number }) {
  const positive = value > 0;
  const color = positive ? "var(--score-high)" : "var(--muted-2)";
  return (
    <span
      className="inline-flex items-center gap-1 tabular px-2 py-[3px] rounded-full text-[11.5px] font-medium"
      style={{
        color,
        background: positive ? "rgba(79,122,74,0.10)" : "rgba(20,17,13,0.04)",
        boxShadow: positive ? "inset 0 0 0 1px rgba(79,122,74,0.18)" : "none",
      }}
      title="estimated lift to total score"
    >
      <span aria-hidden>▲</span>
      <span>+{value} pts</span>
    </span>
  );
}
