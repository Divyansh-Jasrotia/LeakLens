// Detects billing cadence from a merchant's charge history via median
// gap clustering, tracks amount drift, and annualizes spend. Pure functions.

import type { ResolvedTransaction } from "./resolver";

export type Cadence = "monthly" | "annual" | "irregular";

const MONTHLY_GAP_RANGE = [27, 33] as const;
const ANNUAL_GAP_RANGE = [350, 380] as const;
export const ASSUMED_ANNUAL_PERIOD_DAYS = 365;

const DRIFT_PERCENT_THRESHOLD = 5;
const DRIFT_ABSOLUTE_THRESHOLD = 20;

export interface DriftEntry {
  fromTimestamp: string;
  toTimestamp: string;
  fromAmount: number;
  toAmount: number;
  deltaAmount: number;
  deltaPercent: number;
  flagged: boolean;
}

export interface RecurrenceInfo {
  cadence: Cadence;
  gapsDays: number[];
  medianGapDays: number | null;
  drift: DriftEntry[];
  latestAmount: number;
  annualizedSpend: number;
}

function daysBetween(aIso: string, bIso: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return (new Date(bIso).getTime() - new Date(aIso).getTime()) / msPerDay;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function classifyCadence(medianGapDays: number | null): Cadence {
  if (medianGapDays === null) return "annual"; // single charge: assume annual renewal
  if (medianGapDays >= MONTHLY_GAP_RANGE[0] && medianGapDays <= MONTHLY_GAP_RANGE[1]) return "monthly";
  if (medianGapDays >= ANNUAL_GAP_RANGE[0] && medianGapDays <= ANNUAL_GAP_RANGE[1]) return "annual";
  return "irregular";
}

function computeDrift(transactions: ResolvedTransaction[]): DriftEntry[] {
  const drift: DriftEntry[] = [];
  for (let i = 1; i < transactions.length; i++) {
    const prev = transactions[i - 1];
    const curr = transactions[i];
    const deltaAmount = curr.amount - prev.amount;
    const deltaPercent = prev.amount === 0 ? 0 : (deltaAmount / prev.amount) * 100;
    const flagged = deltaAmount >= DRIFT_ABSOLUTE_THRESHOLD || deltaPercent >= DRIFT_PERCENT_THRESHOLD;
    drift.push({
      fromTimestamp: prev.timestamp,
      toTimestamp: curr.timestamp,
      fromAmount: prev.amount,
      toAmount: curr.amount,
      deltaAmount,
      deltaPercent,
      flagged,
    });
  }
  return drift;
}

function annualize(cadence: Cadence, latestAmount: number, medianGapDays: number | null): number {
  if (cadence === "monthly") return latestAmount * 12;
  if (cadence === "annual") return latestAmount;
  if (medianGapDays && medianGapDays > 0) {
    return Math.round(latestAmount * (ASSUMED_ANNUAL_PERIOD_DAYS / medianGapDays));
  }
  return latestAmount;
}

export function computeRecurrence(transactions: ResolvedTransaction[]): RecurrenceInfo {
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const gapsDays: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gapsDays.push(daysBetween(sorted[i - 1].timestamp, sorted[i].timestamp));
  }

  const medianGapDays = gapsDays.length > 0 ? median(gapsDays) : null;
  const cadence = classifyCadence(medianGapDays);
  const drift = computeDrift(sorted);
  const latestAmount = sorted.length > 0 ? sorted[sorted.length - 1].amount : 0;
  const annualizedSpend = annualize(cadence, latestAmount, medianGapDays);

  return { cadence, gapsDays, medianGapDays, drift, latestAmount, annualizedSpend };
}
