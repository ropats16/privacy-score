import Link from "next/link";
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

export default function MethodologyPage() {
  return (
    <div className="relative z-10 flex-1 flex flex-col">
      <header className="flex items-center justify-between px-8 md:px-14 pt-8">
        <Link href="/" className="group">
          <span className="font-display text-[20px] md:text-[22px] font-semibold text-ink">
            sneak peek 👀
          </span>
        </Link>
        <nav className="text-[13px] text-muted">
          <Link href="/" className="hover:text-ink transition-colors">
            back
          </Link>
        </nav>
      </header>

      <main className="flex-1 px-6 md:px-14 py-14">
        <div className="w-full max-w-[820px] mx-auto flex flex-col gap-14">
          <section className="flex flex-col gap-6">
            <h1 className="font-display text-[44px] md:text-[64px] leading-[1.0] tracking-[-0.02em]">
              how the score
              <br />
              <span className="font-italic-serif">is built</span>
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
            <ul className="flex flex-col">
              {ALL_FACTORS.map((f) => {
                const live = isLive(f.key);
                return (
                  <li
                    key={f.key}
                    className="flex items-baseline justify-between py-3 border-b border-rule-soft"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className={`inline-block w-1.5 h-1.5 rounded-full ${live ? "bg-ink" : "bg-muted-2"}`}
                      />
                      <span className="text-[15px] text-ink">{f.title}</span>
                      {!live && (
                        <span className="text-[11px] lowercase tracking-[0.18em] text-muted-2">
                          later
                        </span>
                      )}
                    </div>
                    <span className="tabular text-[14px] text-muted">
                      {WEIGHTS[f.key]}%
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="text-[12px] text-muted">
              total privacy score = weighted average over factors currently
              live. all six factors are scored this phase. dust drops and
              address poisoning attempts are surfaced separately and don&rsquo;t
              feed the score. they are defensive guidance, not a privacy leak
              in themselves.
            </p>
          </section>

          {RUBRICS.map((r) => (
            <section key={r.factor} className="flex flex-col gap-4">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-display text-[28px] md:text-[34px] leading-tight">
                  {r.title}
                </h2>
                <span className="text-[11px] lowercase tracking-[0.2em] text-muted tabular">
                  {r.weight}%
                </span>
              </div>
              <p className="text-[15px] leading-[1.6] text-ink-soft max-w-[62ch]">
                {r.measures}
              </p>
              <ul className="flex flex-col border-t border-rule-soft">
                {r.steps.map((s, i) => (
                  <li
                    key={i}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-6 py-4 border-b border-rule-soft"
                  >
                    <div className="md:col-span-7 text-[14px] text-ink">
                      {s.when}
                    </div>
                    <div className="md:col-span-5 text-[14px] text-muted tabular">
                      {s.effect}
                    </div>
                  </li>
                ))}
              </ul>
              {r.note && (
                <p className="text-[12px] text-muted leading-relaxed max-w-[62ch]">
                  {r.note}
                </p>
              )}
            </section>
          ))}

          <section className="flex flex-col gap-4 border-t border-ink/30 pt-10">
            <h2 className="text-[12px] tracking-[0.22em] lowercase text-muted">
              data sources
            </h2>
            <p className="text-[14px] text-ink-soft leading-relaxed max-w-[62ch]">
              everything below is public onchain data or a public list. nothing
              is purchased from a data broker. nothing is inferred by an ml
              model.
            </p>
            <ul className="flex flex-col">
              {DATA_SOURCES.map((d) => (
                <li
                  key={d.label}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-6 py-3 border-b border-rule-soft"
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
          </section>

          <section className="flex flex-col gap-3 border-t border-ink/30 pt-10">
            <h2 className="text-[12px] tracking-[0.22em] lowercase text-muted">
              privacy of the privacy app
            </h2>
            <p className="text-[14px] text-ink-soft leading-relaxed max-w-[62ch]">
              no database. no auth. no cookies that link wallet to session. no
              third party analytics in v1. the only server side state we keep
              is the public ofac list cached at the edge. share cards are
              rendered on demand from url params and not retained. wallet
              adapter&rsquo;s own ephemeral session is the only state held in
              the browser.
            </p>
          </section>
        </div>
      </main>

      <footer className="px-8 md:px-14 pb-8 pt-10">
        <div className="flex flex-col md:flex-row justify-between gap-4 text-[12px] text-muted">
          <div>© sneak peek 2026</div>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-ink transition-colors">
              back to audit
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
