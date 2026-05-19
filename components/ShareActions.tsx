"use client";

// Share actions for a completed scan: download the PNG card and post to X.
// Both routes pass everything as query params, we never persist anything.

import { useCallback, useMemo, useState } from "react";

type Props = {
  address: string;
  score: number;
  previousScore: number | null;
  watchOnly: boolean;
};

type ImgState = "loading" | "ready" | "error";

export function ShareActions({
  address,
  score,
  previousScore,
  watchOnly,
}: Props) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ogPath = useMemo(() => {
    const p = new URLSearchParams({ address, score: String(score) });
    if (previousScore !== null) p.set("prev", String(previousScore));
    if (watchOnly) p.set("watchOnly", "1");
    return `/api/og?${p.toString()}`;
  }, [address, score, previousScore, watchOnly]);

  const delta =
    previousScore !== null && previousScore !== score
      ? score - previousScore
      : null;
  const tweetCopy = buildTweetCopy({ score, delta });
  const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetCopy)}`;

  const downloadPng = useCallback(async () => {
    setError(null);
    setDownloading(true);
    try {
      const res = await fetch(ogPath, { cache: "no-store" });
      if (!res.ok) throw new Error(`Render failed (${res.status}).`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sneakpeek-${shortFile(address)}-${score}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Couldn't download card.");
    } finally {
      setDownloading(false);
    }
  }, [address, ogPath, score]);

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-3 text-[12px] tracking-[0.22em] uppercase text-muted">
          <span aria-hidden className="w-8 h-px bg-rule" />
          <span>Share</span>
        </div>
        <span className="text-[12px] text-muted-2">
          rendered on demand · nothing stored
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start min-w-0">
        {/* Preview */}
        <div className="md:col-span-7 min-w-0">
          <SharePreview
            key={ogPath}
            ogPath={ogPath}
            alt={`Privacy Score share card for ${shortFile(address)}, ${score} / 100`}
          />
        </div>

        {/* Actions */}
        <div className="md:col-span-5 flex flex-col gap-4">
          <p className="font-italic-serif text-[20px] leading-snug text-ink-soft max-w-[36ch]">
            Save the card, or post it on X with one tap. The image is rendered
            from the URL. No copy of your wallet sits on our servers.
          </p>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={downloadPng}
              disabled={downloading}
              className="inline-flex items-center justify-between gap-3 border border-ink/80 px-4 py-3 text-[13px] tracking-[0.2em] uppercase text-ink hover:bg-ink hover:text-paper disabled:text-muted-2 disabled:border-rule disabled:cursor-not-allowed transition-colors focus-ring rounded-sm"
            >
              <span>
                {downloading ? "Rendering…" : "Download PNG"}
              </span>
              <span aria-hidden>↓</span>
            </button>
            <a
              href={intentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-between gap-3 border border-ink/80 px-4 py-3 text-[13px] tracking-[0.2em] uppercase text-ink hover:bg-ink hover:text-paper transition-colors focus-ring rounded-sm"
            >
              <span>Share on X</span>
              <span aria-hidden>↗</span>
            </a>
          </div>

          {error && (
            <p className="text-[13px] text-[color:var(--score-low)]">{error}</p>
          )}

          <p className="text-[12px] text-muted leading-relaxed max-w-[44ch]">
            <span className="italic">Privacy ≠ anonymity.</span> v1 ships
            guidance and curated tools. One tap fixes ship in v1.5.
          </p>
        </div>
      </div>
    </section>
  );
}

function SharePreview({ ogPath, alt }: { ogPath: string; alt: string }) {
  const [state, setState] = useState<ImgState>("loading");
  return (
    <div
      className="relative border border-rule bg-paper-2/40 rounded-sm overflow-hidden"
      style={{ aspectRatio: "1200 / 630" }}
    >
      {state !== "error" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ogPath}
          alt={alt}
          width={1200}
          height={630}
          loading="eager"
          decoding="async"
          onLoad={() => setState("ready")}
          onError={() => setState("error")}
          className={`w-full h-auto block transition-opacity duration-300 ${
            state === "ready" ? "opacity-100" : "opacity-0"
          }`}
        />
      ) : (
        <a
          href={ogPath}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-[13px] text-muted hover:text-ink transition-colors"
        >
          <span className="font-italic-serif text-[18px] text-ink-soft">
            Card couldn&rsquo;t render inline.
          </span>
          <span className="underline decoration-rule decoration-1 underline-offset-[5px]">
            open card in a new tab ↗
          </span>
        </a>
      )}
      {state === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center text-[11px] tracking-[0.22em] uppercase text-muted-2 pulse-soft">
          rendering card…
        </div>
      )}
    </div>
  );
}

function shortFile(addr: string): string {
  return addr.length > 10 ? `${addr.slice(0, 4)}_${addr.slice(-4)}` : addr;
}

function buildTweetCopy({
  score,
  delta,
}: {
  score: number;
  delta: number | null;
}): string {
  const base = `My Solana Privacy Score is ${score}/100.`;
  const middle =
    delta !== null && delta > 0
      ? ` Just tightened +${delta} points.`
      : delta !== null && delta < 0
        ? ` Slipped ${delta} points, re tightening.`
        : "";
  return `${base}${middle} Audit yours →`;
}
