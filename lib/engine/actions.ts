// Static rail -> cancellation-steps map (India-specific) plus the recovery
// math: how much money is recoverable per merchant, and the invoice total.
// Pure functions only.

import type { Rail } from "./parser";
import type { RecurrenceInfo } from "./recurrence";
import type { Verdict } from "./score";

export const CANCELLATION_STEPS: Record<Rail, string[]> = {
  "upi-autopay": [
    "Open PhonePe or Google Pay (whichever app holds the mandate).",
    "Go to 'Mandates' / 'Autopay' under your profile or payments section.",
    "Select the merchant and tap 'Pause' or 'Cancel mandate'.",
    "Confirm cancellation with your UPI PIN.",
  ],
  "card-si": [
    "Open your bank's app or net banking portal.",
    "Go to 'Manage e-mandates' or 'Standing instructions' (RBI-mandated section).",
    "Find the merchant's e-mandate and select 'Cancel' or 'Revoke'.",
    "Confirm via OTP sent to your registered mobile number.",
  ],
  playstore: [
    "Open the Google Play Store app.",
    "Tap your profile icon, then 'Payments & subscriptions'.",
    "Select 'Subscriptions', find the merchant, and tap 'Cancel subscription'.",
  ],
  direct: [
    "Log in to the merchant's website or app directly.",
    "Go to account or billing settings and locate the subscription/plan.",
    "Cancel the plan or contact support if no self-serve option exists.",
  ],
};

export interface EntityAction {
  rail: Rail;
  steps: string[];
  recoverableAmount: number;
}

function annualizeDelta(deltaAmount: number, recurrence: RecurrenceInfo): number {
  if (recurrence.cadence === "monthly") return deltaAmount * 12;
  if (recurrence.cadence === "annual") return deltaAmount;
  if (recurrence.medianGapDays && recurrence.medianGapDays > 0) {
    return Math.round(deltaAmount * (365 / recurrence.medianGapDays));
  }
  return deltaAmount;
}

export function computeAction(rail: Rail, verdict: Verdict, recurrence: RecurrenceInfo): EntityAction {
  let recoverableAmount = 0;

  // Recovery math only applies to genuine fixed-cost subscriptions
  // (monthly/annual cadence). Irregular-cadence merchants are one-off P2M
  // purchases with no fixed fee to cancel.
  if (recurrence.cadence === "irregular") {
    return { rail, steps: CANCELLATION_STEPS[rail], recoverableAmount };
  }

  if (verdict === "Zombie-high" || verdict === "Zombie-medium") {
    recoverableAmount = recurrence.annualizedSpend;
  } else if (verdict === "PriceHike") {
    const flagged = recurrence.drift.filter((d) => d.flagged);
    const latestDrift = flagged[flagged.length - 1];
    recoverableAmount = latestDrift ? annualizeDelta(latestDrift.deltaAmount, recurrence) : 0;
  }

  return { rail, steps: CANCELLATION_STEPS[rail], recoverableAmount };
}

export function computeTotalRecovery(actions: EntityAction[]): number {
  return actions.reduce((sum, action) => sum + action.recoverableAmount, 0);
}
