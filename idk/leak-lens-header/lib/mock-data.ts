import { Dashboard, Subscription } from './types'

export const mockDashboard: Dashboard = {
  totalLeaking: 7487,
  recoverable: 5719,
  subscriptionCount: 8,
  zombieCount: 2,
  silentHikes: 1,
  ignoredPromos: 38,
  subscriptions: [
    {
      id: '1',
      merchant: 'Netflix',
      monthlyAmount: 649,
      verdict: 'ACTIVE',
      evidence: [
        { label: '11 CHARGES', type: 'charge' },
        { label: 'ACTIVE USAGE — 89 HOURS LAST 30D', type: 'usage' },
      ],
      charges: [649, 649, 649, 649, 649, 649, 649, 649, 649, 649, 649],
      lastCharge: new Date('2025-07-15'),
      logoKey: 'netflix',
    },
    {
      id: '2',
      merchant: 'Hotstar',
      monthlyAmount: 1299,
      verdict: 'ZOMBIE',
      evidence: [
        { label: '0 CHARGES · 127 DAYS', type: 'charge' },
        { label: 'NO INBOX SIGNAL — WE DON\'T GUESS', type: 'usage' },
      ],
      charges: [1299, 1299, 1299, 0, 0, 0, 0, 0, 0, 0, 0],
      lastCharge: new Date('2025-02-08'),
      daysInactive: 127,
      logoKey: 'hotstar',
    },
    {
      id: '3',
      merchant: 'Spotify Premium',
      monthlyAmount: 199,
      verdict: 'ACTIVE',
      evidence: [
        { label: '11 CHARGES', type: 'charge' },
        { label: 'HEAVY USAGE — 312 TRACKS LAST 30D', type: 'usage' },
      ],
      charges: [199, 199, 199, 199, 199, 199, 199, 199, 199, 199, 199],
      lastCharge: new Date('2025-07-18'),
      logoKey: 'spotify',
    },
    {
      id: '4',
      merchant: 'Dropbox Pro',
      monthlyAmount: 999,
      verdict: 'UNKNOWN',
      evidence: [
        { label: '8 CHARGES · NO RECENT ACTIVITY', type: 'charge' },
      ],
      charges: [999, 999, 999, 999, 999, 999, 999, 999],
      lastCharge: new Date('2025-06-10'),
      logoKey: 'dropbox',
    },
    {
      id: '5',
      merchant: 'JioCinema',
      monthlyAmount: 999,
      verdict: 'PRICE_HIKE',
      evidence: [
        { label: '₹299→₹999 DRIFT', type: 'drift' },
        { label: '8 CHARGES', type: 'charge' },
      ],
      charges: [299, 299, 299, 299, 599, 999, 999, 999],
      lastCharge: new Date('2025-07-12'),
      logoKey: 'jiocinema',
    },
    {
      id: '6',
      merchant: 'YouTube Premium',
      monthlyAmount: 129,
      verdict: 'ACTIVE',
      evidence: [
        { label: '11 CHARGES', type: 'charge' },
        { label: 'MODERATE USAGE — 47 VIDEOS LAST 30D', type: 'usage' },
      ],
      charges: [129, 129, 129, 129, 129, 129, 129, 129, 129, 129, 129],
      lastCharge: new Date('2025-07-20'),
      logoKey: 'youtube',
    },
    {
      id: '7',
      merchant: 'Adobe',
      monthlyAmount: 2915,
      verdict: 'ZOMBIE',
      evidence: [
        { label: '0 CHARGES · 89 DAYS', type: 'charge' },
        { label: 'NO INBOX SIGNAL — CANCELLED?', type: 'usage' },
      ],
      charges: [2915, 2915, 2915, 0, 0, 0, 0, 0, 0, 0, 0],
      lastCharge: new Date('2025-04-20'),
      daysInactive: 89,
      logoKey: 'adobe',
    },
    {
      id: '8',
      merchant: 'SRVP_2025_JUL_TXN_ID_447824',
      monthlyAmount: 299,
      verdict: 'ACTIVE',
      evidence: [
        { label: '3 CHARGES', type: 'charge' },
        { label: 'RECURRING SMS PATTERN', type: 'usage' },
      ],
      charges: [299, 299, 299, 0, 0, 0, 0, 0, 0, 0, 0],
      lastCharge: new Date('2025-07-18'),
      isUnresolved: true,
    },
  ],
  networkRequests: 0,
}

export const mockLeakScore = {
  staleness: { score: 42, max: 50 },
  priceDrift: { score: 0, max: 30 },
  shareOfSpend: { score: 11, max: 20 },
}
