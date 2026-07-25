'use client'

import { useEffect, useState } from 'react'
import { PermissionExplainerModal } from './permission-explainer-modal'

interface OnboardingModalProps {
  onLoadDemo: () => void
}

export function OnboardingModal({ onLoadDemo }: OnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showPermissionExplainer, setShowPermissionExplainer] = useState(false)

  useEffect(() => {
    // Check if user has dismissed onboarding
    const dismissed = localStorage.getItem('leaklens-onboarding-dismissed')
    if (!dismissed) {
      setIsOpen(true)
    }
  }, [])

  if (!isOpen) return null

  if (showPermissionExplainer) {
    return (
      <PermissionExplainerModal
        onFileSelected={() => {
          // File selected callback — real parsing happens here later
          setShowPermissionExplainer(false)
          setIsOpen(false)
          localStorage.setItem('leaklens-onboarding-dismissed', 'true')
        }}
        onUseDemoInstead={() => {
          onLoadDemo()
          setShowPermissionExplainer(false)
          setIsOpen(false)
          localStorage.setItem('leaklens-onboarding-dismissed', 'true')
        }}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 p-4">
      <div className="w-full max-w-md border border-ink bg-paper p-8">
        <h2 className="font-serif text-2xl font-bold text-ink">LeakLens</h2>
        <p className="mt-6 text-sm text-ink">
          LeakLens reads the evidence. Nothing leaves your browser.
        </p>
        <p className="mt-4 text-xs text-ink/60">
          6-month sample inbox included — built for you to explore.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={() => {
              onLoadDemo()
              setIsOpen(false)
              localStorage.setItem('leaklens-onboarding-dismissed', 'true')
            }}
            className="w-full border border-ink bg-ink px-4 py-2 font-mono text-xs font-semibold uppercase text-paper transition hover:bg-paper hover:text-ink"
          >
            Load Demo Inbox
          </button>
          <button
            onClick={() => setShowPermissionExplainer(true)}
            className="w-full border border-ink bg-transparent px-4 py-2 font-mono text-xs font-semibold uppercase text-ink transition hover:bg-ink/5"
          >
            Import Your Own (SMS Backup)
          </button>
        </div>
      </div>
    </div>
  )
}
