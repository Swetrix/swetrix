import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RRLink, type LinkProps } from 'react-router'

import { defaultLanguage } from '~/lib/constants'
import { localiseTo } from '~/utils/i18nHref'

/**
 * Drop-in replacement for `react-router`'s `<Link>` that automatically
 * prepends the current language to absolute paths (e.g. `/dashboard` becomes
 * `/de/dashboard` when the active language is German).
 *
 * Routes that should never be language-prefixed (blog, api, etc.) are
 * handled inside `localisePath` and remain untouched.
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  function LocalisedLink({ to, ...props }, ref) {
    const { i18n } = useTranslation()
    const lang = i18n.language || defaultLanguage
    return <RRLink ref={ref} to={localiseTo(to, lang)} {...props} />
  },
)
