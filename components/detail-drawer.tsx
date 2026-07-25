'use client'

import { Subscription } from '@/lib/types'
import { VerdictStamp } from './verdict-stamp'
import { GlossaryPopover } from './glossary-popover'
import { useEffect, useState } from 'react'

interface DetailDrawerProps {
  subscription: Subscription | null
  onClose: () => void
}

export function DetailDrawer({ subscription, onClose }: DetailDrawerProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (subscription) {
      setIsVisible(true)
    }
  }, [subscription])

  if (!subscription) return null

  const leakScore = subscription.leakScore
  const recoverable = subscription.recoverableAmount

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-ink/10 transition-opacity ${
          isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-2xl transform border-l border-ink bg-paper transition-transform duration-300 overflow-y-auto ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-8">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-ink/60 hover:text-ink transition"
            aria-label="Close"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-mono text-3xl font-bold uppercase text-ink">
                  {subscription.merchant}
                </h2>
                <div className="mt-3 font-mono text-4xl font-bold text-ink tabular-nums">
                  ₹{subscription.monthlyAmount.toLocaleString('en-IN')}
                  <span className="text-sm text-ink/60 ml-2">/month</span>
                </div>
              </div>
              <VerdictStamp verdict={subscription.verdict} />
            </div>
          </div>

          {/* Price Chart */}
          <div className="mb-8 border border-ink p-4">
            <h3 className="font-mono text-xs font-bold uppercase text-ink mb-4">
              Amount Over Time (6 months)
            </h3>
            <div className="flex items-end gap-1 h-24">
              {subscription.charges.map((charge, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div
                    className={`w-full transition-colors ${
                      idx > 0 &&
                      subscription.charges[idx] > subscription.charges[idx - 1]
                        ? 'bg-loss'
                        : 'bg-ink'
                    }`}
                    style={{
                      height: `${(charge / Math.max(...subscription.charges)) * 100}%`,
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 font-mono text-xs text-ink/60 flex justify-between">
              <span>6 months ago</span>
              <span>Now</span>
            </div>
          </div>

          {/* Evidence */}
          <div className="mb-8 border border-ink p-4">
            <h3 className="font-mono text-xs font-bold uppercase text-ink mb-4">
              Evidence
            </h3>
            <div className="space-y-2">
              {subscription.evidence.map((chip, idx) => (
                <div
                  key={idx}
                  className="border border-ink/40 bg-paper px-3 py-2 font-mono text-xs uppercase text-ink/70"
                >
                  {chip.label}
                </div>
              ))}
            </div>
          </div>

          {/* LeakScore Breakdown */}
          <div className="mb-8 border border-ink p-4">
            <h3 className="font-mono text-xs font-bold uppercase text-ink mb-6">
              LeakScore Breakdown
            </h3>
            <div className="space-y-4">
              <ScoreBar
                label="Staleness"
                score={leakScore.staleness.score}
                max={leakScore.staleness.max}
              />
              <ScoreBar
                label="Price drift"
                score={leakScore.priceDrift.score}
                max={leakScore.priceDrift.max}
              />
              <ScoreBar
                label="Share of spend"
                score={leakScore.shareOfSpend.score}
                max={leakScore.shareOfSpend.max}
              />
            </div>
          </div>

          {/* Action Plan */}
          <div className="mb-8 border border-ink p-4">
            <h3 className="font-mono text-xs font-bold uppercase text-ink mb-4">
              Action Plan
            </h3>
            <ol className="space-y-3 font-mono text-sm text-ink">
              {subscription.actionSteps.map((step, idx) => (
                <li key={idx}>
                  <span className="font-bold">{idx + 1}.</span> {step}
                </li>
              ))}
            </ol>

            <div className="mt-6 bg-recovery/10 border border-recovery p-4">
              <p className="font-mono text-xs uppercase text-recovery font-bold">
                Recover ₹{recoverable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/yr
              </p>
              <p className="font-mono text-xs text-recovery/70 mt-2">
                Annual amount you could save if cancelled
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

interface ScoreBarProps {
  label: string
  score: number
  max: number
}

const LABEL_EXPLANATIONS: Record<string, string> = {
  Staleness: 'How long since we last saw any sign you used this.',
  'Price drift': 'The price quietly went up over time, without you noticing.',
  'Share of spend': 'How much of your total recurring bill this one subscription eats up.',
}

function ScoreBar({ label, score, max }: ScoreBarProps) {
  const percentage = (score / max) * 100
  const explanation = LABEL_EXPLANATIONS[label]

  const labelElement = (
    <span className="uppercase text-ink/70">{label}</span>
  )

  return (
    <div>
      <div className="flex justify-between mb-1 font-mono text-xs">
        {explanation ? (
          <GlossaryPopover term={label} explanation={explanation}>
            {labelElement}
          </GlossaryPopover>
        ) : (
          labelElement
        )}
        <span className="font-bold text-ink">
          {score}/{max}
        </span>
      </div>
      <div className="h-2 border border-ink/30 bg-paper">
        <div
          className="h-full bg-ink transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
