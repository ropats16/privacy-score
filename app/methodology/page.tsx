import Link from "next/link";
import Image from "next/image";
import { RUBRICS, RUBRIC_BY_FACTOR, WEIGHTS } from "@/lib/rubrics";
import type { FactorKey } from "@/lib/types";

// Generated from the same rubric source the scorer reads.
// If the scoring logic changes, this page changes with it — no drift possible.

const ALL_FACTORS: { key: FactorKey; title: string }[] = [
  { key: "identity", title: "identity exposure" },
  { key: "kyc", title: "kyc distance" },
  { key: "cluster", title: "cluster footprint" },
  { key: "connected", title: "connected apps" },
  { key: "wealth", title: "visible wealth" },
  { key: "surveillance", title: "surveillance coverage" },
];

const DATA_SOURCES: { label: string; detail: string }[] = [
  {
    label: "helius rpc + das",
    detail:
      "parsed transactions, token accounts, stake accounts, asset enumeration, address labels, and sol/spl pricing, pulled live from the browser. read only.",
  },
  {
    label: "bonfida sns",
    detail:
      ".sol resolution and v2 record introspection (twitter, url, email, telegram, discord, github).",
  },
  {
    label: "alldomains (@onsol/tldparser)",
    detail:
      "alt tld ownership lookups (.abc, .bonk, .poor, and similar). used to detect naming presence beyond .sol.",
  },
  {
    label: "ofac sdn list",
    detail:
      "u.s. treasury sanctions list, fetched server side and cached at the edge with weekly revalidation. only solana addresses from the list are kept.",
  },
  {
    label: "cex address set",
    detail:
      "curated hot wallet and deposit addresses for binance, coinbase, kraken, okx, bybit, kucoin, crypto.com, gate.io. used to compute kyc distance.",
  },
];

// "Live" is derived directly from the rubric source — adding a rubric flips
// the corresponding row to live automatically.
function isLive(key: FactorKey): boolean {
  return RUBRIC_BY_FACTOR[key] !== undefined;
}

// Trim the long "measures" paragraph down to its first sentence — keeps each
// card light. The full rubric still lives in lib/rubrics.ts.
function shortMeasure(text: string): string {
  const trimmed = text.trim();
  const end = trimmed.indexOf(". ");
  if (end === -1) return trimmed;
  return trimmed.slice(0, end + 1);
}

export default function MethodologyPage() {
  return (
    <div className="relative z-10 flex-1 flex flex-col">
      <header className="flex items-center justify-between px-8 md:px-14 pt-8">
        <Link href="/">
          <Image
            src="/logo.png"
            alt="how public is your wallet"
            width={1080}
            height={1080}
            priority
            className="h-16 w-16 md:h-20 md:w-20"
          />
        </Link>
        <nav className="text-[13px] text-muted">
          <Link href="/" className="hover:text-ink transition-colors">
            back
          </Link>
        </nav>
      </header>

      <main className="flex-1 px-6 md:px-14 py-14">
        <div className="w-full max-w-[820px] mx-auto flex flex-col gap-12">
          <section className="flex flex-col gap-6">
            <h1 className="font-display text-[44px] md:text-[64px] leading-[1.0] tracking-[-0.025em] text-ink">
              how the score
              <br />
              is built <span aria-hidden>🤠</span>
            </h1>
            <p className="text-[16px] md:text-[17px] leading-[1.6] text-ink-soft max-w-[62ch]">
              the privacy score is a weighted average of six independent factors,
              each scored 0 to 100 from a fixed rubric. this page is generated from
              the same source the scorer reads, so it can&rsquo;t drift from the
              code. higher is more private.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-[12px] tracking-[0.22em] lowercase text-muted">
              weight table
            </h2>
            <div className="card-soft overflow-hidden">
              <ul className="flex flex-col">
                {ALL_FACTORS.map((f) => {
                  const live = isLive(f.key);
                  return (
                    <li
                      key={f.key}
                      className="card-soft-row flex items-center justify-between px-5 md:px-7 py-4"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden
                          className={`inline-block w-1.5 h-1.5 rounded-full ${
                            live ? "bg-ink" : "bg-muted-2"
                          }`}
                        />
                        <span className="text-[15px] text-ink">{f.title}</span>
                        {!live && (
                          <span className="text-[11px] lowercase tracking-[0.18em] text-muted-2">
                            later
                          </span>
                        )}
                      </div>
                      <span className="weight-pill">{WEIGHTS[f.key]}%</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <p className="text-[12px] text-muted max-w-[62ch]">
              weighted average over factors currently live. dust drops and
              address poisoning are surfaced separately and don&rsquo;t feed
              the score.
            </p>
          </section>

          <section className="flex flex-col gap-5">
            <h2 className="text-[12px] tracking-[0.22em] lowercase text-muted">
              the six factors
            </h2>
            <div className="flex flex-col gap-5">
              {RUBRICS.map((r) => (
                <article
                  key={r.factor}
                  className="card-soft px-6 md:px-8 py-6 md:py-7 flex flex-col gap-5"
                >
                  <header className="flex items-start justify-between gap-4">
                    <h3 className="font-display text-[22px] md:text-[26px] leading-tight tracking-[-0.015em] text-[#008cff]">
                      {r.title}
                    </h3>
                    <span className="weight-pill mt-1">{r.weight}%</span>
                  </header>
                  <p className="text-[14px] leading-[1.55] text-ink-soft max-w-[58ch]">
                    {shortMeasure(r.measures)}
                  </p>
                  <ul className="flex flex-col">
                    {r.steps.map((s, i) => (
                      <li
                        key={i}
                        className="card-soft-row grid grid-cols-1 md:grid-cols-12 gap-1 md:gap-6 py-3"
                      >
                        <div className="md:col-span-8 text-[13.5px] text-ink-soft leading-snug">
                          {s.when}
                        </div>
                        <div className="md:col-span-4 text-[13.5px] text-muted tabular md:text-right">
                          {s.effect}
                        </div>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-[12px] tracking-[0.22em] lowercase text-muted">
              data sources
            </h2>
            <p className="text-[14px] text-ink-soft leading-relaxed max-w-[62ch]">
              everything below is public onchain data or a public list. nothing
              is purchased from a data broker. nothing is inferred by an ml
              model.
            </p>
            <div className="card-soft overflow-hidden">
              <ul className="flex flex-col">
                {DATA_SOURCES.map((d) => (
                  <li
                    key={d.label}
                    className="card-soft-row grid grid-cols-1 md:grid-cols-12 gap-1 md:gap-6 px-5 md:px-7 py-4"
                  >
                    <div className="md:col-span-4 text-[14px] text-ink">
                      {d.label}
                    </div>
                    <div className="md:col-span-8 text-[13px] text-muted leading-relaxed">
                      {d.detail}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-[12px] tracking-[0.22em] lowercase text-muted">
              privacy of the privacy app
            </h2>
            <div className="card-soft px-6 md:px-8 py-6">
              <p className="text-[14px] text-ink-soft leading-relaxed max-w-[62ch]">
                no database. no auth. no cookies that link wallet to session.
                no third party analytics in v1. the only server side state we
                keep is the public ofac list cached at the edge. share cards
                are rendered on demand from url params and not retained.
              </p>
            </div>
          </section>
        </div>
      </main>

      <footer className="px-8 md:px-14 pb-8 pt-10">
        <div className="flex justify-end text-[12px] text-muted">
          <Link href="/" className="hover:text-ink transition-colors">
            back to audit
          </Link>
        </div>
      </footer>
    </div>
  );
}
