import { types } from 'redux/actions/alerts/types'

const initialState = {
  message: null,
  type: 'info',
}

// eslint-disable-next-line default-param-last
const alertsReducer = (state = initialState, { type, payload }) => {
  switch (type) {
    case types.ACCOUNT_DELETED:
    case types.ACCOUNT_UPDATED:
    case types.NEW_PASSWORD:
    case types.DELETE_PROJECT_SUCCESS:
    case types.CREATE_NEW_PROJECT_SUCCESS:
    case types.ROLE_UPDATED:
    case types.INVITE_USER:
    case types.REMOVE_USER:
    case types.USER_SHARED_UPDATE:
      return { ...state, message: payload.message, type: payload.type }

    case types.CLEAR_ALERTS:
      return { ...state, message: null, type: 'info' }

    default:
      return state
  }
}

export default alertsReducer
