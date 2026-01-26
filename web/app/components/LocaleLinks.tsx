import _map from 'lodash/map'
import _some from 'lodash/some'
import { useMemo } from 'react'
import { useLocation, Location } from 'react-router'

import {
  whitelist,
  whitelistWithCC,
  MAIN_URL,
  defaultLanguage,
} from '~/lib/constants'

const getUrlFromLocation = (location: Location) => {
  const { pathname, hash, search } = location
  const urlObject = new URL(`${MAIN_URL}${pathname}${search}`)

  return urlObject
}

const getAlternateLinks = (location: Location) => {
  const urlObject = getUrlFromLocation(location)

  // Ensure x-default always points to URL without the ?lng parameter
  const urlWithoutLng = new URL(urlObject.toString())
  urlWithoutLng.searchParams.delete('lng')
  const lnglessUrl = urlWithoutLng.toString()

  const alternateLinks = _map(whitelist, (lc) => {
    const href =
      lc === defaultLanguage
        ? lnglessUrl
        : (() => {
            const tmp = new URL(lnglessUrl)
            tmp.searchParams.set('lng', lc)
            return tmp.toString()
          })()

    return {
      rel: 'alternate',
      hrefLang: lc,
      href,
    }
  })

  const alternateLinksWithCountryCodes = _map(whitelistWithCC, (value, key) => {
    const href =
      key === defaultLanguage
        ? lnglessUrl
        : (() => {
            const tmp = new URL(lnglessUrl)
            tmp.searchParams.set('lng', key)
            return tmp.toString()
          })()

    return {
      rel: 'alternate',
      hrefLang: value,
      href,
    }
  })

  return {
    altLinks: [...alternateLinks, ...alternateLinksWithCountryCodes],
    lnglessUrl,
  }
}

const NO_ALTERNATE_LINKS = [/^\/blog/i]

const getShouldBeIgnored = (location: Location) => {
  return _some(NO_ALTERNATE_LINKS, (regex) => regex.test(location.pathname))
}

export const LocaleLinks = () => {
  const location = useLocation()

  const shouldBeIgnored = useMemo(
    () => getShouldBeIgnored(location),
    [location],
  )
  const altLinks = useMemo(() => getAlternateLinks(location), [location])

  if (shouldBeIgnored) {
    return
  }

  return (
    <>
      {_map(altLinks.altLinks, (link) => (
        <link key={link.hrefLang} {...link} />
      ))}
      <link rel='alternate' href={altLinks.lnglessUrl} hrefLang='x-default' />
    </>
  )
}
