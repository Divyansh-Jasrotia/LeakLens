// Explainable LeakScore: staleness + priceDrift + shareOfRecurringSpend,
// each returned as a separate component alongside a plain-language verdict.
// Pure functions only.

import type { RecurrenceInfo } from "./recurrence";
import type { SensorReading } from "./sensors";

export type Verdict = "Active" | "Zombie-high" | "Zombie-medium" | "PriceHike" | "Unknown";

export interface ScoreComponents {
  staleness: number; // 0-50
  priceDrift: number; // 0-30
  shareOfRecurringSpend: number; // 0-20
}

export interface ScoreResult {
  components: ScoreComponents;
  total: number;
  verdict: Verdict;
}

const STALENESS_MAX = 50;
const PRICE_DRIFT_MAX = 30;
const SHARE_MAX = 20;

// Days-since-last-ping to assume when a tracked sensor has never fired.
const NEVER_PINGED_DAYS = 200;

const ZOMBIE_HIGH_THRESHOLD_DAYS = 90;
const ZOMBIE_MEDIUM_THRESHOLD_DAYS = 30;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function computeStaleness(sensor: SensorReading): number {
  if (sensor.sensorType === "none") return 0;
  const days = sensor.daysSinceLastPing ?? NEVER_PINGED_DAYS;
  const reliability = sensor.reliability ?? 1;
  return Math.round(clamp((days * reliability) / 3, 0, STALENESS_MAX));
}

// Drift only means something for genuinely periodic subscriptions with a
// fixed per-cycle price. Irregular-cadence merchants (one-off P2M UPI
// purchases) vary in amount for reasons that have nothing to do with a
// price hike, so drift is not evaluated for them.
function latestFlaggedDrift(recurrence: RecurrenceInfo) {
  if (recurrence.cadence === "irregular") return undefined;
  const flagged = recurrence.drift.filter((d) => d.flagged);
  return flagged[flagged.length - 1];
}

function computePriceDrift(recurrence: RecurrenceInfo): number {
  const latestDrift = latestFlaggedDrift(recurrence);
  if (!latestDrift) return 0;
  return Math.round(clamp(latestDrift.deltaPercent, 0, PRICE_DRIFT_MAX));
}

function computeShareOfRecurringSpend(annualizedSpend: number, totalAnnualizedSpend: number): number {
  if (totalAnnualizedSpend <= 0) return 0;
  return Math.round(clamp((annualizedSpend / totalAnnualizedSpend) * SHARE_MAX, 0, SHARE_MAX));
}

function computeVerdict(
  sensorType: SensorReading["sensorType"],
  recurrence: RecurrenceInfo,
  sensor: SensorReading
): Verdict {
  if (sensorType === "none") return "Unknown";

  if (latestFlaggedDrift(recurrence)) return "PriceHike";

  const days = sensor.daysSinceLastPing;
  if (days === null || days > ZOMBIE_HIGH_THRESHOLD_DAYS) return "Zombie-high";
  if (days > ZOMBIE_MEDIUM_THRESHOLD_DAYS) return "Zombie-medium";
  return "Active";
}

export function computeScore(
  recurrence: RecurrenceInfo,
  sensor: SensorReading,
  totalAnnualizedSpend: number
): ScoreResult {
  const components: ScoreComponents = {
    staleness: computeStaleness(sensor),
    priceDrift: computePriceDrift(recurrence),
    shareOfRecurringSpend: computeShareOfRecurringSpend(recurrence.annualizedSpend, totalAnnualizedSpend),
  };

  const total = components.staleness + components.priceDrift + components.shareOfRecurringSpend;
  const verdict = computeVerdict(sensor.sensorType, recurrence, sensor);

  return { components, total, verdict };
}
