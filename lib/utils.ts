import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Subscription } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * The period label that belongs next to a subscription's billed amount.
 * Irregular charges get no period at all rather than an invented one.
 */
export function cadenceSuffix(cadence: Subscription["cadence"]): string {
  if (cadence === "monthly") return "/month"
  if (cadence === "annual") return "/year"
  return ""
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
