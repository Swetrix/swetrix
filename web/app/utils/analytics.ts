import _includes from 'lodash/includes'
import {
  init,
  startSessionReplay,
  track,
  trackError as swetrixTrackError,
  trackErrors as swetrixTrackErrors,
  trackViews as swetrixTrackViews,
  type IErrorEventPayload,
  type IPageViewPayload,
  type TrackEventOptions,
} from 'swetrix'

import {
  isBrowser,
  isDevelopment,
  isSelfhosted,
  stripLangFromPath,
} from '~/lib/constants'
import routes from '~/utils/routes'

export const SWETRIX_PID = 'STEzHcB1rALV'
const SWETRIX_API_PROXY_PATH = '/_internal_data_inngest_proxy'

const isIframe = isBrowser ? window.self !== window.top : false
type SessionReplayActions = Awaited<ReturnType<typeof startSessionReplay>>

let sessionReplayActions: SessionReplayActions | null = null
let sessionReplayStart: Promise<SessionReplayActions | null> | null = null
let sessionReplayStop: Promise<void> | null = null
let sessionReplayShouldRun = false
let sessionReplayPrivatePathVersion = 0
let sessionReplayRestartAfterStop = false

const SESSION_REPLAY_PUBLIC_PATHS = new Set<string>([
  routes.main,
  routes.performance,
  routes.errorTracking,
  routes.captchaLanding,
  routes.captchaDemo,
  routes.forMarketers,
  routes.forStartups,
  routes.forSmallBusinesses,
  routes.gaAlternative,
  routes.blog,
  routes.privacy,
  routes.cookiePolicy,
  routes.dpa,
  routes.security,
  routes.terms,
  routes.imprint,
  routes.dataPolicy,
  routes.open,
  routes.contact,
  routes.bookACall,
])

const SESSION_REPLAY_PUBLIC_PREFIXES = [`${routes.blog}/`, '/comparison/']

const REFS_TO_IGNORE = [
  /https:\/\/swetrix.com\/(?:[^/]+\/)?projects\/(?!new$)[^/]+$/i,
  /https:\/\/swetrix.com\/(?:[^/]+\/)?projects\/settings/i,
  /https:\/\/swetrix.com\/(?:[^/]+\/)?verify/i,
  /https:\/\/swetrix.com\/(?:[^/]+\/)?password-reset/i,
  /https:\/\/swetrix.com\/(?:[^/]+\/)?change-email/i,
  /https:\/\/swetrix.com\/(?:[^/]+\/)?share/i,
  /https:\/\/swetrix.com\/(?:[^/]+\/)?captchas\/(?!new$)[^/]+$/i,
  /https:\/\/swetrix.com\/(?:[^/]+\/)?captchas\/settings/i,
  /https:\/\/swetrix.com\/(?:[^/]+\/)?organisations\/[^/]+/i,
  /https:\/\/swetrix.com\/(?:[^/]+\/)?signup\/invitation\/[^/]+/i,
]

const PATHS_REPLACEMENT_MAP = [
  {
    regex: /^\/(?:[^/]+\/)?projects\/(?!new$)[^/]+$/i,
    replacement: '/projects/[id]',
  },
  {
    regex: /^\/(?:[^/]+\/)?projects\/settings/i,
    replacement: '/projects/settings/[id]',
  },
  {
    regex: /^\/(?:[^/]+\/)?verify/i,
    replacement: '/verify/[token]',
  },
  {
    regex: /^\/(?:[^/]+\/)?password-reset/i,
    replacement: '/password-reset/[token]',
  },
  {
    regex: /^\/(?:[^/]+\/)?change-email/i,
    replacement: '/change-email/[token]',
  },
  {
    regex: /^\/(?:[^/]+\/)?reports-unsubscribe/i,
    replacement: '/reports-unsubscribe/[token]',
  },
  {
    regex: /^\/(?:[^/]+\/)?share/i,
    replacement: '/share/[token]',
  },
  {
    regex: /^\/(?:[^/]+\/)?projects\/([^/]+)\/alerts\/create/i,
    replacement: '/projects/[id]/alerts/create',
  },
  {
    regex: /^\/(?:[^/]+\/)?projects\/([^/]+)\/subscribers\/invite/i,
    replacement: '/projects/[id]/subscribers/invite',
  },
  {
    regex: /^\/(?:[^/]+\/)?projects\/([^/]+)\/alerts\/settings/i,
    replacement: '/projects/[id]/alerts/settings/[alert]',
  },
  {
    regex: /^\/(?:[^/]+\/)?projects\/([^/]+)\/password/i,
    replacement: '/projects/[id]/password',
  },
  {
    regex: /^\/(?:[^/]+\/)?organisations\/[^/]+/i,
    replacement: '/organisations/[id]',
  },
  {
    regex: /^\/(?:[^/]+\/)?signup\/invitation\/[^/]+/i,
    replacement: '/signup/invitation/[id]',
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

const getSessionReplayPath = (pathname: string) => {
  const path = stripLangFromPath(pathname)

  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1)
  }

  return path
}

const canTrackSessionReplay = (pathname: string) => {
  const path = getSessionReplayPath(pathname)

  return (
    SESSION_REPLAY_PUBLIC_PATHS.has(path) ||
    SESSION_REPLAY_PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix))
  )
}

const stopSessionReplayActions = async (actions: SessionReplayActions) => {
  try {
    await actions.stop()
  } catch (reason) {
    console.error('Failed to stop Swetrix session replay:', reason)
  }
}

const queueSessionReplayStop = (actions: SessionReplayActions) => {
  const stop = stopSessionReplayActions(actions).finally(() => {
    if (sessionReplayStop === stop) {
      sessionReplayStop = null
    }
  })

  sessionReplayStop = stop

  return stop
}

const stopActiveSessionReplay = () => {
  const actions = sessionReplayActions
  sessionReplayActions = null

  if (actions) {
    void queueSessionReplayStop(actions)
  }
}

const markSessionReplayPrivate = () => {
  sessionReplayShouldRun = false
  sessionReplayPrivatePathVersion += 1
  stopActiveSessionReplay()
}

const startSessionReplayOnPublicPath = async (privatePathVersion: number) => {
  if (sessionReplayStop) {
    await sessionReplayStop
  }

  if (
    !sessionReplayShouldRun ||
    privatePathVersion !== sessionReplayPrivatePathVersion ||
    !canTrackSessionReplay(window.location.pathname)
  ) {
    return null
  }

  return startSessionReplay({
    privacy: 'normal',
  })
}

init(SWETRIX_PID, {
  disabled: isDevelopment,
  apiURL: isSelfhosted ? undefined : SWETRIX_API_PROXY_PATH,
})

export const trackViews = () => {
  if (isSelfhosted || !isBrowser || isDevelopment || isIframe) {
    return
  }

  swetrixTrackViews({
    callback: ({ pg, ref }) => {
      const result = {
        pg,
        ref,
      } as IPageViewPayload

      result.pg = getNewPath(pg)

      if (checkIgnore(ref, REFS_TO_IGNORE)) {
        result.ref = undefined
      }

      return result
    },
    heartbeatOnBackground: true,
  })
}

export const trackSessionReplay = (pathname: string) => {
  if (isSelfhosted || !isBrowser || isDevelopment || isIframe) {
    markSessionReplayPrivate()
    return
  }

  sessionReplayShouldRun = canTrackSessionReplay(pathname)

  if (!sessionReplayShouldRun) {
    markSessionReplayPrivate()
    return
  }

  if (sessionReplayActions || sessionReplayStart) {
    return
  }

  const privatePathVersion = sessionReplayPrivatePathVersion

  sessionReplayStart = startSessionReplayOnPublicPath(privatePathVersion)
    .then(async (actions) => {
      if (!actions) {
        return null
      }

      const isPublicPath = canTrackSessionReplay(window.location.pathname)

      if (
        !sessionReplayShouldRun ||
        !isPublicPath ||
        privatePathVersion !== sessionReplayPrivatePathVersion
      ) {
        await queueSessionReplayStop(actions)

        if (
          sessionReplayShouldRun &&
          isPublicPath &&
          privatePathVersion !== sessionReplayPrivatePathVersion
        ) {
          sessionReplayRestartAfterStop = true
        }

        return null
      }

      sessionReplayActions = actions

      return actions
    })
    .catch((reason) => {
      console.error('Failed to start Swetrix session replay:', reason)
      return null
    })
    .finally(() => {
      sessionReplayStart = null

      if (sessionReplayRestartAfterStop) {
        sessionReplayRestartAfterStop = false
        trackSessionReplay(window.location.pathname)
      }
    })
}

export const stopSessionReplayIfPrivatePath = (pathname: string) => {
  if (
    isSelfhosted ||
    !isBrowser ||
    isDevelopment ||
    isIframe ||
    canTrackSessionReplay(pathname)
  ) {
    return
  }

  markSessionReplayPrivate()
}

export const trackErrors = () => {
  if (isSelfhosted || !isBrowser || isDevelopment || isIframe) {
    return
  }

  swetrixTrackErrors({
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

export const trackError = (payload: IErrorEventPayload) => {
  if (isSelfhosted || !isBrowser || isDevelopment || isIframe) {
    return
  }

  swetrixTrackError(payload)
}

export const trackCustom = (
  ev: string,
  meta?: TrackEventOptions['meta'],
) => {
  if (isSelfhosted || !isBrowser || isDevelopment || isIframe) {
    return
  }

  track({
    ev,
    meta,
  }).catch((reason) => {
    console.error('Failed to track custom event:', reason)
  })
}
