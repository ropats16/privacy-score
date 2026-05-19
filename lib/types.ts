// Shared data models. No DB. In-memory + Zustand only.

export type FactorKey =
  | "identity"
  | "kyc"
  | "cluster"
  | "connected"
  | "wealth"
  | "surveillance";

export type RubricStep = {
  /** Plain-English condition / threshold */
  when: string;
  /** Score delta or absolute value at this threshold, as text */
  effect: string;
};

export type Rubric = {
  factor: FactorKey;
  title: string;
  weight: number; // contribution to total (sums to 100 across all factors)
  measures: string;
  steps: RubricStep[];
  /** Short note rendered under the rubric on the methodology page. */
  note?: string;
};

export type FactorSignals = Record<string, string | number>;

export type Factor = {
  key: FactorKey;
  title: string;
  weight: number;
  /** Sub-score 0–100 — higher is more private. */
  score: number;
  signals: FactorSignals;
};

/** A single curated tool/guide link offered as part of a recommendation.
 *  `affiliate` is reserved for future referral monetization — empty in v1. */
export type ToolLink = {
  label: string;
  url: string;
  blurb?: string;
  affiliate?: string;
};

export type RecommendedAction = {
  headline: string;
  detail: string;
  /** v1 = false everywhere. v1.5 flips this on once we ship 1-click tx fixes. */
  inAppFixAvailable: boolean;
  links: ToolLink[];
};

export type LeakReason = {
  factorKey: FactorKey;
  severity: "low" | "medium" | "high";
  title: string;
  plainEnglish: string;
  signals: FactorSignals;
  recommendation: RecommendedAction;
  /** Headroom on the total score if this factor were brought to 100. */
  estimatedLift: number;
};

export type DustWarning = {
  address: string;
  kind: "dust" | "poisoning";
  evidence: string;
};

export type Scan = {
  address: string;
  scannedAt: number; // ms epoch
  /** Hard-coded 90 days in v1. */
  windowDays: 90;
  factors: Factor[];
  leakReasons: LeakReason[];
  dustWarnings: DustWarning[];
  totalScore: number;
};

export type FactorStatus = "pending" | "running" | "done" | "error";

export type FactorProgress = {
  key: FactorKey;
  title: string;
  status: FactorStatus;
  score?: number;
  error?: string;
};
