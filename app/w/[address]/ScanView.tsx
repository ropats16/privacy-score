"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  deriveDust,
  deriveSurveillance,
  fetchClusterSignals,
  fetchConnectedSignals,
  fetchKycSignals,
  fetchOfacSet,
  fetchWealthSignals,
  HELIUS_KEY,
} from "@/lib/helius";
import { fetchIdentitySignals } from "@/lib/identity";
import {
  buildScan,
  scoreCluster,
  scoreConnected,
  scoreIdentity,
  scoreKyc,
  scoreSurveillance,
  scoreBand,
  scoreWealth,
} from "@/lib/scoring";
import { WEIGHTS } from "@/lib/rubrics";
import { shortAddress } from "@/lib/resolve";
import { useScanStore } from "@/lib/scan-store";
import { ScoreNumeral } from "@/components/ScoreNumeral";
import { SubScoreChip } from "@/components/SubScoreChip";
import { FactorProgressList } from "@/components/FactorProgressList";
import { LeakReasonsList } from "@/components/LeakReasonsList";
import { DustPanel } from "@/components/DustPanel";
import { ConnectButton } from "@/components/ConnectButton";
import { ShareActions } from "@/components/ShareActions";
import type {
  DustWarning,
  Factor,
  FactorKey,
  FactorProgress,
  Scan,
} from "@/lib/types";

const INITIAL_PROGRESS: FactorProgress[] = [
  { key: "identity", title: "Identity exposure", status: "pending" },
  { key: "kyc", title: "KYC distance", status: "pending" },
  { key: "cluster", title: "Cluster footprint", status: "pending" },
  { key: "connected", title: "Connected apps", status: "pending" },
  { key: "wealth", title: "Visible wealth", status: "pending" },
  { key: "surveillance", title: "Surveillance coverage", status: "pending" },
];

type Phase = "scanning" | "done" | "error";

const MISSING_KEY_MSG =
  "NEXT_PUBLIC_HELIUS_API_KEY is not set. Add it to .env.local and restart the dev server.";

export function ScanView({ address }: { address: string }) {
  const hasKey = HELIUS_KEY.length > 0;
  const { publicKey } = useWallet();
  const [progress, setProgress] = useState<FactorProgress[]>(INITIAL_PROGRESS);
  const [phase, setPhase] = useState<Phase>(hasKey ? "scanning" : "error");
  const [error, setError] = useState<string | null>(
    hasKey ? null : MISSING_KEY_MSG
  );
  const setScan = useScanStore((s) => s.setScan);
  const currentScan = useScanStore((s) => s.current);
  const previousScan = useScanStore((s) => s.previous);
  const [trigger, setTrigger] = useState(0);
  const sessionKey = `${address}::${trigger}`;
  const [session, setSession] = useState(sessionKey);

  // Reset progress + phase during render when the session changes (initial
  // mount-after-reScan or address swap). Avoids cascading renders that would
  // happen if we set this state inside an effect.
  if (session !== sessionKey) {
    setSession(sessionKey);
    setProgress(INITIAL_PROGRESS);
    setPhase(hasKey ? "scanning" : "error");
    setError(hasKey ? null : MISSING_KEY_MSG);
  }

  const isOwned = publicKey?.toBase58() === address;

  // Only count scans whose address matches the current URL — guards against
  // stale store entries when the user switches wallets.
  const scan = currentScan && currentScan.address === address ? currentScan : null;
  const prevForThis =
    previousScan && previousScan.address === address ? previousScan : null;

  useEffect(() => {
    if (!hasKey) return;
    const ac = new AbortController();

    runScan(address, ac.signal, setProgress)
      .then((scan) => {
        if (ac.signal.aborted) return;
        setScan(scan);
        setPhase("done");
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Scan failed.");
        setPhase("error");
      });
    return () => ac.abort();
  }, [address, hasKey, trigger, setScan]);

  const reScan = useCallback(() => {
    setTrigger((n) => n + 1);
  }, []);

  // Celebrate when a re-scan improved the total — derived from current state
  // so it re-fires whenever a new improving scan lands (key = scannedAt).
  const celebrationKey =
    phase === "done" &&
    scan &&
    prevForThis &&
    scan.totalScore > prevForThis.totalScore
      ? scan.scannedAt
      : 0;

  const factorByKey = useMemo(() => {
    const map = new Map<FactorKey, Factor>();
    for (const f of scan?.factors ?? []) map.set(f.key, f);
    return map;
  }, [scan]);

  const prevFactorByKey = useMemo(() => {
    const map = new Map<FactorKey, Factor>();
    for (const f of prevForThis?.factors ?? []) map.set(f.key, f);
    return map;
  }, [prevForThis]);

  const previousScores = useMemo(() => {
    const out: Partial<Record<FactorKey, number>> = {};
    for (const [k, f] of prevFactorByKey) out[k] = f.score;
    return out;
  }, [prevFactorByKey]);

  const totalDelta =
    scan && prevForThis ? scan.totalScore - prevForThis.totalScore : null;

  return (
    <div className="relative z-10 flex-1 flex flex-col">
      <header className="flex items-center justify-between px-8 md:px-14 pt-8">
        <Link href="/" className="flex items-center gap-2 group">
          <span aria-hidden className="inline-block w-2.5 h-2.5 rounded-full bg-ink" />
          <span className="text-[13px] tracking-[0.18em] uppercase text-ink-soft">
            PrivacyScore
          </span>
        </Link>
        <nav className="text-[13px] text-muted flex items-center gap-6">
          <Link href="/" className="hover:text-ink transition-colors">
            Scan another
          </Link>
          <Link href="/methodology" className="hover:text-ink transition-colors">
            Methodology
          </Link>
          <ConnectButton />
        </nav>
      </header>

      <main className="flex-1 px-6 md:px-14 py-14">
        <div className="w-full max-w-[1080px] mx-auto flex flex-col gap-14">
          {/* Address + window meta */}
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline gap-3 text-[12px] tracking-[0.22em] uppercase text-muted">
              <span aria-hidden className="w-8 h-px bg-rule" />
              <span>90-day audit</span>
              <span aria-hidden className="text-muted-2">·</span>
              <span className="lowercase tracking-normal text-[12px] not-italic">
                last {windowReadable()}
              </span>
              {isOwned && (
                <>
                  <span aria-hidden className="text-muted-2">·</span>
                  <span className="inline-flex items-center gap-1.5 normal-case tracking-normal text-[12px] text-[color:var(--score-high)]">
                    <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-[color:var(--score-high)]" />
                    owned by you
                  </span>
                </>
              )}
            </div>
            <h2 className="font-display text-[34px] md:text-[44px] leading-[1.05] tracking-[-0.02em] text-ink">
              <span className="font-italic-serif text-muted">audit · </span>
              <span className="font-mono text-[22px] md:text-[28px] tracking-tight align-baseline text-ink">
                {shortAddress(address, 6, 6)}
              </span>
            </h2>
          </div>

          {/* Hero score card */}
          <section className="relative border-t border-b border-ink/80 py-12 md:py-16">
            <CelebrationBurst trigger={celebrationKey} />
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
              <div className="md:col-span-7 flex items-start gap-5">
                <div className="flex flex-col">
                  <span className="text-[11px] tracking-[0.22em] uppercase text-muted mb-3">
                    Privacy Score
                  </span>
                  <div className="flex items-end gap-3 relative">
                    {scan ? (
                      <ScoreNumeral
                        value={scan.totalScore}
                        className="text-[180px] md:text-[260px]"
                      />
                    ) : phase === "error" ? (
                      <span className="score-numeral text-[120px] md:text-[180px] text-muted-2">
                        ——
                      </span>
                    ) : (
                      <motion.span
                        key="loading-num"
                        className="score-numeral text-[180px] md:text-[260px] text-muted-2 pulse-soft"
                      >
                        ··
                      </motion.span>
                    )}
                    <span className="text-[18px] md:text-[22px] text-muted tabular pb-6 md:pb-10">
                      / 100
                    </span>
                    <AnimatePresence>
                      {phase === "done" &&
                        scan &&
                        prevForThis &&
                        totalDelta !== null &&
                        totalDelta !== 0 && (
                          <motion.div
                            key={`delta-${scan.scannedAt}`}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{
                              delay: 1.4,
                              duration: 0.6,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                            className="absolute -top-2 left-0 md:left-auto md:right-0 md:-top-4 inline-flex items-center gap-1.5 px-2 py-1 rounded-full border tabular text-[12px]"
                            style={{
                              color:
                                totalDelta > 0
                                  ? "var(--score-high)"
                                  : "var(--score-low)",
                              borderColor:
                                totalDelta > 0
                                  ? "var(--score-high)"
                                  : "var(--score-low)",
                              background: "rgba(241,237,228,0.85)",
                              backdropFilter: "blur(2px)",
                            }}
                          >
                            <span aria-hidden>
                              {totalDelta > 0 ? "▲" : "▼"}
                            </span>
                            <span>
                              {prevForThis.totalScore}
                              <span className="text-muted-2 mx-1">→</span>
                              {scan.totalScore}
                            </span>
                            <span className="text-muted-2">·</span>
                            <span>
                              {totalDelta > 0 ? "+" : ""}
                              {totalDelta}
                            </span>
                          </motion.div>
                        )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              <div className="md:col-span-5 flex flex-col gap-4">
                <p className="font-italic-serif text-[22px] md:text-[26px] leading-snug text-ink-soft max-w-[34ch]">
                  {heroCopy(phase, scan, totalDelta)}
                </p>
                <p className="text-[13px] text-muted max-w-[44ch]">
                  All six factors are live this phase — Identity, KYC, Cluster,
                  Connected apps, Visible wealth, and Surveillance. Tap any
                  chip to see its rubric and raw signals.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={reScan}
                    disabled={phase === "scanning"}
                    className="inline-flex items-center gap-2 text-[12px] tracking-[0.2em] uppercase text-ink hover:text-accent disabled:text-muted-2 disabled:cursor-not-allowed transition-colors focus-ring rounded-sm"
                  >
                    <span
                      aria-hidden
                      className={`inline-block ${phase === "scanning" ? "animate-spin" : ""}`}
                    >
                      ↻
                    </span>
                    <span>
                      {phase === "scanning"
                        ? "Re-scanning…"
                        : prevForThis
                          ? "Re-scan"
                          : "Re-scan after a fix"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Dust / poisoning panel — shown before leak reasons, never scored */}
          {scan && <DustPanel warnings={scan.dustWarnings} />}

          {/* Sub-scores */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(["identity", "kyc", "cluster", "connected", "wealth", "surveillance"] as const).map(
              (k) => {
                const f = factorByKey.get(k);
                const prevScore = prevFactorByKey.get(k)?.score;
                if (f)
                  return (
                    <SubScoreChip
                      key={k}
                      factor={f}
                      previousScore={
                        phase === "done" ? prevScore : undefined
                      }
                    />
                  );
                return <PendingChip key={k} title={titleFor(k)} weight={WEIGHTS[k]} />;
              }
            )}
          </section>

          {/* Top leak reasons */}
          {scan && (
            <section className="flex flex-col gap-5">
              <div className="flex items-baseline justify-between gap-4">
                <div className="flex items-baseline gap-3 text-[12px] tracking-[0.22em] uppercase text-muted">
                  <span aria-hidden className="w-8 h-px bg-rule" />
                  <span>Top leak reasons</span>
                </div>
                <span className="text-[12px] text-muted-2">
                  ranked by score lift
                </span>
              </div>
              <LeakReasonsList reasons={scan.leakReasons} />
            </section>
          )}

          {/* Share card + actions */}
          {scan && phase === "done" && (
            <ShareActions
              address={address}
              score={scan.totalScore}
              previousScore={prevForThis ? prevForThis.totalScore : null}
              watchOnly={false}
            />
          )}

          {/* Per-factor progress list */}
          <section className="flex flex-col gap-5">
            <h3 className="text-[12px] tracking-[0.22em] uppercase text-muted">
              Scan trace
            </h3>
            <FactorProgressList
              items={progress}
              previousScores={previousScores}
            />
            <AnimatePresence>
              {phase === "error" && error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="border border-[color:var(--score-low)]/40 bg-[color:var(--score-low)]/5 p-4 rounded-sm text-[14px] text-[color:var(--score-low)]"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </main>

      <footer className="px-8 md:px-14 pb-8 pt-10">
        <div className="flex flex-col md:flex-row justify-between gap-4 text-[12px] text-muted">
          <div>
            <span className="italic">Privacy ≠ anonymity.</span>{" "}
            We don&rsquo;t hide you. We show you what&rsquo;s already public.
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

function titleFor(k: keyof typeof WEIGHTS): string {
  switch (k) {
    case "identity":
      return "Identity exposure";
    case "kyc":
      return "KYC distance";
    case "cluster":
      return "Cluster footprint";
    case "connected":
      return "Connected apps";
    case "wealth":
      return "Visible wealth";
    case "surveillance":
      return "Surveillance coverage";
  }
}

function PendingChip({ title, weight }: { title: string; weight: number }) {
  return (
    <div className="flex flex-col gap-3 p-5 border border-rule-soft border-dashed bg-paper rounded-sm pulse-soft">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] tracking-[0.2em] uppercase text-muted">
          {title}
        </span>
        <span className="text-[11px] tabular text-muted-2">w {weight}</span>
      </div>
      <div className="font-italic-serif text-[18px] text-muted">reading…</div>
    </div>
  );
}

function heroCopy(
  phase: Phase,
  scan: Scan | null,
  totalDelta: number | null
): string {
  if (phase === "error") return "Something stopped the audit before we could read the chain.";
  if (phase === "scanning") {
    return scan
      ? "Re-reading the last ninety days. Hold tight…"
      : "Reading ninety days of public on-chain activity…";
  }
  if (!scan) return "Reading ninety days of public on-chain activity…";
  if (totalDelta !== null) {
    if (totalDelta > 0)
      return `Quieter than last time — you tightened ${totalDelta} point${totalDelta === 1 ? "" : "s"}.`;
    if (totalDelta < 0)
      return `Slipped ${Math.abs(totalDelta)} point${totalDelta === -1 ? "" : "s"} since last scan.`;
    return "No change since last scan. Pick a top reason to tighten.";
  }
  const band = scoreBand(scan.totalScore);
  if (band === "high") return "You leave a small footprint. Stay disciplined.";
  if (band === "mid") return "Moderate exposure. A few easy wins ahead.";
  return "Broad, distinctive surface. Plenty to tighten.";
}

function CelebrationBurst({ trigger }: { trigger: number }) {
  if (trigger === 0) return null;
  return (
    <AnimatePresence>
      <motion.div
        key={trigger}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: [0, 0.7, 0], scale: [0.6, 1.4, 1.8] }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div
          className="w-[420px] h-[420px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(79,122,74,0.35) 0%, rgba(79,122,74,0) 60%)",
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
}

function windowReadable(): string {
  const now = new Date();
  const start = new Date(Date.now() - 90 * 24 * 3600 * 1000);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(now)}`;
}

async function runScan(
  address: string,
  signal: AbortSignal,
  setProgress: React.Dispatch<React.SetStateAction<FactorProgress[]>>
) {
  const markRunning = (keys: string[]) =>
    setProgress((prev) =>
      prev.map((p) => (keys.includes(p.key) ? { ...p, status: "running" } : p))
    );
  const markDone = (key: string, score: number) =>
    setProgress((prev) =>
      prev.map((p) => (p.key === key ? { ...p, status: "done", score } : p))
    );
  const markError = (key: string) =>
    setProgress((prev) =>
      prev.map((p) => (p.key === key ? { ...p, status: "error" } : p))
    );

  // Fan out the cheap, independent calls immediately. Connected + surveillance
  // wait on cluster (they derive from its tx scan). Identity runs in parallel.
  markRunning(["identity", "kyc", "cluster", "wealth"]);

  const clusterPromise = fetchClusterSignals(address, { signal });
  const ofacPromise = fetchOfacSet({ signal }).catch(() => ({
    set: new Set<string>(),
    source: "ofac-fallback" as const,
    fetchedAt: Date.now(),
  }));

  const clusterFactorPromise = clusterPromise.then((signals) => {
    const { score, signals: scored } = scoreCluster({
      uniqueCounterparties: signals.uniqueCounterparties,
      uniqueDapps: signals.uniqueDapps,
    });
    const factor: Factor = {
      key: "cluster",
      title: "Cluster footprint",
      weight: WEIGHTS.cluster,
      score,
      signals: {
        uniqueCounterparties: scored.uniqueCounterparties,
        uniqueDapps: scored.uniqueDapps,
        txCount: signals.txCount,
        windowDays: scored.windowDays,
      },
    };
    markDone("cluster", score);
    return factor;
  });

  const kycPromise = fetchKycSignals(address, { signal })
    .then((signals) => {
      const { score, signals: scored } = scoreKyc({
        hops: signals.hops,
        nearestCex: signals.nearestCex,
      });
      const factor: Factor = {
        key: "kyc",
        title: "KYC distance",
        weight: WEIGHTS.kyc,
        score,
        signals: {
          hops: scored.hops,
          nearestCex: scored.nearestCex,
          distanceLabel: scored.distanceLabel,
          linkVia: signals.linkVia ?? "—",
          cexAddressesChecked: signals.cexAddressesChecked,
          hop1Traversed: signals.hop1Traversed,
        },
      };
      markDone("kyc", score);
      return factor;
    })
    .catch((err) => {
      markError("kyc");
      throw err;
    });

  const wealthPromise = fetchWealthSignals(address, { signal })
    .then((signals) => {
      const { score, signals: scored } = scoreWealth(signals);
      const factor: Factor = {
        key: "wealth",
        title: "Visible wealth",
        weight: WEIGHTS.wealth,
        score,
        signals: {
          usdTotal: scored.usdTotal,
          solUsd: scored.solUsd,
          splUsd: scored.splUsd,
          pricedAssets: scored.pricedAssets,
          unpricedAssets: scored.unpricedAssets,
        },
      };
      markDone("wealth", score);
      return factor;
    })
    .catch((err) => {
      markError("wealth");
      throw err;
    });

  const identityPromise = fetchIdentitySignals(address, { signal })
    .then((signals) => {
      const { score, signals: scored } = scoreIdentity({
        nameCount: signals.names.length,
        exposedRecordCount: signals.exposedRecords.length,
        nameMatchesHandle: signals.nameMatchesHandle,
      });
      const factor: Factor = {
        key: "identity",
        title: "Identity exposure",
        weight: WEIGHTS.identity,
        score,
        signals: {
          namesOwned: scored.namesOwned,
          exposedRecords: scored.exposedRecords,
          nameMatchesHandle: scored.nameMatchesHandle,
          names: signals.names.map((n) => n.fullName).join(", ") || "—",
        },
      };
      markDone("identity", score);
      return factor;
    })
    .catch((err) => {
      // Don't fail the whole scan if Bonfida/AllDomains hiccups — score
      // identity as "no detected presence" and surface a soft error in trace.
      console.warn("Identity factor failed", err);
      const { score, signals: scored } = scoreIdentity({
        nameCount: 0,
        exposedRecordCount: 0,
        nameMatchesHandle: false,
      });
      const factor: Factor = {
        key: "identity",
        title: "Identity exposure",
        weight: WEIGHTS.identity,
        score,
        signals: {
          namesOwned: scored.namesOwned,
          exposedRecords: scored.exposedRecords,
          nameMatchesHandle: scored.nameMatchesHandle,
          names: "lookup failed — treated as no presence",
        },
      };
      markDone("identity", score);
      return factor;
    });

  // Connected + Surveillance derive from cluster's tx scan.
  const dependentPromise = clusterPromise.then(async (clusterSignals) => {
    markRunning(["connected", "surveillance"]);

    const connectedSignalsPromise = fetchConnectedSignals(
      address,
      clusterSignals.peers,
      { signal }
    );
    const ofac = await ofacPromise;
    const surveillanceSignals = deriveSurveillance(
      address,
      clusterSignals.transfers,
      ofac.set
    );
    const dust: DustWarning[] = deriveDust(address, clusterSignals.transfers);

    const connectedSignals = await connectedSignalsPromise;
    const { score: cScore, signals: cScored } = scoreConnected({
      activeDelegations: connectedSignals.activeDelegations,
      staleDelegations: connectedSignals.staleDelegations,
      activeStakeAuthorities: connectedSignals.activeStakeAuthorities,
      staleStakeAuthorities: connectedSignals.staleStakeAuthorities,
    });
    const connectedFactor: Factor = {
      key: "connected",
      title: "Connected apps",
      weight: WEIGHTS.connected,
      score: cScore,
      signals: {
        activeDelegations: cScored.activeDelegations,
        staleDelegations: cScored.staleDelegations,
        activeStakeAuthorities: cScored.activeStakeAuthorities,
        staleStakeAuthorities: cScored.staleStakeAuthorities,
        totalLive: cScored.totalLive,
      },
    };
    markDone("connected", cScore);

    const { score: sScore, signals: sScored } = scoreSurveillance({
      inboundFlagged: surveillanceSignals.inboundFlagged,
      outboundFlagged: surveillanceSignals.outboundFlagged,
    });
    const surveillanceFactor: Factor = {
      key: "surveillance",
      title: "Surveillance coverage",
      weight: WEIGHTS.surveillance,
      score: sScore,
      signals: {
        inboundFlagged: sScored.inboundFlagged,
        outboundFlagged: sScored.outboundFlagged,
        severity: sScored.severity,
        listSource: ofac.source,
        listSize: ofac.set.size,
      },
    };
    markDone("surveillance", sScore);

    return { connectedFactor, surveillanceFactor, dust };
  });

  const cluster = await clusterFactorPromise;
  const [identity, kyc, wealth, dependent] = await Promise.all([
    identityPromise,
    kycPromise,
    wealthPromise,
    dependentPromise,
  ]);

  return buildScan({
    address,
    factors: [
      identity,
      kyc,
      cluster,
      dependent.connectedFactor,
      wealth,
      dependent.surveillanceFactor,
    ],
    dustWarnings: dependent.dust,
  });
}
