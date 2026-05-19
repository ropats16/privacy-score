// Builds plain-English "leak reasons" from scored factors.
// Each leak reason carries: severity, explanation, recommendation, and an
// estimated score lift (max headroom this factor could contribute back).

import type { Factor, LeakReason, RecommendedAction } from "./types";
import { RECOMMENDATIONS } from "./recommendations";

/** Max headroom this factor still has on the *total* score. */
export function estimatedLift(factor: Factor, totalWeight: number): number {
  if (totalWeight <= 0) return 0;
  return Math.round(((100 - factor.score) * factor.weight) / totalWeight);
}

function severityFor(score: number): "low" | "medium" | "high" {
  if (score < 35) return "high";
  if (score < 70) return "medium";
  return "low";
}

/** Returns a LeakReason for a factor when its score is below the floor.
 *  Factors at/above the floor produce no leak reason — nothing to fix. */
export function buildLeakReason(
  factor: Factor,
  totalWeight: number
): LeakReason | null {
  const FLOOR = 80; // factors at 80+ aren't worth surfacing as leaks
  if (factor.score >= FLOOR) return null;

  const lift = estimatedLift(factor, totalWeight);
  const severity = severityFor(factor.score);

  switch (factor.key) {
    case "cluster":
      return {
        factorKey: "cluster",
        severity,
        title: "You're easy to fingerprint by your cluster.",
        plainEnglish: clusterCopy(factor),
        signals: factor.signals,
        recommendation: clusterRecommendation(),
        estimatedLift: lift,
      };
    case "kyc":
      return {
        factorKey: "kyc",
        severity,
        title: "A centralized exchange can link this wallet to you.",
        plainEnglish: kycCopy(factor),
        signals: factor.signals,
        recommendation: kycRecommendation(),
        estimatedLift: lift,
      };
    case "connected":
      return {
        factorKey: "connected",
        severity,
        title: "Programs still hold standing permissions on your wallet.",
        plainEnglish: connectedCopy(factor),
        signals: factor.signals,
        recommendation: connectedRecommendation(),
        estimatedLift: lift,
      };
    case "wealth":
      return {
        factorKey: "wealth",
        severity,
        title: "Your visible balance makes you a target.",
        plainEnglish: wealthCopy(factor),
        signals: factor.signals,
        recommendation: wealthRecommendation(),
        estimatedLift: lift,
      };
    case "identity":
      return {
        factorKey: "identity",
        severity,
        title: "Your name records tie this wallet to your identity.",
        plainEnglish: identityCopy(factor),
        signals: factor.signals,
        recommendation: identityRecommendation(),
        estimatedLift: lift,
      };
    case "surveillance":
      return {
        factorKey: "surveillance",
        severity,
        title: "This wallet has touched sanctioned addresses.",
        plainEnglish: surveillanceCopy(factor),
        signals: factor.signals,
        recommendation: surveillanceRecommendation(),
        estimatedLift: lift,
      };
    default:
      return null;
  }
}

function identityCopy(f: Factor): string {
  const names = Number(f.signals.namesOwned ?? 0);
  const records = Number(f.signals.exposedRecords ?? 0);
  const handleMatch = String(f.signals.nameMatchesHandle ?? "no") === "yes";
  if (names === 0) return "No name presence detected. Nothing to fix here.";
  const bits: string[] = [];
  bits.push(
    `${names} name${names === 1 ? "" : "s"} owned by this wallet`
  );
  if (records > 0) {
    bits.push(
      `${records} public record${records === 1 ? "" : "s"} (twitter, url, email, etc.) attached`
    );
  }
  if (handleMatch) bits.push("the name matches a declared social handle");
  return `${bits.join(", ")}. Each populated record gives anyone with an RPC endpoint a direct edge from this wallet to your offline identity.`;
}

function identityRecommendation(): RecommendedAction {
  return {
    headline: "Stop using your named wallet for everything.",
    detail:
      "Keep the named wallet for public activity only and route sensitive payments through a separate, unnamed address. Once a name is widely linked to you, no amount of editing records will unpublish that history.",
    inAppFixAvailable: false,
    links: RECOMMENDATIONS.identity,
  };
}

function surveillanceCopy(f: Factor): string {
  const inbound = Number(f.signals.inboundFlagged ?? 0);
  const outbound = Number(f.signals.outboundFlagged ?? 0);
  if (outbound > 0) {
    return `This wallet sent value to ${outbound} OFAC SDN listed address${outbound === 1 ? "" : "es"} in the last 90 days. Outbound transfers to sanctioned addresses materially increase legal exposure. Review immediately.`;
  }
  if (inbound > 0) {
    return `This wallet received value from ${inbound} OFAC SDN listed address${inbound === 1 ? "" : "es"}. Inbound transfers from flagged senders are almost always unsolicited (dust drops, spam tokens, address poisoning). Don't interact with them. Receiving alone does not constitute wrongdoing.`;
  }
  return "No flagged interactions in the last 90 days.";
}

function surveillanceRecommendation(): RecommendedAction {
  return {
    headline: "Don't interact. Verify before acting.",
    detail:
      "Ignore inbound contact from flagged senders and never return funds or touch tokens they sent. For any outbound transfer you see flagged, look up the address against the official list before taking further action.",
    inAppFixAvailable: false,
    links: RECOMMENDATIONS.surveillance,
  };
}

function clusterCopy(f: Factor): string {
  const cp = Number(f.signals.uniqueCounterparties ?? 0);
  const da = Number(f.signals.uniqueDapps ?? 0);
  return `You've touched ${cp} unique counterparties and ${da} dApps in the last 90 days. The wider the cluster, the easier it is to fingerprint your activity across the chain.`;
}

function clusterRecommendation(): RecommendedAction {
  return {
    headline: "Stop using one wallet for every intent.",
    detail:
      "Route trading, NFTs, payments, and long term holdings through different addresses going forward so no single wallet aggregates your full behavior. You can't untouch counterparties you've already touched, but you can stop adding to the pile.",
    inAppFixAvailable: false,
    links: RECOMMENDATIONS.cluster,
  };
}

function kycCopy(f: Factor): string {
  const label = String(f.signals.distanceLabel ?? "unknown");
  const cex = String(f.signals.nearestCex ?? "");
  if (label === "direct CEX funding") {
    return `This wallet received funds directly from ${cex || "a known CEX address"}. That CEX holds your KYC, so a single subpoena links this wallet to your identity.`;
  }
  if (label === "1 hop") {
    return `This wallet sits one hop from a known ${cex} address. One intermediate wallet stands between you and a KYC'd identity. Minimal buffer.`;
  }
  return `A centralized exchange can be traced to this wallet (${label}). The closer the link, the smaller the legal distance to your identity.`;
}

function connectedCopy(f: Factor): string {
  const active = Number(f.signals.activeDelegations ?? 0) + Number(f.signals.activeStakeAuthorities ?? 0);
  const stale = Number(f.signals.staleDelegations ?? 0) + Number(f.signals.staleStakeAuthorities ?? 0);
  const total = active + stale;
  if (total === 0) return "No standing permissions detected.";
  const parts: string[] = [];
  if (active) parts.push(`${active} active`);
  if (stale) parts.push(`${stale} stale`);
  return `This wallet has ${parts.join(" and ")} standing permission${total === 1 ? "" : "s"} attached. Token delegations or stake account authorities held by other programs and addresses. Stale ones are the highest risk: a dApp you forgot can still move your tokens.`;
}

function connectedRecommendation(): RecommendedAction {
  return {
    headline: "Revoke any delegation you don't actively use.",
    detail:
      "Once a quarter, sweep your standing approvals and revoke anything you don't recognise or no longer use. Stale delegations from forgotten dApps are the easiest entry point a future exploit will reach for.",
    inAppFixAvailable: false,
    links: RECOMMENDATIONS.connected,
  };
}

function wealthCopy(f: Factor): string {
  const total = String(f.signals.usdTotal ?? "$0");
  const sol = String(f.signals.solUsd ?? "$0");
  const spl = String(f.signals.splUsd ?? "$0");
  return `This wallet currently shows ${total} in visible onchain value (${sol} in SOL and ${spl} in priceable SPL tokens). Bigger visible balance, bigger target for phishing, social engineering, and physical risk.`;
}

function wealthRecommendation(): RecommendedAction {
  return {
    headline: "Stop using one address as both wallet and vault.",
    detail:
      "Keep day to day spending money on this wallet and move long term value to a separate cold or vault address you can fund privately. You can't unpublish the current balance, but you can stop adding to it.",
    inAppFixAvailable: false,
    links: RECOMMENDATIONS.wealth,
  };
}

function kycRecommendation(): RecommendedAction {
  return {
    headline: "Stop funding this wallet straight from a CEX.",
    detail:
      "If this address is for sensitive activity, fund it through an intermediate wallet you control instead of straight off your KYC'd exchange account. Each extra hop adds real legal distance between your identity and what this wallet does.",
    inAppFixAvailable: false,
    links: RECOMMENDATIONS.kyc,
  };
}
