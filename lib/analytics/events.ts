// First-party analytics event schema.
//
// Shared by the client `track()` module and the server `/api/event` route.
// The taxonomy is a closed set: the server validates every incoming event
// against the allowlists below and silently drops anything that doesn't fit.
// Nothing here ever carries a raw wallet address, an IP, or a cookie.

import type { FactorKey } from "../types";

export const FACTOR_KEYS: readonly FactorKey[] = [
  "identity",
  "kyc",
  "cluster",
  "connected",
  "wealth",
  "surveillance",
];

export const EVENT_NAMES = [
  "page_view",
  "scan_started",
  "scan_completed",
  "scan_failed",
  "share_clicked",
  "comparison_run",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export const PAGE_NAMES = ["landing", "scan_result", "methodology"] as const;
export type PageName = (typeof PAGE_NAMES)[number];

export const INPUT_TYPES = ["address", "sns", "alt"] as const;
export type InputType = (typeof INPUT_TYPES)[number];

export const ERROR_TYPES = [
  "invalid_address",
  "sns_unresolved",
  "rpc_error",
  "timeout",
  "aborted",
  "other",
] as const;
export type ErrorType = (typeof ERROR_TYPES)[number];

export const SCORE_BANDS = ["low", "mid", "high"] as const;
export type ScoreBand = (typeof SCORE_BANDS)[number];

export const DURATION_BUCKETS = ["fast", "normal", "slow", "very_slow"] as const;
export type DurationBucket = (typeof DURATION_BUCKETS)[number];

export const SHARE_METHODS = ["download", "x"] as const;
export const COMPARISON_DIRECTIONS = ["up", "down", "same"] as const;

// A property is one of these primitives once validated.
export type PropValue = string | number;
export type EventProps = Record<string, PropValue>;

export type ValidatedEvent = { event: EventName; props: EventProps };

// --- Property specs -------------------------------------------------------
// Each event declares the only keys it may carry and how each is validated.
// `required: true` means a malformed/missing value rejects the whole event.

type PropSpec =
  | { kind: "enum"; values: readonly string[]; required?: boolean }
  | { kind: "int"; min: number; max: number; required?: boolean }
  | { kind: "hash"; required?: boolean } // 64-char lowercase hex (SHA-256)
  | { kind: "str"; maxLen: number; required?: boolean }; // free-ish text (referrer / utm)

type EventSpec = Record<string, PropSpec>;

const factorScoreSpecs: EventSpec = Object.fromEntries(
  FACTOR_KEYS.map((k) => [k, { kind: "int", min: 0, max: 100 } as PropSpec]),
);

export const EVENT_SPECS: Record<EventName, EventSpec> = {
  page_view: {
    page: { kind: "enum", values: PAGE_NAMES, required: true },
    ref: { kind: "str", maxLen: 64 },
    utmSource: { kind: "str", maxLen: 64 },
    utmMedium: { kind: "str", maxLen: 64 },
    utmCampaign: { kind: "str", maxLen: 64 },
  },
  scan_started: {
    inputType: { kind: "enum", values: INPUT_TYPES, required: true },
  },
  scan_completed: {
    scoreBand: { kind: "enum", values: SCORE_BANDS, required: true },
    scoreBucket: { kind: "int", min: 0, max: 100, required: true },
    weakestFactorKey: { kind: "enum", values: FACTOR_KEYS, required: true },
    ...factorScoreSpecs,
    leakReasonCount: { kind: "int", min: 0, max: 6 },
    dustWarningCount: { kind: "int", min: 0, max: 1000 },
    durationBucket: { kind: "enum", values: DURATION_BUCKETS },
    walletHash: { kind: "hash" },
  },
  scan_failed: {
    errorType: { kind: "enum", values: ERROR_TYPES, required: true },
  },
  share_clicked: {
    method: { kind: "enum", values: SHARE_METHODS },
  },
  comparison_run: {
    direction: { kind: "enum", values: COMPARISON_DIRECTIONS },
  },
};

// Anything matching this is treated as a (possible) Solana address and an
// event carrying it is dropped wholesale. Hash props are exempt — a 64-char
// hex digest can incidentally contain a base58-looking run.
const ADDRESS_SHAPED = /[1-9A-HJ-NP-Za-km-z]{32,44}/;
const HEX64 = /^[0-9a-f]{64}$/;

function validateProp(spec: PropSpec, raw: unknown): PropValue | undefined {
  switch (spec.kind) {
    case "enum":
      return typeof raw === "string" && spec.values.includes(raw)
        ? raw
        : undefined;
    case "int": {
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(n)) return undefined;
      const i = Math.round(n);
      return i >= spec.min && i <= spec.max ? i : undefined;
    }
    case "hash":
      return typeof raw === "string" && HEX64.test(raw) ? raw : undefined;
    case "str": {
      if (typeof raw !== "string") return undefined;
      const v = raw.trim();
      if (!v || v.length > spec.maxLen) return undefined;
      // Reject anything address-shaped — never let an address ride along.
      if (ADDRESS_SHAPED.test(v)) return undefined;
      return v;
    }
  }
}

/**
 * Validate an untrusted payload against the taxonomy. Returns a sanitized
 * event with only allowlisted props, or `null` if the event should be dropped
 * (unknown name, missing required prop, or an address-shaped value present).
 */
export function validateEvent(raw: unknown): ValidatedEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const name = obj.event;
  if (typeof name !== "string") return null;
  if (!(EVENT_NAMES as readonly string[]).includes(name)) return null;
  const event = name as EventName;

  const spec = EVENT_SPECS[event];
  const rawProps =
    obj.props && typeof obj.props === "object"
      ? (obj.props as Record<string, unknown>)
      : {};

  const props: EventProps = {};
  for (const [key, propSpec] of Object.entries(spec)) {
    const value = validateProp(propSpec, rawProps[key]);
    if (value === undefined) {
      if (propSpec.required) return null;
      continue;
    }
    props[key] = value;
  }

  return { event, props };
}
