"use client";

import { motion, AnimatePresence } from "motion/react";
import type { FactorKey, FactorProgress } from "@/lib/types";

export function FactorProgressList({
  items,
  previousScores,
}: {
  items: FactorProgress[];
  previousScores?: Partial<Record<FactorKey, number>>;
}) {
  return (
    <ul className="flex flex-col">
      {items.map((it) => {
        const prev = previousScores?.[it.key];
        return (
        <li
          key={it.key}
          className="flex items-center justify-between py-3 border-b border-rule-soft"
        >
          <div className="flex items-center gap-3">
            <StatusDot status={it.status} />
            <span
              className={`text-[14px] ${it.status === "pending" ? "text-muted" : "text-ink-soft"} ${it.status === "running" ? "pulse-soft" : ""}`}
            >
              {it.title}
            </span>
          </div>
          <div className="text-[13px] text-muted tabular min-w-[110px] text-right">
            <AnimatePresence mode="wait">
              {it.status === "done" && typeof it.score === "number" && (
                <motion.span
                  key="done"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-ink inline-flex items-center justify-end gap-2"
                >
                  {typeof prev === "number" && prev !== it.score && (
                    <span
                      className="text-[11px]"
                      style={{
                        color:
                          it.score > prev
                            ? "var(--score-high)"
                            : "var(--score-low)",
                      }}
                    >
                      {it.score > prev ? "+" : ""}
                      {it.score - prev}
                    </span>
                  )}
                  <span>{it.score} / 100</span>
                </motion.span>
              )}
              {it.status === "running" && (
                <motion.span key="running" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="italic">
                  reading…
                </motion.span>
              )}
              {it.status === "pending" && (
                <motion.span key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  —
                </motion.span>
              )}
              {it.status === "error" && (
                <motion.span
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[color:var(--score-low)]"
                >
                  failed
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </li>
        );
      })}
    </ul>
  );
}

function StatusDot({ status }: { status: FactorProgress["status"] }) {
  const color =
    status === "done"
      ? "var(--ink)"
      : status === "running"
        ? "var(--muted)"
        : status === "error"
          ? "var(--score-low)"
          : "var(--muted-2)";
  return (
    <span
      aria-hidden
      className={`inline-block w-1.5 h-1.5 rounded-full ${status === "running" ? "pulse-soft" : ""}`}
      style={{ background: color }}
    />
  );
}
