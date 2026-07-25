'use client'

import { Subscription } from '@/lib/types'
import { VerdictStamp } from './verdict-stamp'
import { GlossaryPopover } from './glossary-popover'
import { cadenceSuffix } from '@/lib/utils'
import { useEffect, useState } from 'react'

interface DetailDrawerProps {
  subscription: Subscription | null
  onClose: () => void
}

// The bar chart is sized in explicit pixels rather than percentages. A
// percentage height only resolves against a parent with a *definite* height,
// and the bars' old parent was a `flex-1` box whose height came from flex
// layout — so the bars could collapse depending on how the browser resolved
// it. Deriving every height from these constants keeps the chart identical
// in dev and in the static production build.
const CHART_HEIGHT_PX = 128 // plot area
const LABEL_HEIGHT_PX = 16 // the ₹ amount above each bar
const TRACK_HEIGHT_PX = CHART_HEIGHT_PX - LABEL_HEIGHT_PX
// With no price movement there is no meaningful scale, so bars render at a
// constant fraction of the track rather than all pinned to the top.
const FLAT_BAR_RATIO = 0.68
// Keep a very small charge visible next to a much larger one.
const MIN_BAR_PX = 2

export function DetailDrawer({ subscription, onClose }: DetailDrawerProps) {
  const [isVisible, setIsVisible] = useState(false)

  // Flip to the visible state on the frame *after* the drawer mounts, so the
  // browser has an off-screen starting position to transition from.
  useEffect(() => {
    if (!subscription) return

    const frame = requestAnimationFrame(() => setIsVisible(true))
    return () => {
      cancelAnimationFrame(frame)
      setIsVisible(false)
    }
  }, [subscription])

  if (!subscription) return null

  const leakScore = subscription.leakScore
  const recoverable = subscription.recoverableAmount
  const referenceDate = new Date(subscription.lastCharge)
  const chartEnd = Number.isNaN(referenceDate.getTime()) ? new Date() : referenceDate
  const monthKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}`
  const sortedCharges = [...subscription.charges].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
  const chartSlots = Array.from({ length: 6 }, (_, index) => {
    const month = new Date(chartEnd.getFullYear(), chartEnd.getMonth() - 5 + index, 1)
    const charge = sortedCharges
      .filter((item) => monthKey(new Date(item.timestamp)) === monthKey(month))
      .slice(-1)[0]

    return { month, charge }
  })
  const chargeAmounts = subscription.charges.map((charge) => charge.amount)
  const maxCharge = Math.max(...chargeAmounts, 0)
  const flatCharges = chargeAmounts.length <= 1 || new Set(chargeAmounts).size === 1

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
                  ₹{subscription.billedAmount.toLocaleString('en-IN')}
                  <span className="text-sm text-ink/60 ml-2">
                    {cadenceSuffix(subscription.cadence)}
                  </span>
                </div>
                {subscription.charges.length === 1 && (
                  <p className="mt-1 font-mono text-[10px] uppercase text-ink/50">
                    Only one charge seen — renewal period assumed
                  </p>
                )}
              </div>
              <VerdictStamp verdict={subscription.verdict} />
            </div>
          </div>

          {/* Price Chart */}
          <div className="mb-8 border border-ink p-4">
            <h3 className="font-mono text-xs font-bold uppercase text-ink mb-4">
              Amount Over Time (6 months)
            </h3>
            <div
              className="relative border-b border-ink/30"
              style={{ height: CHART_HEIGHT_PX }}
            >
              <div className="flex h-full items-end gap-2">
                {chartSlots.map(({ month, charge }, idx) => {
                  const previousCharge = [...chartSlots.slice(0, idx)]
                    .reverse()
                    .find((slot) => slot.charge)?.charge
                  const priceIncreased = Boolean(
                    charge && previousCharge && charge.amount > previousCharge.amount
                  )
                  const priceDecreased = Boolean(
                    charge && previousCharge && charge.amount < previousCharge.amount
                  )
                  const barHeightPx =
                    charge && maxCharge > 0
                      ? Math.max(
                          MIN_BAR_PX,
                          Math.round(
                            (flatCharges ? FLAT_BAR_RATIO : charge.amount / maxCharge) *
                              TRACK_HEIGHT_PX
                          )
                        )
                      : 0

                  return (
                    <div
                      key={monthKey(month)}
                      className="flex-1 min-w-0 flex flex-col justify-end items-center"
                    >
                      {charge && (
                        <>
                          <span
                            className="flex items-center justify-center text-center font-mono text-[10px] leading-none text-ink/60 tabular-nums"
                            style={{ height: LABEL_HEIGHT_PX }}
                          >
                            ₹{charge.amount.toLocaleString('en-IN')}
                          </span>
                          <div
                            className="w-full flex items-end"
                            style={{ height: TRACK_HEIGHT_PX }}
                          >
                            <div
                              className={`w-full transition-colors ${
                                priceIncreased
                                  ? 'bg-loss'
                                  : priceDecreased
                                    ? 'bg-recovery'
                                    : 'bg-ink/40'
                              }`}
                              style={{ height: barHeightPx }}
                              title={`₹${charge.amount.toLocaleString('en-IN')}`}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
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
