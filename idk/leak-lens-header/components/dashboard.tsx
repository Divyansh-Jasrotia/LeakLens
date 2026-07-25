'use client'

import { useState } from 'react'
import { mockDashboard } from '@/lib/mock-data'
import { Subscription } from '@/lib/types'
import { DashboardHero } from './dashboard-hero'
import { SubscriptionCard } from './subscription-card'
import { DetailDrawer } from './detail-drawer'
import { OnboardingModal } from './onboarding-modal'
import { PrivacyBadge } from './privacy-badge'

export function Dashboard() {
  const [selectedSubscription, setSelectedSubscription] =
    useState<Subscription | null>(null)

  // Sort subscriptions: zombies and price hikes first, then others
  const sortedSubscriptions = [...mockDashboard.subscriptions].sort((a, b) => {
    const verdictOrder = {
      ZOMBIE: 0,
      PRICE_HIKE: 1,
      UNKNOWN: 2,
      ACTIVE: 3,
    }
    return verdictOrder[a.verdict] - verdictOrder[b.verdict]
  })

  return (
    <main className="min-h-screen bg-paper p-6 md:p-12 lg:p-16">
      <OnboardingModal onLoadDemo={() => {}} />
      <PrivacyBadge />

      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-16 border-b border-ink pb-8 flex items-center justify-between gap-8">
          {/* Left: Title and Subtitle */}
          <div className="flex-1">
            <h1 className="font-serif text-5xl font-bold text-ink">
              LeakLens
            </h1>
            <p className="font-mono text-xs uppercase text-ink/60 mt-2">
              Forensic subscription audit
            </p>
          </div>

          {/* Right: Tagline and Actions */}
          <div className="flex flex-col items-end gap-3">
            <p className="font-mono text-xs text-ink/60">
              Reads your SMS inbox. Nothing leaves your browser.
            </p>
            <div className="flex items-center gap-4">
              <button className="font-mono text-xs uppercase text-ink hover:text-ink/70 transition">
                Replay tour
              </button>
              <a href="#" className="font-mono text-xs uppercase text-ink hover:text-ink/70 transition">
                Import your own
              </a>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <DashboardHero
          totalLeaking={mockDashboard.totalLeaking}
          recoverable={mockDashboard.recoverable}
          subscriptionCount={mockDashboard.subscriptionCount}
          zombieCount={mockDashboard.zombieCount}
          silentHikes={mockDashboard.silentHikes}
          ignoredPromos={mockDashboard.ignoredPromos}
        />

        {/* Subscriptions Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 auto-rows-max">
          {sortedSubscriptions.map((sub, idx) => (
            <SubscriptionCard
              key={sub.id}
              subscription={sub}
              onClick={() => setSelectedSubscription(sub)}
              delay={idx * 40}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="mt-16 border-t border-ink pt-8 text-center font-mono text-xs text-ink/60">
          <p>All data stays in your browser. No server sync. Ever.</p>
        </div>
      </div>

      {/* Detail Drawer */}
      <DetailDrawer
        subscription={selectedSubscription}
        onClose={() => setSelectedSubscription(null)}
      />
    </main>
  )
}
