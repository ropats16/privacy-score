"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
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
import {
  classifyScanError,
  clearScanCount,
  track,
  trackScanCompleted,
} from "@/lib/analytics/track";
import { CircularScore } from "@/components/CircularScore";
import { SubScoreChip } from "@/components/SubScoreChip";
import { LeakReasonsList } from "@/components/LeakReasonsList";
// import { DustPanel } from "@/components/DustPanel";
// import { ShareActions } from "@/components/ShareActions";
import { ScanTips } from "@/components/ScanTips";
import { RetroAds } from "@/components/RetroAds";
import type {
  DustWarning,
  Factor,
  FactorKey,
  Scan,
} from "@/lib/types";

type Phase = "scanning" | "done" | "error";

const MISSING_KEY_MSG =
  "NEXT_PUBLIC_HELIUS_API_KEY is not set. Add it to .env.local and restart the dev server.";

export function ScanView({ address, sns }: { address: string; sns?: string }) {
  const hasKey = HELIUS_KEY.length > 0;
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

  // Reset phase during render when the session changes (initial mount after
  // reScan or address swap). Avoids cascading renders that would happen if
  // we set this state inside an effect.
  if (session !== sessionKey) {
    setSession(sessionKey);
    setPhase(hasKey ? "scanning" : "error");
    setError(hasKey ? null : MISSING_KEY_MSG);
  }

  // No wallet connection in this build — every scan is watch-only. Drives a
  // muted pill on the scan view and a watermark on the share card.
  // const watchOnly = true;

  // Only count scans whose address matches the current URL — guards against
  // stale store entries when the user switches wallets.
  const scan = currentScan && currentScan.address === address ? currentScan : null;
  const prevForThis =
    previousScan && previousScan.address === address ? previousScan : null;

  useEffect(() => {
    if (!hasKey) return;
    const ac = new AbortController();
    const startedAt = performance.now();

    runScan(address, ac.signal)
      .then((scan) => {
        if (ac.signal.aborted) return;
        // Snapshot the prior scan before the store swaps it — a same-address
        // prior scan means this completion is a re-scan comparison.
        const previousScan = useScanStore.getState().current;
        setScan(scan);
        setPhase("done");
        void trackScanCompleted(scan, performance.now() - startedAt);
        if (previousScan && previousScan.address === address) {
          const delta = scan.totalScore - previousScan.totalScore;
          track("comparison_run", {
            direction: delta > 0 ? "up" : delta < 0 ? "down" : "same",
          });
        }
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return;
        track("scan_failed", {
          errorType: classifyScanError(err, "rpc_error"),
        });
        setError(err instanceof Error ? err.message : "scan failed.");
        setPhase("error");
      });
    return () => ac.abort();
  }, [address, hasKey, trigger, setScan]);

  const reScan = useCallback(() => {
    // A rescan is a deliberate new scan: drop the per-session dedup marker so
    // this completion counts even though the address was already counted.
    clearScanCount(address);
    setTrigger((n) => n + 1);
  }, [address]);

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

  const totalDelta =
    scan && prevForThis ? scan.totalScore - prevForThis.totalScore : null;

  return (
    <div className="relative z-10 flex-1 flex flex-col">
      <header className="flex items-center justify-between gap-3 px-5 md:px-14 pt-6 md:pt-8 flex-wrap">
        <Link href="/">
          <Image
            src="/logo.png"
            alt="how public is your wallet"
            width={1080}
            height={1080}
            priority
            className="h-16 w-16 md:h-20 md:w-20"
          />
        </Link>
      </header>

      <main className="flex-1 px-5 md:px-14 py-10 md:py-14">
        <div className="w-full max-w-[1080px] mx-auto flex flex-col gap-14">
          {/* Address + meta */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-6">
            <div className="flex flex-col gap-3 min-w-0">
              <div className="flex items-baseline gap-3 text-[12px] tracking-[0.22em] lowercase text-muted flex-wrap">
                <span aria-hidden className="w-8 h-px bg-rule" />
                <span className="lowercase tracking-normal text-[12px] not-italic">
                  scan period · {windowReadable()}
                </span>
                <span aria-hidden className="text-muted-2">·</span>
                <span
                  className="inline-flex items-center gap-1.5 normal-case tracking-normal text-[12px] text-muted"
                  title="read only audit. share cards are watermarked."
                >
                  <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-muted-2" />
                  watch only
                </span>
              </div>
              <div className="flex flex-col gap-1.5 min-w-0">
                <h2 className="font-display text-[28px] md:text-[44px] leading-[1.05] tracking-[-0.02em] text-ink break-words">
                  <span className="text-muted">privacy score · </span>
                  <span className="font-mono text-[18px] md:text-[28px] tracking-tight align-baseline text-ink">
                    {sns ?? shortAddress(address, 6, 6)}
                  </span>
                </h2>
                {sns && (
                  <span className="font-mono text-[12px] md:text-[13px] tracking-tight text-muted break-all">
                    {address}
                  </span>
                )}
              </div>
            </div>
            <div className="md:ml-auto md:self-end shrink-0">
              <button
                type="button"
                onClick={reScan}
                disabled={phase === "scanning"}
                className="inline-flex items-center gap-2 rounded-full border border-rule px-4 py-2 text-[12px] tracking-[0.2em] lowercase text-muted hover:border-ink hover:text-ink disabled:text-muted-2 disabled:cursor-not-allowed transition-colors focus-ring"
              >
                <span
                  aria-hidden
                  className={`inline-block ${phase === "scanning" ? "animate-spin" : ""}`}
                >
                  ↻
                </span>
                <span>{phase === "scanning" ? "rescanning…" : "rescan"}</span>
              </button>
            </div>
          </div>

          {/* Hero — centered meter, copy under */}
          <section className="relative border-t border-b border-ink/80 py-12 md:py-20">
            <CelebrationBurst trigger={celebrationKey} />
            <div className="flex flex-col items-center gap-8 md:gap-10">
              <span className="text-[11px] tracking-[0.28em] lowercase text-muted">
                privacy score
              </span>

              {/* Negative margins counteract the CSS scale, which shrinks the
                  painted pixels but not the layout box the element reserves. */}
              <div className="relative origin-center scale-[0.72] sm:scale-[0.85] md:scale-100 -m-[59px] sm:-m-[31px] md:m-0">
                {/* Soft tri-color glow behind the meter so it pops on the page */}
                <div
                  aria-hidden
                  className="meter-bed absolute -inset-12 md:-inset-16 rounded-full pointer-events-none"
                />
                <div className="relative">
                  {scan ? (
                    <CircularScore value={scan.totalScore} size={420} />
                  ) : (
                    <div className="pulse-soft">
                      <CircularScore value={0} size={420} showBand={false} />
                    </div>
                  )}
                  <AnimatePresence>
                    {phase === "done" &&
                      scan &&
                      prevForThis &&
                      totalDelta !== null &&
                      totalDelta !== 0 && (
                        <motion.div
                          key={`delta-${scan.scannedAt}`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            delay: 1.6,
                            duration: 0.6,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          className="absolute -top-2 -right-2 md:right-6 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border tabular text-[12px]"
                          style={{
                            color:
                              totalDelta > 0
                                ? "var(--score-high)"
                                : "var(--score-low)",
                            borderColor:
                              totalDelta > 0
                                ? "var(--score-high)"
                                : "var(--score-low)",
                            background: "rgba(255,255,255,0.94)",
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

              <div className="w-full flex justify-center">
                {phase === "scanning" ? (
                  <ScanTips />
                ) : (
                  <p className="font-display text-[22px] md:text-[30px] leading-[1.2] tracking-[-0.018em] text-ink-soft max-w-[38ch] text-center">
                    {heroCopy(phase, scan, totalDelta)}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Sub-scores */}
          <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
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
                return <PendingChip key={k} title={titleFor(k)} />;
              }
            )}
          </section>

          {/* Try these fixes */}
          {scan && (
            <section className="flex flex-col gap-5">
              <div className="flex items-baseline gap-3 text-[12px] tracking-[0.22em] lowercase text-muted">
                <span aria-hidden className="w-8 h-px bg-rule" />
                <span>recommend fixes</span>
              </div>
              <LeakReasonsList reasons={scan.leakReasons} />
            </section>
          )}

          {/* Dust / poisoning panel · informational, never scored */}
          {/* {scan && <DustPanel warnings={scan.dustWarnings} />} */}

          {/* Share card + actions — disabled while we rework the share flow */}
          {/* {scan && phase === "done" && (
            <ShareActions
              address={address}
              score={scan.totalScore}
              previousScore={prevForThis ? prevForThis.totalScore : null}
              watchOnly={watchOnly}
            />
          )} */}

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
        </div>
      </main>

      <footer className="px-8 md:px-14 pb-8 pt-10">
        <div className="flex flex-col md:flex-row justify-between gap-4 text-[12px] text-muted">
          <div>© how public is your wallet 2026</div>
        </div>
      </footer>

      <RetroAds />
    </div>
  );
}

function titleFor(k: keyof typeof WEIGHTS): string {
  switch (k) {
    case "identity":
      return "identity exposure";
    case "kyc":
      return "kyc distance";
    case "cluster":
      return "cluster footprint";
    case "connected":
      return "connected apps";
    case "wealth":
      return "visible wealth";
    case "surveillance":
      return "surveillance coverage";
  }
}

function PendingChip({ title }: { title: string }) {
  return (
    <div className="card-soft p-5 flex flex-col gap-4 pulse-soft">
      <div className="flex items-center gap-3">
        <span className="text-[13px] text-ink/70 truncate">{title}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline gap-1">
            <span className="score-numeral text-[44px] leading-none tabular text-muted-2">
              ··
            </span>
            <span className="text-[13px] text-muted-2 tabular">/ 100</span>
          </div>
          <span className="text-[12px] text-muted-2">reading…</span>
        </div>
        <span
          aria-hidden
          className="rounded-full"
          style={{
            width: 18,
            height: 64,
            background: "rgba(20,17,13,0.05)",
          }}
        />
      </div>
    </div>
  );
}

function heroCopy(
  phase: Phase,
  scan: Scan | null,
  totalDelta: number | null
): string {
  if (phase === "error") return "something stopped the audit before we could read the chain.";
  if (phase === "scanning") {
    return scan
      ? "Re reading the last ninety days. Hold tight…"
      : "Reading ninety days of public onchain activity…";
  }
  if (!scan) return "reading ninety days of public onchain activity…";
  if (totalDelta !== null) {
    if (totalDelta > 0)
      return `Quieter than last time. You tightened ${totalDelta} point${totalDelta === 1 ? "" : "s"}.`;
    if (totalDelta < 0)
      return `Slipped ${Math.abs(totalDelta)} point${totalDelta === -1 ? "" : "s"} since last scan.`;
    return "no change since last scan. pick a top reason to tighten.";
  }
  const band = scoreBand(scan.totalScore);
  if (band === "high") return "you leave a small footprint. stay disciplined.";
  if (band === "mid") return "moderate exposure. a few easy wins ahead.";
  return "broad, distinctive surface. plenty to tighten.";
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
          className="w-[520px] h-[520px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(2,201,121,0.38) 0%, rgba(2,201,121,0) 62%)",
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
  return `${fmt(start)} to ${fmt(now)}`;
}

async function runScan(
  address: string,
  signal: AbortSignal
) {
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
      title: "cluster footprint",
      weight: WEIGHTS.cluster,
      score,
      signals: {
        uniqueCounterparties: scored.uniqueCounterparties,
        uniqueDapps: scored.uniqueDapps,
        txCount: signals.txCount,
        windowDays: scored.windowDays,
      },
    };
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
        title: "kyc distance",
        weight: WEIGHTS.kyc,
        score,
        signals: {
          hops: scored.hops,
          nearestCex: scored.nearestCex,
          distanceLabel: scored.distanceLabel,
          linkVia: signals.linkVia ?? "none",
          cexAddressesChecked: signals.cexAddressesChecked,
          hop1Traversed: signals.hop1Traversed,
        },
      };
      return factor;
    });

  const wealthPromise = fetchWealthSignals(address, { signal })
    .then((signals) => {
      const { score, signals: scored } = scoreWealth(signals);
      const factor: Factor = {
        key: "wealth",
        title: "visible wealth",
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
      return factor;
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
        title: "identity exposure",
        weight: WEIGHTS.identity,
        score,
        signals: {
          namesOwned: scored.namesOwned,
          exposedRecords: scored.exposedRecords,
          nameMatchesHandle: scored.nameMatchesHandle,
          names: signals.names.map((n) => n.fullName).join(", ") || "none",
        },
      };
      return factor;
    })
    .catch((err) => {
      // Don't fail the whole scan if Bonfida/AllDomains hiccups — score
      // identity as "no detected presence" and surface a soft error in trace.
      console.warn("identity factor failed", err);
      const { score, signals: scored } = scoreIdentity({
        nameCount: 0,
        exposedRecordCount: 0,
        nameMatchesHandle: false,
      });
      const factor: Factor = {
        key: "identity",
        title: "identity exposure",
        weight: WEIGHTS.identity,
        score,
        signals: {
          namesOwned: scored.namesOwned,
          exposedRecords: scored.exposedRecords,
          nameMatchesHandle: scored.nameMatchesHandle,
          names: "lookup failed, treated as no presence",
        },
      };
      return factor;
    });

  // Connected + Surveillance derive from cluster's tx scan.
  const dependentPromise = clusterPromise.then(async (clusterSignals) => {
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
      title: "connected apps",
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

    const { score: sScore, signals: sScored } = scoreSurveillance({
      inboundFlagged: surveillanceSignals.inboundFlagged,
      outboundFlagged: surveillanceSignals.outboundFlagged,
    });
    const surveillanceFactor: Factor = {
      key: "surveillance",
      title: "surveillance coverage",
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
