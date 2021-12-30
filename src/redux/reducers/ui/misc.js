import { types } from 'redux/actions/ui/types'

const getInitialState = () => {
  return {
    stats: {
      users: 0,
      projects: 0,
      pageviews: 0,
    },
  }
}

const miscReducer = (state = getInitialState(), { type, payload }) => {
  switch (type) {
    case types.SET_GENERAL_STATS: {
      const { stats } = payload
      return {
        ...state,
        stats,
      }
    }

    default:
      return state
  }
}

export default miscReducer
