import Link from "next/link";
import { RUBRICS, RUBRIC_BY_FACTOR, WEIGHTS } from "@/lib/rubrics";
import type { FactorKey } from "@/lib/types";

// Generated from the same rubric source the scorer reads.
// If the scoring logic changes, this page changes with it — no drift possible.

const ALL_FACTORS: { key: FactorKey; title: string }[] = [
  { key: "identity", title: "Identity exposure" },
  { key: "kyc", title: "KYC distance" },
  { key: "cluster", title: "Cluster footprint" },
  { key: "connected", title: "Connected apps" },
  { key: "wealth", title: "Visible wealth" },
  { key: "surveillance", title: "Surveillance coverage" },
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
        <Link href="/" className="flex items-center gap-2">
          <span aria-hidden className="inline-block w-2.5 h-2.5 rounded-full bg-ink" />
          <span className="text-[13px] tracking-[0.18em] uppercase text-ink-soft">
            PrivacyScore
          </span>
        </Link>
        <nav className="text-[13px] text-muted">
          <Link href="/" className="hover:text-ink transition-colors">
            Back
          </Link>
        </nav>
      </header>

      <main className="flex-1 px-6 md:px-14 py-14">
        <div className="w-full max-w-[820px] mx-auto flex flex-col gap-14">
          <section className="flex flex-col gap-6">
            <div className="flex items-baseline gap-3 text-[12px] tracking-[0.22em] uppercase text-muted">
              <span aria-hidden className="w-8 h-px bg-rule" />
              <span>Methodology</span>
            </div>
            <h1 className="font-display text-[44px] md:text-[64px] leading-[1.0] tracking-[-0.02em]">
              Open math.
              <br />
              <span className="font-italic-serif">No black boxes.</span>
            </h1>
            <p className="text-[16px] md:text-[17px] leading-[1.6] text-ink-soft max-w-[62ch]">
              The Privacy Score is a weighted average of six independent factors,
              each scored 0–100 from a fixed rubric. This page is generated from
              the same source the scorer reads, so it can&rsquo;t drift from the
              code. Higher is more private.
            </p>
            <p className="font-italic-serif text-[18px] text-muted max-w-[60ch]">
              We don&rsquo;t make you anonymous. We show you what you&rsquo;re
              already showing.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-[12px] tracking-[0.22em] uppercase text-muted">
              Weight table
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
                        <span className="text-[11px] uppercase tracking-[0.18em] text-muted-2">
                          later
                        </span>
                      )}
                    </div>
                    <span className="tabular text-[14px] text-muted">
                      weight {WEIGHTS[f.key]}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="text-[12px] text-muted">
              Total Privacy Score = weighted average over factors currently
              live. All six factors are scored this phase. Dust drops and
              address-poisoning attempts are surfaced separately and don&rsquo;t
              feed the score &mdash; they are defensive guidance, not a privacy
              leak in themselves.
            </p>
          </section>

          {RUBRICS.map((r) => (
            <section key={r.factor} className="flex flex-col gap-4">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-display text-[28px] md:text-[34px] leading-tight">
                  {r.title}
                </h2>
                <span className="text-[11px] uppercase tracking-[0.2em] text-muted tabular">
                  weight {r.weight}
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

          <section className="flex flex-col gap-3 border-t border-ink/30 pt-10">
            <h2 className="text-[12px] tracking-[0.22em] uppercase text-muted">
              Privacy of the privacy app
            </h2>
            <p className="text-[14px] text-ink-soft leading-relaxed max-w-[62ch]">
              No database. No auth. No cookies that link wallet to session. No
              third-party analytics in v1. The only server-side state we keep is
              the public OFAC list cached at the edge (used in a later phase).
              Wallet-adapter&rsquo;s own session is the only state held in the
              browser.
            </p>
          </section>
        </div>
      </main>

      <footer className="px-8 md:px-14 pb-8 pt-10">
        <div className="text-[12px] text-muted">
          <span className="italic">Privacy ≠ anonymity.</span>
        </div>
      </footer>
    </div>
  );
}
