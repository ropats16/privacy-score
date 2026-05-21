// Presentational primitives for the admin dashboard. All server components —
// pure SVG/CSS, no chart library, no client JS.

import type { ReactNode } from "react";
import type { HashEntry } from "@/lib/analytics/redis";

export function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function pct(num: number, den: number): string {
  if (den <= 0) return "—";
  return `${((num / den) * 100).toFixed(1)}%`;
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-baseline gap-3 text-[12px] tracking-[0.22em] text-muted">
        <span aria-hidden className="w-8 h-px bg-rule" />
        <span>{title}</span>
      </div>
      {children}
    </section>
  );
}

export function Panel({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`card-soft px-5 md:px-6 py-5 flex flex-col gap-4 ${className}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[13px] text-ink-soft">{title}</h3>
        {subtitle && (
          <span className="text-[11px] text-muted-2 tabular shrink-0">
            {subtitle}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card-soft px-5 py-4 flex flex-col gap-1.5">
      <span className="text-[11px] tracking-[0.16em] text-muted">{label}</span>
      <span className="font-display text-[30px] md:text-[34px] leading-none tabular text-ink">
        {value}
      </span>
      {hint && <span className="text-[11px] text-muted-2">{hint}</span>}
    </div>
  );
}

export function Empty({ label = "no data yet" }: { label?: string }) {
  return <p className="text-[12px] text-muted-2 py-2">{label}</p>;
}

/** Inline SVG sparkline. Stretches to its container width. */
export function Sparkline({
  values,
  color = "var(--brand)",
  height = 52,
}: {
  values: number[];
  color?: string;
  height?: number;
}) {
  const w = 300;
  const h = height;
  const max = Math.max(1, ...values);
  const n = values.length;
  if (n === 0) return <Empty />;

  const point = (v: number, i: number): [number, number] => {
    const x = n <= 1 ? w / 2 : (i / (n - 1)) * w;
    const y = h - 3 - (v / max) * (h - 6);
    return [x, y];
  };
  const pts = values.map(point);
  const line = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const [lastX, lastY] = pts[pts.length - 1];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="w-full block"
      style={{ height: h }}
      role="img"
    >
      <path d={area} fill={color} opacity={0.1} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lastX} cy={lastY} r={3} fill={color} />
    </svg>
  );
}

/** Horizontal bar list for hash breakdowns, sorted by the caller. */
export function BarList({
  entries,
  color = "var(--ink)",
  emptyLabel,
  max: maxOverride,
}: {
  entries: HashEntry[];
  color?: string;
  emptyLabel?: string;
  max?: number;
}) {
  if (entries.length === 0) return <Empty label={emptyLabel} />;
  const max = Math.max(maxOverride ?? 0, ...entries.map((e) => e.count));
  return (
    <ul className="flex flex-col gap-2.5">
      {entries.map((e) => (
        <li key={e.key} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-[12px]">
            <span className="text-ink-soft truncate">{e.key}</span>
            <span className="tabular text-muted shrink-0">{fmt(e.count)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-rule/60 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(2, (e.count / max) * 100)}%`,
                background: color,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Vertical histogram for the score-bucket distribution. */
export function Histogram({
  buckets,
  color = "var(--brand)",
}: {
  buckets: { label: string; count: number }[];
  color?: string;
}) {
  const H = 120;
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <div className="flex items-end gap-1" style={{ height: H + 30 }}>
      {buckets.map((b) => (
        <div
          key={b.label}
          className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0"
        >
          <span className="text-[9.5px] tabular text-muted-2 leading-none">
            {b.count > 0 ? fmt(b.count) : ""}
          </span>
          <div
            className="w-full rounded-t-[3px]"
            style={{
              height: Math.max(2, (b.count / max) * H),
              background: color,
            }}
          />
          <span className="text-[9px] tabular text-muted-2 leading-none">
            {b.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Stacked horizontal segment bar with a legend (used for score bands). */
export function SegmentBar({
  segments,
}: {
  segments: { label: string; count: number; color: string }[];
}) {
  const total = segments.reduce((s, x) => s + x.count, 0);
  if (total === 0) return <Empty />;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex h-3 rounded-full overflow-hidden bg-rule/60">
        {segments.map((s) =>
          s.count > 0 ? (
            <div
              key={s.label}
              style={{
                width: `${(s.count / total) * 100}%`,
                background: s.color,
              }}
            />
          ) : null,
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s) => (
          <span
            key={s.label}
            className="inline-flex items-center gap-1.5 text-[11px] text-muted"
          >
            <span
              aria-hidden
              className="w-2 h-2 rounded-full"
              style={{ background: s.color }}
            />
            {s.label}
            <span className="tabular text-ink-soft">
              {fmt(s.count)} · {pct(s.count, total)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
