import { GlobeIcon, MegaphoneIcon } from '@phosphor-icons/react'
import { siMeta } from 'simple-icons'

import GoogleGSVG from '~/ui/icons/GoogleG'

import {
  BROWSER_LOGO_MAP,
  OS_LOGO_MAP,
  OS_LOGO_MAP_DARK,
} from '~/lib/constants'

const FALLBACK_ICON_CLASS = 'size-3.5 text-gray-400 dark:text-gray-500'

export const AdProviderIcon = ({
  provider,
  className = 'size-4 shrink-0',
}: {
  provider: string
  className?: string
}) => {
  if (provider === 'google') {
    return <GoogleGSVG className={className} title='Google' />
  }

  if (provider === 'meta') {
    return (
      <svg viewBox='0 0 24 24' className={className} fill={`#${siMeta.hex}`}>
        <title>Meta</title>
        <path d={siMeta.path} />
      </svg>
    )
  }

  return <MegaphoneIcon className={className} aria-hidden='true' />
}

export const BrowserIcon = ({
  browser,
  className,
}: {
  browser: string | null
  className?: string
}) => {
  if (!browser)
    return (
      <GlobeIcon
        className={className || FALLBACK_ICON_CLASS}
        weight='duotone'
      />
    )
  const logoUrl = BROWSER_LOGO_MAP[browser as keyof typeof BROWSER_LOGO_MAP]
  if (!logoUrl)
    return (
      <GlobeIcon
        className={className || FALLBACK_ICON_CLASS}
        weight='duotone'
      />
    )
  return <img src={logoUrl} className={className || 'size-3.5'} alt={browser} />
}

export const OSIcon = ({
  os,
  theme,
  className,
}: {
  os: string | null
  theme: string
  className?: string
}) => {
  if (!os)
    return (
      <GlobeIcon
        className={className || FALLBACK_ICON_CLASS}
        weight='duotone'
      />
    )
  const logoUrlLight = OS_LOGO_MAP[os as keyof typeof OS_LOGO_MAP]
  const logoUrlDark = OS_LOGO_MAP_DARK[os as keyof typeof OS_LOGO_MAP_DARK]
  let logoUrl = theme === 'dark' ? logoUrlDark : logoUrlLight
  logoUrl ||= logoUrlLight
  if (!logoUrl)
    return (
      <GlobeIcon
        className={className || FALLBACK_ICON_CLASS}
        weight='duotone'
      />
    )
  return <img src={logoUrl} className={className || 'size-3.5'} alt={os} />
}
