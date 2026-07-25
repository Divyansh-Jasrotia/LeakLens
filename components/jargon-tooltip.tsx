'use client'

import { useState, useRef, useEffect } from 'react'

interface JargonTooltipProps {
  term: string
  explanation: string
  children: React.ReactNode
}

export function JargonTooltip({
  term,
  explanation,
  children,
}: JargonTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<{
    top: number
    left: number
    side: 'top' | 'bottom'
  } | null>(null)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const handleMouseEnter = () => {
    if (window.innerWidth >= 768) {
      setIsOpen(true)
    }
  }

  const handleMouseLeave = () => {
    setIsOpen(false)
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.innerWidth < 768) {
      setIsOpen(!isOpen)
    }
  }

  const handleClickOutside = (e: MouseEvent) => {
    if (
      tooltipRef.current &&
      !tooltipRef.current.contains(e.target as Node) &&
      triggerRef.current &&
      !triggerRef.current.contains(e.target as Node)
    ) {
      setIsOpen(false)
    }
  }

  const updatePosition = () => {
    if (!triggerRef.current || !isOpen) return

    const rect = triggerRef.current.getBoundingClientRect()
    const viewport = window.innerHeight

    // Calculate space above and below
    const spaceAbove = rect.top
    const spaceBelow = viewport - rect.bottom
    const preferredSpacing = 8
    const tooltipHeight = 60 // Estimated tooltip height

    // Determine if tooltip should appear above or below
    const shouldBeAbove = spaceAbove > spaceBelow && spaceAbove > tooltipHeight + preferredSpacing
    const side: 'top' | 'bottom' = shouldBeAbove ? 'top' : 'bottom'

    const top =
      side === 'top'
        ? rect.top - tooltipHeight - preferredSpacing
        : rect.bottom + preferredSpacing

    const left = rect.left + rect.width / 2

    setPosition({
      top,
      left,
      side,
    })
  }

  useEffect(() => {
    if (isOpen) {
      updatePosition()
      if (window.innerWidth < 768) {
        document.addEventListener('click', handleClickOutside)
      }
    }
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [isOpen])

  // Re-update position on window resize/scroll
  useEffect(() => {
    if (!isOpen) return

    const handleScroll = () => updatePosition()
    const handleResize = () => updatePosition()

    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
    }
  }, [isOpen])

  return (
    <span
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className="inline-block border-b border-dotted border-ink/60 cursor-help hover:border-ink transition-colors"
    >
      {children}

      {isOpen && position && (
        <div
          ref={tooltipRef}
          className="fixed z-50 max-w-[220px] bg-paper border border-ink p-2 font-mono text-xs text-ink rounded-none pointer-events-none"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="leading-snug text-ink">{explanation}</div>
        </div>
      )}
    </span>
  )
}
