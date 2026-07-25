'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface GlossaryPopoverProps {
  term: string
  explanation: string
  children?: React.ReactNode
}

interface PopoverPosition {
  top: number
  left: number
  side: 'left' | 'right'
}

export function GlossaryPopover({
  term,
  explanation,
  children,
}: GlossaryPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [popoverPos, setPopoverPos] = useState<PopoverPosition | null>(null)
  const containerRef = useRef<HTMLSpanElement>(null)
  const buttonRef = useRef<HTMLDivElement>(null)

  const calculatePosition = () => {
    if (!buttonRef.current) return

    const rect = buttonRef.current.getBoundingClientRect()
    const viewport = window.innerWidth
    const popoverWidth = 200
    const gap = 8

    // Calculate if we need to flip left
    const rightEdge = rect.right + gap + popoverWidth
    const shouldOpenLeft = rightEdge > viewport - 16
    const side: 'left' | 'right' = shouldOpenLeft ? 'left' : 'right'

    // Position relative to trigger button (fixed to viewport)
    const top = rect.top + rect.height / 2 - 32 // Center vertically, adjust for arrow
    const left = shouldOpenLeft
      ? rect.left - gap - popoverWidth
      : rect.right + gap

    setPopoverPos({ top, left, side })
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(!isOpen)
  }

  const handleClickOutside = (e: MouseEvent) => {
    if (
      containerRef.current &&
      !containerRef.current.contains(e.target as Node)
    ) {
      setIsOpen(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      calculatePosition()
      document.addEventListener('click', handleClickOutside)
      window.addEventListener('resize', calculatePosition)
      window.addEventListener('scroll', calculatePosition, true)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
      window.removeEventListener('resize', calculatePosition)
      window.removeEventListener('scroll', calculatePosition, true)
    }
  }, [isOpen])

  return (
    <span ref={containerRef} className="inline-flex items-center gap-1">
      {children}
      <div
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          handleClick(e as any)
        }}
        onMouseDown={(e) => {
          e.stopPropagation()
          e.preventDefault()
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            e.stopPropagation()
            setIsOpen(!isOpen)
          }
        }}
        className="inline-flex items-center justify-center w-4 h-4 border border-ink text-ink rounded-full flex-shrink-0 hover:bg-ink/5 transition cursor-pointer"
        title={term}
        aria-label={`More information about ${term}`}
        style={{ pointerEvents: 'auto' }}
      >
        <span className="text-xs font-bold">i</span>
      </div>

      {isOpen && popoverPos && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed z-50 bg-paper border border-ink p-2 font-mono text-xs text-ink rounded-none w-48"
              style={{
                top: `${popoverPos.top}px`,
                left: `${popoverPos.left}px`,
                pointerEvents: 'none',
              }}
            >
              {/* Arrow pointer */}
              <div
                className={`absolute w-0 h-0 border-4 border-transparent ${
                  popoverPos.side === 'right'
                    ? 'right-full border-r-ink'
                    : 'left-full border-l-ink'
                }`}
                style={{
                  top: '8px',
                }}
              />

              <div className="leading-snug text-ink break-words">{explanation}</div>
            </div>,
            document.body
          )
        : null}
    </span>
  )
}
