'use client'

import { useMemo, useState } from 'react'
import { Dashboard } from './dashboard'
import { DataSourceModal } from './data-source-modal'
import { analyzeInbox, type InboxEvent } from '@/lib/engine'
import { toDashboard } from '@/lib/ui-adapter'

export function AppShell() {
  // No dataset is loaded until the person picks one — the picker shows
  // on every fresh load since this state resets on every page refresh.
  const [events, setEvents] = useState<InboxEvent[] | null>(null)
  const [sourceLabel, setSourceLabel] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(true)
  const [loadId, setLoadId] = useState(0)

  const data = useMemo(() => {
    if (!events) return null
    return toDashboard(analyzeInbox(events))
  }, [events])

  function handleSelect(selectedEvents: InboxEvent[], label: string) {
    setEvents(selectedEvents)
    setSourceLabel(label)
    setModalOpen(false)
    setLoadId((n) => n + 1)
  }

  return (
    <>
      {modalOpen && (
        <DataSourceModal
          onSelect={handleSelect}
          onDismiss={data ? () => setModalOpen(false) : undefined}
        />
      )}

      {data ? (
        <Dashboard
          key={loadId}
          data={data}
          events={events ?? []}
          sourceLabel={sourceLabel}
          onChangeSource={() => setModalOpen(true)}
          autoShowTour
        />
      ) : (
        <main className="min-h-screen bg-paper flex items-center justify-center p-6">
          <div className="text-center opacity-30">
            <h1 className="font-serif text-5xl font-bold text-ink">LeakLens</h1>
            <p className="font-mono text-xs uppercase text-ink/60 mt-2">
              Forensic subscription audit
            </p>
          </div>
        </main>
      )}
    </>
  )
}
