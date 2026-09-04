import _map from 'lodash/map'
import { useMemo } from 'react'
import { useLocation, useMatches, type Location } from 'react-router'

import {
  whitelist,
  whitelistWithCC,
  MAIN_URL,
  localisePath,
  stripLangFromPath,
  isUnlocalisedPath,
} from '~/lib/constants'

const buildHref = (lang: string, pathname: string, search: string): string => {
  const path = localisePath(pathname, lang)
  return `${MAIN_URL}${path}${search}`
}

const getAlternateLinks = (location: Location) => {
  const unprefixedPathname = stripLangFromPath(location.pathname)
  const search = location.search ?? ''

  const xDefault = `${MAIN_URL}${unprefixedPathname}${search}`

  const alternateLinks = _map(whitelist, (lc) => ({
    rel: 'alternate',
    hrefLang: lc,
    href: buildHref(lc, unprefixedPathname, search),
  }))

  const alternateLinksWithCountryCodes = _map(
    whitelistWithCC,
    (value, key) => ({
      rel: 'alternate',
      hrefLang: value,
      href: buildHref(key, unprefixedPathname, search),
    }),
  )

  return {
    altLinks: [...alternateLinks, ...alternateLinksWithCountryCodes],
    xDefault,
  }
}

export const LocaleLinks = () => {
  const location = useLocation()
  const matches = useMatches()

  const shouldBeIgnored =
    isUnlocalisedPath(stripLangFromPath(location.pathname)) ||
    matches.some((match) => match.id === 'routes/$')
  const altLinks = useMemo(() => getAlternateLinks(location), [location])

  if (shouldBeIgnored) {
    return null
  }

  return (
    <>
      {_map(altLinks.altLinks, (link) => (
        <link key={link.hrefLang} {...link} />
      ))}
      <link rel='alternate' href={altLinks.xDefault} hrefLang='x-default' />
    </>
  )
}
