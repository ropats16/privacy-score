"use client";

import { motion } from "motion/react";
import type { DustWarning } from "@/lib/types";
import { shortAddress } from "@/lib/resolve";

export function DustPanel({ warnings }: { warnings: DustWarning[] }) {
  if (warnings.length === 0) return null;

  const poisoning = warnings.filter((w) => w.kind === "poisoning");
  const dust = warnings.filter((w) => w.kind === "dust");

  return (
    <motion.section
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="border border-[color:var(--score-low)]/40 bg-[color:var(--score-low)]/5 rounded-sm"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 md:p-7">
        <div className="md:col-span-1 flex md:flex-col items-center md:items-start gap-3">
          <span aria-hidden className="font-display text-[28px] leading-none text-[color:var(--score-low)]">
            ⚠
          </span>
        </div>
        <div className="md:col-span-11 flex flex-col gap-3">
          <div className="flex items-baseline gap-3 text-[11px] tracking-[0.22em] lowercase text-[color:var(--score-low)]">
            <span>do not interact</span>
            <span aria-hidden className="text-[color:var(--score-low)]/50">·</span>
            <span>{warnings.length} flagged</span>
          </div>
          <h3 className="font-display text-[22px] md:text-[26px] leading-tight text-ink">
            dust drops & address poisoning attempts.
          </h3>
          <p className="text-[14px] leading-[1.55] text-ink-soft max-w-[64ch]">
            These addresses appear in your 90 day history because{" "}
            <em className="font-italic-serif">they</em> sent to{" "}
            <em className="font-italic-serif">you</em>, not the other way
            around. they&rsquo;re spam designed to lure a return transaction or
            trick you into copy pasting a lookalike address. they don&rsquo;t
            affect your score. do not interact.
          </p>

          {poisoning.length > 0 && (
            <div className="flex flex-col gap-2 mt-2">
              <div className="text-[11px] tracking-[0.22em] lowercase text-muted">
                address poisoning lookalikes
              </div>
              <ul className="flex flex-col gap-1">
                {poisoning.map((w) => (
                  <li
                    key={w.address}
                    className="grid grid-cols-[1fr_max-content] gap-3 text-[13px]"
                  >
                    <span className="font-mono tabular text-ink break-all">
                      {w.address}
                    </span>
                    <span className="text-muted text-[12px]">
                      {w.evidence}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {dust.length > 0 && (
            <div className="flex flex-col gap-2 mt-2">
              <div className="text-[11px] tracking-[0.22em] lowercase text-muted">
                dust drops
              </div>
              <ul className="flex flex-col gap-1">
                {dust.slice(0, 10).map((w) => (
                  <li
                    key={w.address}
                    className="grid grid-cols-[1fr_max-content] gap-3 text-[13px]"
                  >
                    <span className="font-mono tabular text-ink-soft break-all">
                      {shortAddress(w.address, 8, 8)}
                    </span>
                    <span className="text-muted text-[12px]">
                      {w.evidence}
                    </span>
                  </li>
                ))}
                {dust.length > 10 && (
                  <li className="text-[12px] text-muted italic mt-1">
                    + {dust.length - 10} more dust counterparties
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
