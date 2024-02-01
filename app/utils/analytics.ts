import * as Swetrix from 'swetrix'
import { isSelfhosted } from 'redux/constants'

const SWETRIX_PID = 'STEzHcB1rALV'

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

const pathsToIgnore = [
  /^\/projects\/(?!new$)[^/]+$/i,
  /^\/projects\/settings/i,
  /^\/verify/i,
  /^\/password-reset/i,
  /^\/change-email/i,
  /^\/share/i,
  /^\/captchas\/(?!new$)[^/]+$/i,
  /^\/captchas\/settings/i,
]

Swetrix.init(SWETRIX_PID, {
  devMode: true,
})

const trackViews = () => {
  if (!isSelfhosted) {
    Swetrix.trackViews({
      callback: ({ pg, prev }) => {
        const result = {
          pg,
          prev,
        }

        if (checkIgnore(pg, pathsToIgnore)) {
          result.pg = null
        }

        if (checkIgnore(prev, pathsToIgnore)) {
          result.prev = null
        }

        return result
      },
      heartbeatOnBackground: true,
    })
  }
}

const trackCustom = (ev: string, unique = false) => {
  if (!isSelfhosted) {
    Swetrix.track({
      ev,
      unique,
    })
  }
}

export { trackViews, trackCustom, SWETRIX_PID }
