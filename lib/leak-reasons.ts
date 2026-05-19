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
        title: "a centralized exchange can link this wallet to you.",
        plainEnglish: kycCopy(factor),
        signals: factor.signals,
        recommendation: kycRecommendation(),
        estimatedLift: lift,
      };
    case "connected":
      return {
        factorKey: "connected",
        severity,
        title: "programs still hold standing permissions on your wallet.",
        plainEnglish: connectedCopy(factor),
        signals: factor.signals,
        recommendation: connectedRecommendation(),
        estimatedLift: lift,
      };
    case "wealth":
      return {
        factorKey: "wealth",
        severity,
        title: "your visible balance makes you a target.",
        plainEnglish: wealthCopy(factor),
        signals: factor.signals,
        recommendation: wealthRecommendation(),
        estimatedLift: lift,
      };
    case "identity":
      return {
        factorKey: "identity",
        severity,
        title: "your name records tie this wallet to your identity.",
        plainEnglish: identityCopy(factor),
        signals: factor.signals,
        recommendation: identityRecommendation(),
        estimatedLift: lift,
      };
    case "surveillance":
      return {
        factorKey: "surveillance",
        severity,
        title: "this wallet has touched sanctioned addresses.",
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
  if (names === 0) return "no name presence detected. nothing to fix here.";
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
    headline: "clean the records, then split the wallet.",
    detail:
      "open sns manager and wipe any public record (twitter, url, email, discord, telegram) you don't want tied to onchain activity. then stop using the named wallet for everything: keep it for public, payable activity and route sensitive moves through a separate unnamed address. you can't unpublish history, but you can stop adding to it.",
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
  return "no flagged interactions in the last 90 days.";
}

function surveillanceRecommendation(): RecommendedAction {
  return {
    headline: "verify the flag, then leave it alone.",
    detail:
      "run the address through a solana native risk screen (range) and confirm the hit against the official ofac sdn list before doing anything else. for inbound transfers from flagged senders: ignore them, do not return funds, do not touch dust tokens they sent. for any outbound transfer you find flagged, escalate to your counsel rather than acting on your own.",
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
    headline: "push high frequency activity onto ephemeral rails.",
    detail:
      "the cheapest fix for a wide cluster is to stop widening it. push trading, gaming, and any high frequency dapp interaction onto magicblock ephemeral rollups so each session writes to short lived state rather than your mainnet graph. keep payments and long hold on separate addresses, and never let one wallet aggregate your full behavior again.",
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
  if (total === 0) return "no standing permissions detected.";
  const parts: string[] = [];
  if (active) parts.push(`${active} active`);
  if (stale) parts.push(`${stale} stale`);
  return `This wallet has ${parts.join(" and ")} standing permission${total === 1 ? "" : "s"} attached. Token delegations or stake account authorities held by other programs and addresses. Stale ones are the highest risk: a dApp you forgot can still move your tokens.`;
}

function connectedRecommendation(): RecommendedAction {
  return {
    headline: "sweep approvals through revoke.cash, every quarter.",
    detail:
      "open revoke.cash for solana, list every standing spl token delegation and stake authority on this wallet, and revoke anything you don't recognise or no longer use. set a recurring calendar reminder (one sweep per quarter) so stale approvals don't accumulate. revoking costs a fraction of a cent. forgetting to revoke is the cheapest entry point a future exploit will reach for.",
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
    headline: "move the vault behind a squads multisig.",
    detail:
      "keep day to day spend on this address. stand up a squads multisig vault for long hold value with a threshold of signers and, ideally, a time lock on large outflows. a hardened custody address that you don't paste into random dapps is harder to phish, drain, or physically target than a single hot wallet showing the full balance.",
    inAppFixAvailable: false,
    links: RECOMMENDATIONS.wealth,
  };
}

function kycRecommendation(): RecommendedAction {
  return {
    headline: "fund through a stealth address, not direct from cex.",
    detail:
      "for any sensitive activity, never receive funds straight from your kyc'd exchange. use umbra to derive a one time stealth address only you can spend from, send the cex withdrawal there, then move into this wallet. each hop adds real legal distance between your identity and what this wallet does.",
    inAppFixAvailable: false,
    links: RECOMMENDATIONS.kyc,
  };
}
