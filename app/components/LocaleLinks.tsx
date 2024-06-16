import { useMemo } from 'react'
import { useLocation, Location } from '@remix-run/react'
import { whitelist, whitelistWithCC, MAIN_URL } from 'redux/constants'
import _map from 'lodash/map'

const getUrlFromLocation = (location: Location) => {
  const { pathname, hash, search } = location
  const urlObject = new URL(`${MAIN_URL}${pathname}${search}${hash}`)

  return urlObject
}

const getAlternateLinks = (location: Location) => {
  const urlObject = getUrlFromLocation(location)

  const lnglessUrl = urlObject.toString()

  const alternateLinks = _map(whitelist, (lc) => {
    urlObject.searchParams.set('lng', lc)

    return {
      rel: 'alternate',
      hrefLang: lc,
      href: urlObject.toString(),
    }
  })

  const alternateLinksWithCountryCodes = _map(whitelistWithCC, (value, key) => {
    urlObject.searchParams.set('lng', key)

    return {
      rel: 'alternate',
      hrefLang: value,
      href: urlObject.toString(),
    }
  })

  return {
    altLinks: [...alternateLinks, ...alternateLinksWithCountryCodes],
    lnglessUrl,
  }
}

const NO_ALTERNATE_LINKS = [/^\/blog/i]

const getShouldBeIgnored = (location: Location) => {
  return NO_ALTERNATE_LINKS.some((regex) => regex.test(location.pathname))
}

export const LocaleLinks = () => {
  const location = useLocation()

  const shouldBeIgnored = useMemo(() => getShouldBeIgnored(location), [location])
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
