import _includes from 'lodash/includes'
import * as Swetrix from 'swetrix'

import {
  isBrowser,
  isDevelopment,
  isIframe,
  isSelfhosted,
} from '~/lib/constants'

export const SWETRIX_PID = 'STEzHcB1rALV'

const REFS_TO_IGNORE = [
  /https:\/\/swetrix.com\/projects\/(?!new$)[^/]+$/i,
  /https:\/\/swetrix.com\/projects\/settings/i,
  /https:\/\/swetrix.com\/verify/i,
  /https:\/\/swetrix.com\/password-reset/i,
  /https:\/\/swetrix.com\/change-email/i,
  /https:\/\/swetrix.com\/share/i,
  /https:\/\/swetrix.com\/captchas\/(?!new$)[^/]+$/i,
  /https:\/\/swetrix.com\/captchas\/settings/i,
]

const PATHS_REPLACEMENT_MAP = [
  {
    regex: /^\/projects\/(?!new$)[^/]+$/i,
    replacement: '/projects/[id]',
  },
  {
    regex: /^\/projects\/settings/i,
    replacement: '/projects/settings/[id]',
  },
  {
    regex: /^\/verify/i,
    replacement: '/verify/[token]',
  },
  {
    regex: /^\/password-reset/i,
    replacement: '/password-reset/[token]',
  },
  {
    regex: /^\/change-email/i,
    replacement: '/change-email/[token]',
  },
  {
    regex: /^\/reports-unsubscribe/i,
    replacement: '/reports-unsubscribe/[token]',
  },
  {
    regex: /^\/share/i,
    replacement: '/share/[token]',
  },
  {
    regex: /^\/ref/i,
    replacement: '/ref/[id]',
  },
  {
    regex: /\/projects\/([^/]+)\/alerts\/create/i,
    replacement: '/projects/[id]/alerts/create',
  },
  {
    regex: /\/projects\/([^/]+)\/subscribers\/invite/i,
    replacement: '/projects/[id]/subscribers/invite',
  },
  {
    regex: /\/projects\/([^/]+)\/alerts\/settings/i,
    replacement: '/projects/[id]/alerts/settings/[alert]',
  },
  {
    regex: /\/projects\/([^/]+)\/password/i,
    replacement: '/projects/[id]/password',
  },
]

const checkIgnore = (path: string | undefined | null, ignore: RegExp[]) => {
  if (!path) {
    return false
  }

  for (let i = 0; i < ignore.length; ++i) {
    if (ignore[i].test(path)) {
      return true
    }
  }

  return false
}

const getNewPath = (path: string | undefined | null) => {
  if (!path) {
    return path
  }

  for (let i = 0; i < PATHS_REPLACEMENT_MAP.length; ++i) {
    const map = PATHS_REPLACEMENT_MAP[i]

    if (map.regex.test(path)) {
      return map.replacement
    }
  }

  return path
}

Swetrix.init(SWETRIX_PID, {
  disabled: isDevelopment,
})

const BLOG_PAGE_REGEX = /^\/blog\/.+$/

export const trackViews = () => {
  if (isSelfhosted || !isBrowser || isIframe) {
    return
  }

  Swetrix.trackViews({
    callback: ({ pg, ref }) => {
      const locale = window?.REMIX_ENV?.LOCALE || 'N/A'

      const result = {
        pg,
        ref,
        meta: {
          locale,
        },
      } as Swetrix.IPageViewPayload

      if (pg && BLOG_PAGE_REGEX.test(pg)) {
        return false
      }

      result.pg = getNewPath(pg)

      if (checkIgnore(ref, REFS_TO_IGNORE)) {
        result.ref = undefined
      }

      return result
    },
    heartbeatOnBackground: true,
  })
}

export const trackPageview = (options: Swetrix.IPageviewOptions) => {
  if (isSelfhosted) {
    return
  }

  Swetrix.pageview(options)
}

export const trackErrors = () => {
  if (isSelfhosted || !isBrowser) {
    return
  }

  Swetrix.trackErrors({
    callback: ({ message, pg, filename }) => {
      if (_includes(message, 'Minified React error')) {
        return false
      }

      // 3rd party extension errors
      if (
        _includes(filename, 'chrome-extension://') ||
        _includes(filename, 'moz-extension://')
      ) {
        return false
      }

      return {
        pg: getNewPath(pg),
      }
    },
  })
}

export const trackError = (payload: Swetrix.IErrorEventPayload) => {
  if (isSelfhosted || !isBrowser) {
    return
  }

  Swetrix.trackError(payload)
}

export const trackCustom = (
  ev: string,
  meta?: Swetrix.TrackEventOptions['meta'],
) => {
  if (isSelfhosted || !isBrowser) {
    return
  }

  Swetrix.track({
    ev,
    meta,
  }).catch((reason) => {
    console.error('Failed to track custom event:', reason)
  })
}
