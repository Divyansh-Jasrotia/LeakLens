# LeakLens

LeakLens is a privacy-first subscription audit dashboard. It analyzes SMS or email transaction messages to surface recurring charges, estimate annual spend, identify likely savings, and suggest practical next actions.

This demo is browser-only and requires users to upload SMS or email data for analysis. In the final product, LeakLens will be a mobile app that can securely access SMS messages directly (with user permission), eliminating the need for uploads. All processing will still happen locally on the device, ensuring that personal data never leaves the user's phone.

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

## Scripts

```bash
npm run dev    # Start the development server
npm run build  # Create a production build
npm run start  # Serve the production build
npm run lint   # Run ESLint
```

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
