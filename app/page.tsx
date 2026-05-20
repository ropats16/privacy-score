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
          <span className="wordmark text-[20px] md:text-[22px]">
            sneak peek
            <span aria-hidden className="wordmark-eye">👀</span>
          </span>
        </Link>
      </header>

      <main className="relative flex-1 flex flex-col items-center justify-center lg:flex-row lg:items-center lg:justify-normal px-5 md:px-14 py-8 lg:py-0 lg:-ml-24">
        {/* Character — sits below the copy on mobile/tablet, beside it on
            desktop. The PNG is cropped tight to the artwork; a controlled
            margin (not mt-auto) keeps it tucked under the copy as a centered
            group rather than drifting to the viewport's bottom edge. */}
        <Image
          src="/character_1.png"
          alt=""
          aria-hidden
          width={698}
          height={717}
          priority
          className="order-2 lg:order-1 mt-[clamp(1.25rem,4.5vh,2.75rem)] lg:mt-0 w-auto h-[clamp(9.5rem,27dvh,15.5rem)] sm:h-[34dvh] lg:h-auto max-w-full lg:max-w-none lg:w-[400px] xl:w-[540px] 2xl:w-[620px] lg:flex-shrink-0 pointer-events-none select-none -scale-x-100"
        />
        <div className="relative z-10 w-full max-w-[860px] order-1 lg:order-2 lg:-mt-8 lg:-ml-20">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.2, 0.7, 0.1, 1] }}
            className="flex flex-col gap-6 sm:gap-8 lg:gap-10"
          >
            <h1 className="font-display text-[clamp(2rem,0.4rem+8vw,4rem)] xl:text-[5rem] 2xl:text-[6rem] leading-[1.05] tracking-[-0.02em] text-balance text-ink">
              a <span className="wave-underline">privacy</span> checkup
              <br />
              <span className="font-italic-serif text-ink">
                for your wallet.
              </span>
            </h1>

            <p className="font-sans text-[clamp(0.9375rem,0.875rem+0.3vw,1.0625rem)] leading-[1.6] text-muted max-w-[40rem] sm:-mt-4">
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
                  className="input-bare flex-1 min-w-0 text-[clamp(1.125rem,0.7rem+2.2vw,1.75rem)] text-ink leading-tight"
                  aria-label="solana address or .sol name"
                  disabled={busy}
                />
                <button
                  type="submit"
                  disabled={busy || !value.trim()}
                  className="font-sans text-[clamp(0.875rem,0.8rem+0.35vw,1rem)] leading-none text-paper bg-ink hover:bg-ink-soft rounded-full px-5 py-3 md:px-6 md:py-3.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-ring whitespace-nowrap"
                >
                  {busy ? "resolving…" : "check score"}
                </button>
              </div>
              {error && (
                <p className="text-[0.875rem] text-[color:var(--score-low)]">
                  {error}
                </p>
              )}
            </form>

            {lastScan && (
              <div className="flex items-center gap-3 flex-wrap text-[0.8125rem] sm:-mt-3">
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

      <footer className="px-8 md:px-14 pb-8 pt-8 lg:pt-16">
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
