export type VerdictType = 'ZOMBIE' | 'PRICE_HIKE' | 'UNKNOWN' | 'ACTIVE'

export interface EvidenceChip {
  label: string
  type?: 'charge' | 'usage' | 'drift'
}

export interface LeakScoreBreakdown {
  staleness: { score: number; max: number }
  priceDrift: { score: number; max: number }
  shareOfSpend: { score: number; max: number }
}

export interface Subscription {
  id: string
  merchant: string
  /**
   * The amount actually charged most recently — never a derived figure.
   * Pair it with `cadence` to label the period. Dividing an annual charge
   * into a fake monthly rate produced nonsense like "₹7/month" for a
   * one-off ₹89 charge.
   */
  billedAmount: number
  verdict: VerdictType
  evidence: EvidenceChip[]
  charges: { amount: number; timestamp: string }[]
  lastCharge: string // ISO date
  daysInactive?: number
  logoKey?: string // Known merchant identifier for logo rendering
  isUnresolved?: boolean // True if merchant couldn't be resolved from SMS
  // Real engine output, used by DetailDrawer instead of any mock figures.
  recoverableAmount: number
  leakScore: LeakScoreBreakdown
  actionSteps: string[]
  cadence: 'monthly' | 'annual' | 'irregular'
}

export interface Dashboard {
  totalLeaking: number
  recoverable: number
  subscriptionCount: number
  zombieCount: number
  silentHikes: number
  ignoredPromos: number
  subscriptions: Subscription[]
  networkRequests: number
}
