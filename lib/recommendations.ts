// Curated external tool/guide links per leak reason.
//
// Curation policy:
//   • Every factor key gets exactly one direct link to a Solana privacy tool.
//   • Priority list: Umbra (umbraprivacy.com), MagicBlock
//     (magicblock.xyz), Revoke.cash. We only fall back to other tools when
//     none of those three fit the leak type.
//   • NO mixers, tumblers, or anything that could be construed as
//     sanctions evasion guidance.
//   • `affiliate` is reserved for future referral monetization. Empty
//     in v1 across every link.

import type { FactorKey, ToolLink } from "./types";

export const RECOMMENDATIONS: Record<FactorKey, ToolLink[]> = {
  identity: [
    {
      label: "umbra · private payments on solana",
      url: "https://umbraprivacy.com/",
      blurb:
        "Route sensitive activity through Umbra so your named wallet stops being the address that touches everything.",
    },
  ],
  kyc: [
    {
      label: "umbra · private payments on solana",
      url: "https://umbraprivacy.com/",
      blurb:
        "Umbra breaks the straight line from a KYC'd CEX deposit to the wallet you actually use.",
    },
  ],
  cluster: [
    {
      label: "magicblock · ephemeral wallets and rollups",
      url: "https://www.magicblock.xyz/",
      blurb:
        "Push high frequency activity (trading, NFTs, app interactions) onto MagicBlock so it doesn't pile up against one address.",
    },
  ],
  connected: [
    {
      label: "revoke.cash for solana",
      url: "https://revoke.cash/solana",
      blurb:
        "Enumerate every live SPL token delegation on this wallet and revoke the ones you no longer use.",
    },
  ],
  wealth: [
    {
      label: "umbra · private payments on solana",
      url: "https://umbraprivacy.com/",
      blurb:
        "Move long hold value off this address with Umbra so your visible balance stops advertising you as a target.",
    },
  ],
  surveillance: [
    {
      label: "ofac sdn list (official source)",
      url: "https://sanctionssearch.ofac.treas.gov/",
      blurb:
        "Verify whether the address you saw is actually flagged before taking any action.",
    },
  ],
};
