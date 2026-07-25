@AGENTS.md
# LeakLens — project brief for Claude Code

Hackathon MVP, deadline in hours. FinTech: detects subscription money leaks
from a user's SMS/email inbox, FULLY CLIENT-SIDE.

## Hard rules — never violate
1. ZERO runtime network calls. No fetch, no APIs, no LLM calls, no analytics,
   no external scripts. The app's core selling point is "0 network requests."
   Fonts via next/font (bundled), not Google Fonts CDN.
2. Static export only: `output: 'export'` in next.config. No server components
   that need a server, no API routes, no middleware.
3. Engine code lives in /lib/engine/*.ts as PURE functions. No React imports
   there, ever. UI consumes engine output; engine never touches UI.
4. TypeScript strict. Every engine module exports its types.
5. When I ask for a feature, implement the smallest version that works, then
   stop. No speculative abstractions, no extra config options.

## Architecture (fixed — do not redesign)
inbox.json → parser.ts → resolver.ts → recurrence.ts → sensors.ts
→ score.ts → actions.ts → React UI
- parser.ts: regex templates for Indian bank/UPI SMS + usage pings
  (OTP, login alert, order receipt, delivery). Promos matched and DISCARDED
  (count them — UI shows "N promos ignored").
- resolver.ts: hardcoded alias map (~15 merchants) + normalized-token
  fallback + `unresolved` bucket. Entities carry sensorType
  (otp|receipt|delivery|login|none) and rail (upi-autopay|card-si|playstore|direct).
- recurrence.ts: median charge-gap clustering (27–33d monthly, 350–380d
  annual), amount drift series (flag any rise ≥5% or ≥₹20), annualization.
- sensors.ts: join usage pings to entities → daysSinceLastPing, weighted by
  sensor reliability (receipt=1.0, delivery=1.0, otp=0.7, login=0.7, none=null).
- score.ts: explainable LeakScore = staleness(0–50) + priceDrift(0–30)
  + shareOfRecurringSpend(0–20). Components returned SEPARATELY.
  Verdicts: Active | Zombie-high | Zombie-medium | PriceHike | Unknown.
  sensorType=none ⇒ ALWAYS Unknown (we never guess).
- actions.ts: static rail→cancellation-steps map (India-specific:
  UPI Autopay via PhonePe/GPay mandate menu; card SI via bank e-mandate
  menu per RBI rules; Play Store via Payments & subscriptions) + recovery
  math (zombie annualized spend + drift delta annualized).

## Design system — follow exactly, no substitutions
"Forensic ledger" aesthetic. Paper off-white #FAF6F0 bg, ink #1A1714 text,
leak red #C8361E (losses only), muted green #2E6E4E (recoveries only).
NO gradients, NO glassmorphism, NO purple, NO emoji, NO rounded-2xl-shadow-xl
card defaults. Fonts via next/font: Fraunces (display/headings),
Inter (body), IBM Plex Mono with font-variant-numeric: tabular-nums for
EVERY rupee amount and date. Cards = receipt slips: sharp corners (radius 0
or 2px), 1px ink borders. Verdict stamps ("ZOMBIE", "PRICE HIKE") rendered
rotated −2° like rubber stamps. Density like an auditor's desk, not a
SaaS landing page.

## Testing
Vitest for /lib/engine only. Run `npx vitest run` after every engine change.