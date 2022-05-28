import * as Swetrix from 'swetrix'
import { isSelfhosted } from 'redux/constants'

const SWETRIX_PID = 'STEzHcB1rALV'

Swetrix.init(SWETRIX_PID)

const trackViews = () => {
  if (!isSelfhosted) {
    Swetrix.trackViews({
      ignore: [/^\/projects/i, /^\/verify/i, /^\/password-reset/i],
      heartbeatOnBackground: true,
    })
  }
}

const trackCustom = (ev, unique = true) => {
  if (!isSelfhosted) {
    Swetrix.track({
      ev, unique,
    })
  }
}

export {
  trackViews, trackCustom,
}
