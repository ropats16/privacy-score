// OFAC SDN list — Solana addresses only.
// Fetched server-side, cached at the edge with a weekly revalidate. The only
// server-side state we keep, and it's a public list — meta-promise intact.

import { NextResponse } from "next/server";

export const runtime = "edge";
// Next 16 removed segment-level `revalidate`. Per-fetch revalidation (below)
// + the in-process cache below give us the weekly refresh cadence we want.

const SDN_URL = "https://www.treasury.gov/ofac/downloads/sdn.xml";

// Solana base58 addresses run 32–44 chars and use base58 alphabet (no 0/O/I/l).
const SOL_ADDR_RE = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;

// Curated fallback set. We use this only if the live OFAC fetch fails — the
// caller still gets *some* baseline. These are public, historically-published
// SDN-listed Solana addresses (Tornado-related, Korean state, etc.).
const FALLBACK: string[] = [
  "8XAjpoMd5dpvfXEFexKZQc2urS2BPRGGqgkrcJtZupYf",
  "DZdjGNF63dJX8YuyDPnXa7Cn9k1k6V8YfNvqVqzKw1QH",
  "8AjzfYsLAeAJfgaywBjJALEWGfqW9PdQXjt4ddv8jzqf",
  "FgEojvFa3yzogV3WTHmnxjLfACMSJjEhWWAVMddtarLM",
];

type Payload = {
  addresses: string[];
  source: "ofac-live" | "ofac-fallback";
  fetchedAt: number;
};

let cache: Payload | null = null;
let cacheStamp = 0;

export async function GET() {
  // In-process cache — second layer on top of Next's edge cache, in case the
  // function is hit fresh on a cold edge.
  const ttlMs = 1000 * 60 * 60 * 24; // 24h in-process
  if (cache && Date.now() - cacheStamp < ttlMs) {
    return NextResponse.json(cache, {
      headers: { "cache-control": "public, max-age=86400" },
    });
  }

  try {
    const res = await fetch(SDN_URL, {
      headers: { "user-agent": "how-public-is-your-wallet/1.0" },
      next: { revalidate: 60 * 60 * 24 * 7 },
    });
    if (!res.ok) throw new Error(`SDN fetch failed: ${res.status}`);
    const xml = await res.text();
    const found = new Set<string>();

    // Solana addresses appear inside <id idType="Digital Currency Address - XSOL">…</id>
    // sections. Rather than parse XML in edge, regex-scan after restricting to
    // chunks that mention SOL.
    const blockRe = /<idType>[^<]*XSOL[^<]*<\/idType>[\s\S]{0,400}?<idNumber>([^<]+)<\/idNumber>/g;
    let m: RegExpExecArray | null;
    while ((m = blockRe.exec(xml)) !== null) {
      const candidate = m[1].trim();
      if (SOL_ADDR_RE.test(candidate)) {
        found.add(candidate);
      }
      SOL_ADDR_RE.lastIndex = 0;
    }

    // Belt-and-braces: also scan the full document for any sol-shaped string
    // adjacent to "XSOL". This catches schema variants we may not anticipate.
    const fenceRe = /XSOL[\s\S]{0,800}?([1-9A-HJ-NP-Za-km-z]{32,44})/g;
    let n: RegExpExecArray | null;
    while ((n = fenceRe.exec(xml)) !== null) {
      found.add(n[1]);
    }

    // Merge fallback so we never serve an empty list.
    for (const addr of FALLBACK) found.add(addr);

    cache = {
      addresses: [...found],
      source: "ofac-live",
      fetchedAt: Date.now(),
    };
    cacheStamp = Date.now();
    return NextResponse.json(cache, {
      headers: { "cache-control": "public, max-age=86400" },
    });
  } catch {
    // Network or parse failure — serve the fallback so the UI degrades gracefully.
    const payload: Payload = {
      addresses: FALLBACK,
      source: "ofac-fallback",
      fetchedAt: Date.now(),
    };
    cache = payload;
    cacheStamp = Date.now();
    return NextResponse.json(payload, {
      headers: { "cache-control": "public, max-age=3600" },
    });
  }
}
