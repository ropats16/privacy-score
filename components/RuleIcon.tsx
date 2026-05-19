import type { FactorKey } from "@/lib/types";

// Editorial line illustrations, one per factor. Each visualises the good
// practice rule for that factor (e.g. "split your wallet", "sweep approvals",
// "stealth fund"). Inherits colour via currentColor.

type Props = {
  k: FactorKey;
  size?: number;
  className?: string;
};

export function RuleIcon({ k, size = 56, className }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 64 64",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };

  switch (k) {
    case "identity":
      // Split wallet: name peeled away from a second clean wallet
      return (
        <svg {...common}>
          <rect x="9" y="20" width="20" height="26" rx="3" />
          <path d="M14 27h10" />
          <path d="M14 32h7" />
          <rect x="35" y="20" width="20" height="26" rx="3" strokeDasharray="2.2 2.6" />
          <circle cx="45" cy="33" r="2" fill="currentColor" stroke="none" />
          <path d="M29 33h6" strokeDasharray="1.8 2.4" />
        </svg>
      );
    case "kyc":
      // Stealth funding: from a CEX box, via a masked hop, into a wallet
      return (
        <svg {...common}>
          <rect x="6" y="26" width="14" height="14" rx="2" />
          <path d="M10.5 30.5h5M10.5 33.5h5M10.5 36.5h3" />
          <circle cx="32" cy="33" r="6" />
          <path d="M28 34l2 2 6-6" />
          <rect x="44" y="26" width="14" height="14" rx="2" />
          <path d="M48 30h6M48 33h6M48 36h6" />
          <path d="M20 33h6" />
          <path d="M38 33h6" />
        </svg>
      );
    case "cluster":
      // Ephemeral rails: one wallet feeding many short-lived nodes
      return (
        <svg {...common}>
          <circle cx="12" cy="32" r="4" />
          <path d="M16 32h4" />
          <path d="M20 32l8 -10" />
          <path d="M20 32l8 0" />
          <path d="M20 32l8 10" />
          <circle cx="32" cy="20" r="3" strokeDasharray="2 2.4" />
          <circle cx="32" cy="32" r="3" strokeDasharray="2 2.4" />
          <circle cx="32" cy="44" r="3" strokeDasharray="2 2.4" />
          <path d="M35 20l4 -3" strokeDasharray="1.6 2" />
          <path d="M35 32l5 0" strokeDasharray="1.6 2" />
          <path d="M35 44l4 3" strokeDasharray="1.6 2" />
          <circle cx="46" cy="16" r="2.5" />
          <circle cx="46" cy="32" r="2.5" />
          <circle cx="46" cy="48" r="2.5" />
        </svg>
      );
    case "connected":
      // Revoke sweep: broom strokes across permission tags
      return (
        <svg {...common}>
          <path d="M14 14l30 30" />
          <path d="M44 44l8 8" />
          <path d="M44 44l-6 6" />
          <path d="M44 44l-2 8" />
          <path d="M44 44l-8 2" />
          <rect x="10" y="20" width="12" height="6" rx="3" />
          <path d="M12 23h8" />
          <rect x="18" y="32" width="14" height="6" rx="3" strokeDasharray="2 2.4" />
          <rect x="6" y="42" width="12" height="6" rx="3" strokeDasharray="2 2.4" />
        </svg>
      );
    case "wealth":
      // Vault with multisig signers radiating in
      return (
        <svg {...common}>
          <rect x="20" y="22" width="24" height="24" rx="3" />
          <circle cx="32" cy="34" r="4" />
          <path d="M32 38v4" />
          <path d="M20 28h-3" />
          <path d="M44 28h3" />
          <path d="M20 40h-3" />
          <path d="M44 40h3" />
          <circle cx="13" cy="22" r="2" />
          <circle cx="51" cy="22" r="2" />
          <circle cx="13" cy="46" r="2" />
          <circle cx="51" cy="46" r="2" />
          <path d="M15 22l5 2" strokeDasharray="1.6 2" />
          <path d="M49 22l-5 2" strokeDasharray="1.6 2" />
          <path d="M15 46l5 -2" strokeDasharray="1.6 2" />
          <path d="M49 46l-5 -2" strokeDasharray="1.6 2" />
        </svg>
      );
    case "surveillance":
      // Flag verified — a flag pole with a checkmark
      return (
        <svg {...common}>
          <path d="M18 12v40" />
          <path d="M18 14h26l-6 8 6 8H18" />
          <path d="M26 38l4 4 8 -10" />
        </svg>
      );
  }
}
