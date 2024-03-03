import * as Swetrix from 'swetrix'
import { isDevelopment, isSelfhosted } from 'redux/constants'

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

const refsToIgnore = [
  /https:\/\/swetrix.com\/projects\/(?!new$)[^/]+$/i,
  /https:\/\/swetrix.com\/projects\/settings/i,
  /https:\/\/swetrix.com\/verify/i,
  /https:\/\/swetrix.com\/password-reset/i,
  /https:\/\/swetrix.com\/change-email/i,
  /https:\/\/swetrix.com\/share/i,
  /https:\/\/swetrix.com\/captchas\/(?!new$)[^/]+$/i,
  /https:\/\/swetrix.com\/captchas\/settings/i,
]

Swetrix.init(SWETRIX_PID, {
  devMode: isDevelopment,
})

const trackViews = () => {
  if (!isSelfhosted) {
    Swetrix.trackViews({
      callback: ({ pg, prev, ref }) => {
        const result = {
          pg,
          prev,
          ref,
        }

        if (checkIgnore(pg, pathsToIgnore)) {
          result.pg = null
        }

        if (checkIgnore(prev, pathsToIgnore)) {
          result.prev = null
        }

        if (checkIgnore(ref, refsToIgnore)) {
          result.ref = undefined
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
