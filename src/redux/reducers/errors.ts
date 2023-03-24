/* eslint-disable no-param-reassign */
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface IInitialState {
  error: null | string
}

const initialState: IInitialState = {
  error: null,
}

const errorsCreate = (state: IInitialState, { payload }: PayloadAction<{ message: string, type: string }>) => {
  state.error = payload.message
}

const errorsSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    genericError: errorsCreate,
    loginFailed: errorsCreate,
    signUpFailed: errorsCreate,
    updateUserProfileFailed: errorsCreate,
    createNewPasswordFailed: errorsCreate,
    deleteAccountFailed: errorsCreate,
    createNewProjectFailed: errorsCreate,
    updateProjectFailed: errorsCreate,
    deleteProjectFailed: errorsCreate,
    gdprExportFailed: errorsCreate,
    sharedProjectFailed: errorsCreate,
    clearErrors: (state) => {
      state.error = null
    },
  },
})

export const alertsActions = errorsSlice.actions
export default errorsSlice.reducer
