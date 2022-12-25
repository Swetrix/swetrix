import { types } from './types'

export const alertsActions = {
  accountDeleted(message, type = 'success') {
    return {
      type: types.ACCOUNT_DELETED,
      payload: { message, type },
    }
  },

  accountUpdated(message, type = 'success') {
    return {
      type: types.ACCOUNT_UPDATED,
      payload: { message, type },
    }
  },

  newPassword(message, type = 'success') {
    return {
      type: types.NEW_PASSWORD,
      payload: { message, type },
    }
  },

  newProject(message, type = 'success') {
    return {
      type: types.CREATE_NEW_PROJECT_SUCCESS,
      payload: { message, type },
    }
  },

  projectDeleted(message, type = 'success') {
    return {
      type: types.CREATE_NEW_PROJECT_SUCCESS,
      payload: { message, type },
    }
  },

  roleUpdated(message, type = 'success') {
    return {
      type: types.ROLE_UPDATED,
      payload: { message, type },
    }
  },

  inviteUser(message, type = 'success') {
    return {
      type: types.INVITE_USER,
      payload: { message, type },
    }
  },

  removeUser(message, type = 'success') {
    return {
      type: types.REMOVE_USER,
      payload: { message, type },
    }
  },

  userSharedUpdate(message, type = 'success') {
    return {
      type: types.USER_SHARED_UPDATE,
      payload: { message, type },
    }
  },

  generateAlerts(message, type = 'success') {
    return {
      type: types.GENERATE_ALERTS,
      payload: { message, type },
    }
  },

  clearAlerts() {
    return {
      type: types.CLEAR_ALERTS,
    }
  },
}
