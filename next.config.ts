import type { NextConfig } from "next";

// Telemetry posture (v1):
//
//   • First-party, anonymous, aggregate-only analytics — see lib/analytics/
//     and /api/event. Runs entirely on our own infrastructure (Upstash
//     Redis); no data ever leaves this Vercel project and no third-party
//     analytics service is involved.
//   • No cookies, no client identifier, no cross-day tracking. Unique
//     visitor and wallet counts use non-invertible HyperLogLog sketches —
//     no IP, User-Agent, or wallet address is ever stored.
//   • Still no @vercel/analytics, @vercel/speed-insights, @sentry/*,
//     posthog, plausible, fullstory, hotjar, segment, mixpanel, or
//     amplitude in the runtime dep graph.
//   • proxy.ts only gates /admin behind Basic Auth — it logs no identity.
//   • The only server-side state we keep is /api/ofac (public OFAC list)
//     and the analytics aggregates above. /api/og is stateless.
//
// If you add a dep or a new event, re-check this posture before merging.

const nextConfig: NextConfig = {};

export default nextConfig;
