import type { Metadata, Viewport } from 'next'
import { preload } from 'react-dom'
import './globals.css'

// Fonts are self-hosted from /public/fonts and declared in app/fonts.css.
// Nothing is fetched from Google — not at build time, not at runtime.

export const metadata: Metadata = {
  title: 'LeakLens - Subscription Auditor',
  description: 'Find subscription money leaks by reading your SMS inbox',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Fonts are only discovered once the CSS has parsed, which costs a round
  // trip. Preload the two faces used above the fold: body copy, and the
  // mono face the hero's rupee total is set in. react-dom's preload() emits
  // exactly one tag — a <link> written in JSX gets hoisted *and* rendered,
  // so it ends up in the HTML twice.
  preload('/fonts/inter-latin.woff2', {
    as: 'font',
    type: 'font/woff2',
    crossOrigin: 'anonymous',
  })
  preload('/fonts/ibm-plex-mono-700-latin.woff2', {
    as: 'font',
    type: 'font/woff2',
    crossOrigin: 'anonymous',
  })

  return (
    <html lang="en" className="bg-background">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
