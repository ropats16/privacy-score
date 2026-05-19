import type { NextConfig } from "next";

// Zero-telemetry posture (v1). Audited in Phase 7:
//
//   • No @vercel/analytics, @vercel/speed-insights, @sentry/*, posthog,
//     plausible, fullstory, hotjar, segment, mixpanel, or amplitude in
//     the runtime dep graph. (Sentry appears only as an optional peer
//     dep of a transitive Solana wallet package — not installed.)
//   • No instrumentation.ts. No middleware that logs identity.
//   • Wallet-adapter's own ephemeral session is the only client state
//     beyond Zustand's in-memory scan store; nothing is persisted.
//   • The single server-side cache is /api/ofac, which only ever holds
//     the public OFAC list. /api/og is stateless.
//
// If you add a dep, re-run the audit before merging.

const nextConfig: NextConfig = {};

export default nextConfig;
