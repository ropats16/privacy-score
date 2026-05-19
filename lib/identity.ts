// Identity-exposure signal extraction.
// Pulls all .sol names via Bonfida and all alt-TLDs via @onsol/tldparser.
// For each name, reads V2 records that materially dox the wallet (twitter,
// url, email, telegram, discord, github).

import { Connection, PublicKey } from "@solana/web3.js";
import {
  getAllDomains,
  reverseLookupBatch,
  getMultipleRecordsV2,
  Record as SnsRecord,
} from "@bonfida/spl-name-service";
import { TldParser } from "@onsol/tldparser";
import { heliusRpcUrl } from "./helius";

// V2 records we treat as identity exposure. Each populated record costs
// score; the rubric is encoded once in scoring.ts.
const DOX_RECORDS: SnsRecord[] = [
  SnsRecord.Twitter,
  SnsRecord.Url,
  SnsRecord.Email,
  SnsRecord.Telegram,
  SnsRecord.Discord,
  SnsRecord.Github,
];

export type IdentityName = {
  /** Plain name (e.g. "rohit") without TLD. */
  name: string;
  /** Full handle with TLD, e.g. "rohit.sol" or "rohit.abc". */
  fullName: string;
  tld: string; // "sol", "abc", "bonk", "poor", ...
};

export type ExposedRecord = {
  fullName: string;
  recordType: string; // "twitter", "url", ...
  /** Trimmed value for display in raw signals. Long values are abbreviated. */
  value: string;
};

export type IdentitySignals = {
  names: IdentityName[];
  exposedRecords: ExposedRecord[];
  /** True if any owned name appears to match a known social-handle convention.
   *  v1 heuristic: a Twitter record value equals the .sol name (case-insensitive). */
  nameMatchesHandle: boolean;
};

/** Lookup all names + introspect public records. Returns empty arrays when
 *  the wallet has no name presence — that's the privacy-positive case. */
export async function fetchIdentitySignals(
  address: string,
  opts?: { signal?: AbortSignal }
): Promise<IdentitySignals> {
  const conn = new Connection(heliusRpcUrl(), "confirmed");
  const owner = new PublicKey(address);

  const [solDomains, allDomains] = await Promise.all([
    getAllDomains(conn, owner).catch(() => [] as PublicKey[]),
    fetchAlt(conn, address).catch(() => [] as IdentityName[]),
  ]);

  if (opts?.signal?.aborted) {
    return { names: [], exposedRecords: [], nameMatchesHandle: false };
  }

  // Resolve .sol name strings via reverseLookupBatch.
  const solNames: IdentityName[] = [];
  if (solDomains.length > 0) {
    const resolved = await reverseLookupBatch(conn, solDomains).catch(
      () => [] as (string | undefined)[]
    );
    for (const n of resolved) {
      if (typeof n === "string" && n.length > 0) {
        solNames.push({ name: n, fullName: `${n}.sol`, tld: "sol" });
      }
    }
  }

  // Merge & dedupe (alt-TLDs from tldparser don't include .sol).
  const names: IdentityName[] = [...solNames];
  for (const d of allDomains) {
    if (d.tld === "sol") continue;
    if (!names.some((n) => n.fullName === d.fullName)) names.push(d);
  }

  // Read dox records only for .sol names — Bonfida getMultipleRecordsV2 is
  // .sol-specific. Alt-TLD record introspection ships in a later phase.
  const exposedRecords: ExposedRecord[] = [];
  const handleByName = new Map<string, string>();
  if (solNames.length > 0) {
    for (const n of solNames) {
      try {
        const results = await getMultipleRecordsV2(conn, n.name, DOX_RECORDS, {
          deserialize: true,
        });
        results.forEach((res, idx) => {
          if (!res) return;
          const value = String(
            (res as { deserializedContent?: unknown }).deserializedContent ?? ""
          ).trim();
          if (!value) return;
          const recType = DOX_RECORDS[idx];
          exposedRecords.push({
            fullName: n.fullName,
            recordType: recType,
            value: abbreviate(value, 48),
          });
          if (recType === SnsRecord.Twitter) {
            handleByName.set(n.name.toLowerCase(), value.replace(/^@/, "").toLowerCase());
          }
        });
      } catch {
        // Records account doesn't exist or domain isn't a V2 — silently skip.
      }
    }
  }

  // Handle-pattern leakage: any .sol name where Twitter record equals the name.
  let nameMatchesHandle = false;
  for (const [nameLower, handleLower] of handleByName) {
    if (handleLower === nameLower) {
      nameMatchesHandle = true;
      break;
    }
  }

  return { names, exposedRecords, nameMatchesHandle };
}

async function fetchAlt(
  conn: Connection,
  address: string
): Promise<IdentityName[]> {
  // TldParser v1 returns parsed { nameAccount, domain } pairs for all TLDs.
  const parser = new TldParser(conn);
  const results = (await parser.getParsedAllUserDomains(address).catch(() => [])) as Array<{
    domain?: string;
  }>;
  const out: IdentityName[] = [];
  for (const r of results ?? []) {
    if (!r?.domain) continue;
    const full = r.domain.startsWith(".") ? r.domain.slice(1) : r.domain;
    // domain shape from tldparser: "name.tld"
    const dot = full.lastIndexOf(".");
    if (dot <= 0) continue;
    const name = full.slice(0, dot);
    const tld = full.slice(dot + 1);
    out.push({ name, fullName: full, tld });
  }
  return out;
}

function abbreviate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}
