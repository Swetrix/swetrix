import type { Path, To } from 'react-router'

import { localisePath } from '~/lib/constants'

const localiseString = (href: string, lang: string): string => {
  if (!href.startsWith('/')) return href

  const hashIdx = href.indexOf('#')
  const queryIdx = href.indexOf('?')
  const splitIdx =
    hashIdx === -1
      ? queryIdx
      : queryIdx === -1
        ? hashIdx
        : Math.min(hashIdx, queryIdx)

  if (splitIdx === -1) {
    return localisePath(href, lang)
  }

  const pathname = href.slice(0, splitIdx)
  const rest = href.slice(splitIdx)
  return `${localisePath(pathname, lang)}${rest}`
}

export const localiseTo = (to: To, lang: string): To => {
  if (typeof to === 'string') {
    return localiseString(to, lang)
  }

  if (!to.pathname || !to.pathname.startsWith('/')) return to

  const next: Partial<Path> = { ...to }
  next.pathname = localisePath(to.pathname, lang)
  return next as To
}
