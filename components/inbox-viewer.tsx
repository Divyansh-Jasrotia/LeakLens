'use client'

import { useMemo, useState } from 'react'
import type { InboxEvent } from '@/lib/engine'

interface InboxViewerProps {
  events: InboxEvent[]
  onClose: () => void
}

interface Thread {
  sender: string
  channel: InboxEvent['channel']
  messages: InboxEvent[]
  lastTs: string
}

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
})

const dayHeaderFormatter = new Intl.DateTimeFormat('en-IN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
})

const timeFormatter = new Intl.DateTimeFormat('en-IN', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Asia/Kolkata',
})

function dayKey(ts: string): string {
  // Group by IST calendar day regardless of viewer's local timezone.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(ts))
}

function groupThreads(events: InboxEvent[]): Thread[] {
  const map = new Map<string, InboxEvent[]>()
  for (const e of events) {
    const key = e.sender?.trim() || 'Unknown sender'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(e)
  }

  const threads: Thread[] = [...map.entries()].map(([sender, messages]) => {
    const sorted = [...messages].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
    return {
      sender,
      channel: sorted[sorted.length - 1].channel,
      messages: sorted,
      lastTs: sorted[sorted.length - 1].ts,
    }
  })

  threads.sort((a, b) => new Date(b.lastTs).getTime() - new Date(a.lastTs).getTime())
  return threads
}

function groupByDay(messages: InboxEvent[]): { day: string; items: InboxEvent[] }[] {
  const map = new Map<string, InboxEvent[]>()
  for (const m of messages) {
    const key = dayKey(m.ts)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(m)
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([day, items]) => ({ day, items }))
}

export function InboxViewer({ events, onClose }: InboxViewerProps) {
  const threads = useMemo(() => groupThreads(events), [events])
  const [activeSender, setActiveSender] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const filteredThreads = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return threads
    return threads.filter(
      (t) =>
        t.sender.toLowerCase().includes(q) ||
        t.messages.some((m) => m.body.toLowerCase().includes(q))
    )
  }, [threads, query])

  const activeThread = threads.find((t) => t.sender === activeSender) ?? null
  const dayGroups = activeThread ? groupByDay(activeThread.messages) : []

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-paper">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-ink px-6 py-4 md:px-12">
        <div>
          <h2 className="font-serif text-xl font-bold text-ink">Messages</h2>
          <p className="font-mono text-[10px] uppercase text-ink/60">
            {events.length} messages · {threads.length} senders
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close messages"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-ink font-mono text-sm text-ink hover:bg-ink hover:text-paper transition"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Conversation list */}
        <div
          className={`w-full md:w-80 md:flex-none border-r border-ink flex-col min-h-0 ${
            activeThread ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="border-b border-ink p-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sender or text…"
              className="w-full border border-ink/40 bg-transparent px-3 py-2 font-mono text-xs text-ink placeholder:text-ink/40 focus:outline-none focus:border-ink"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredThreads.length === 0 && (
              <p className="p-6 text-center font-mono text-xs text-ink/40">No matches.</p>
            )}
            {filteredThreads.map((thread) => {
              const last = thread.messages[thread.messages.length - 1]
              return (
                <button
                  key={thread.sender}
                  onClick={() => setActiveSender(thread.sender)}
                  className={`w-full border-b border-ink/20 px-4 py-3 text-left transition hover:bg-ink/5 ${
                    activeSender === thread.sender ? 'bg-ink/5' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold uppercase text-ink truncate">
                      {thread.sender}
                    </span>
                    <span className="font-mono text-[10px] text-ink/40 flex-none">
                      {dateFormatter.format(new Date(thread.lastTs))}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-ink/60 line-clamp-1">
                    {last.body}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-[9px] uppercase text-ink/30">
                      {thread.channel}
                    </span>
                    <span className="font-mono text-[9px] uppercase text-ink/30">
                      · {thread.messages.length} msg{thread.messages.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Thread view */}
        <div className={`flex-1 min-h-0 flex-col ${activeThread ? 'flex' : 'hidden md:flex'}`}>
          {!activeThread && (
            <div className="flex flex-1 items-center justify-center">
              <p className="font-mono text-xs text-ink/40">Select a sender to read messages.</p>
            </div>
          )}

          {activeThread && (
            <>
              <div className="flex items-center gap-3 border-b border-ink px-4 py-3 md:px-6">
                <button
                  onClick={() => setActiveSender(null)}
                  aria-label="Back to conversations"
                  className="font-mono text-xs text-ink/60 hover:text-ink transition md:hidden"
                >
                  ← Back
                </button>
                <div>
                  <p className="font-mono text-xs font-bold uppercase text-ink">
                    {activeThread.sender}
                  </p>
                  <p className="font-mono text-[10px] uppercase text-ink/40">
                    {activeThread.channel} · {activeThread.messages.length} messages
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
                {dayGroups.map((group) => (
                  <div key={group.day}>
                    <div className="sticky top-0 z-10 mb-3 flex justify-center">
                      <span className="border border-ink/30 bg-paper px-2 py-0.5 font-mono text-[9px] uppercase text-ink/50">
                        {dayHeaderFormatter.format(new Date(group.items[0].ts))}
                      </span>
                    </div>
                    <div className="mb-4 flex flex-col gap-2">
                      {group.items.map((msg) => (
                        <div key={msg.id} className="flex flex-col items-start">
                          <div className="max-w-[85%] border border-ink/20 bg-ink/5 px-3 py-2 rounded-sm rounded-tl-none">
                            <p className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-ink">
                              {msg.body}
                            </p>
                          </div>
                          <span className="mt-1 font-mono text-[9px] text-ink/40">
                            {timeFormatter.format(new Date(msg.ts))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
