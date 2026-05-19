// Share-card PNG renderer.
//
// Stateless edge route. Reads `address`, `score`, and optional `prev` from the
// query string and returns a 1200×630 PNG. No persistence, no per-address
// caching by us — the params *are* the input.
//
// Satori (the engine behind ImageResponse) requires every <div> to have an
// explicit `display: flex` or `display: none`. Single-text-child divs are NOT
// exempt. We standardise on `display: flex` everywhere and use a tiny `Box`
// alias so it's hard to forget.

import { ImageResponse } from "next/og";

export const runtime = "edge";

const WIDTH = 1200;
const HEIGHT = 630;

const COLORS = {
  paper: "#f1ede4",
  paper2: "#ebe6d8",
  ink: "#14110d",
  inkSoft: "#2b261e",
  muted: "#807769",
  muted2: "#b8b0a0",
  rule: "#d8d1bf",
  scoreLow: "#b94a2a",
  scoreMid: "#c08a3a",
  scoreHigh: "#4f7a4a",
};

const SANS =
  "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const SERIF = "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

function scoreBand(score: number): "low" | "mid" | "high" {
  if (score < 40) return "low";
  if (score < 70) return "mid";
  return "high";
}

function shortAddress(addr: string, head = 6, tail = 6): string {
  if (addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

function clamp0to100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawAddress = (url.searchParams.get("address") ?? "").trim();
  const address = rawAddress.length > 0 ? rawAddress : "—";
  const score = clamp0to100(Number(url.searchParams.get("score") ?? 0));
  const prevParam = url.searchParams.get("prev");
  const prev =
    prevParam === null || prevParam === ""
      ? null
      : clamp0to100(Number(prevParam));
  const delta = prev === null ? null : score - prev;
  const watchOnly = url.searchParams.get("watchOnly") === "1";

  const band = scoreBand(score);
  const bandColor =
    band === "high"
      ? COLORS.scoreHigh
      : band === "mid"
        ? COLORS.scoreMid
        : COLORS.scoreLow;
  const bandLabel =
    band === "high"
      ? "Quiet footprint"
      : band === "mid"
        ? "Moderate exposure"
        : "Loud footprint";

  try {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: COLORS.paper,
            color: COLORS.ink,
            padding: "64px 72px",
            fontFamily: SERIF,
          }}
        >
          {/* Top rule + brand line */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              color: COLORS.muted,
              fontFamily: SANS,
              fontSize: 18,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            <div
              style={{
                display: "flex",
                width: 12,
                height: 12,
                borderRadius: 999,
                backgroundColor: COLORS.ink,
              }}
            />
            <div style={{ display: "flex", color: COLORS.inkSoft }}>
              PrivacyScore
            </div>
            <div
              style={{
                display: "flex",
                flex: 1,
                height: 1,
                backgroundColor: COLORS.rule,
              }}
            />
            <div style={{ display: "flex" }}>90-day audit</div>
          </div>

          {/* Body row */}
          <div
            style={{
              display: "flex",
              flex: 1,
              marginTop: 36,
              alignItems: "flex-start",
              gap: 56,
            }}
          >
            {/* Left: huge score numeral */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                minWidth: 540,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontFamily: SANS,
                  fontSize: 18,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: COLORS.muted,
                  marginBottom: 16,
                }}
              >
                Privacy Score
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 18,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontStyle: "italic",
                    fontSize: 360,
                    color: COLORS.ink,
                    letterSpacing: "-0.04em",
                    lineHeight: 0.82,
                  }}
                >
                  {score}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontFamily: SANS,
                    fontSize: 32,
                    color: COLORS.muted,
                    paddingBottom: 28,
                  }}
                >
                  / 100
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginTop: 24,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    backgroundColor: bandColor,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    fontSize: 26,
                    fontStyle: "italic",
                    color: COLORS.inkSoft,
                  }}
                >
                  {bandLabel}
                </div>
              </div>
            </div>

            {/* Right: address, delta, honesty */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                gap: 24,
                paddingTop: 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontFamily: SANS,
                    fontSize: 16,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: COLORS.muted,
                  }}
                >
                  Audit
                </div>
                <div
                  style={{
                    display: "flex",
                    fontFamily: MONO,
                    fontSize: 36,
                    color: COLORS.ink,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {shortAddress(address, 6, 6)}
                </div>
              </div>

              {delta !== null && delta !== 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 16px",
                    borderRadius: 999,
                    border: `1px solid ${delta > 0 ? COLORS.scoreHigh : COLORS.scoreLow}`,
                    color: delta > 0 ? COLORS.scoreHigh : COLORS.scoreLow,
                    fontFamily: SANS,
                    fontSize: 22,
                    alignSelf: "flex-start",
                  }}
                >
                  <div style={{ display: "flex" }}>
                    {delta > 0 ? "▲" : "▼"}
                  </div>
                  <div style={{ display: "flex" }}>{String(prev)}</div>
                  <div style={{ display: "flex", color: COLORS.muted2 }}>
                    →
                  </div>
                  <div style={{ display: "flex" }}>{String(score)}</div>
                  <div style={{ display: "flex", color: COLORS.muted2 }}>
                    ·
                  </div>
                  <div style={{ display: "flex" }}>
                    {`${delta > 0 ? "+" : ""}${delta}`}
                  </div>
                </div>
              )}

              {watchOnly && (
                <div
                  style={{
                    display: "flex",
                    alignSelf: "flex-start",
                    padding: "6px 12px",
                    borderRadius: 4,
                    border: `1px solid ${COLORS.muted2}`,
                    color: COLORS.muted,
                    fontFamily: SANS,
                    fontSize: 16,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  watch-only
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  fontSize: 30,
                  fontStyle: "italic",
                  color: COLORS.inkSoft,
                  lineHeight: 1.25,
                  maxWidth: 480,
                }}
              >
                Privacy ≠ anonymity. We show you what your wallet is already
                showing.
              </div>
            </div>
          </div>

          {/* Bottom rule + CTA */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              color: COLORS.muted,
              fontFamily: SANS,
              fontSize: 18,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              marginTop: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                flex: 1,
                height: 1,
                backgroundColor: COLORS.rule,
              }}
            />
            <div style={{ display: "flex" }}>Audit yours →</div>
          </div>
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
        headers: {
          "cache-control":
            "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/og] render failed:", message);
    // Minimal fallback card so consumers still get a renderable PNG.
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: COLORS.paper,
            color: COLORS.ink,
            fontFamily: SERIF,
          }}
        >
          <div style={{ display: "flex", fontSize: 200, fontStyle: "italic" }}>
            {score}
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: SANS,
              fontSize: 24,
              color: COLORS.muted,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              marginTop: 8,
            }}
          >
            PrivacyScore · {shortAddress(address, 4, 4)}
          </div>
        </div>
      ),
      { width: WIDTH, height: HEIGHT }
    );
  }
}
