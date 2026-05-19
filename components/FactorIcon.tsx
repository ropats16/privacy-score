import type { FactorKey } from "@/lib/types";

type Props = {
  k: FactorKey;
  className?: string;
  size?: number;
};

// Pen-stroke line icons, one per factor. Stroke inherits via currentColor.
export function FactorIcon({ k, className, size = 18 }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };

  switch (k) {
    case "identity":
      return (
        <svg {...common}>
          <circle cx="12" cy="8.5" r="3.6" />
          <path d="M4.5 19.5c1.5-3.4 4.4-5 7.5-5s6 1.6 7.5 5" />
        </svg>
      );
    case "kyc":
      return (
        <svg {...common}>
          <path d="M3.5 9.5 12 4l8.5 5.5" />
          <path d="M5 10.5v8" />
          <path d="M19 10.5v8" />
          <path d="M9 10.5v8" />
          <path d="M15 10.5v8" />
          <path d="M3 19.5h18" />
        </svg>
      );
    case "cluster":
      return (
        <svg {...common}>
          <circle cx="12" cy="5" r="2" />
          <circle cx="5" cy="18" r="2" />
          <circle cx="19" cy="18" r="2" />
          <circle cx="12" cy="12" r="1.6" />
          <path d="M12 7v3" />
          <path d="m11 13-5 4" />
          <path d="m13 13 5 4" />
        </svg>
      );
    case "connected":
      return (
        <svg {...common}>
          <path d="M9 9h6" />
          <path d="M9 7v6a3 3 0 0 0 3 3" />
          <path d="M15 7v6a3 3 0 0 1-3 3" />
          <path d="M9 4v3" />
          <path d="M15 4v3" />
          <path d="M12 16v4" />
        </svg>
      );
    case "wealth":
      return (
        <svg {...common}>
          <ellipse cx="12" cy="6.5" rx="6.5" ry="2.2" />
          <path d="M5.5 6.5v4c0 1.2 2.9 2.2 6.5 2.2s6.5-1 6.5-2.2v-4" />
          <path d="M5.5 10.5v4c0 1.2 2.9 2.2 6.5 2.2s6.5-1 6.5-2.2v-4" />
          <path d="M5.5 14.5v3c0 1.2 2.9 2.2 6.5 2.2s6.5-1 6.5-2.2v-3" />
        </svg>
      );
    case "surveillance":
      return (
        <svg {...common}>
          <path d="M2.5 12c2.4-4.2 5.9-6.5 9.5-6.5s7.1 2.3 9.5 6.5c-2.4 4.2-5.9 6.5-9.5 6.5S4.9 16.2 2.5 12Z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
  }
}
