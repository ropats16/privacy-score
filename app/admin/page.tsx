// Analytics admin dashboard.
//
// Server component — reads aggregates straight from Redis and renders numbers
// plus lightweight inline charts. Access is gated by proxy.ts (HTTP Basic
// Auth). All-time totals plus a last-30-day window.

import Link from "next/link";
import Image from "next/image";
import { getDashboardData, type HashEntry } from "@/lib/analytics/redis";
import {
  BarList,
  Empty,
  fmt,
  Histogram,
  Panel,
  pct,
  Section,
  SegmentBar,
  Sparkline,
  StatCard,
} from "./charts";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "analytics · how public is your wallet",
  robots: { index: false, follow: false },
};

const FACTOR_TITLE: Record<string, string> = {
  identity: "identity exposure",
  kyc: "kyc distance",
  cluster: "cluster footprint",
  connected: "connected apps",
  wealth: "visible wealth",
  surveillance: "surveillance coverage",
};

const INPUT_LABEL: Record<string, string> = {
  address: "raw address",
  sns: ".sol name",
  alt: "alt-tld name",
};

function humanize(key: string): string {
  return key.replace(/_/g, " ");
}

function relabel(
  entries: HashEntry[],
  map: Record<string, string>,
): HashEntry[] {
  return entries.map((e) => ({ key: map[e.key] ?? e.key, count: e.count }));
}

function sum(values: number[]): number {
  return values.reduce((s, v) => s + v, 0);
}

function Header() {
  return (
    <header className="flex items-center justify-between gap-3 px-5 md:px-14 pt-6 md:pt-8">
      <Link href="/">
        <Image
          src="/logo.png"
          alt="how public is your wallet"
          width={1080}
          height={1080}
          priority
          className="h-14 w-14 md:h-16 md:w-16"
        />
      </Link>
      <span className="text-[12px] tracking-[0.22em] text-muted">
        analytics
      </span>
    </header>
  );
}

export default async function AdminPage() {
  const data = await getDashboardData();

  if (!data.configured) {
    return (
      <div className="relative z-10 flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 md:px-14 py-14">
          <div className="w-full max-w-[640px] mx-auto card-soft px-7 py-8 flex flex-col gap-3">
            <h1 className="font-display text-[26px] text-ink">
              analytics datastore not configured
            </h1>
            <p className="text-[14px] leading-relaxed text-ink-soft">
              set <code className="font-mono text-[13px]">KV_REST_API_URL</code>{" "}
              and{" "}
              <code className="font-mono text-[13px]">
                KV_REST_API_TOKEN
              </code>{" "}
              (auto-injected by the vercel upstash integration) and reload. the
              event endpoint stays a no-op until then — no scan is affected.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const { allTime, series, breakdowns } = data;
  const ev = allTime.events;

  // Derived metrics.
  const totalScans = allTime.scans;
  const startedToScan = pct(ev.scan_started, allTime.pageViews.landing);
  const completedPlusFailed = ev.scan_completed + ev.scan_failed;
  const failureRate = pct(ev.scan_failed, completedPlusFailed);
  const avgLeak =
    totalScans > 0 ? (allTime.leakCountSum / totalScans).toFixed(2) : "—";
  const avgDust =
    totalScans > 0 ? (allTime.dustCountSum / totalScans).toFixed(2) : "—";
  const visitorsToday = series.visitors[series.visitors.length - 1] ?? 0;
  const win = `last ${data.windowDays}d`;

  // Score-bucket histogram, ordered 0 → 100.
  const bucketCounts = new Map(
    breakdowns.scoreBuckets.map((e) => [e.key, e.count]),
  );
  const histogram = Array.from({ length: 11 }, (_, i) => {
    const label = String(i * 10);
    return { label, count: bucketCounts.get(label) ?? 0 };
  });

  // Score bands, fixed order + band colors.
  const bandCount = (b: string) =>
    breakdowns.scoreBands.find((e) => e.key === b)?.count ?? 0;
  const bandSegments = [
    { label: "low", count: bandCount("low"), color: "var(--score-low)" },
    { label: "mid", count: bandCount("mid"), color: "var(--score-mid)" },
    { label: "high", count: bandCount("high"), color: "var(--score-high)" },
  ];

  return (
    <div className="relative z-10 flex-1 flex flex-col">
      <Header />

      <main className="flex-1 px-5 md:px-14 py-10 md:py-12">
        <div className="w-full max-w-[1100px] mx-auto flex flex-col gap-12">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-[34px] md:text-[48px] leading-[1.05] tracking-[-0.02em] text-ink">
              analytics
            </h1>
            <p className="text-[13px] text-muted">
              first-party · anonymous · aggregate-only. all-time totals plus a{" "}
              {data.windowDays}-day window. generated{" "}
              <span className="tabular">
                {new Date(data.generatedAt).toISOString().replace("T", " ").slice(0, 16)}
              </span>{" "}
              utc.
            </p>
          </div>

          {/* ---- Traction ---- */}
          <Section title="traction">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="unique visitors"
                value={fmt(allTime.uniqueVisitors)}
                hint="all-time · hyperloglog"
              />
              <StatCard
                label="visitors today"
                value={fmt(visitorsToday)}
                hint="utc day"
              />
              <StatCard
                label="page views"
                value={fmt(ev.page_view)}
                hint="all-time"
              />
              <StatCard
                label={`page views · ${win}`}
                value={fmt(sum(series.landingViews))}
                hint="landing page"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Panel
                title="unique visitors over time"
                subtitle={`${win} · ${fmt(sum(series.visitors))}`}
                className="md:col-span-2"
              >
                <Sparkline values={series.visitors} />
              </Panel>
              <Panel title="page views by page" subtitle="all-time">
                <BarList
                  entries={[
                    { key: "landing", count: allTime.pageViews.landing },
                    {
                      key: "scan result",
                      count: allTime.pageViews.scan_result,
                    },
                    {
                      key: "methodology",
                      count: allTime.pageViews.methodology,
                    },
                  ].filter((e) => e.count > 0)}
                />
              </Panel>
              <Panel title="referrers" subtitle="all-time">
                <BarList
                  entries={breakdowns.referrers.slice(0, 8)}
                  emptyLabel="no external referrers yet"
                />
              </Panel>
              <Panel title="utm campaigns" subtitle="all-time">
                <BarList
                  entries={breakdowns.utmCampaigns.slice(0, 8)}
                  color="var(--brand)"
                  emptyLabel="no campaign-tagged visits yet"
                />
              </Panel>
              <Panel title="countries" subtitle="all-time">
                <BarList
                  entries={breakdowns.countries.slice(0, 10)}
                  emptyLabel="no geo data yet"
                />
              </Panel>
            </div>
          </Section>

          {/* ---- Core usage ---- */}
          <Section title="core usage">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="total scans" value={fmt(totalScans)} hint="all-time" />
              <StatCard
                label={`scans · ${win}`}
                value={fmt(sum(series.scans))}
              />
              <StatCard
                label="unique wallets"
                value={fmt(allTime.uniqueWallets)}
                hint="all-time · hyperloglog"
              />
              <StatCard
                label="landing → scan"
                value={startedToScan}
                hint="conversion"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Panel
                title="scans over time"
                subtitle={`${win} · ${fmt(sum(series.scans))}`}
                className="md:col-span-2"
              >
                <Sparkline values={series.scans} color="var(--score-high)" />
              </Panel>
              <Panel title="input type" subtitle="scans started">
                <BarList
                  entries={relabel(breakdowns.inputTypes, INPUT_LABEL)}
                  emptyLabel="no scans started yet"
                />
              </Panel>
              <Panel
                title="usage funnel"
                subtitle="all-time"
                className="md:col-span-2 lg:col-span-3"
              >
                <FunnelRow
                  label="landing views"
                  value={allTime.pageViews.landing}
                />
                <FunnelRow
                  label="scans started"
                  value={ev.scan_started}
                  note={`${startedToScan} of landing`}
                />
                <FunnelRow
                  label="scans completed"
                  value={ev.scan_completed}
                />
                <FunnelRow
                  label="scans failed"
                  value={ev.scan_failed}
                  note={`${failureRate} failure rate`}
                />
              </Panel>
            </div>
          </Section>

          {/* ---- Product insights ---- */}
          <Section title="product insights">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="avg leaks / scan"
                value={avgLeak}
                hint="leak reasons"
              />
              <StatCard
                label="avg dust / scan"
                value={avgDust}
                hint="dust warnings"
              />
              <StatCard
                label="share cards"
                value={fmt(ev.share_clicked)}
                hint="all-time"
              />
              <StatCard
                label="comparisons"
                value={fmt(ev.comparison_run)}
                hint="re-scans compared"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Panel
                title="privacy score distribution"
                subtitle="completed scans"
                className="md:col-span-2"
              >
                {histogram.some((b) => b.count > 0) ? (
                  <Histogram buckets={histogram} />
                ) : (
                  <Empty label="no completed scans yet" />
                )}
              </Panel>
              <Panel title="score bands" subtitle="completed scans">
                <SegmentBar segments={bandSegments} />
              </Panel>
              <Panel title="most common weakest factor" subtitle="per scan">
                <BarList
                  entries={relabel(breakdowns.weakestFactors, FACTOR_TITLE)}
                  color="var(--score-low)"
                  emptyLabel="no completed scans yet"
                />
              </Panel>
              <Panel title="leak frequency by factor" subtitle="factor < 80">
                <BarList
                  entries={relabel(breakdowns.leakFactors, FACTOR_TITLE)}
                  color="var(--score-mid)"
                  emptyLabel="no leaks recorded yet"
                />
              </Panel>
              <Panel title="scan duration" subtitle="completed scans">
                <BarList
                  entries={breakdowns.durations.map((e) => ({
                    key: humanize(e.key),
                    count: e.count,
                  }))}
                  emptyLabel="no completed scans yet"
                />
              </Panel>
            </div>
          </Section>

          {/* ---- Reliability ---- */}
          <Section title="reliability">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="failure rate"
                value={failureRate}
                hint="of all scan attempts"
              />
              <StatCard
                label="scans failed"
                value={fmt(ev.scan_failed)}
                hint="all-time"
              />
              <StatCard
                label={`failures · ${win}`}
                value={fmt(sum(series.failures))}
              />
              <StatCard
                label="scans completed"
                value={fmt(ev.scan_completed)}
                hint="all-time"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Panel
                title="failures over time"
                subtitle={`${win} · ${fmt(sum(series.failures))}`}
                className="md:col-span-2"
              >
                <Sparkline values={series.failures} color="var(--score-low)" />
              </Panel>
              <Panel title="failures by error type" subtitle="all-time">
                <BarList
                  entries={breakdowns.errorTypes.map((e) => ({
                    key: humanize(e.key),
                    count: e.count,
                  }))}
                  color="var(--score-low)"
                  emptyLabel="no failures recorded"
                />
              </Panel>
            </div>
          </Section>

          <p className="text-[11px] text-muted-2 leading-relaxed max-w-[70ch] pb-4">
            unique counts use hyperloglog sketches (~0.81% standard error) — no
            visitor identifier or wallet address is ever stored. dated keys
            expire after ~90 days. all data lives on this project&rsquo;s own
            redis instance and is never shared with a third party.
          </p>
        </div>
      </main>
    </div>
  );
}

function FunnelRow({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note?: string;
}) {
  return (
    <div className="card-soft-row flex items-baseline justify-between gap-3 py-2.5">
      <span className="text-[13px] text-ink-soft">{label}</span>
      <div className="flex items-baseline gap-3">
        {note && <span className="text-[11px] text-muted-2">{note}</span>}
        <span className="font-display text-[20px] tabular text-ink">
          {fmt(value)}
        </span>
      </div>
    </div>
  );
}
