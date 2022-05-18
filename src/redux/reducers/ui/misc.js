import { types } from 'redux/actions/ui/types'
import { LOW_EVENTS_WARNING } from 'redux/constants'
import { setCookie } from 'utils/cookie'
import { secondsTillNextMonth } from 'utils/generic'

const initialState = {
  stats: {
    users: 0,
    projects: 0,
    pageviews: 0,
  },
  paddle: {
    lastEvent: null,
  },
  showNoEventsLeftBanner: false,
}

// eslint-disable-next-line default-param-last
const miscReducer = (state = initialState, { type, payload }) => {
  switch (type) {
    case types.SET_GENERAL_STATS: {
      const { stats } = payload

      return {
        ...state,
        stats,
      }
    }

    case types.SET_PADDLE_LAST_EVENT: {
      const { event } = payload

      return {
        ...state,
        paddle: {
          ...state.paddle,
          lastEvent: event,
        },
      }
    }

    case types.SET_SHOW_NO_EVENTS_LEFT: {
      const { showNoEventsLeftBanner } = payload

      if (!showNoEventsLeftBanner) {
        const maxAge = secondsTillNextMonth() + 86400
        setCookie(LOW_EVENTS_WARNING, 1, maxAge)
      }

      return {
        ...state,
        showNoEventsLeftBanner,
      }
    }

    default:
      return state
  }
}

export default miscReducer
