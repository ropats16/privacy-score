"use client";

import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { useEffect } from "react";
import { scoreBand } from "@/lib/scoring";

type Props = {
  value: number;
  /** total displayed digits; defaults to 0–100 (3) */
  className?: string;
};

export function ScoreNumeral({ value, className }: Props) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toString());

  useEffect(() => {
    const controls = animate(mv, value, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [mv, value]);

  const band = scoreBand(value);
  const color =
    band === "high"
      ? "var(--score-high)"
      : band === "mid"
        ? "var(--score-mid)"
        : "var(--score-low)";

  return (
    <motion.span
      className={`score-numeral tabular ${className ?? ""}`}
      style={{ color }}
    >
      {rounded}
    </motion.span>
  );
}
