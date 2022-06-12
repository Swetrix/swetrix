import { types } from 'redux/actions/auth/types'
import _filter from 'lodash/filter'
import _map from 'lodash/map'

const initialState = {
  redirectPath: null,
  authenticated: false,
  loading: true,
  user: {},
}

// eslint-disable-next-line default-param-last
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

    case types.DELETE_SHARE_PROJECT: {
      // eslint-disable-next-line no-case-declarations
      const { id } = payload
      return { ...state, user: { ...state.user, sharedProjects: _filter(state.user.sharedProjects, (item) => item.id !== id) } }
    }

    case types.SET_USER_SHARE_DATA: {
      // eslint-disable-next-line no-case-declarations
      const { data, id } = payload
      return {
        ...state,
        user: {
          ...state.user,
          sharedProjects: _map(state.user.sharedProjects, (item) => {
            if (item.id === id) {
              return { ...item, ...data }
            }

            return item
          }),
        },
      }
    }

    default:
      return state
  }
}

export default authReducer
