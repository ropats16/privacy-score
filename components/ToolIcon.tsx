// Tool monograms — large brand-flavoured marks used inside fix cards and
// compact list rows. We render stylised letterforms rather than raw brand
// SVGs (licensing) but match each brand's dominant colour and feel.

type Props = {
  url: string;
  className?: string;
  size?: number;
  /** Compact = small inline pill. Hero = large square tile for fix cards. */
  variant?: "compact" | "hero";
};

function hostFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

type Mark = {
  glyph: string;
  bg: string;
  fg: string;
  /** Optional CSS background-image (gradient/pattern) for hero rendering. */
  bgImage?: string;
  /** Display name shown beside the hero mark. */
  name: string;
};

const MARKS: Record<string, Mark> = {
  "umbraprivacy.com": {
    glyph: "U",
    name: "umbra",
    bg: "#0d0d12",
    fg: "#f6f4ef",
    bgImage:
      "radial-gradient(circle at 30% 25%, rgba(180,170,255,0.22) 0%, rgba(13,13,18,0) 55%)",
  },
  "magicblock.xyz": {
    glyph: "✦",
    name: "magicblock",
    bg: "#1d143f",
    fg: "#f6f4ef",
    bgImage:
      "linear-gradient(135deg, #2c1b6a 0%, #5a2bd6 55%, #c46aff 100%)",
  },
  "magicblock.gg": {
    glyph: "✦",
    name: "magicblock",
    bg: "#1d143f",
    fg: "#f6f4ef",
    bgImage:
      "linear-gradient(135deg, #2c1b6a 0%, #5a2bd6 55%, #c46aff 100%)",
  },
  "revoke.cash": {
    glyph: "✕",
    name: "revoke.cash",
    bg: "#0a3a2a",
    fg: "#a6f0c8",
    bgImage:
      "linear-gradient(150deg, #0a3a2a 0%, #115d3e 60%, #02c979 110%)",
  },
  "sns.id": {
    glyph: ".sol",
    name: "sns",
    bg: "#0b3e7a",
    fg: "#f6f4ef",
    bgImage:
      "linear-gradient(160deg, #0b3e7a 0%, #1862c5 55%, #61c4ff 110%)",
  },
  "squads.so": {
    glyph: "▢",
    name: "squads",
    bg: "#14110d",
    fg: "#f6f4ef",
    bgImage:
      "radial-gradient(circle at 70% 30%, rgba(255,205,108,0.20) 0%, rgba(20,17,13,0) 60%)",
  },
  "range.security": {
    glyph: "◯",
    name: "range",
    bg: "#3a2310",
    fg: "#f6dfb8",
    bgImage:
      "linear-gradient(140deg, #3a2310 0%, #6a3a14 55%, #d68b3a 110%)",
  },
  "sanctionssearch.ofac.treas.gov": {
    glyph: "⚠",
    name: "ofac sdn list",
    bg: "#5a1410",
    fg: "#fbe5dc",
    bgImage:
      "linear-gradient(160deg, #5a1410 0%, #8a221c 55%, #ff3e00 120%)",
  },
};

function markFor(url: string): Mark {
  const host = hostFromUrl(url);
  return (
    MARKS[host] ?? {
      glyph: host.charAt(0).toUpperCase() || "·",
      name: host || "tool",
      bg: "#2b261e",
      fg: "#f6f4ef",
    }
  );
}

export function ToolIcon({ url, className, size = 22, variant = "compact" }: Props) {
  const m = markFor(url);

  if (variant === "hero") {
    return (
      <span
        aria-hidden
        className={`inline-flex items-center justify-center shrink-0 ${className ?? ""}`}
        style={{
          width: size,
          height: size,
          borderRadius: 18,
          background: m.bg,
          backgroundImage: m.bgImage,
          color: m.fg,
          fontSize: size * 0.36,
          fontWeight: 600,
          fontFamily: "var(--font-bricolage), ui-sans-serif, system-ui, sans-serif",
          letterSpacing: "-0.02em",
          lineHeight: 1,
          textTransform: "none",
          boxShadow:
            "inset 0 0 0 1px rgba(255,255,255,0.08), 0 12px 30px -16px rgba(20,17,13,0.45)",
        }}
      >
        {m.glyph}
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className={`inline-flex items-center justify-center shrink-0 ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        background: m.bg,
        color: m.fg,
        fontSize: size * 0.5,
        fontWeight: 600,
        fontFamily: "var(--font-bricolage), ui-sans-serif, system-ui, sans-serif",
        lineHeight: 1,
        textTransform: "none",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
      }}
    >
      {m.glyph}
    </span>
  );
}

export function toolName(url: string): string {
  return markFor(url).name;
}
