import { types } from 'actions/errors/types'

const initialState = {
  error: null
}

export default (state = initialState, { type, payload }) => {
  switch (type) {
    case types.LOGIN_FAILED:
    case types.SIGN_UP_FAILED:
    case types.UPDATE_USER_PROFILE_FAILED:
    case types.CREATE_NEW_PASSWORD_FAILED:
    case types.DELETE_ACCOUNT_FAILED:
    case types.CREATE_NEW_PROJECT_FAILED:
    case types.UPDATE_PROJECT_FAILED:
    case types.DELETE_PROJECT_FAILED:
      return { ...state, error: payload.error }

    case types.CLEAR_ERRORS:
      return { ...state, error: null }

    default:
      return state
  }
}
