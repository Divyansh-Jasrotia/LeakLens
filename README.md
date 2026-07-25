# LeakLens

> ### 🔗 Live demo: https://leaklens-henna.vercel.app/
>
> _Replace this line with the deployed URL before submitting._
> Source: <https://github.com/ranvir7123/LeakLens>

LeakLens is a privacy-first subscription audit dashboard. It analyzes SMS or email transaction messages to surface recurring charges, estimate annual spend, identify likely savings, and suggest practical next actions.

This demo is browser-only and requires users to upload SMS or email data for analysis. In the final product, LeakLens will be a mobile app that can securely access SMS messages directly (with user permission), eliminating the need for uploads. All processing will still happen locally on the device, ensuring that personal data never leaves the user's phone.

**Zero network requests.** Not at runtime, and not at build time either — the
webfonts are committed to the repo rather than fetched from a CDN, so
`npm run build` succeeds on a machine with no internet connection. The
running app makes no API, analytics, or font requests at all; a live counter
in the corner of the dashboard shows the count staying at zero.

## What it does

- Loads one of the included demo inboxes or a local JSON inbox export.
- Parses transaction messages and resolves them into merchant entities.
- Detects recurring payments and annualizes subscription spend.
- Scores each subscription to highlight potential leaks and recovery opportunities.
- Shows a dashboard with detailed subscription evidence, recommendations, and an inbox viewer.
- Keeps promotional messages separate from the financial audit.

## Demo data

Choose a profile when the app opens to explore the experience:

- `data/demo-priya.json`
- `data/demo-rahul.json`
- `data/demo-karan.json`

You can also upload your own JSON file from the data-source picker.

## Inbox JSON format

An upload must be a JSON array with one object per message. Each object requires:

```json
[
  {
    "id": "msg-001",
    "ts": "2026-01-04T10:26:55+05:30",
    "channel": "sms",
    "body": "Your subscription payment of Rs. 499 was successful.",
    "sender": "BANK"
  }
]
```

`channel` must be either `sms` or `email`. The `sender` field is optional. Each message ID must be unique, and timestamps must use a valid ISO 8601 date.

## Run locally

### Prerequisites

- Node.js 20 or later
- npm

### Installation

```bash
git clone https://github.com/ranvir7123/LeakLens.git
cd LeakLens
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If port 3000 is already occupied, Next.js will choose the next available port and print it in the terminal.

### Viewing a production build

```bash
npm run build     # writes the static site to out/
npm run preview   # serves it at http://localhost:3000
```

> **Do not open `out/index.html` by double-clicking it.** A static export
> references its assets by absolute path (`/_next/...`), so a `file://` page
> looks for them at the root of your drive, finds nothing, and loads no
> JavaScript. The page renders but every button is dead. Serve it over HTTP
> with `npm run preview` — that is what the export expects, and it is exactly
> how a real host serves it.

## Tests

The analysis engine is covered by a Vitest suite:

```bash
npm test
```

It exercises the pipeline end to end against the bundled demo inboxes, and
covers merchant parsing for ICICI, SBI, HDFC, Axis, Kotak, PNB and Google
Play message formats, recurrence detection, price-drift flagging, and the
scoring verdicts.

## Scripts

```bash
npm run dev        # Start the development server
npm run build      # Create a production build (static export to out/)
npm run preview    # Serve the production build over HTTP at :3000
npm run start      # Alias of preview
npm run lint       # Run ESLint
npm test           # Run the engine test suite once
npm run test:watch # Re-run tests on change
```

## Deployment

The app is a fully static export — there is no server, no API route and no
runtime environment variable to configure.

```bash
npm run build   # writes a static site to out/
```

Deploy the generated `out/` directory to any static host (Vercel, Netlify,
GitHub Pages, Cloudflare Pages). On Vercel and Netlify the defaults work as
is: build command `npm run build`, publish directory `out`.

## How the analysis works

The analysis engine is implemented as a sequence of pure functions:

```text
Inbox messages
  -> parser
  -> merchant/entity resolver
  -> recurrence detection
  -> subscription sensors and scoring
  -> recommended actions and recovery estimate
```

The engine lives in `lib/engine/`; presentation components adapt its results for the dashboard.

**Parsing** is template-driven rather than a single regex. Indian banks put
the merchant in a handful of different shapes — a structured UPI path
(`Info: UPI/NETFLIX INDIA/504312`), a VPA, or a keyword-led string
(`towards TIMES PRIME on 09-02-26`) — so `lib/engine/parser.ts` tries each
template in order and takes the first that yields a plausible merchant.
Supporting another issuer means adding one entry to `MERCHANT_TEMPLATES`,
not rewriting the pipeline. Amounts are read both with and without a
currency prefix, since SBI's UPI template omits it.

**Merchant resolution** escalates through three passes in
`lib/engine/resolver.ts`: an exact hit on the alias map, then a substring
match in either direction (so `PRACTO TECHNOLOGIE` still reaches Practo),
then a conservative edit-distance match for typos. Anything still unmatched
keeps its own readable bucket rather than being merged into one anonymous
"unknown" pile. The fuzzy pass is deliberately tight — a wrong merchant is
worse than an unresolved one in a tool people act on, so `ZEPTO MARKETPLACE`
stays unresolved instead of being absorbed into the Zepto Pass subscription.

## Technology

- Next.js 16 and React 19
- TypeScript
- Tailwind CSS
- Framer Motion
- Recharts

## Privacy

LeakLens is designed for local, client-side analysis. The uploaded JSON is parsed and validated in the browser, and the application does not include a backend endpoint for storing inbox data.

## License

This project is available under the [MIT License](LICENSE).
