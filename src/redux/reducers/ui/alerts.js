import { types } from 'redux/actions/ui/types'

const getInitialState = () => {
  return {
    alerts: [],
    total: 0,
    pageTotal: 0,
    loading: false,
  }
}

// eslint-disable-next-line default-param-last
const alertsReducer = (state = getInitialState(), { type, payload }) => {
  switch (type) {
    case types.SET_PROJECT_ALERTS: {
      const { alerts } = payload

      return {
        ...state,
        alerts,
      }
    }

    case types.SET_PROJECT_ALERTS_TOTAL: {
      const { total, pageTotal } = payload

      return {
        ...state,
        total,
        pageTotal,
      }
    }

    case types.SET_PROJECT_ALERTS_LOADING: {
      const { loading } = payload

      return {
        ...state,
        loading,
      }
    }

    default:
      return state
  }
}

export default alertsReducer
