// Tool logos — real brand marks served from /public/tools. Most are
// app-icon-style artwork that already carries its own background, so they
// render full-bleed inside the rounded tile. SNS ships only a transparent
// glyph, so it gets a light tile behind it. Unknown hosts fall back to a
// neutral monogram.

import Image from "next/image";

type Props = {
  url: string;
  className?: string;
  size?: number;
  /** Compact = small inline pill. Hero = large square tile for fix cards. */
  variant?: "compact" | "hero";
};

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

type Logo = {
  src: string;
  name: string;
  /** Background tile — set when the artwork has transparent areas (a circle,
      or a bare glyph) that would otherwise reveal the card behind it. */
  tile?: string;
  /** Inset the artwork inside the tile — for bare glyphs, not app icons. */
  pad?: boolean;
};

const LOGOS: Record<string, Logo> = {
  "umbraprivacy.com": { src: "/tools/umbra.png", name: "umbra" },
  "magicblock.xyz": { src: "/tools/magicblock.png", name: "magicblock", tile: "#000000" },
  "magicblock.gg": { src: "/tools/magicblock.png", name: "magicblock", tile: "#000000" },
  "revoke.cash": { src: "/tools/revoke.png", name: "revoke.cash" },
  "squads.so": { src: "/tools/squads.png", name: "squads" },
  "range.security": { src: "/tools/range.png", name: "range" },
  "range.org": { src: "/tools/range.png", name: "range" },
  "sns.id": { src: "/tools/sns.png", name: "sns", tile: "#ffffff", pad: true },
};

export function ToolIcon({ url, className, size = 22, variant = "compact" }: Props) {
  const host = hostFromUrl(url);
  const logo = LOGOS[host];
  const radius = variant === "hero" ? 16 : 6;
  const shadow =
    variant === "hero"
      ? "inset 0 0 0 1px rgba(20,17,13,0.10), 0 10px 26px -16px rgba(20,17,13,0.45)"
      : "inset 0 0 0 1px rgba(20,17,13,0.12)";

  // Unknown tool — neutral monogram fallback.
  if (!logo) {
    return (
      <span
        aria-hidden
        className={`inline-flex items-center justify-center shrink-0 ${className ?? ""}`}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          background: "#2b261e",
          color: "#f6f4ef",
          fontSize: size * 0.46,
          fontWeight: 600,
          fontFamily: "var(--font-bricolage), ui-sans-serif, system-ui, sans-serif",
          lineHeight: 1,
          textTransform: "none",
          boxShadow: shadow,
        }}
      >
        {host.charAt(0).toUpperCase() || "·"}
      </span>
    );
  }

  // Bare glyphs sit padded inside their tile; app icons fill it edge to edge.
  const inner = logo.pad ? Math.round(size * 0.64) : size;

  return (
    <span
      aria-hidden
      className={`inline-flex items-center justify-center shrink-0 overflow-hidden ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: logo.tile ?? "transparent",
        boxShadow: shadow,
      }}
    >
      <Image
        src={logo.src}
        alt=""
        width={inner}
        height={inner}
        style={{ display: "block", objectFit: "contain" }}
      />
    </span>
  );
}

export function toolName(url: string): string {
  const host = hostFromUrl(url);
  return LOGOS[host]?.name ?? (host || "tool");
}
