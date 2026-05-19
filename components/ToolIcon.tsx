// Tiny monogram chip for each tool surfaced in a recommendation.
// We don't ship brand logos (licensing) — these are stylised marks that pair
// with the link label. Deterministic from the URL hostname.

type Props = {
  url: string;
  className?: string;
  size?: number;
};

function hostFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

type Mark = { glyph: string; bg: string; fg: string };

const MARKS: Record<string, Mark> = {
  "umbraprivacy.com": { glyph: "U", bg: "#1a1a1f", fg: "#f6f4ef" },
  "magicblock.xyz": { glyph: "M", bg: "#3a2e7a", fg: "#f6f4ef" },
  "magicblock.gg": { glyph: "M", bg: "#3a2e7a", fg: "#f6f4ef" },
  "revoke.cash": { glyph: "R", bg: "#1d4d3b", fg: "#f6f4ef" },
  "sns.id": { glyph: "S", bg: "#0b4d8a", fg: "#f6f4ef" },
  "squads.so": { glyph: "▢", bg: "#14110d", fg: "#f6f4ef" },
  "range.security": { glyph: "◯", bg: "#5a3a14", fg: "#f6f4ef" },
  "sanctionssearch.ofac.treas.gov": { glyph: "⚠", bg: "#7a2014", fg: "#f6f4ef" },
};

export function ToolIcon({ url, className, size = 22 }: Props) {
  const host = hostFromUrl(url);
  const m = MARKS[host] ?? { glyph: host.charAt(0).toUpperCase() || "·", bg: "#2b261e", fg: "#f6f4ef" };
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
