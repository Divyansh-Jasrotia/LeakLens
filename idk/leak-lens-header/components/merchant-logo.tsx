'use client'

interface MerchantLogoProps {
  logoKey?: string
  merchantName: string
}

// Map logoKey to simple-icons slug and brand color
const LOGO_CONFIG: Record<string, { slug: string; color: string }> = {
  netflix: { slug: 'netflix', color: '#E50914' },
  spotify: { slug: 'spotify', color: '#1DB954' },
  youtube: { slug: 'youtube', color: '#FF0000' },
  dropbox: { slug: 'dropbox', color: '#0061FF' },
  adobe: { slug: 'adobe', color: '#FF0000' },
  // hotstar and jiocinema don't have simple-icons entries, fall back to monogram
}

export function MerchantLogo({ logoKey, merchantName }: MerchantLogoProps) {
  const config = logoKey ? LOGO_CONFIG[logoKey.toLowerCase()] : null

  // Render real brand logo if available
  if (config) {
    return (
      <div className="w-7 h-7 border border-ink bg-paper flex items-center justify-center flex-shrink-0">
        <BrandLogoSVG slug={config.slug} color={config.color} />
      </div>
    )
  }

  // Fallback monogram badge for unknown merchants or unmatched keys
  const initials = merchantName
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 1)

  return (
    <div className="w-7 h-7 border border-ink bg-paper flex items-center justify-center flex-shrink-0">
      <span className="font-mono text-xs font-bold text-ink">{initials}</span>
    </div>
  )
}

// Component to render SVG paths from simple-icons
function BrandLogoSVG({ slug, color }: { slug: string; color: string }) {
  // Real SVG paths from simple-icons data
  const ICON_PATHS: Record<string, string> = {
    netflix:
      'M23.454 6.338c-.302-.65-.944-1.1-1.674-1.1.528.42 1.063.93 1.674 1.1zm-15.976 5.662v-5.5h2.352v13.5H7.478v-8zm11.976-5.5h2.352v13.5h-2.352zm-4.238 4.988l2.352-4.988h2.548l-3.69 7.232v6.268h-2.352v-6.268l-3.69-7.232h2.548l2.352 4.988zm-16.678-4.988h2.352v13.5H-1.462v-13.5zm15.976 0h2.352v13.5h-2.352z',
    spotify:
      'M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.491 17.412c-.82 1.396-2.472 2.196-4.192 2.196-1.72 0-3.372-.8-4.192-2.196-.328-.568-.656-1.304-.984-2.04-.656-1.648-.984-3.296-1.64-4.944-.328-.984-.656-1.64-.656-1.968 0-1.312.492-2.296 1.476-2.952 1.312-.82 3.048-.656 4.36.164.656.41 1.312 1.148 1.968 2.04.82 1.14 1.476 2.624 1.968 3.936.328 1.148.656 2.296.984 3.444.164.82.164 1.804.328 2.952z',
    youtube:
      'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
    dropbox:
      'M6 2l6 3.5L6 9 0 5.5 6 2zm6 3.5l6 3.5-6 3.5-6-3.5 6-3.5zm0 9.5l6 3.5-6 3.5-6-3.5 6-3.5zm6-3.5l6-3.5-6-3.5-6 3.5 6 3.5z',
    adobe:
      'M6.62 0L11 11h2.69L18.08 0h-2.79l-1.38 3.22h-3.64L9.33 0H6.62zm10.23 0c-.88 0-1.44.52-1.44 1.39 0 .87.56 1.39 1.44 1.39.88 0 1.44-.52 1.44-1.39 0-.87-.56-1.39-1.44-1.39z',
  }

  const pathData = ICON_PATHS[slug]

  if (!pathData) {
    return (
      <div className="flex items-center justify-center w-full h-full text-ink/40">
        ?
      </div>
    )
  }

  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill={color}
      className="flex-shrink-0"
    >
      <path d={pathData} />
    </svg>
  )
}
