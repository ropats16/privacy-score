"use client";

import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { useEffect, useMemo } from "react";
import { scoreBand } from "@/lib/scoring";

type Props = {
  value: number;
  size?: number;
  className?: string;
  // Hide center label band ("high"/"mid"/"low") when used in compact contexts.
  showBand?: boolean;
};

const ARC_DEGREES = 270;
const TICK_COUNT = 60;
const START_ANGLE = 135; // starts bottom-left, sweeps clockwise

function bandLabel(value: number): string {
  const b = scoreBand(value);
  return b === "high" ? "private" : b === "mid" ? "moderate" : "exposed";
}

function tickColor(percent: number): string {
  if (percent < 0.35) return "var(--score-low)";
  if (percent < 0.7) return "var(--score-mid)";
  return "var(--score-high)";
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function CircularScore({
  value,
  size = 360,
  className,
  showBand = true,
}: Props) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toString());
  const arcProgress = useMotionValue(0);

  useEffect(() => {
    const c1 = animate(mv, value, { duration: 1.6, ease: [0.16, 1, 0.3, 1] });
    const c2 = animate(arcProgress, value, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => {
      c1.stop();
      c2.stop();
    };
  }, [mv, arcProgress, value]);

  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 6;
  const rInner = rOuter - 18;
  const rNeedle = rOuter + 2;

  const ticks = useMemo(() => {
    const arr: { angle: number; pct: number }[] = [];
    for (let i = 0; i < TICK_COUNT; i++) {
      const pct = i / (TICK_COUNT - 1);
      arr.push({ angle: START_ANGLE + pct * ARC_DEGREES, pct });
    }
    return arr;
  }, []);

  const needleAngle = useTransform(arcProgress, (v) =>
    START_ANGLE + (Math.max(0, Math.min(100, v)) / 100) * ARC_DEGREES
  );
  const filledCount = useTransform(arcProgress, (v) =>
    Math.round((Math.max(0, Math.min(100, v)) / 100) * TICK_COUNT)
  );

  const band = scoreBand(value);
  const valueColor =
    band === "high"
      ? "var(--score-high)"
      : band === "mid"
        ? "var(--score-mid)"
        : "var(--score-low)";

  return (
    <div
      className={`relative ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="overflow-visible"
        aria-hidden
      >
        <defs>
          <filter id="cs-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.6" />
          </filter>
        </defs>

        {ticks.map((t, i) => {
          const p1 = polar(cx, cy, rOuter, t.angle);
          const p2 = polar(cx, cy, rInner, t.angle);
          return (
            <AnimatedTick
              key={i}
              index={i}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              activeColor={tickColor(t.pct)}
              filledCount={filledCount}
            />
          );
        })}

        {/* Center disk */}
        <circle
          cx={cx}
          cy={cy}
          r={rInner - 10}
          fill="#fbf8f1"
          stroke="rgba(20,17,13,0.06)"
          strokeWidth={1}
          filter="url(#cs-soft)"
        />

        {/* Needle */}
        <Needle
          cx={cx}
          cy={cy}
          radius={rNeedle}
          angle={needleAngle}
          color={valueColor}
        />
      </svg>

      {/* Center text overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <motion.span
          className="font-display tabular leading-none"
          style={{
            color: "var(--ink)",
            fontSize: size * 0.26,
            letterSpacing: "-0.04em",
          }}
        >
          {rounded}
        </motion.span>
        {showBand && (
          <span
            className="mt-2 text-[12px] tracking-[0.28em] lowercase"
            style={{ color: valueColor }}
          >
            {bandLabel(value)}
          </span>
        )}
      </div>

      {/* 0 / 100 endpoints */}
      <div
        className="absolute text-[11px] tabular text-muted-2 select-none"
        style={{
          left: polar(cx, cy, rOuter, START_ANGLE).x - 10,
          top: polar(cx, cy, rOuter, START_ANGLE).y + 4,
        }}
      >
        0
      </div>
      <div
        className="absolute text-[11px] tabular text-muted-2 select-none"
        style={{
          left: polar(cx, cy, rOuter, START_ANGLE + ARC_DEGREES).x - 6,
          top: polar(cx, cy, rOuter, START_ANGLE + ARC_DEGREES).y + 4,
        }}
      >
        100
      </div>
    </div>
  );
}

function AnimatedTick({
  index,
  x1,
  y1,
  x2,
  y2,
  activeColor,
  filledCount,
}: {
  index: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  activeColor: string;
  filledCount: import("motion/react").MotionValue<number>;
}) {
  const stroke = useTransform(filledCount, (c) =>
    c > index ? activeColor : "rgba(20,17,13,0.10)"
  );
  const width = useTransform(filledCount, (c) => (c > index ? 2.4 : 1.4));
  return (
    <motion.line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
    />
  );
}

function Needle({
  cx,
  cy,
  radius,
  angle,
  color,
}: {
  cx: number;
  cy: number;
  radius: number;
  angle: import("motion/react").MotionValue<number>;
  color: string;
}) {
  const x = useTransform(
    angle,
    (a) => cx + radius * Math.cos((a * Math.PI) / 180)
  );
  const y = useTransform(
    angle,
    (a) => cy + radius * Math.sin((a * Math.PI) / 180)
  );
  return (
    <>
      <motion.circle cx={x} cy={y} r={5.5} fill={color} />
      <motion.circle
        cx={x}
        cy={y}
        r={10}
        fill={color}
        opacity={0.18}
      />
    </>
  );
}
