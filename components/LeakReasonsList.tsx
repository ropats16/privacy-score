"use client";

import type { LeakReason } from "@/lib/types";
import { FactorIcon } from "./FactorIcon";
import { ToolIcon, toolName } from "./ToolIcon";
import { RuleIcon } from "./RuleIcon";

type Severity = LeakReason["severity"];

const SEV_LABEL: Record<Severity, string> = {
  high: "exposed",
  medium: "moderate",
  low: "minor",
};

const BRAND = "var(--brand)";
const BRAND_SOFT = "var(--brand-soft)";

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
    <ol className="flex flex-col gap-5">
      {reasons.map((r, i) => (
        <LeakReasonCard key={r.factorKey} index={i + 1} reason={r} />
      ))}
    </ol>
  );
}

function LeakReasonCard({ index, reason }: { index: number; reason: LeakReason }) {
  const sev = reason.severity;
  const primaryLink = reason.recommendation.links[0];

  return (
    <li className="card-soft is-interactive relative overflow-hidden">
      {/* Left brand strip */}
      <span
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: BRAND }}
      />

      {/* TOP ROW — title, plain-english body, severity & lift */}
      <div className="pl-6 pr-6 pt-6 pb-5 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 text-[11px] tracking-[0.22em] lowercase">
            <span className="tabular text-muted-2">
              {String(index).padStart(2, "0")}
            </span>
            <span aria-hidden className="text-muted-2">·</span>
            <span style={{ color: BRAND }}>{SEV_LABEL[sev]}</span>
          </div>
          <LiftBadge value={reason.estimatedLift} />
        </div>

        <div className="flex items-start gap-3">
          <span style={{ color: BRAND }} className="mt-1 shrink-0">
            <FactorIcon k={reason.factorKey} size={20} />
          </span>
          <div className="flex flex-col gap-2 min-w-0">
            <h3 className="font-display text-[20px] md:text-[24px] leading-[1.18] tracking-[-0.015em] text-ink">
              {reason.title}
            </h3>
            <p className="text-[14px] leading-[1.55] text-ink-soft max-w-[72ch]">
              {reason.plainEnglish}
            </p>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW — split: rule (left) | recommended tool (right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 border-t border-rule-soft">
        {/* GOOD PRACTICE RULE */}
        <div className="p-6 flex items-center gap-5 border-b md:border-b-0 md:border-r border-rule-soft">
          <span
            className="shrink-0 inline-flex items-center justify-center rounded-2xl"
            style={{
              width: 72,
              height: 72,
              background: "var(--paper)",
              color: "var(--ink)",
              boxShadow: "inset 0 0 0 1px rgba(20,17,13,0.08)",
            }}
            aria-hidden
          >
            <RuleIcon k={reason.factorKey} size={48} />
          </span>
          <div className="flex flex-col gap-1.5 min-w-0">
            <span className="text-[10.5px] tracking-[0.22em] lowercase text-muted">
              good practice
            </span>
            <p className="text-[14.5px] leading-snug text-ink max-w-[36ch]">
              {reason.recommendation.headline}
            </p>
          </div>
        </div>

        {/* RECOMMENDED TOOL */}
        {primaryLink ? (
          <a
            href={primaryLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-6 flex items-center gap-5 group/tool focus-ring rounded-md transition-colors hover:bg-[rgba(20,17,13,0.025)]"
          >
            <ToolIcon url={primaryLink.url} variant="hero" size={72} />
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="text-[10.5px] tracking-[0.22em] lowercase text-muted">
                recommended tool
              </span>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-display text-[18px] md:text-[19px] tracking-[-0.012em] text-ink group-hover/tool:underline decoration-rule decoration-1 underline-offset-[5px]">
                  {toolName(primaryLink.url)}
                </span>
                <span aria-hidden className="text-muted-2 text-[12px]">
                  ↗
                </span>
              </div>
              <p className="text-[12.5px] leading-[1.5] text-muted max-w-[36ch]">
                {primaryLink.blurb}
              </p>
            </div>
          </a>
        ) : (
          <div className="p-6 text-[13px] text-muted">
            no external tool needed.
          </div>
        )}
      </div>
    </li>
  );
}

function LiftBadge({ value }: { value: number }) {
  const positive = value > 0;
  return (
    <span
      className="inline-flex items-center gap-1 tabular px-2.5 py-1 rounded-full text-[12px] font-medium"
      style={{
        color: positive ? BRAND : "var(--muted-2)",
        background: positive ? BRAND_SOFT : "rgba(20,17,13,0.04)",
        boxShadow: positive ? "inset 0 0 0 1px rgba(0,140,255,0.30)" : "none",
      }}
      title="estimated lift to total score"
    >
      <span aria-hidden>▲</span>
      <span>+{value} pts</span>
    </span>
  );
}
