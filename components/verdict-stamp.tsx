'use client'

import { VerdictType } from '@/lib/types'
import { GlossaryPopover } from './glossary-popover'
import { motion, useReducedMotion } from 'framer-motion'

interface VerdictStampProps {
  verdict: VerdictType
  delay?: number
}

export function VerdictStamp({ verdict, delay = 0 }: VerdictStampProps) {
  const prefersReducedMotion = useReducedMotion()

  const labelMap: Record<VerdictType, string> = {
    ZOMBIE: 'ZOMBIE',
    PRICE_HIKE: 'PRICE HIKE',
    UNKNOWN: 'UNKNOWN',
    ACTIVE: 'ACTIVE',
  }

  const colorMap: Record<VerdictType, string> = {
    ZOMBIE: 'border-loss text-loss',
    PRICE_HIKE: 'border-loss text-loss',
    UNKNOWN: 'border-ink text-ink',
    ACTIVE: 'border-recovery text-recovery',
  }

  const explanationMap: Record<VerdictType, string> = {
    ZOMBIE:
      'You\'re still being charged, but there\'s no sign you\'re using it anymore.',
    PRICE_HIKE:
      'The price quietly went up over time, without you noticing.',
    UNKNOWN:
      'We couldn\'t find any usage evidence either way — so we\'re not guessing.',
    ACTIVE: 'We found active usage recently.',
  }

  return (
    <GlossaryPopover term={labelMap[verdict]} explanation={explanationMap[verdict]}>
      <motion.div
        className={`inline-block border px-2 py-1 font-mono text-xs font-bold uppercase ${colorMap[verdict]}`}
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.6, rotate: 6 }}
        animate={{ opacity: 1, scale: 1, rotate: -2 }}
        transition={{ type: 'spring', stiffness: 260, damping: 16, delay: prefersReducedMotion ? 0 : delay }}
      >
        {labelMap[verdict]}
      </motion.div>
    </GlossaryPopover>
  )
}
