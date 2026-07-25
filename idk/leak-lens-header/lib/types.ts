export type VerdictType = 'ZOMBIE' | 'PRICE_HIKE' | 'UNKNOWN' | 'ACTIVE'

export interface EvidenceChip {
  label: string
  type?: 'charge' | 'usage' | 'drift'
}

export interface Subscription {
  id: string
  merchant: string
  monthlyAmount: number
  verdict: VerdictType
  evidence: EvidenceChip[]
  charges: number[]
  lastCharge: Date
  daysInactive?: number
  logoKey?: string // Known merchant identifier for logo rendering
  isUnresolved?: boolean // True if merchant couldn't be resolved from SMS
}

export interface LeakScoreBreakdown {
  staleness: { score: number; max: number }
  priceDrift: { score: number; max: number }
  shareOfSpend: { score: number; max: number }
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
