"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

type Tip = {
  eyebrow: string;
  title: string;
};

// Short, sharp principles. No body text — the meter is the focus while these
// tick by.
const TIPS: Tip[] = [
  { eyebrow: "one wallet, one job", title: "a wallet you use for everything tells everyone everything." },
  { eyebrow: "revoke quarterly", title: "stale approvals outlive the dapp." },
  { eyebrow: "the cheapest tracking pixel", title: "ignore the airdrop. don't touch the dust." },
  { eyebrow: "names are bridges", title: "your address is public. your identity doesn't have to be." },
  { eyebrow: "cex distance is legal distance", title: "every hop is a buffer." },
  { eyebrow: "don't display the vault", title: "a balance you never show is harder to phish." },
  { eyebrow: "maintenance is the lure", title: "phishing dresses up as routine. read every signature." },
];

const ROTATE_MS = 3400;

export function ScanTips() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setI((n) => (n + 1) % TIPS.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  const t = TIPS[i];

  return (
    <div className="card-soft px-6 md:px-8 py-5 md:py-6 flex flex-col gap-4 w-full max-w-[520px]">
      <div className="flex items-center justify-between text-[11px] tracking-[0.22em] lowercase text-muted">
        <span className="flex items-center gap-2">
          <span aria-hidden className="relative inline-flex">
            <span className="w-1.5 h-1.5 rounded-full bg-ink" />
            <span className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-ink animate-ping opacity-40" />
          </span>
          while we read the chain
        </span>
        <span className="tabular text-muted-2">
          {String(i + 1).padStart(2, "0")} / {String(TIPS.length).padStart(2, "0")}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col gap-2 min-h-[88px]"
        >
          <span className="text-[11px] tracking-[0.22em] lowercase text-accent">
            tip · {t.eyebrow}
          </span>
          <h3 className="font-display text-[20px] md:text-[22px] leading-[1.18] tracking-[-0.015em] text-ink">
            {t.title}
          </h3>
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-1.5">
        {TIPS.map((_, idx) => (
          <span
            key={idx}
            aria-hidden
            className="h-[2px] flex-1 rounded-full overflow-hidden bg-rule-soft"
          >
            <motion.span
              className="block h-full bg-ink"
              initial={{ width: idx < i ? "100%" : "0%" }}
              animate={{
                width: idx < i ? "100%" : idx === i ? "100%" : "0%",
              }}
              transition={{
                duration: idx === i ? ROTATE_MS / 1000 : 0.2,
                ease: "linear",
              }}
            />
          </span>
        ))}
      </div>
    </div>
  );
}
