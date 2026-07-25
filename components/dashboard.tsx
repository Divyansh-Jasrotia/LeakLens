'use client'

import { useEffect, useRef, useState } from 'react'
import { Dashboard as DashboardData, Subscription } from '@/lib/types'
import type { InboxEvent } from '@/lib/engine'
import { DashboardHero } from './dashboard-hero'
import { SubscriptionCard } from './subscription-card'
import { DetailDrawer } from './detail-drawer'
import { PrivacyBadge } from './privacy-badge'
import { GuidedTour, type TourStep } from './guided-tour'
import { InboxViewer } from './inbox-viewer'

interface DashboardProps {
  data: DashboardData
  // Raw source messages, shown in the "View Messages" viewer.
  events: InboxEvent[]
  // Label of the currently loaded source, e.g. "Karan" or "Your upload".
  sourceLabel?: string | null
  // Reopens the data-source picker so the user can switch datasets.
  onChangeSource?: () => void
  // Auto-opens the guided tour once, the first time this dataset loads.
  autoShowTour?: boolean
}

export function Dashboard({ data, events, sourceLabel, onChangeSource, autoShowTour }: DashboardProps) {
  const [selectedSubscription, setSelectedSubscription] =
    useState<Subscription | null>(null)
  const [showTour, setShowTour] = useState(false)
  const [showInbox, setShowInbox] = useState(false)
  const hasAutoShown = useRef(false)

  // Sort subscriptions: zombies and price hikes first, then others
  const sortedSubscriptions = [...data.subscriptions].sort((a, b) => {
    const verdictOrder = {
      ZOMBIE: 0,
      PRICE_HIKE: 1,
      UNKNOWN: 2,
      ACTIVE: 3,
    }
    return verdictOrder[a.verdict] - verdictOrder[b.verdict]
  })

  // Worst zombie: the one that's gone longest without any usage signal.
  const worstZombie = sortedSubscriptions
    .filter((s) => s.verdict === 'ZOMBIE')
    .sort((a, b) => (b.daysInactive ?? 0) - (a.daysInactive ?? 0))[0]
  const unknownCard = sortedSubscriptions.find((s) => s.verdict === 'UNKNOWN')

  const tourSteps: TourStep[] = [
    {
      targetSelector: '[data-tour-id="hero-number"]',
      title: 'Your annual subscription leak',
    },
    ...(worstZombie
      ? [
          {
            targetSelector: `[data-tour-id="sub-${worstZombie.id}"]`,
            title: `Paying monthly, unused for ${Math.round((worstZombie.daysInactive ?? 0) / 30)} months`,
          },
        ]
      : []),
    ...(unknownCard
      ? [
          {
            targetSelector: `[data-tour-id="sub-${unknownCard.id}"]`,
            title: "When the inbox can't know, we say so",
          },
        ]
      : []),
  ]

  useEffect(() => {
    if (autoShowTour && !hasAutoShown.current) {
      hasAutoShown.current = true
      setShowTour(true)
    }
  }, [autoShowTour])

  return (
    <main className="min-h-screen bg-paper p-6 md:p-12 lg:p-16">
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
              {sourceLabel && (
                <span className="font-mono text-xs uppercase text-ink/40">
                  Source: {sourceLabel}
                </span>
              )}
              <button
                onClick={() => setShowTour(true)}
                disabled={tourSteps.length === 0}
                aria-label="Replay guided tour"
                title="Replay tour"
                className="flex h-5 w-5 items-center justify-center rounded-full border border-ink font-mono text-xs font-bold text-ink hover:bg-ink hover:text-paper transition disabled:opacity-30 disabled:pointer-events-none"
              >
                ?
              </button>
              <button
                onClick={() => setShowInbox(true)}
                className="font-mono text-xs uppercase text-ink hover:text-ink/70 transition"
              >
                View messages
              </button>
              {onChangeSource && (
                <button
                  onClick={onChangeSource}
                  className="font-mono text-xs uppercase text-ink hover:text-ink/70 transition"
                >
                  Change data
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div data-tour-id="hero-number">
          <DashboardHero
            totalLeaking={data.totalLeaking}
            recoverable={data.recoverable}
            subscriptionCount={data.subscriptionCount}
            zombieCount={data.zombieCount}
            silentHikes={data.silentHikes}
            ignoredPromos={data.ignoredPromos}
          />
        </div>

        {/* Subscriptions Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 auto-rows-max">
          {sortedSubscriptions.map((sub, idx) => (
            <SubscriptionCard
              key={sub.id}
              subscription={sub}
              onClick={() => setSelectedSubscription(sub)}
              delay={idx * 40}
              tourId={`sub-${sub.id}`}
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

      {/* Guided Tour */}
      {showTour && <GuidedTour steps={tourSteps} onClose={() => setShowTour(false)} />}

      {/* Raw message viewer */}
      {showInbox && <InboxViewer events={events} onClose={() => setShowInbox(false)} />}
    </main>
  )
}
