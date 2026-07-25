'use client'

interface TopHeaderProps {
  onReplayTour?: () => void
  onImportOwn?: () => void
}

export function TopHeader({ onReplayTour, onImportOwn }: TopHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-paper border-b border-ink flex items-center justify-between px-6 md:px-12 lg:px-16 z-40">
      {/* Left: Branding */}
      <div className="flex flex-col gap-0">
        <div className="font-mono text-xs font-bold uppercase text-ink">
          LEAKLENS
        </div>
        <div className="font-mono text-xs text-ink/60">
          Reads your SMS inbox. Nothing leaves your browser.
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        {onReplayTour && (
          <button
            onClick={onReplayTour}
            className="font-mono text-xs uppercase text-ink hover:text-ink/70 transition"
          >
            Replay tour
          </button>
        )}
        {onImportOwn && (
          <button
            onClick={onImportOwn}
            className="font-mono text-xs uppercase text-ink hover:text-ink/70 transition"
          >
            Import your own
          </button>
        )}
      </div>
    </header>
  )
}
