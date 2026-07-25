// Validates a user-uploaded file against the InboxEvent[] shape the engine
// expects, before it ever reaches the parser. Runs entirely client-side —
// the file never leaves the browser.

import type { InboxEvent } from './engine'

export type ValidationResult =
  | { valid: true; events: InboxEvent[] }
  | { valid: false; error: string }

const VALID_CHANNELS = new Set(['sms', 'email'])
const MAX_EVENTS = 20000

export function validateInboxJson(raw: unknown): ValidationResult {
  if (!Array.isArray(raw)) {
    return {
      valid: false,
      error: 'The file must be a JSON array of message objects — e.g. [ { "id": ..., "ts": ..., ... }, ... ].',
    }
  }

  if (raw.length === 0) {
    return { valid: false, error: 'The file is an empty array — there are no messages to analyze.' }
  }

  if (raw.length > MAX_EVENTS) {
    return { valid: false, error: `The file has ${raw.length} messages — please keep uploads under ${MAX_EVENTS}.` }
  }

  const seenIds = new Set<string>()

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i]
    const pos = `Item ${i + 1}`

    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      return { valid: false, error: `${pos} is not an object.` }
    }

    const obj = item as Record<string, unknown>

    if (typeof obj.id !== 'string' || obj.id.trim() === '') {
      return { valid: false, error: `${pos} is missing a string "id" field.` }
    }
    if (seenIds.has(obj.id)) {
      return { valid: false, error: `${pos} has a duplicate "id" ("${obj.id}") — every message needs a unique id.` }
    }
    seenIds.add(obj.id)

    if (typeof obj.ts !== 'string' || Number.isNaN(new Date(obj.ts).getTime())) {
      return {
        valid: false,
        error: `${pos} (id "${obj.id}") has a missing or unparseable "ts" date — use ISO 8601, e.g. "2026-01-04T10:26:55+05:30".`,
      }
    }

    if (typeof obj.channel !== 'string' || !VALID_CHANNELS.has(obj.channel)) {
      return {
        valid: false,
        error: `${pos} (id "${obj.id}") has an invalid "channel" — must be "sms" or "email".`,
      }
    }

    if (typeof obj.body !== 'string' || obj.body.trim() === '') {
      return { valid: false, error: `${pos} (id "${obj.id}") is missing a string "body" field with the message text.` }
    }

    if (obj.sender !== undefined && typeof obj.sender !== 'string') {
      return { valid: false, error: `${pos} (id "${obj.id}") has a "sender" field that isn't a string.` }
    }
  }

  return { valid: true, events: raw as InboxEvent[] }
}

export function parseInboxFile(fileText: string): ValidationResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(fileText)
  } catch {
    return { valid: false, error: 'That file is not valid JSON — check for a trailing comma or a missing bracket.' }
  }
  return validateInboxJson(parsed)
}
