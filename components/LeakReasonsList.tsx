"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { LeakReason } from "@/lib/types";

export function LeakReasonsList({ reasons }: { reasons: LeakReason[] }) {
  if (reasons.length === 0) {
    return (
      <div className="border border-dashed border-rule-soft p-6 rounded-sm">
        <p className="font-italic-serif text-[20px] text-ink-soft">
          Nothing pressing to fix.
        </p>
        <p className="text-[13px] text-muted mt-2 max-w-[52ch]">
          No factor scored below the leak-reason threshold this scan. Re-scan
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
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 md:p-7">
        {/* Left rail: index + severity */}
        <div className="md:col-span-1 flex md:flex-col items-center md:items-start gap-3">
          <span className="font-display text-[34px] leading-none text-muted-2 tabular">
            {String(index).padStart(2, "0")}
          </span>
          <span
            aria-hidden
            className="inline-block w-2 h-2 rounded-full mt-1"
            style={{ background: sevColor }}
            title={`${reason.severity} severity`}
          />
        </div>

        {/* Main column */}
        <div className="md:col-span-8 flex flex-col gap-3">
          <div className="flex items-baseline gap-3 text-[11px] tracking-[0.22em] uppercase text-muted">
            <span>{factorLabel(reason.factorKey)}</span>
            <span aria-hidden className="text-muted-2">
              ·
            </span>
            <span>{reason.severity} severity</span>
          </div>
          <h3 className="font-display text-[22px] md:text-[26px] leading-tight text-ink">
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
              className="text-[12px] tracking-[0.18em] uppercase text-muted hover:text-ink transition-colors flex items-center gap-2"
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
            <div className="flex items-baseline gap-3 text-[11px] tracking-[0.22em] uppercase text-muted">
              <span aria-hidden className="w-6 h-px bg-rule" />
              <span>Recommended action</span>
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
                v1 ships guidance + curated links. In-app one-click fixes come in v1.5.
              </p>
            )}
          </div>
        </div>

        {/* Right column: estimated lift */}
        <div className="md:col-span-3 flex md:flex-col items-start md:items-end justify-between md:justify-start gap-2 md:gap-1 md:border-l md:border-rule-soft md:pl-6">
          <span className="text-[11px] tracking-[0.22em] uppercase text-muted">
            Estimated lift
          </span>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-[44px] md:text-[56px] leading-none text-ink tabular">
              +{reason.estimatedLift}
            </span>
            <span className="text-[14px] text-muted">pts</span>
          </div>
          <p className="text-[11px] text-muted md:text-right max-w-[20ch]">
            Max headroom if this factor is fully addressed.
          </p>
        </div>
      </div>
    </li>
  );
}

function factorLabel(key: LeakReason["factorKey"]): string {
  switch (key) {
    case "cluster":
      return "Cluster footprint";
    case "kyc":
      return "KYC distance";
    case "identity":
      return "Identity exposure";
    case "connected":
      return "Connected apps";
    case "wealth":
      return "Visible wealth";
    case "surveillance":
      return "Surveillance";
  }
}

function humanize(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
