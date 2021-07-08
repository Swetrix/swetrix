import { types } from 'actions/alerts/types'

const initialState = {
  message: null,
  type: 'info'
}

export default (state = initialState, { type, payload }) => {
  switch (type) {
    case types.ACCOUNT_DELETED:
    case types.ACCOUNT_UPDATED:
    case types.NEW_PASSWORD:
    case types.DELETE_PROJECT_SUCCESS:
    case types.CREATE_NEW_PROJECT_SUCCESS:
      return { ...state, message: payload.message, type: payload.type }

    case types.CLEAR_ERRORS:
      return { ...state, message: null, type: 'info' }

    default:
      return state
  }
}
