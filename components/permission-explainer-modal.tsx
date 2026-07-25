'use client'

import { useRef } from 'react'

interface PermissionExplainerModalProps {
  onFileSelected: (file: File) => void
  onUseDemoInstead: () => void
}

export function PermissionExplainerModal({
  onFileSelected,
  onUseDemoInstead,
}: PermissionExplainerModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.name.endsWith('.xml')) {
      onFileSelected(file)
    } else {
      alert('Please select a valid .xml file from SMS Backup & Restore')
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/20 p-4">
      <div className="w-full max-w-md border border-ink bg-paper p-8">
        <h2 className="font-serif text-2xl font-bold text-ink">SMS Access</h2>
        <p className="mt-6 text-sm text-ink">
          LeakLens reads your SMS export — analyzing charge patterns, price hikes, and cancellation opportunities.
        </p>
        <p className="mt-4 text-xs text-ink/60">
          We&apos;re a static web app. Nothing leaves your browser.
        </p>

        <div className="mt-6 border border-ink/40 bg-white p-4">
          <p className="font-mono text-xs uppercase text-ink/70 mb-2">How to export:</p>
          <ol className="font-mono text-xs text-ink/60 space-y-1 list-decimal list-inside">
            <li>Install &quot;SMS Backup &amp; Restore&quot; from Google Play</li>
            <li>Go to Backup → Backup to File</li>
            <li>Download the XML file to your device</li>
          </ol>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full border border-ink bg-ink px-4 py-2 font-mono text-xs font-semibold uppercase text-paper transition hover:bg-paper hover:text-ink"
          >
            Choose File
          </button>
          <button
            onClick={onUseDemoInstead}
            className="w-full border border-ink bg-transparent px-4 py-2 font-mono text-xs font-semibold uppercase text-ink transition hover:bg-ink/5"
          >
            Use Demo Inbox Instead
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xml"
          onChange={handleFileChange}
          className="hidden"
        />

        <p className="mt-6 font-mono text-xs text-ink/40 text-center">
          Real parsing coming soon — for now, demo data loaded.
        </p>
      </div>
    </div>
  )
}
