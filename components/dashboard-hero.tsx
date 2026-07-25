'use client'

import { useEffect, useState } from 'react'
import { animate, useReducedMotion } from 'framer-motion'
import { GlossaryPopover } from './glossary-popover'

interface DashboardHeroProps {
  totalLeaking: number
  recoverable: number
  subscriptionCount: number
  zombieCount: number
  silentHikes: number
  ignoredPromos: number
}

export function DashboardHero({
  totalLeaking,
  recoverable,
  subscriptionCount,
  zombieCount,
  silentHikes,
  ignoredPromos,
}: DashboardHeroProps) {
  // null until the count-up animation produces its first frame, so the
  // rendered value can be derived rather than seeded from an effect.
  const [animatedAmount, setAnimatedAmount] = useState<number | null>(null)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (prefersReducedMotion) return

    const controls = animate(0, totalLeaking, {
      duration: 1.5,
      ease: 'easeOut',
      onUpdate: (value) => setAnimatedAmount(Math.floor(value)),
    })

    return () => controls.stop()
  }, [totalLeaking, prefersReducedMotion])

  const displayedAmount = prefersReducedMotion
    ? totalLeaking
    : (animatedAmount ?? 0)

  return (
    <div className="mb-12 text-center">
      {/* Main leak amount */}
      <div className="mb-6">
        <div className="font-mono text-7xl font-bold text-loss tabular-nums">
          ₹{displayedAmount.toLocaleString('en-IN')}
        </div>
        <div className="font-mono text-xs uppercase text-ink/60 mt-1">
          /yr leaking
        </div>
      </div>

      {/* Recovery message */}
      <p className="font-mono text-sm font-semibold text-recovery mb-8">
        ₹{recoverable.toLocaleString('en-IN')} recoverable if you act today
      </p>

      {/* Stats row */}
      <div className="flex flex-wrap justify-center gap-6 text-center font-mono text-sm text-ink/70">
        <div>
          <div className="font-bold text-ink">{subscriptionCount}</div>
          <div className="text-xs uppercase">Subscriptions</div>
        </div>
        <div className="w-px bg-ink/20" />
        <div>
          <div className="font-bold text-ink">{zombieCount}</div>
          <GlossaryPopover
            term="Zombies"
            explanation="Subscriptions you're still being charged for, but there's no sign you're using them anymore."
          >
            <div className="text-xs uppercase">Zombies</div>
          </GlossaryPopover>
        </div>
        <div className="w-px bg-ink/20" />
        <div>
          <div className="font-bold text-ink">{silentHikes}</div>
          <GlossaryPopover
            term="Silent Hikes"
            explanation="Subscriptions where the price quietly went up over time, without you noticing."
          >
            <div className="text-xs uppercase">Silent Hikes</div>
          </GlossaryPopover>
        </div>
        <div className="w-px bg-ink/20" />
        <div>
          <div className="font-bold text-ink">{ignoredPromos}</div>
          <div className="text-xs uppercase">Promos Ignored</div>
        </div>
      </div>
    </div>
  )
}
