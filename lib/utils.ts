import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function playClickSound() {
  try {
    const audio = new Audio("/sounds/ui-pop.mp3")
    audio.volume = 0.35
    audio.play().catch(() => {
      // Silently fail if audio playback is not available
    })
  } catch {
    // Silently fail if Audio is not available
  }
}
