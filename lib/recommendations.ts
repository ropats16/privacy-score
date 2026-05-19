// Curated external tool/guide links per leak reason.
//
// Curation policy (audited in Phase 7):
//   • Every factor key must have ≥1 entry.
//   • Links go to official docs, established privacy explainers, or
//     well-known utilities (Bonfida SNS, Revoke.cash, Sol-Incinerator,
//     Phantom help, OFAC official source).
//   • NO mixers, tumblers, or anything that could be construed as
//     sanctions-evasion guidance — even if some users might want it.
//     Surveillance recommendations point at official lookup tools, not
//     at evasion.
//   • `affiliate` is reserved for future referral monetization. Empty
//     in v1 across every link.
//
// Methodology page reads this same file, so additions show up in the
// public surface automatically.

import type { FactorKey, ToolLink } from "./types";

export const RECOMMENDATIONS: Record<FactorKey, ToolLink[]> = {
  identity: [
    {
      label: "Bonfida SNS — manage records",
      url: "https://sns.id/",
      blurb:
        "Edit or delete public records (twitter, url, email) attached to your .sol name. Removing these unties the on-chain handle from your real-world identity.",
    },
    {
      label: "Wallet segmentation primer",
      url: "https://officercia.mirror.xyz/yYpgtuhYUbCRZ8MmrcEjlktBu9bND8oWvkM_M3vT_2A",
      blurb:
        "If a name is already widely linked to you, move sensitive activity to a fresh wallet without a name attached.",
    },
  ],
  kyc: [
    {
      label: "Wallet segmentation primer",
      url: "https://officercia.mirror.xyz/yYpgtuhYUbCRZ8MmrcEjlktBu9bND8oWvkM_M3vT_2A",
      blurb:
        "Why one wallet per intent matters, and how to set up fresh wallets without leaking metadata.",
    },
    {
      label: "Phantom: create a separate wallet",
      url: "https://help.phantom.com/hc/en-us/articles/4406388623251-How-do-I-create-a-new-wallet-on-Phantom",
      blurb: "Official walkthrough for spinning up a clean wallet.",
    },
  ],
  cluster: [
    {
      label: "Wallet segmentation primer",
      url: "https://officercia.mirror.xyz/yYpgtuhYUbCRZ8MmrcEjlktBu9bND8oWvkM_M3vT_2A",
      blurb:
        "Practical guidance for splitting trading, NFTs, and payments across distinct wallets.",
    },
    {
      label: "Solana account cleanup (Sol-Incinerator)",
      url: "https://sol-incinerator.com/",
      blurb:
        "Close empty token accounts to reduce the on-chain surface tied to this address.",
    },
  ],
  connected: [
    {
      label: "Revoke.cash (Solana)",
      url: "https://revoke.cash/solana",
      blurb:
        "Enumerate and revoke every live SPL token delegation. The canonical tool for cleaning up standing permissions.",
    },
    {
      label: "Solana stake authority docs",
      url: "https://solana.com/docs/economics/staking",
      blurb:
        "Reference for moving stake / withdrawer authorities back to addresses you control.",
    },
  ],
  wealth: [
    {
      label: "Cold-storage hardware wallets",
      url: "https://help.phantom.com/hc/en-us/articles/4406388623251-Using-a-hardware-wallet-with-Phantom",
      blurb:
        "How to pair a Ledger with Phantom and shift long-hold balances off your hot wallet.",
    },
    {
      label: "Wallet segmentation primer",
      url: "https://officercia.mirror.xyz/yYpgtuhYUbCRZ8MmrcEjlktBu9bND8oWvkM_M3vT_2A",
      blurb:
        "Why one wallet per intent matters, and how to split day-to-day from long-hold.",
    },
  ],
  surveillance: [
    {
      label: "OFAC SDN list (official source)",
      url: "https://sanctionssearch.ofac.treas.gov/",
      blurb:
        "The canonical U.S. sanctions list. Use this to verify whether an address you saw is actually flagged.",
    },
    {
      label: "Chainalysis sanctions API documentation",
      url: "https://public.chainalysis.com/api/v1/address/",
      blurb:
        "Independent reference data on sanctioned addresses, useful for cross-checking exposure.",
    },
  ],
};
