'use client'

import { useEffect, useState } from 'react'

export function PrivacyBadge() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 border border-ink/30 bg-paper/95 px-3 py-2 font-mono text-xs text-ink/70">
      <span>Network requests since load: 0</span>
      <div className="inline-flex h-2 w-2 items-center justify-center">
        <div className="h-1.5 w-1.5 rounded-full bg-recovery animate-pulse" />
      </div>
    </div>
  )
}
