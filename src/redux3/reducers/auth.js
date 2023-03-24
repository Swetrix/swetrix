import { types } from 'redux/actions/auth/types'
import _filter from 'lodash/filter'
import _map from 'lodash/map'
import { FREE_TIER_KEY, isSelfhosted } from '../constants'

const initialState = {
  redirectPath: null,
  authenticated: false,
  loading: true,
  user: {},
  dontRemember: false,
  // if the app is selfhosted, we assume that the user is using a paid tier so there won't be any restrictions or advertising of it
  isPaidTierUsed: isSelfhosted,
}

// eslint-disable-next-line default-param-last
const authReducer = (state = initialState, { type, payload }) => {
  switch (type) {
    case types.SIGNUP_UP_SUCCESSFUL:
    case types.LOGIN_SUCCESSFUL: {
      const { user } = payload

      return {
        ...state,
        user: payload.user,
        authenticated: true,
        isPaidTierUsed: isSelfhosted || (user?.planCode && user.planCode !== FREE_TIER_KEY),
      }
    }

    case types.UPDATE_USER_PROFILE_SUCCESS:
      return { ...state, user: payload.user }

    case types.EMAIL_VERIFY_SUCCESSFUL:
      return { ...state, user: { ...state.user, isActive: true } }

    case types.SET_USER: {
      const { user } = payload
      return {
        ...state,
        user: {
          ...state.user,
          ...user,
        },
      }
    }

    case types.SAVE_PATH:
      return { ...state, redirectPath: payload.path }

    case types.SET_API_KEY:
      return { ...state, user: { ...state.user, apiKey: payload.apiKey } }

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

    case types.SET_DONT_REMEMBER: {
      const { dontRemember } = payload
      return { ...state, dontRemember }
    }

    case types.UPDATE_USER_DATA: {
      const { data } = payload

      return {
        ...state,
        user: {
          ...state.user,
          ...data,
        },
      }
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
