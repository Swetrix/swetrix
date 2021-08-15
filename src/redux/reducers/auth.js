import { types } from 'redux/actions/auth/types'

const initialState = {
  redirectPath: null,
  authenticated: false,
  loading: true,
  user: {},
}

const authReducer = (state = initialState, { type, payload }) => {
  switch (type) {
    case types.SIGNUP_UP_SUCCESSFUL:
    case types.LOGIN_SUCCESSFUL:
      return { ...state, user: payload.user, authenticated: true }

    case types.UPDATE_USER_PROFILE_SUCCESS:
      return { ...state, user: payload.user }

    case types.EMAIL_VERIFY_SUCCESSFUL:
      return { ...state, user: { ...state.user, isActive: true } }

    case types.SAVE_PATH:
      return { ...state, redirectPath: payload.path }

    case types.LOGOUT:
    case types.DELETE_ACCOUNT_SUCCESS:
      return { ...state, authenticated: false, user: {} }

    case types.FINISH_LOADING:
      return { ...state, loading: false }

    default:
      return state
  }
}

export default authReducer