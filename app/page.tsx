"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { useState } from "react";
import { resolveAddressInput, shortAddress } from "@/lib/resolve";
import { ConnectButton } from "@/components/ConnectButton";
import { useWallet } from "@solana/wallet-adapter-react";
import { useScanStore } from "@/lib/scan-store";

export default function LandingPage() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Zustand keeps scan state in-memory across client-side navs. Surfacing
  // the last scan lets the user audit a second wallet and bounce back to
  // compare without retyping the address.
  const lastScan = useScanStore((s) => s.current);

  function auditConnected() {
    if (!publicKey) return;
    router.push(`/w/${publicKey.toBase58()}`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!value.trim()) return;
    setBusy(true);
    try {
      const addr = await resolveAddressInput(value);
      router.push(`/w/${addr}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="relative z-10 flex-1 flex flex-col">
      <header className="flex items-center justify-between gap-3 px-5 md:px-14 pt-6 md:pt-8 flex-wrap">
        <Link href="/" className="flex items-center gap-2 group">
          <span aria-hidden className="inline-block w-2.5 h-2.5 rounded-full bg-ink" />
          <span className="text-[13px] tracking-[0.18em] uppercase text-ink-soft">
            PrivacyScore
          </span>
        </Link>
        <nav className="text-[13px] text-muted flex items-center gap-4 md:gap-6">
          <Link href="/methodology" className="hover:text-ink transition-colors">
            Methodology
          </Link>
          <ConnectButton />
        </nav>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 md:px-14 py-10 md:py-0">
        <div className="w-full max-w-[860px] -mt-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.2, 0.7, 0.1, 1] }}
            className="flex flex-col gap-10"
          >
            <div className="flex items-baseline gap-3 text-[12px] tracking-[0.22em] uppercase text-muted">
              <span aria-hidden className="w-8 h-px bg-rule" />
              <span>An audit, not a verdict</span>
            </div>

            <h1 className="font-display text-[44px] sm:text-[64px] md:text-[96px] leading-[0.95] tracking-[-0.02em] text-ink">
              See what your wallet
              <br />
              <span className="font-italic-serif text-ink">is quietly showing.</span>
            </h1>

            <p className="max-w-[52ch] text-[16px] sm:text-[17px] md:text-[18px] leading-[1.55] text-ink-soft">
              Paste any Solana address. We&rsquo;ll spend about thirty seconds reading
              ninety days of public on-chain activity and give you one number
              between 0 and 100. Higher means more private. The math is open.
            </p>
            <p className="max-w-[52ch] text-[14px] leading-[1.6] text-muted">
              <span className="italic text-ink-soft">Privacy ≠ anonymity.</span>{" "}
              We don&rsquo;t hide you — we show you what&rsquo;s already public,
              in plain English, with curated fixes you do in tools you already
              trust. One-tap in-app fixes ship in v1.5.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex items-end gap-3 border-b border-ink/60 pb-3 transition-colors focus-within:border-ink">
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
                  aria-label="Solana address or .sol name"
                  disabled={busy}
                />
                <button
                  type="submit"
                  disabled={busy || !value.trim()}
                  className="font-display text-[18px] sm:text-[20px] md:text-[22px] leading-none text-ink hover:italic transition-[font-style] disabled:opacity-40 focus-ring whitespace-nowrap"
                >
                  {busy ? "resolving…" : "audit →"}
                </button>
              </div>
              {error && (
                <p className="text-[14px] text-[color:var(--score-low)]">{error}</p>
              )}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <p className="text-[13px] text-muted">
                  Read-only. No wallet connection. Nothing is stored.
                </p>
                {publicKey && (
                  <button
                    type="button"
                    onClick={auditConnected}
                    className="text-[13px] text-ink-soft hover:text-ink transition-colors underline decoration-rule decoration-1 underline-offset-[5px] focus-ring"
                  >
                    audit my connected wallet →
                  </button>
                )}
              </div>
            </form>

            {lastScan && (
              <div className="flex items-center gap-3 flex-wrap text-[13px] -mt-3">
                <span className="text-muted">Last scan this session</span>
                <Link
                  href={`/w/${lastScan.address}`}
                  className="inline-flex items-center gap-2 border border-rule hover:border-ink px-3 py-1.5 rounded-full text-ink-soft hover:text-ink transition-colors focus-ring"
                >
                  <span className="font-mono text-[12px]">
                    {shortAddress(lastScan.address, 4, 4)}
                  </span>
                  <span aria-hidden className="text-muted-2">·</span>
                  <span className="tabular">{lastScan.totalScore}/100</span>
                  <span aria-hidden>↗</span>
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      <footer className="px-8 md:px-14 pb-8 pt-16">
        <div className="flex flex-col md:flex-row justify-between gap-4 text-[12px] text-muted">
          <div>
            <span className="italic">Privacy ≠ anonymity.</span>{" "}
            <span>
              We don&rsquo;t hide you. We show you what&rsquo;s already public.
            </span>
          </div>
          <div className="flex gap-6">
            <Link href="/methodology" className="hover:text-ink transition-colors">
              How the score is built
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
