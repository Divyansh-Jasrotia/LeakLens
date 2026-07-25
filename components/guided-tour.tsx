'use client'

import { useEffect, useState } from 'react'

export interface TourStep {
  targetSelector: string
  title: string
}

interface GuidedTourProps {
  steps: TourStep[]
  onClose: () => void
}

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

const PADDING = 6

export function GuidedTour({ steps, onClose }: GuidedTourProps) {
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)

  const step = steps[index]
  const isLast = index === steps.length - 1

  useEffect(() => {
    if (!step) return

    function measure() {
      const el = document.querySelector(step.targetSelector)
      if (!el) {
        setRect(null)
        return
      }
      const box = el.getBoundingClientRect()
      setRect({ top: box.top, left: box.left, width: box.width, height: box.height })
    }

    const el = document.querySelector(step.targetSelector)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })

    measure()
    const raf = requestAnimationFrame(measure) // re-measure after scrollIntoView settles
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [step])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!step) return null

  function next() {
    if (isLast) {
      onClose()
    } else {
      setIndex((i) => i + 1)
    }
  }

  const highlightStyle: React.CSSProperties = rect
    ? {
        top: rect.top - PADDING,
        left: rect.left - PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
        boxShadow: '0 0 0 9999px rgba(26, 23, 20, 0.65)',
      }
    : {
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        boxShadow: '0 0 0 9999px rgba(26, 23, 20, 0.65)',
      }

  // Position the tooltip below the highlighted target, flipping above it
  // (and clamping horizontally) when there isn't room.
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200
  const tooltipWidth = 280
  const spaceBelow = rect ? viewportHeight - (rect.top + rect.height) : 0
  const placeAbove = rect ? spaceBelow < 140 && rect.top > 140 : false

  const tooltipTop = rect
    ? placeAbove
      ? Math.max(16, rect.top - PADDING - 12 - 120)
      : rect.top + rect.height + PADDING + 12
    : viewportHeight / 2

  const tooltipLeft = rect
    ? Math.min(Math.max(16, rect.left), viewportWidth - tooltipWidth - 16)
    : viewportWidth / 2 - tooltipWidth / 2

  return (
    <div className="fixed inset-0 z-[70]">
      <div
        className="fixed rounded-none transition-all duration-300"
        style={highlightStyle}
      />

      <div
        className="fixed border border-ink bg-paper p-4 font-mono text-sm text-ink shadow-lg"
        style={{ top: tooltipTop, left: tooltipLeft, width: tooltipWidth }}
      >
        <p className="text-xs uppercase text-ink/50 mb-2">
          Step {index + 1} of {steps.length}
        </p>
        <p className="font-semibold leading-snug mb-4">{step.title}</p>
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="font-mono text-xs uppercase text-ink/60 hover:text-ink transition"
          >
            Skip (Esc)
          </button>
          <button
            onClick={next}
            className="border border-ink bg-ink px-3 py-1.5 font-mono text-xs font-semibold uppercase text-paper transition hover:bg-paper hover:text-ink"
          >
            {isLast ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
