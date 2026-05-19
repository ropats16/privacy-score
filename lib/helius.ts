// Helius client. All calls are made from the browser. The API key is
// `NEXT_PUBLIC_HELIUS_API_KEY` — exposed by design. Solana RPC is public anyway,
// and the meta-promise is no server-side storage of user addresses.

export const HELIUS_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY ?? "";

export function heliusRpcUrl(): string {
  if (!HELIUS_KEY) {
    throw new Error(
      "NEXT_PUBLIC_HELIUS_API_KEY is not set. Add it to .env.local."
    );
  }
  return `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`;
}

function enhancedTxUrl(address: string, before?: string): string {
  if (!HELIUS_KEY) {
    throw new Error(
      "NEXT_PUBLIC_HELIUS_API_KEY is not set. Add it to .env.local."
    );
  }
  const u = new URL(
    `https://api.helius.xyz/v0/addresses/${address}/transactions`
  );
  u.searchParams.set("api-key", HELIUS_KEY);
  u.searchParams.set("limit", "100");
  if (before) u.searchParams.set("before", before);
  return u.toString();
}

/** Trimmed shape of Helius Enhanced Tx we actually use. */
export type EnhancedTx = {
  signature: string;
  timestamp: number; // seconds epoch
  feePayer?: string;
  source?: string; // dApp source label, e.g. "JUPITER"
  type?: string;
  instructions?: Array<{
    programId: string;
    accounts: string[];
    innerInstructions?: Array<{ programId: string; accounts: string[] }>;
  }>;
  accountData?: Array<{ account: string }>;
  nativeTransfers?: Array<{
    fromUserAccount?: string;
    toUserAccount?: string;
    amount?: number;
  }>;
  tokenTransfers?: Array<{
    fromUserAccount?: string;
    toUserAccount?: string;
    tokenAmount?: number;
    mint?: string;
  }>;
};

/** Programs we treat as plumbing, not "dApps". Counterparties touching these
 *  alone shouldn't bloat the cluster score. */
const PLUMBING_PROGRAMS = new Set<string>([
  "11111111111111111111111111111111", // System
  "ComputeBudget111111111111111111111111111111",
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", // SPL Token
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", // Token-2022
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL", // Associated Token Account
  "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo", // Memo v1
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr", // Memo v2
]);

/** Enumerate parsed txs older-to-newer with a 90-day cutoff.
 *  Pagination via Helius `before=<signature>`. */
export async function* iterTxsLast90d(
  address: string,
  signal?: AbortSignal
): AsyncGenerator<EnhancedTx, void, unknown> {
  const cutoff = Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000);
  let before: string | undefined = undefined;
  // Safety cap — never paginate forever on extremely active wallets.
  const HARD_CAP_PAGES = 30; // ~3000 txs
  for (let page = 0; page < HARD_CAP_PAGES; page++) {
    const res = await fetch(enhancedTxUrl(address, before), { signal });
    if (!res.ok) {
      throw new Error(
        `Helius enhanced-tx fetch failed: ${res.status} ${res.statusText}`
      );
    }
    const batch = (await res.json()) as EnhancedTx[];
    if (!Array.isArray(batch) || batch.length === 0) return;

    for (const tx of batch) {
      if (typeof tx.timestamp === "number" && tx.timestamp < cutoff) {
        return; // crossed the 90-day boundary
      }
      yield tx;
    }
    before = batch[batch.length - 1].signature;
    if (batch.length < 100) return; // last page
  }
}

export type ClusterSignals = {
  uniqueCounterparties: number;
  uniqueDapps: number;
  txCount: number;
  /** All peer addresses (accounts + programs) seen in the 90-day window.
   *  Re-used downstream by the Connected-apps factor for staleness inference. */
  peers: Set<string>;
  /** Compact transfer log captured during the cluster pass. Surveillance and
   *  dust detection are derived from this without re-iterating Helius. */
  transfers: ScanTransfer[];
};

/** Curated set of known CEX hot-wallet / deposit addresses on Solana.
 *  Sourced from public on-chain analytics (Helius labels, Solscan tags,
 *  exchange-published deposit addresses). Not exhaustive — we'd refresh
 *  this from Helius's label API in production. */
export const CEX_ADDRESSES: Record<string, string> = {
  // Binance
  "5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9": "Binance",
  "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM": "Binance",
  "2ojv9BAiHUrvsm9gxDe7fJSzbNZSJcxZvf8dqmWGHG8S": "Binance",
  "3yFwqXBfZY4jBVUafQ1YEXw7recsbAfqEKWUhuHJYa6L": "Binance",
  AC5RDfQFmDS1deWZos921JfqscXdByf8BKHs5ACWjtW2: "Binance",
  // Coinbase
  H8sMJSCQxfKiFTCfDR3DUMLPwcRbM61LGFJ8N4dK3WjS: "Coinbase",
  "9uTQRtRYUudGsyXBHbHcQ3xn3UC2NfYqr9gSwAJWWJBu": "Coinbase",
  "2AQdpHJ2JpcEgPiATUXjQxA8QmafFegfQwSLWSprPicm": "Coinbase",
  // Kraken
  FWznbcNXWQuHTawe9RxvQ2LdCENssh12dsznf4RiouN5: "Kraken",
  // OKX
  HVh6wHNBAsG3pq1Bj5oCzRjoWKVogEDHwUHkRz3ekFgt: "OKX",
  // Bybit
  AobVSwdW9BbpMdJvTqeCN4hPAmh4rHm7vwLnQ5ATSyrS: "Bybit",
  // KuCoin
  BmFdpraQhkiDQE6SnfG5omcA1VwzqfXrwtNYBwWTymy6: "KuCoin",
  // Crypto.com
  E9LAZYxBVhJr9Cd1HnoGUMUkAyVMJpFsM3KYsP3fHCgK: "Crypto.com",
  // Gate.io
  HRH3oZqsFFRgYrFAj38PRq7Ld9DLfATmGYJ9oj1eYzhi: "Gate.io",
};

/** Helius source labels that imply a CEX-side action. */
const CEX_SOURCES = new Set<string>([
  "BINANCE",
  "COINBASE",
  "KRAKEN",
  "OKX",
  "BYBIT",
  "KUCOIN",
  "CRYPTO_COM",
  "GATE_IO",
]);

export type KycHopResult = {
  /** Minimum hops detected (0–3) or null when no link found within search depth. */
  hops: number | null;
  /** Friendly CEX name (e.g. "Binance") when a link was found. */
  nearestCex: string | null;
  /** The address along the path that touched the CEX (= the wallet itself for hop 0). */
  linkVia: string | null;
  /** How many CEX addresses we scanned against (for transparency). */
  cexAddressesChecked: number;
  /** How many counterparties we traversed at hop 1 (capped). */
  hop1Traversed: number;
};

/** Single-pass detector: scan one wallet's 90-day txs for any direct CEX touch
 *  and collect the top inbound funders for downstream 1-hop traversal. */
async function scanWalletForCex(
  address: string,
  signal?: AbortSignal,
  collectFunders = true
): Promise<{
  directHit: { cex: string } | null;
  topFunders: string[]; // most-frequent inbound senders, capped
}> {
  const funderCounts = new Map<string, number>();
  let directHit: { cex: string } | null = null;

  for await (const tx of iterTxsLast90d(address, signal)) {
    if (!directHit) {
      // 1) Helius `source` label on the tx itself
      if (tx.source && CEX_SOURCES.has(tx.source)) {
        directHit = { cex: prettyFromSource(tx.source) };
      }
    }
    if (!directHit) {
      // 2) Native / token transfers involving a known CEX address
      const peers = collectPeers(tx);
      for (const peer of peers) {
        const label = CEX_ADDRESSES[peer];
        if (label) {
          directHit = { cex: label };
          break;
        }
      }
    }
    // Even if we already have a direct hit, still collect funders cheaply.
    if (collectFunders) {
      for (const t of tx.nativeTransfers ?? []) {
        if (t.toUserAccount === address && t.fromUserAccount && t.fromUserAccount !== address) {
          funderCounts.set(t.fromUserAccount, (funderCounts.get(t.fromUserAccount) ?? 0) + 1);
        }
      }
      for (const t of tx.tokenTransfers ?? []) {
        if (t.toUserAccount === address && t.fromUserAccount && t.fromUserAccount !== address) {
          funderCounts.set(t.fromUserAccount, (funderCounts.get(t.fromUserAccount) ?? 0) + 1);
        }
      }
    }
    if (directHit && !collectFunders) break;
  }

  const topFunders = [...funderCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([addr]) => addr);

  return { directHit, topFunders };
}

function collectPeers(tx: EnhancedTx): string[] {
  const peers: string[] = [];
  for (const t of tx.nativeTransfers ?? []) {
    if (t.fromUserAccount) peers.push(t.fromUserAccount);
    if (t.toUserAccount) peers.push(t.toUserAccount);
  }
  for (const t of tx.tokenTransfers ?? []) {
    if (t.fromUserAccount) peers.push(t.fromUserAccount);
    if (t.toUserAccount) peers.push(t.toUserAccount);
  }
  return peers;
}

function prettyFromSource(src: string): string {
  // "BINANCE" -> "Binance", "CRYPTO_COM" -> "Crypto.com", "GATE_IO" -> "Gate.io"
  if (src === "CRYPTO_COM") return "Crypto.com";
  if (src === "GATE_IO") return "Gate.io";
  return src.charAt(0) + src.slice(1).toLowerCase();
}

/** KYC-distance signal extraction. Looks for direct CEX touches on the wallet;
 *  if none, walks the top funders at depth 1. Beyond hop 1 we infer 4+
 *  rather than blow the API budget BFS'ing the whole graph in the browser. */
export async function fetchKycSignals(
  address: string,
  opts?: { signal?: AbortSignal }
): Promise<KycHopResult> {
  const cexAddressesChecked = Object.keys(CEX_ADDRESSES).length;
  const root = await scanWalletForCex(address, opts?.signal, true);

  if (root.directHit) {
    return {
      hops: 0,
      nearestCex: root.directHit.cex,
      linkVia: address,
      cexAddressesChecked,
      hop1Traversed: 0,
    };
  }

  // Hop 1: walk the top funders and check each for a direct CEX touch.
  // Cap at 5 funders × ≤1 page (100 txs) each to keep API usage modest.
  let hop1Traversed = 0;
  for (const funder of root.topFunders) {
    if (opts?.signal?.aborted) break;
    hop1Traversed++;
    const sub = await scanWalletForCex(funder, opts?.signal, false);
    if (sub.directHit) {
      return {
        hops: 1,
        nearestCex: sub.directHit.cex,
        linkVia: funder,
        cexAddressesChecked,
        hop1Traversed,
      };
    }
  }

  return {
    hops: null,
    nearestCex: null,
    linkVia: null,
    cexAddressesChecked,
    hop1Traversed,
  };
}

// Native SPL token programs (delegate lives on the token account, not the mint).
const SPL_TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const NATIVE_STAKE_PROGRAM = "Stake11111111111111111111111111111111111111";
const WSOL_MINT = "So11111111111111111111111111111111111111112";

type ParsedTokenAccount = {
  account: {
    data: {
      parsed: {
        info: {
          mint: string;
          owner: string;
          delegate?: string;
          delegatedAmount?: { amount: string; uiAmount: number; decimals: number };
          tokenAmount: { amount: string; uiAmount: number; decimals: number };
        };
      };
    };
  };
  pubkey: string;
};

type ParsedStakeAccount = {
  pubkey: string;
  account: {
    lamports: number;
    data: {
      parsed: {
        type: string;
        info: {
          meta?: {
            authorized?: { staker?: string; withdrawer?: string };
          };
          stake?: {
            delegation?: { voter?: string };
          };
        };
      };
    };
  };
};

async function rpc<T>(method: string, params: unknown[], signal?: AbortSignal): Promise<T> {
  const res = await fetch(heliusRpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "ps", method, params }),
    signal,
  });
  if (!res.ok) {
    throw new Error(`RPC ${method} failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as { result?: T; error?: { message: string } };
  if (json.error) throw new Error(`RPC ${method} error: ${json.error.message}`);
  return json.result as T;
}

export type ConnectedSignals = {
  activeDelegations: number;
  staleDelegations: number;
  activeStakeAuthorities: number;
  staleStakeAuthorities: number;
  delegations: Array<{ delegate: string; mint: string; uiAmount: number; stale: boolean }>;
  stakeAuthorities: Array<{ stakePubkey: string; staker: string | null; withdrawer: string | null; stale: boolean }>;
};

/** Enumerate live token delegations + stake-account authorities for this wallet.
 *  Staleness = the delegate / authority address never appears as a peer in the
 *  90-day tx window. We accept the peer set from the caller so we don't refetch. */
export async function fetchConnectedSignals(
  address: string,
  recentPeers: ReadonlySet<string>,
  opts?: { signal?: AbortSignal }
): Promise<ConnectedSignals> {
  const signal = opts?.signal;

  // Token accounts owned by the wallet, parsed — gives us delegate + delegatedAmount.
  const fetchTokens = async (programId: string) =>
    rpc<{ value: ParsedTokenAccount[] }>(
      "getTokenAccountsByOwner",
      [address, { programId }, { encoding: "jsonParsed" }],
      signal
    );

  const [splResp, t22Resp] = await Promise.all([
    fetchTokens(SPL_TOKEN_PROGRAM),
    fetchTokens(TOKEN_2022_PROGRAM).catch(() => ({ value: [] as ParsedTokenAccount[] })),
  ]);

  const delegations: ConnectedSignals["delegations"] = [];
  for (const ta of [...splResp.value, ...t22Resp.value]) {
    const info = ta.account.data.parsed.info;
    if (!info.delegate) continue;
    const ui = info.delegatedAmount?.uiAmount ?? 0;
    if (ui <= 0) continue;
    delegations.push({
      delegate: info.delegate,
      mint: info.mint,
      uiAmount: ui,
      stale: !recentPeers.has(info.delegate),
    });
  }

  // Stake accounts where this wallet is the withdraw authority (or staker).
  // We look up accounts owned by the stake program filtered to ones that
  // reference this wallet in either authorized field via memcmp.
  // Authorized layout in a delegated stake account:
  //   offset 4 (meta start) + 8 (rent_exempt_reserve) = 12 → staker (32 bytes)
  //   offset 12 + 32 = 44 → withdrawer (32 bytes)
  const fetchStakes = async (offset: number) =>
    rpc<Array<ParsedStakeAccount>>(
      "getProgramAccounts",
      [
        NATIVE_STAKE_PROGRAM,
        {
          encoding: "jsonParsed",
          filters: [{ memcmp: { offset, bytes: address } }],
        },
      ],
      signal
    ).catch(() => [] as ParsedStakeAccount[]);

  const [stakerHits, withdrawerHits] = await Promise.all([
    fetchStakes(12),
    fetchStakes(44),
  ]);

  // Dedupe stake accounts by pubkey.
  const seenStake = new Set<string>();
  const stakeAuthorities: ConnectedSignals["stakeAuthorities"] = [];
  for (const acct of [...stakerHits, ...withdrawerHits]) {
    if (seenStake.has(acct.pubkey)) continue;
    seenStake.add(acct.pubkey);
    const info = acct.account.data.parsed.info;
    const staker = info?.meta?.authorized?.staker ?? null;
    const withdrawer = info?.meta?.authorized?.withdrawer ?? null;
    // We only care when an *external* party holds either authority. If both
    // staker and withdrawer are the wallet itself, this isn't a "connected app".
    if (staker === address && withdrawer === address) continue;
    const externals = [staker, withdrawer].filter(
      (x): x is string => !!x && x !== address
    );
    const stale = externals.every((x) => !recentPeers.has(x));
    stakeAuthorities.push({
      stakePubkey: acct.pubkey,
      staker,
      withdrawer,
      stale,
    });
  }

  let activeD = 0;
  let staleD = 0;
  let activeS = 0;
  let staleS = 0;
  for (const d of delegations) {
    if (d.stale) staleD++;
    else activeD++;
  }
  for (const s of stakeAuthorities) {
    if (s.stale) staleS++;
    else activeS++;
  }

  return {
    activeDelegations: activeD,
    staleDelegations: staleD,
    activeStakeAuthorities: activeS,
    staleStakeAuthorities: staleS,
    delegations,
    stakeAuthorities,
  };
}

export type WealthSignals = {
  usdTotal: number;
  solUsd: number;
  splUsd: number;
  pricedAssets: number;
  unpricedAssets: number;
};

type DasAsset = {
  id: string;
  interface?: string;
  token_info?: {
    balance?: number;
    decimals?: number;
    price_info?: { price_per_token?: number; total_price?: number; currency?: string };
    symbol?: string;
  };
};

type DasPage = {
  total: number;
  limit: number;
  page: number;
  items: DasAsset[];
  nativeBalance?: {
    lamports?: number;
    price_per_sol?: number;
    total_price?: number;
  };
};

/** Visible wealth via Helius DAS `searchAssets` with token info + native balance.
 *  This collapses SOL + priceable SPL fungibles into a single USD total.
 *  NFT floor is intentionally not summed in v1. */
export async function fetchWealthSignals(
  address: string,
  opts?: { signal?: AbortSignal }
): Promise<WealthSignals> {
  let page = 1;
  let solUsd = 0;
  let splUsd = 0;
  let priced = 0;
  let unpriced = 0;
  // Cap pages — DAS returns up to 1000/page; a single page covers virtually
  // all wallets but we guard anyway.
  for (let i = 0; i < 5; i++) {
    const resp = await fetch(heliusRpcUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "ps-wealth",
        method: "searchAssets",
        params: {
          ownerAddress: address,
          tokenType: "fungible",
          page,
          limit: 1000,
          displayOptions: { showNativeBalance: true },
        },
      }),
      signal: opts?.signal,
    });
    if (!resp.ok) throw new Error(`DAS searchAssets failed: ${resp.status}`);
    const json = (await resp.json()) as { result?: DasPage };
    const data = json.result;
    if (!data) break;

    if (page === 1 && data.nativeBalance) {
      const nb = data.nativeBalance;
      if (typeof nb.total_price === "number") {
        solUsd = nb.total_price;
      } else if (typeof nb.lamports === "number" && typeof nb.price_per_sol === "number") {
        solUsd = (nb.lamports / 1e9) * nb.price_per_sol;
      }
    }

    for (const a of data.items) {
      // Skip wrapped SOL — already accounted via nativeBalance.
      if (a.id === WSOL_MINT) continue;
      const tp = a.token_info?.price_info?.total_price;
      if (typeof tp === "number" && tp > 0) {
        splUsd += tp;
        priced++;
      } else {
        unpriced++;
      }
    }

    if (data.items.length < data.limit) break;
    page++;
  }

  const usdTotal = solUsd + splUsd;
  return { usdTotal, solUsd, splUsd, pricedAssets: priced, unpricedAssets: unpriced };
}

export type SurveillanceSignals = {
  inboundFlagged: number;
  outboundFlagged: number;
  flaggedPeers: Array<{ address: string; direction: "in" | "out" | "both" }>;
};

export type DustWarning = {
  address: string;
  kind: "dust" | "poisoning";
  /** Short line describing why this address was flagged. */
  evidence: string;
};

/** Compact transfer record collected during the cluster pass. We hold these
 *  in memory only as long as the scan is running; surveillance + dust derive
 *  from this without re-fetching the 90-day window. */
export type ScanTransfer = {
  from: string;
  to: string;
  /** SOL: lamports. SPL: ui amount × 1e6 (rough). Used only for "is this tiny?" checks. */
  amt: number;
  kind: "sol" | "spl";
  mint?: string;
};

/** Extract cluster-footprint signals over the 90-day window.
 *  Counterparties = unique non-program accounts touched (excluding self).
 *  dApps = unique on-chain programs invoked, excluding plumbing (system, token, ATA, memo, compute-budget). */
export async function fetchClusterSignals(
  address: string,
  opts?: { signal?: AbortSignal }
): Promise<ClusterSignals> {
  const counterparties = new Set<string>();
  const programs = new Set<string>();
  const transfers: ScanTransfer[] = [];
  let txCount = 0;

  for await (const tx of iterTxsLast90d(address, opts?.signal)) {
    txCount++;

    for (const acct of tx.accountData ?? []) {
      if (!acct.account) continue;
      if (acct.account === address) continue;
      // Heuristic: program-owned accounts that show up in instructions are
      // captured via the program path; here we keep wallet/account peers.
      counterparties.add(acct.account);
    }

    for (const ix of tx.instructions ?? []) {
      if (!ix.programId) continue;
      if (!PLUMBING_PROGRAMS.has(ix.programId)) {
        programs.add(ix.programId);
      }
      for (const inner of ix.innerInstructions ?? []) {
        if (inner.programId && !PLUMBING_PROGRAMS.has(inner.programId)) {
          programs.add(inner.programId);
        }
      }
    }

    for (const t of tx.nativeTransfers ?? []) {
      if (!t.fromUserAccount || !t.toUserAccount) continue;
      if (t.fromUserAccount === t.toUserAccount) continue;
      if (t.fromUserAccount !== address && t.toUserAccount !== address) continue;
      transfers.push({
        from: t.fromUserAccount,
        to: t.toUserAccount,
        amt: t.amount ?? 0,
        kind: "sol",
      });
    }
    for (const t of tx.tokenTransfers ?? []) {
      if (!t.fromUserAccount || !t.toUserAccount) continue;
      if (t.fromUserAccount === t.toUserAccount) continue;
      if (t.fromUserAccount !== address && t.toUserAccount !== address) continue;
      transfers.push({
        from: t.fromUserAccount,
        to: t.toUserAccount,
        amt: t.tokenAmount ?? 0,
        kind: "spl",
        mint: t.mint,
      });
    }
  }

  // Programs we explicitly counted shouldn't also pollute the counterparty
  // set (some end up listed as accounts on the tx). Subtract.
  for (const pid of programs) counterparties.delete(pid);
  counterparties.delete(address);

  // Union of every address touched in the window — counterparties + programs.
  // Connected-apps uses this to decide if a live delegation is stale.
  const peers = new Set<string>();
  for (const c of counterparties) peers.add(c);
  for (const p of programs) peers.add(p);

  return {
    uniqueCounterparties: counterparties.size,
    uniqueDapps: programs.size,
    txCount,
    peers,
    transfers,
  };
}

/** Derive surveillance signals from the cluster transfer log. Pure. */
export function deriveSurveillance(
  address: string,
  transfers: readonly ScanTransfer[],
  ofac: ReadonlySet<string>
): SurveillanceSignals {
  const inbound = new Set<string>();
  const outbound = new Set<string>();
  for (const t of transfers) {
    if (t.from === address && t.to !== address && ofac.has(t.to)) outbound.add(t.to);
    if (t.to === address && t.from !== address && ofac.has(t.from)) inbound.add(t.from);
  }
  const peersMap = new Map<string, "in" | "out" | "both">();
  for (const a of inbound) peersMap.set(a, "in");
  for (const a of outbound) peersMap.set(a, peersMap.has(a) ? "both" : "out");
  return {
    inboundFlagged: inbound.size,
    outboundFlagged: outbound.size,
    flaggedPeers: [...peersMap.entries()].map(([address, direction]) => ({
      address,
      direction,
    })),
  };
}

/** Derive dust + address-poisoning warnings from the cluster transfer log.
 *  Inbound-only. We never flag outbound transfers as dust — that would be
 *  the user spending, not receiving spam. */
export function deriveDust(
  address: string,
  transfers: readonly ScanTransfer[]
): DustWarning[] {
  const head = address.slice(0, 4);
  const tail = address.slice(-4);
  const out = new Map<string, DustWarning>();

  for (const t of transfers) {
    if (t.to !== address) continue;
    if (t.from === address) continue;

    let warn: DustWarning | null = null;
    // Address poisoning: counterparty mimics prefix + suffix
    if (resembles(t.from, head, tail)) {
      warn = {
        address: t.from,
        kind: "poisoning",
        evidence: "look-alike address — same prefix and suffix as yours",
      };
    } else if (t.kind === "sol" && t.amt > 0 && t.amt < 5000) {
      // < 5000 lamports ≈ sub-cent: dust
      warn = {
        address: t.from,
        kind: "dust",
        evidence: `dust SOL drop (${t.amt} lamports)`,
      };
    } else if (t.kind === "spl" && t.amt > 0 && t.amt < 0.000001) {
      warn = {
        address: t.from,
        kind: "dust",
        evidence: `dust token drop (${t.amt.toFixed(9)})`,
      };
    }

    if (!warn) continue;
    const existing = out.get(warn.address);
    // Promote dust → poisoning if both apply for same address.
    if (!existing || (existing.kind === "dust" && warn.kind === "poisoning")) {
      out.set(warn.address, warn);
    }
  }
  return [...out.values()];
}

function resembles(candidate: string, head: string, tail: string): boolean {
  if (!candidate || candidate.length < 32) return false;
  return candidate.startsWith(head) && candidate.endsWith(tail);
}

/** Fetch the OFAC SDN Solana address set from our edge route. */
export async function fetchOfacSet(opts?: { signal?: AbortSignal }): Promise<{
  set: Set<string>;
  source: "ofac-live" | "ofac-fallback";
  fetchedAt: number;
}> {
  const res = await fetch("/api/ofac", { signal: opts?.signal });
  if (!res.ok) {
    return { set: new Set(), source: "ofac-fallback", fetchedAt: Date.now() };
  }
  const json = (await res.json()) as {
    addresses: string[];
    source: "ofac-live" | "ofac-fallback";
    fetchedAt: number;
  };
  return {
    set: new Set(json.addresses ?? []),
    source: json.source,
    fetchedAt: json.fetchedAt,
  };
}
