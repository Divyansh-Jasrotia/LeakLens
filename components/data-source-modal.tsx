'use client'

import { useRef, useState } from 'react'
import type { InboxEvent } from '@/lib/engine'
import { DEMO_PROFILES, type DemoProfile } from '@/lib/demo-profiles'
import { parseInboxFile } from '@/lib/validate-inbox'
import { playClickSound } from '@/lib/utils'
import { JargonTooltip } from './jargon-tooltip'

interface DataSourceModalProps {
  onSelect: (events: InboxEvent[], label: string) => void
  // When set, the modal can be dismissed without picking anything (used
  // when the user reopens it mid-session to switch datasets).
  onDismiss?: () => void
}

type Step = 'root' | 'demo' | 'upload'

const SAMPLE_FORMAT = `[
  {
    "id": "evt_001",
    "ts": "2026-01-04T10:26:55+05:30",
    "channel": "sms",
    "sender": "SBIBNK",
    "body": "Rs 149.00 debited from A/c XX9042 for YOUTUBE PREMIUM..."
  }
]`

export function DataSourceModal({ onSelect, onDismiss }: DataSourceModalProps) {
  const [step, setStep] = useState<Step>('root')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isReading, setIsReading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handlePickDemo(profile: DemoProfile) {
    playClickSound()
    onSelect(profile.events, profile.name)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setUploadError(null)
    setIsReading(true)

    const reader = new FileReader()
    reader.onload = () => {
      setIsReading(false)
      const text = typeof reader.result === 'string' ? reader.result : ''
      const result = parseInboxFile(text)
      if (!result.valid) {
        setUploadError(result.error)
        return
      }
      playClickSound()
      onSelect(result.events, 'Your upload')
    }
    reader.onerror = () => {
      setIsReading(false)
      setUploadError('Could not read that file. Please try again.')
    }
    reader.readAsText(file)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 p-4">
      <div className="w-full max-w-md border border-ink bg-paper p-8 max-h-[90vh] overflow-y-auto">
        {step === 'root' && (
          <RootStep
            onDismiss={onDismiss}
            onChooseDemo={() => setStep('demo')}
            onChooseUpload={() => setStep('upload')}
          />
        )}

        {step === 'demo' && (
          <DemoStep onBack={() => setStep('root')} onPick={handlePickDemo} />
        )}

        {step === 'upload' && (
          <UploadStep
            onBack={() => {
              setStep('root')
              setUploadError(null)
              setFileName(null)
            }}
            onFileChange={handleFileChange}
            fileInputRef={fileInputRef}
            uploadError={uploadError}
            fileName={fileName}
            isReading={isReading}
          />
        )}
      </div>
    </div>
  )
}

function RootStep({
  onDismiss,
  onChooseDemo,
  onChooseUpload,
}: {
  onDismiss?: () => void
  onChooseDemo: () => void
  onChooseUpload: () => void
}) {
  return (
    <>
      <div className="flex items-start justify-between">
        <h2 className="font-serif text-2xl font-bold text-ink">LeakLens</h2>
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Close"
            className="font-mono text-xs text-ink/60 hover:text-ink transition"
          >
            ✕
          </button>
        )}
      </div>
      <p className="mt-6 text-sm text-ink">
        LeakLens reads the evidence. Nothing leaves your browser.
      </p>
      <p className="mt-4 text-xs text-ink/60">
        Choose where your inbox comes from to get started.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        <button
          onClick={onChooseDemo}
          className="w-full border border-ink bg-ink px-4 py-2 font-mono text-xs font-semibold uppercase text-paper transition hover:bg-paper hover:text-ink"
        >
          Use Demo Data
        </button>

        <button
          onClick={onChooseUpload}
          className="w-full border border-ink bg-transparent px-4 py-2 font-mono text-xs font-semibold uppercase text-ink transition hover:bg-ink hover:text-paper"
        >
          Upload Your Data
        </button>

        <JargonTooltip
          term="Connect SMS"
          explanation="Coming soon — a web app can't read your phone's SMS inbox directly. Use Upload Your Data for now."
        >
          <button
            disabled
            className="w-full border border-ink/40 bg-transparent px-4 py-2 font-mono text-xs font-semibold uppercase text-ink/40 cursor-not-allowed"
          >
            Connect SMS (Coming Soon)
          </button>
        </JargonTooltip>
      </div>
    </>
  )
}

function DemoStep({
  onBack,
  onPick,
}: {
  onBack: () => void
  onPick: (profile: DemoProfile) => void
}) {
  return (
    <>
      <button
        onClick={onBack}
        className="font-mono text-xs text-ink/60 hover:text-ink transition"
      >
        ← Back
      </button>
      <h2 className="mt-4 font-serif text-2xl font-bold text-ink">
        Pick a sample inbox
      </h2>
      <p className="mt-3 text-xs text-ink/60">
        Three real-shaped inboxes, three different spending patterns.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {DEMO_PROFILES.map((profile) => (
          <button
            key={profile.id}
            onClick={() => onPick(profile)}
            className="w-full border border-ink bg-transparent px-4 py-3 text-left transition hover:bg-ink hover:text-paper group"
          >
            <div className="flex items-center justify-between">
              <span className="font-serif text-lg font-bold text-ink group-hover:text-paper">
                {profile.name}
              </span>
              <span className="font-mono text-[10px] uppercase text-ink/60 group-hover:text-paper/70">
                {profile.bank}
              </span>
            </div>
            <p className="mt-1 font-mono text-xs text-ink/60 group-hover:text-paper/70">
              {profile.tagline}
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase text-ink/40 group-hover:text-paper/50">
              {profile.events.length} messages
            </p>
          </button>
        ))}
      </div>
    </>
  )
}

function UploadStep({
  onBack,
  onFileChange,
  fileInputRef,
  uploadError,
  fileName,
  isReading,
}: {
  onBack: () => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  uploadError: string | null
  fileName: string | null
  isReading: boolean
}) {
  return (
    <>
      <button
        onClick={onBack}
        className="font-mono text-xs text-ink/60 hover:text-ink transition"
      >
        ← Back
      </button>
      <h2 className="mt-4 font-serif text-2xl font-bold text-ink">
        Upload your inbox
      </h2>
      <p className="mt-3 text-xs text-ink/60">
        A JSON file — an array of message objects, each shaped like:
      </p>

      <pre className="mt-3 overflow-x-auto border border-ink/40 bg-ink/5 p-3 font-mono text-[10px] leading-relaxed text-ink whitespace-pre">
        {SAMPLE_FORMAT}
      </pre>

      <ul className="mt-3 space-y-1 font-mono text-[10px] text-ink/60">
        <li>· id — unique string</li>
        <li>· ts — ISO 8601 timestamp</li>
        <li>· channel — &quot;sms&quot; or &quot;email&quot;</li>
        <li>· sender — optional</li>
        <li>· body — the message text</li>
      </ul>

      <div className="mt-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={onFileChange}
          className="hidden"
          id="inbox-upload-input"
        />
        <label
          htmlFor="inbox-upload-input"
          className="block w-full cursor-pointer border border-ink bg-transparent px-4 py-2 text-center font-mono text-xs font-semibold uppercase text-ink transition hover:bg-ink hover:text-paper"
        >
          {isReading ? 'Reading…' : 'Choose JSON File'}
        </label>

        {fileName && !uploadError && !isReading && (
          <p className="mt-2 font-mono text-[10px] text-ink/60">{fileName} selected.</p>
        )}

        {uploadError && (
          <div className="mt-3 border border-loss/60 bg-loss/5 p-3 font-mono text-[10px] leading-relaxed text-loss">
            {uploadError}
          </div>
        )}
      </div>

      <p className="mt-6 text-[10px] font-mono text-ink/40">
        Your file is parsed entirely in this browser tab. It is never uploaded to a server.
      </p>
    </>
  )
}
