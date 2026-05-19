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
    title: "identity exposure",
    weight: WEIGHTS.identity,
    measures:
      "How much your wallet's naming presence ties it to an offline identity. Owning a name is fine. Populating that name with twitter, email, or website records is what dox'es the wallet.",
    steps: [
      {
        when: "no .sol or alt tld name owned",
        effect: "100, invisible at the name layer",
      },
      {
        when: "name(s) owned, no public records, no handle match",
        effect: "80, adopted but not advertised",
      },
      {
        when: "each exposed social/email/website record (twitter, url, email, telegram, discord, github)",
        effect: "−25 per record",
      },
      {
        when: "name matches a known social handle pattern",
        effect: "−25",
      },
      {
        when: "each additional name beyond the first",
        effect: "−5 (more surface to fingerprint)",
      },
      { when: "floor", effect: "0" },
    ],
    note:
      ".sol resolution via Bonfida; alt TLDs (.abc, .bonk, .poor, etc.) via AllDomains (@onsol/tldparser). Records read with Bonfida's getMultipleRecordsV2 across the V2 record types. Absence of a name is treated as a privacy positive.",
  },
  {
    factor: "cluster",
    title: "cluster footprint",
    weight: WEIGHTS.cluster,
    measures:
      "how many unique counterparties and dapps your wallet touched in the last 90 days. the wider your cluster, the easier it is to fingerprint your activity.",
    steps: [
      {
        when: "≤5 counterparties and ≤5 dapps in 90 days",
        effect: "100, tight cluster, hard to fingerprint",
      },
      {
        when: "counterparties grow toward 100, or dapps grow toward 50",
        effect: "linear decay toward 0",
      },
      {
        when: "≥100 counterparties or ≥50 dapps in 90 days",
        effect: "0, broad, distinctive footprint",
      },
    ],
    note:
      "counterparties = unique non program account peers in parsed transactions. dapps = unique on chain programs invoked, excluding system and ata programs.",
  },
  {
    factor: "kyc",
    title: "kyc distance",
    weight: WEIGHTS.kyc,
    measures:
      "how many transaction hops sit between this wallet and the nearest known centralized exchange address. shorter distance = a cex (which holds your kyc) can link this wallet to your identity more directly.",
    steps: [
      { when: "0 hops, funded directly from a cex address", effect: "0" },
      { when: "1 hop from a cex", effect: "25" },
      { when: "2 hops from a cex", effect: "50" },
      { when: "3 hops from a cex", effect: "75" },
      {
        when: "4+ hops, or no detectable cex linkage in 90 days",
        effect: "100, effectively unlinked from any known cex",
      },
    ],
    note:
      "We detect direct CEX touches via a curated set of known exchange hot wallet and deposit addresses (Binance, Coinbase, Kraken, OKX, Bybit, KuCoin, Crypto.com, Gate.io). One hop traversal walks the top funders of this wallet. Deeper hops are inferred. We don't BFS the entire graph in v1.",
  },
  {
    factor: "connected",
    title: "connected apps",
    weight: WEIGHTS.connected,
    measures:
      "live token delegations and stake account authorities still attached to this wallet. each one is a standing permission a program holds over your assets, even if the dapp is long forgotten.",
    steps: [
      { when: "zero live delegations or stake authorities", effect: "100" },
      {
        when: "each active delegation used in the last 90 days",
        effect: "−10 per",
      },
      {
        when: "each stale delegation (no matching activity in 90 days)",
        effect: "−20 per",
      },
      { when: "floor", effect: "0" },
    ],
    note:
      "delegations are read from your spl token accounts (delegate field set, nonzero amount). stake account authorities are read from native stake accounts where staker or withdrawer differs from this wallet. staleness is inferred against the 90 day activity peer set.",
  },
  {
    factor: "wealth",
    title: "visible wealth",
    weight: WEIGHTS.wealth,
    measures:
      "the usd value visible on this wallet right now: sol plus priceable spl tokens. bigger visible balance = bigger target for phishing, social engineering, and physical risk.",
    steps: [
      { when: "under $1k", effect: "100" },
      { when: "≈ $10k", effect: "75" },
      { when: "≈ $100k", effect: "50" },
      { when: "≈ $1m", effect: "25" },
      { when: "$10m and above", effect: "0" },
    ],
    note:
      "log scaled between $1k and $10m. prices come from helius for sol and priceable spl fungibles. nft floors are not yet included; they ship in a later phase. wealth held off chain or on other chains is invisible here by design.",
  },
  {
    factor: "surveillance",
    title: "surveillance coverage",
    weight: WEIGHTS.surveillance,
    measures:
      "whether this wallet has touched addresses on the u.s. ofac sdn list. a single dust drop from a flagged address is informational, not a verdict. direct outbound transfers are what materially raise legal risk.",
    steps: [
      { when: "no interactions with ofac sdn addresses in 90 days", effect: "100" },
      {
        when: "inbound only contact (dust / unsolicited transfer received)",
        effect: "−10 per distinct counterparty (capped)",
      },
      {
        when: "outbound transfer to a flagged address",
        effect: "−50 per (this is the material risk)",
      },
      { when: "floor", effect: "0" },
    ],
    note:
      "ofac sdn solana addresses are fetched server side and cached at the edge with weekly revalidation. a flagged inbound transfer is almost always involuntary (dust drop, address poisoning, spam token); we surface it for awareness but treat it lightly. outbound transfers are the signal that actually matters.",
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
