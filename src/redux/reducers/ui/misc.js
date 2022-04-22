import { types } from 'redux/actions/ui/types'

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
        // set cookie
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
