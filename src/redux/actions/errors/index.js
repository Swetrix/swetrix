import { types } from './types'

export const errorsActions = {
  // Authorisation
  loginFailed(error) {
    return {
      type: types.LOGIN_FAILED,
      payload: { error },
    }
  },
  
  signupFailed(error) {
    return {
      type: types.SIGN_UP_FAILED,
      payload: { error },
    }
  },

  createNewPasswordFailed(error) {
    return {
      type: types.CREATE_NEW_PASSWORD_FAILED,
      payload: { error },
    }
  },

  updateProfileFailed(error) {
    return {
      type: types.UPDATE_USER_PROFILE_FAILED,
      payload: { error },
    }
  },

  canteensErrors(error) {
    return {
      type: types.CANTEENS_ERRORS,
      payload: { error },
    }
  },

  deleteAccountFailed(error) {
    return {
      type: types.DELETE_ACCOUNT_FAILED,
      payload: { error },
    }
  },

  createNewProjectFailed(error) {
    return {
      type: types.CREATE_NEW_PROJECT_FAILED,
      payload: { error },
    }
  },

  updateProjectFailed(error) {
    return {
      type: types.UPDATE_PROJECT_FAILED,
      payload: { error },
    }
  },

  deleteProjectFailed(error) {
    return {
      type: types.DELETE_PROJECT_FAILED,
      payload: { error },
    }
  },

  genericError(error) {
    return {
      type: types.GENERIC_ERROR,
      payload: { error },
    }
  },

  clearErrors() {
    return {
      type: types.CLEAR_ERRORS,
    }
  },
}
