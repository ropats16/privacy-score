"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

type Tip = {
  eyebrow: string;
  title: string;
  body: string;
};

const TIPS: Tip[] = [
  {
    eyebrow: "tip · one wallet, one job",
    title: "your wallet tells a story.",
    body: "a wallet you use for everything tells anyone watching exactly who you are. a wallet you use for one thing tells almost nothing.",
  },
  {
    eyebrow: "tip · revoke quarterly",
    title: "stale approvals outlive the dapp.",
    body: "a delegation you granted a year ago to a forgotten app can still move tokens today. revoking costs a fraction of a cent. forgetting can cost the wallet.",
  },
  {
    eyebrow: "tip · the cheapest tracking pixel",
    title: "ignore the airdrop.",
    body: "an unsolicited dust token is the cheapest tracking pixel ever invented. selling, swapping, or moving it links the receiving address to whatever you do next.",
  },
  {
    eyebrow: "tip · names are bridges",
    title: "public address is not public identity.",
    body: "until you bridge them. sns records, social handles, and labeled accounts are the most common edge between a wallet and a person.",
  },
  {
    eyebrow: "tip · cex distance is legal distance",
    title: "every hop is a buffer.",
    body: "a wallet funded straight from your kyc'd exchange sits one subpoena away from your identity. one intermediate wallet you control changes that materially.",
  },
  {
    eyebrow: "tip · don't display the vault",
    title: "a balance you never show is harder to phish.",
    body: "keep day to day spend on one address. keep long hold value on a separate cold or vault address you don't connect to random dapps.",
  },
  {
    eyebrow: "tip · maintenance is the lure",
    title: "phishing dresses up as routine.",
    body: "“reapprove”, “migrate”, “claim”. the most dangerous prompts wear the costume of housekeeping. read every signature; never sign blind.",
  },
];

const ROTATE_MS = 4200;

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
    <div className="card-soft px-6 md:px-8 py-6 md:py-7 flex flex-col gap-4 w-full max-w-[460px]">
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
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col gap-3 min-h-[140px]"
        >
          <span className="text-[11px] tracking-[0.22em] lowercase text-accent">
            {t.eyebrow}
          </span>
          <h3 className="font-display text-[22px] md:text-[26px] leading-[1.15] tracking-[-0.015em] text-ink">
            {t.title}
          </h3>
          <p className="text-[14px] leading-[1.55] text-ink-soft max-w-[44ch]">
            {t.body}
          </p>
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-1.5 pt-1">
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
