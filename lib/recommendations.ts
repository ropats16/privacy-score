// Curated external tool/guide links per leak reason.
//
// Curation policy:
//   • Every factor gets one factor-specific Solana tool as the primary link.
//   • No mixers, tumblers, or sanctions evasion guidance.
//   • `affiliate` is reserved for future referral monetization. Empty in v1.

import type { FactorKey, ToolLink } from "./types";

export const RECOMMENDATIONS: Record<FactorKey, ToolLink[]> = {
  identity: [
    {
      label: "sns manager · edit or transfer your .sol records",
      url: "https://sns.id/",
      blurb:
        "the authoritative sns dashboard. wipe public records (twitter, url, email, telegram, discord) on your domain or transfer the name itself to a fresh unnamed wallet so it stops resolving to your active address.",
    },
  ],
  kyc: [
    {
      label: "umbra · stealth payments on solana",
      url: "https://umbraprivacy.com/",
      blurb:
        "route the funding step through a one time stealth address instead of receiving straight from a kyc'd exchange. breaks the deterministic edge between cex deposit and spending wallet.",
    },
  ],
  cluster: [
    {
      label: "magicblock · ephemeral rollups for dapp activity",
      url: "https://www.magicblock.xyz/",
      blurb:
        "spin up short lived session wallets on ephemeral rollups for trading, gaming, and dapp interactions. the behavioral fingerprint stays off your mainnet address.",
    },
  ],
  connected: [
    {
      label: "revoke.cash · solana approvals dashboard",
      url: "https://revoke.cash/solana",
      blurb:
        "enumerates every active spl token delegation and stake authority on this wallet, then revokes them with a single signed transaction. covers both token and stake account permissions.",
    },
  ],
  wealth: [
    {
      label: "squads · multisig smart account vaults",
      url: "https://squads.so/",
      blurb:
        "move long hold value into a multisig vault address with policy controls (threshold signers, time locks). separates the wallet you display in chats from the wallet that actually holds value.",
    },
  ],
  surveillance: [
    {
      label: "range · solana risk and compliance screening",
      url: "https://www.range.security/",
      blurb:
        "solana native risk scoring for counterparties. cross check the flagged address before you decide whether to ignore the inbound or escalate the outbound.",
    },
    {
      label: "ofac sdn list · official source",
      url: "https://sanctionssearch.ofac.treas.gov/",
      blurb:
        "confirm any flagged address against the authoritative u.s. treasury list before taking action.",
    },
  ],
};
