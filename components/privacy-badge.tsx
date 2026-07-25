'use client'

import { useEffect, useState } from 'react'

export function PrivacyBadge() {
  // Server and first client render agree on 0, so no mount guard is needed.
  const [requestCount, setRequestCount] = useState(0)

  useEffect(() => {
    if (typeof PerformanceObserver === 'undefined') return

    // Counts only requests that happen from this point forward — the
    // app's own initial bundle/fonts don't count as "since load."
    const observer = new PerformanceObserver((list) => {
      setRequestCount((count) => count + list.getEntries().length)
    })

    try {
      observer.observe({ entryTypes: ['resource'] })
    } catch {
      // PerformanceObserver not supported in this browser — leave at 0.
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 border border-ink/30 bg-paper/95 px-3 py-2 font-mono text-xs text-ink/70">
      <span>Network requests since load: {requestCount}</span>
      <div className="inline-flex h-2 w-2 items-center justify-center">
        <div
          className={`h-1.5 w-1.5 rounded-full animate-pulse ${
            requestCount === 0 ? 'bg-recovery' : 'bg-loss'
          }`}
        />
      </div>
    </div>
  )
}
