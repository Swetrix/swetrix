/* eslint-disable no-param-reassign */
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface IInitialState {
  message: null | string
  type: string
}

const initialState: IInitialState = {
  message: null,
  type: 'info',
}

const alertsCreate = (state: IInitialState, { payload }: PayloadAction<{ message: string; type?: string }>) => {
  state.message = payload.message
  state.type = payload.type || 'info'
}

const alertsSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    accountDeleted: alertsCreate,
    accountUpdated: alertsCreate,
    newPassword: alertsCreate,
    deleteProjectSuccess: alertsCreate,
    createNewProjectSuccess: alertsCreate,
    roleUpdated: alertsCreate,
    inviteUser: alertsCreate,
    removeUser: alertsCreate,
    userSharedUpdate: alertsCreate,
    generateAlerts: alertsCreate,
    clearAlerts: (state) => {
      state.message = null
      state.type = 'info'
    },
  },
})

export const alertsActions = alertsSlice.actions
export default alertsSlice.reducer
