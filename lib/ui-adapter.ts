// Adapts real lib/engine output (AnalysisResult) into the shape the v0 UI
// components expect (lib/types.ts). No mock data — every field here is
// derived from analyzeInbox()'s real numbers.

import type { AnalysisResult, EntityAnalysis, Verdict } from './engine'
import type { Dashboard, EvidenceChip, Subscription, VerdictType } from './types'

function toVerdictType(verdict: Verdict): VerdictType {
  switch (verdict) {
    case 'Zombie-high':
    case 'Zombie-medium':
      return 'ZOMBIE'
    case 'PriceHike':
      return 'PRICE_HIKE'
    case 'Unknown':
      return 'UNKNOWN'
    case 'Active':
      return 'ACTIVE'
  }
}

const LOGO_KEY_BY_NAME: Record<string, string> = {
  netflix: 'netflix',
  spotify: 'spotify',
}

function inferLogoKey(merchantName: string): string | undefined {
  const lower = merchantName.toLowerCase()
  const match = Object.keys(LOGO_KEY_BY_NAME).find((key) => lower.includes(key))
  return match ? LOGO_KEY_BY_NAME[match] : undefined
}

function buildEvidence(item: EntityAnalysis, verdictType: VerdictType): EvidenceChip[] {
  const chargeCount = item.entity.transactions.length
  const chips: EvidenceChip[] = [
    { label: `${chargeCount} CHARGE${chargeCount === 1 ? '' : 'S'}`, type: 'charge' },
  ]

  const days = item.sensor.daysSinceLastPing

  if (verdictType === 'PRICE_HIKE') {
    const flaggedDrifts = item.recurrence.drift.filter((drift) => drift.flagged)
    for (const drift of flaggedDrifts) {
      const pct = Math.round(drift.deltaPercent)
      chips.push({
        label: `₹${drift.fromAmount}→₹${drift.toAmount} DRIFT (+${pct}%)`,
        type: 'drift',
      })
    }
  } else if (verdictType === 'ZOMBIE') {
    chips.push({
      label: days == null ? 'NO USAGE SIGNAL — NEVER SEEN' : `NO USAGE SIGNAL — ${days}D SINCE LAST PING`,
      type: 'usage',
    })
  } else if (verdictType === 'UNKNOWN') {
    chips.push({ label: "NO INBOX SIGNAL — WE DON'T GUESS", type: 'usage' })
  } else {
    chips.push({
      label: days == null ? 'ACTIVE — RECENT USAGE SIGNAL' : `ACTIVE — LAST SEEN ${days}D AGO`,
      type: 'usage',
    })
  }

  return chips
}

function toSubscription(item: EntityAnalysis): Subscription {
  const verdict = toVerdictType(item.score.verdict)
  const sortedTransactions = [...item.entity.transactions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
  const monthlyAmount =
    item.recurrence.cadence === 'monthly'
      ? item.recurrence.latestAmount
      : Math.round(item.recurrence.annualizedSpend / 12)

  return {
    id: item.entity.id,
    merchant: item.entity.name,
    monthlyAmount,
    verdict,
    evidence: buildEvidence(item, verdict),
    charges: sortedTransactions.map((t) => ({ amount: t.amount, timestamp: t.timestamp })),
    lastCharge: sortedTransactions[sortedTransactions.length - 1]?.timestamp ?? item.recurrence.drift[0]?.toTimestamp ?? '',
    daysInactive: item.sensor.daysSinceLastPing ?? undefined,
    logoKey: inferLogoKey(item.entity.name),
    isUnresolved: false,
    recoverableAmount: item.action.recoverableAmount,
    leakScore: {
      staleness: { score: item.score.components.staleness, max: 50 },
      priceDrift: { score: item.score.components.priceDrift, max: 30 },
      shareOfSpend: { score: item.score.components.shareOfRecurringSpend, max: 20 },
    },
    actionSteps: item.action.steps,
    cadence: item.recurrence.cadence,
  }
}

export function toDashboard(result: AnalysisResult): Dashboard {
  // Only genuine fixed-cost subscriptions (monthly/annual cadence) are
  // shown — irregular-cadence merchants are one-off P2M purchases, not
  // subscriptions, and the engine already excludes them from recovery math.
  const subscriptionEntities = result.entities.filter((e) => e.recurrence.cadence !== 'irregular')

  const subscriptions = subscriptionEntities.map(toSubscription)

  const totalLeaking = subscriptionEntities.reduce(
    (sum, e) => (e.score.verdict === 'Active' ? sum : sum + e.recurrence.annualizedSpend),
    0
  )

  return {
    totalLeaking,
    recoverable: result.totalRecoverable,
    subscriptionCount: subscriptions.length,
    zombieCount: subscriptions.filter((s) => s.verdict === 'ZOMBIE').length,
    silentHikes: subscriptions.filter((s) => s.verdict === 'PRICE_HIKE').length,
    ignoredPromos: result.promosIgnored,
    subscriptions,
    networkRequests: 0,
  }
}
