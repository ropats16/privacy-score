"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { LeakReason } from "@/lib/types";

export function LeakReasonsList({ reasons }: { reasons: LeakReason[] }) {
  if (reasons.length === 0) {
    return (
      <div className="border border-dashed border-rule-soft p-6 rounded-sm">
        <p className="font-italic-serif text-[20px] text-ink-soft">
          nothing pressing to fix.
        </p>
        <p className="text-[13px] text-muted mt-2 max-w-[52ch]">
          no factor scored below the leak threshold this scan. re scan
          after future activity to keep an eye on drift.
        </p>
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-4">
      {reasons.map((r, i) => (
        <LeakReasonCard key={r.factorKey} index={i + 1} reason={r} />
      ))}
    </ol>
  );
}

function LeakReasonCard({
  index,
  reason,
}: {
  index: number;
  reason: LeakReason;
}) {
  const [signalsOpen, setSignalsOpen] = useState(false);

  const sevColor =
    reason.severity === "high"
      ? "var(--score-low)"
      : reason.severity === "medium"
        ? "var(--score-mid)"
        : "var(--score-high)";

  return (
    <li className="border border-rule bg-paper-2/40 rounded-sm">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 p-5 md:p-7">
        {/* Left rail: index + severity */}
        <div className="md:col-span-1 flex md:flex-col items-center md:items-start gap-3">
          <span className="font-display text-[28px] md:text-[34px] leading-none text-muted-2 tabular">
            {String(index).padStart(2, "0")}
          </span>
          <span
            aria-hidden
            className="inline-block w-2 h-2 rounded-full mt-0 md:mt-1"
            style={{ background: sevColor }}
            title={`${reason.severity} severity`}
          />
        </div>

        {/* Main column */}
        <div className="md:col-span-8 flex flex-col gap-3">
          <div className="flex items-baseline gap-2 md:gap-3 text-[11px] tracking-[0.22em] lowercase text-muted flex-wrap">
            <span>{factorLabel(reason.factorKey)}</span>
            <span aria-hidden className="text-muted-2">
              ·
            </span>
            <span>{reason.severity} severity</span>
          </div>
          <h3 className="font-display text-[20px] md:text-[26px] leading-tight text-ink">
            {reason.title}
          </h3>
          <p className="text-[15px] leading-[1.55] text-ink-soft max-w-[58ch]">
            {reason.plainEnglish}
          </p>

          {/* Expandable raw signals */}
          <div>
            <button
              type="button"
              onClick={() => setSignalsOpen((v) => !v)}
              className="text-[12px] tracking-[0.18em] lowercase text-muted hover:text-ink transition-colors flex items-center gap-2"
              aria-expanded={signalsOpen}
            >
              <span>{signalsOpen ? "Hide raw signals" : "Show raw signals"}</span>
              <span aria-hidden className={`inline-block transition-transform ${signalsOpen ? "rotate-180" : ""}`}>
                ⌄
              </span>
            </button>
            <AnimatePresence initial={false}>
              {signalsOpen && (
                <motion.dl
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden mt-3 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 text-[13px]"
                >
                  {Object.entries(reason.signals).map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-muted">{humanize(k)}</dt>
                      <dd className="tabular text-ink-soft break-all">
                        {String(v)}
                      </dd>
                    </div>
                  ))}
                </motion.dl>
              )}
            </AnimatePresence>
          </div>

          {/* Recommendation */}
          <div className="mt-4 pt-5 border-t border-rule-soft flex flex-col gap-3">
            <div className="flex items-baseline gap-3 text-[11px] tracking-[0.22em] lowercase text-muted">
              <span aria-hidden className="w-6 h-px bg-rule" />
              <span>recommended action</span>
            </div>
            <h4 className="text-[16px] text-ink leading-snug">
              {reason.recommendation.headline}
            </h4>
            <p className="text-[14px] text-muted leading-[1.55] max-w-[58ch]">
              {reason.recommendation.detail}
            </p>
            {reason.recommendation.links.length > 0 && (
              <ul className="flex flex-col gap-2 mt-1">
                {reason.recommendation.links.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-baseline gap-2 text-[14px] text-ink hover:text-ink-soft transition-colors"
                    >
                      <span className="underline decoration-rule decoration-1 underline-offset-[5px] group-hover:decoration-ink">
                        {link.label}
                      </span>
                      <span aria-hidden className="text-muted-2 text-[12px]">
                        ↗
                      </span>
                    </a>
                    {link.blurb && (
                      <p className="text-[12px] text-muted mt-0.5 max-w-[58ch]">
                        {link.blurb}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {!reason.recommendation.inAppFixAvailable && (
              <p className="text-[11px] text-muted-2 italic mt-1">
                v1 ships guidance + curated links. in-app one-click fixes come in v1.5.
              </p>
            )}
          </div>
        </div>

        {/* Right column: estimated lift */}
        <div className="md:col-span-3 flex md:flex-col items-center md:items-end justify-between md:justify-start gap-3 md:gap-1 pt-3 md:pt-0 border-t border-rule-soft md:border-t-0 md:border-l md:border-rule-soft md:pl-6">
          <span className="text-[11px] tracking-[0.22em] lowercase text-muted">
            estimated lift
          </span>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-[36px] md:text-[56px] leading-none text-ink tabular">
              +{reason.estimatedLift}
            </span>
            <span className="text-[14px] text-muted">pts</span>
          </div>
          <p className="text-[11px] text-muted md:text-right max-w-[20ch] hidden sm:block">
            max headroom if this factor is fully addressed.
          </p>
        </div>
      </div>
    </li>
  );
}

function factorLabel(key: LeakReason["factorKey"]): string {
  switch (key) {
    case "cluster":
      return "cluster footprint";
    case "kyc":
      return "kyc distance";
    case "identity":
      return "identity exposure";
    case "connected":
      return "connected apps";
    case "wealth":
      return "visible wealth";
    case "surveillance":
      return "surveillance";
  }
}

function humanize(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
