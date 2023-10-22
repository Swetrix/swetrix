import * as Swetrix from 'swetrix'
import { isSelfhosted } from 'redux/constants'

const SWETRIX_PID = 'STEzHcB1rALV'

Swetrix.init(SWETRIX_PID)

const trackViews = () => {
  if (!isSelfhosted) {
    Swetrix.trackViews({
      ignore: [
        /^\/projects\/(?!new$)[^/]+$/i,
        /^\/projects\/settings/i,
        /^\/verify/i,
        /^\/password-reset/i,
        /^\/change-email/i,
        /^\/share/i,
        /^\/captchas\/(?!new$)[^/]+$/i,
        /^\/captchas\/settings/i,
      ],
      heartbeatOnBackground: true,
    })
  }
}

const trackCustom = (ev: string, unique = false) => {
  if (!isSelfhosted) {
    Swetrix.track({
      ev, unique,
    })
  }
}

export {
  trackViews, trackCustom, SWETRIX_PID,
}
