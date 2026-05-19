// Single source of truth for scoring rubrics.
// Consumed by the scorer AND the methodology page renderer.
// Methodology cannot drift from logic — both read from this file.

import type { Rubric, FactorKey } from "./types";

export const WEIGHTS: Record<FactorKey, number> = {
  identity: 25,
  kyc: 20,
  cluster: 20,
  connected: 15,
  wealth: 10,
  surveillance: 10,
};

export const RUBRICS: Rubric[] = [
  {
    factor: "identity",
    title: "Identity exposure",
    weight: WEIGHTS.identity,
    measures:
      "How much your wallet's naming presence ties it to a real world identity. Owning a name is fine. Populating that name with twitter, email, or website records is what dox'es the wallet.",
    steps: [
      {
        when: "No .sol or alt TLD name owned",
        effect: "100, invisible at the name layer",
      },
      {
        when: "Name(s) owned, no public records, no handle match",
        effect: "80, adopted but not advertised",
      },
      {
        when: "Each exposed social/email/website record (twitter, url, email, telegram, discord, github)",
        effect: "−25 per record",
      },
      {
        when: "Name matches a known social handle pattern",
        effect: "−25",
      },
      {
        when: "Each additional name beyond the first",
        effect: "−5 (more surface to fingerprint)",
      },
      { when: "Floor", effect: "0" },
    ],
    note:
      ".sol resolution via Bonfida; alt TLDs (.abc, .bonk, .poor, etc.) via AllDomains (@onsol/tldparser). Records read with Bonfida's getMultipleRecordsV2 across the V2 record types. Absence of a name is treated as a privacy positive.",
  },
  {
    factor: "cluster",
    title: "Cluster footprint",
    weight: WEIGHTS.cluster,
    measures:
      "How many unique counterparties and dApps your wallet touched in the last 90 days. The wider your cluster, the easier it is to fingerprint your activity.",
    steps: [
      {
        when: "≤5 counterparties AND ≤5 dApps in 90 days",
        effect: "100, tight cluster, hard to fingerprint",
      },
      {
        when: "Counterparties grow toward 100, or dApps grow toward 50",
        effect: "Linear decay toward 0",
      },
      {
        when: "≥100 counterparties OR ≥50 dApps in 90 days",
        effect: "0, broad, distinctive footprint",
      },
    ],
    note:
      "Counterparties = unique non program account peers in parsed transactions. dApps = unique on chain programs invoked, excluding system and ATA programs.",
  },
  {
    factor: "kyc",
    title: "KYC distance",
    weight: WEIGHTS.kyc,
    measures:
      "How many transaction hops sit between this wallet and the nearest known centralized exchange address. Shorter distance = a CEX (which holds your KYC) can link this wallet to your identity more directly.",
    steps: [
      { when: "0 hops, funded directly from a CEX address", effect: "0" },
      { when: "1 hop from a CEX", effect: "25" },
      { when: "2 hops from a CEX", effect: "50" },
      { when: "3 hops from a CEX", effect: "75" },
      {
        when: "4+ hops, or no detectable CEX linkage in 90 days",
        effect: "100, effectively unlinked from any known CEX",
      },
    ],
    note:
      "We detect direct CEX touches via a curated set of known exchange hot wallet and deposit addresses (Binance, Coinbase, Kraken, OKX, Bybit, KuCoin, Crypto.com, Gate.io). One hop traversal walks the top funders of this wallet. Deeper hops are inferred. We don't BFS the entire graph in v1.",
  },
  {
    factor: "connected",
    title: "Connected apps",
    weight: WEIGHTS.connected,
    measures:
      "Live token delegations and stake account authorities still attached to this wallet. Each one is a standing permission a program holds over your assets, even if the dApp is long forgotten.",
    steps: [
      { when: "Zero live delegations or stake authorities", effect: "100" },
      {
        when: "Each active delegation used in the last 90 days",
        effect: "−10 per",
      },
      {
        when: "Each stale delegation (no matching activity in 90 days)",
        effect: "−20 per",
      },
      { when: "Floor", effect: "0" },
    ],
    note:
      "Delegations are read from your SPL token accounts (delegate field set, nonzero amount). Stake account authorities are read from native stake accounts where staker or withdrawer differs from this wallet. Staleness is inferred against the 90 day activity peer set.",
  },
  {
    factor: "wealth",
    title: "Visible wealth",
    weight: WEIGHTS.wealth,
    measures:
      "The USD value visible on this wallet right now: SOL plus priceable SPL tokens. Bigger visible balance = bigger target for phishing, social engineering, and physical risk.",
    steps: [
      { when: "Under $1k", effect: "100" },
      { when: "≈ $10k", effect: "75" },
      { when: "≈ $100k", effect: "50" },
      { when: "≈ $1M", effect: "25" },
      { when: "$10M and above", effect: "0" },
    ],
    note:
      "Log scaled between $1k and $10M. Prices come from Helius for SOL and priceable SPL fungibles. NFT floors are not yet included; they ship in a later phase. Wealth held off chain or on other chains is invisible here by design.",
  },
  {
    factor: "surveillance",
    title: "Surveillance coverage",
    weight: WEIGHTS.surveillance,
    measures:
      "Whether this wallet has touched addresses on the U.S. OFAC SDN list. A single dust drop from a flagged address is informational, not a verdict. Direct outbound transfers are what materially raise legal risk.",
    steps: [
      { when: "No interactions with OFAC SDN addresses in 90 days", effect: "100" },
      {
        when: "Inbound only contact (dust / unsolicited transfer received)",
        effect: "−10 per distinct counterparty (capped)",
      },
      {
        when: "Outbound transfer to a flagged address",
        effect: "−50 per (this is the material risk)",
      },
      { when: "Floor", effect: "0" },
    ],
    note:
      "OFAC SDN Solana addresses are fetched server side and cached at the edge with weekly revalidation. A flagged inbound transfer is almost always involuntary (dust drop, address poisoning, spam token); we surface it for awareness but treat it lightly. Outbound transfers are the signal that actually matters.",
  },
];

export const RUBRIC_BY_FACTOR: Record<FactorKey, Rubric | undefined> =
  RUBRICS.reduce(
    (acc, r) => {
      acc[r.factor] = r;
      return acc;
    },
    {} as Record<FactorKey, Rubric | undefined>
  );
