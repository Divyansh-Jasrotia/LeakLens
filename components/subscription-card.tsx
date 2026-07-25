'use client'

import { Subscription } from '@/lib/types'
import { VerdictStamp } from './verdict-stamp'
import { GlossaryPopover } from './glossary-popover'
import { useState, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface SubscriptionCardProps {
  subscription: Subscription
  onClick: () => void
  delay: number
  tourId?: string
}

// Play UI pop sound on card hover
function playPopSound() {
  try {
    const audio = new Audio('/sounds/ui-pop.mp3')
    audio.volume = 0.3
    audio.play().catch(() => {
      // Silently fail if audio playback is not available
    })
  } catch {
    // Silently fail if Audio is not available
  }
}

export function SubscriptionCard({
  subscription,
  onClick,
  delay,
  tourId,
}: SubscriptionCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [hasSoundPlayed, setHasSoundPlayed] = useState(false)
  const cardRef = useRef<HTMLButtonElement>(null)
  const prefersReducedMotion = useReducedMotion()

  const handleMouseEnter = () => {
    setIsHovered(true)
    setHasSoundPlayed(false)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!cardRef.current) return

    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setMousePos({ x, y })

    // Play sound only once on enter
    if (!hasSoundPlayed) {
      playPopSound()
      setHasSoundPlayed(true)
    }
  }

  // Calculate tilt based on mouse position
  const getTransform = () => {
    if (prefersReducedMotion) {
      return 'scale(1.02)'
    }

    if (!isHovered || !cardRef.current) {
      return 'scale(1) rotateX(0deg) rotateY(0deg)'
    }

    const rect = cardRef.current.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const rotateX = ((mousePos.y - centerY) / (rect.height / 2)) * 5
    const rotateY = ((mousePos.x - centerX) / (rect.width / 2)) * -5

    return `perspective(1000px) scale(1.03) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
  }

  return (
    <motion.button
      ref={cardRef}
      data-tour-id={tourId}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      className="w-full text-left group relative"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: prefersReducedMotion ? 0 : delay / 1000, ease: 'easeOut' }}
    >
      <div
        className="border border-ink bg-white p-6 relative flex flex-col min-h-80 transition-all duration-150 ease-out"
        style={{
          transform: getTransform(),
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Perforated top edge */}
        <div className="absolute -top-2 left-0 right-0 flex justify-between px-4">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="h-1 w-1 rounded-full bg-ink/30"
            />
          ))}
        </div>

        <div className="flex items-start justify-between gap-4 pt-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-mono text-sm font-bold uppercase text-ink truncate">
              {subscription.isUnresolved ? 'Unknown subscription' : subscription.merchant}
            </h3>
            <div className="mt-3 font-mono text-2xl font-bold text-ink tabular-nums">
              ₹{subscription.monthlyAmount.toLocaleString('en-IN')}
              <span className="text-xs text-ink/60 ml-1">/month</span>
            </div>
          </div>

          <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <VerdictStamp verdict={subscription.verdict} delay={delay / 1000 + 0.3} />
          </div>
        </div>

        <div className="mt-auto pt-6 flex flex-wrap gap-2">
          {subscription.isUnresolved && (
            <GlossaryPopover
              term="Merchant unresolved"
              explanation="We found the charge but couldn't match it to a known company name."
            >
              <div className="border border-ink/40 bg-paper px-2 py-1 font-mono text-xs uppercase text-ink/70">
                MERCHANT UNRESOLVED
              </div>
            </GlossaryPopover>
          )}
          {subscription.evidence.map((chip, idx) => (
            <div
              key={idx}
              className="border border-ink/40 bg-paper px-2 py-1 font-mono text-xs uppercase text-ink/70"
            >
              {chip.label}
            </div>
          ))}
        </div>
      </div>
    </motion.button>
  )
}
