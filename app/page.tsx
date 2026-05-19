"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { useState } from "react";
import { resolveAddressInput, shortAddress } from "@/lib/resolve";
import { useScanStore } from "@/lib/scan-store";

export default function LandingPage() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Zustand keeps scan state in-memory across client-side navs. Surfacing
  // the last scan lets the user audit a second wallet and bounce back to
  // compare without retyping the address.
  const lastScan = useScanStore((s) => s.current);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!value.trim()) return;
    setBusy(true);
    try {
      const addr = await resolveAddressInput(value);
      router.push(`/w/${addr}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="relative z-10 flex-1 flex flex-col">
      <header className="flex items-center justify-between gap-3 px-5 md:px-14 pt-6 md:pt-8 flex-wrap">
        <Link href="/" className="group">
          <span className="font-display text-[20px] md:text-[22px] font-semibold text-ink">
            sneak peek 👀
          </span>
        </Link>
      </header>

      <main className="relative flex-1 flex items-center px-5 md:px-14 py-10 md:py-0 -ml-24">
        <Image
          src="/character_1.png"
          alt=""
          aria-hidden
          width={1254}
          height={1254}
          priority
          className="hidden md:block flex-shrink-0 w-[460px] lg:w-[560px] xl:w-[640px] h-auto pointer-events-none select-none -scale-x-100"
        />
        <div className="relative z-10 w-full max-w-[860px] -mt-8 -ml-20">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.2, 0.7, 0.1, 1] }}
            className="flex flex-col gap-10"
          >
            <h1 className="font-display text-[44px] sm:text-[64px] md:text-[96px] leading-[0.95] tracking-[-0.02em] text-ink">
              a{" "}
              <span className="underline decoration-wavy decoration-[#008cff] decoration-[6px] underline-offset-[0.2em]">
                privacy
              </span>{" "}
              checkup
              <br />
              <span className="font-italic-serif text-ink">
                for your wallet.
              </span>
            </h1>

            <p className="font-sans text-[15px] sm:text-[16px] leading-[1.6] text-muted max-w-[640px] -mt-4">
              we&rsquo;ll spend about thirty seconds reading 3 months of public
              onchain activity and give you a privacy score between 0 and 100.
              higher means more private. learn privacy by doing.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex items-center gap-3 border-b border-ink/60 pb-3 transition-colors focus-within:border-ink">
                <input
                  autoFocus
                  spellCheck={false}
                  autoComplete="off"
                  autoCapitalize="off"
                  type="text"
                  inputMode="text"
                  placeholder="paste a solana address, or a .sol name"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="input-bare flex-1 min-w-0 text-[18px] sm:text-[24px] md:text-[28px] text-ink leading-tight"
                  aria-label="solana address or .sol name"
                  disabled={busy}
                />
                <button
                  type="submit"
                  disabled={busy || !value.trim()}
                  className="font-sans text-[14px] sm:text-[15px] md:text-[16px] leading-none text-paper bg-ink hover:bg-ink-soft rounded-full px-5 py-3 md:px-6 md:py-3.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-ring whitespace-nowrap"
                >
                  {busy ? "resolving…" : "check score"}
                </button>
              </div>
              {error && (
                <p className="text-[14px] text-[color:var(--score-low)]">
                  {error}
                </p>
              )}
            </form>

            {lastScan && (
              <div className="flex items-center gap-3 flex-wrap text-[13px] -mt-3">
                <span className="text-muted">last scan this session</span>
                <Link
                  href={`/w/${lastScan.address}`}
                  className="inline-flex items-center gap-2 border border-rule hover:border-ink px-3 py-1.5 rounded-full text-ink-soft hover:text-ink transition-colors focus-ring"
                >
                  <span className="font-mono text-[12px]">
                    {shortAddress(lastScan.address, 4, 4)}
                  </span>
                  <span aria-hidden className="text-muted-2">
                    ·
                  </span>
                  <span className="tabular">{lastScan.totalScore}/100</span>
                  <span aria-hidden>↗</span>
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      <footer className="px-8 md:px-14 pb-8 pt-16">
        <div className="flex justify-end text-[12px]">
          <Link
            href="/methodology"
            className="inline-flex items-center border border-rule hover:border-ink text-muted hover:text-ink rounded-full px-4 py-2 transition-colors focus-ring"
          >
            how the score is built
          </Link>
        </div>
      </footer>
    </div>
  );
}
