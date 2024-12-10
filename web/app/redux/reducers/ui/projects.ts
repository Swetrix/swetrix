import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { PROJECTS_PROTECTED } from 'redux/constants'
import { setItem, getItem } from 'utils/localstorage'

interface InitialState {
  totalMonthlyEvents: number | null
  password: {
    [key: string]: string
  }
}

const initialState: InitialState = {
  totalMonthlyEvents: null,
  password: getItem(PROJECTS_PROTECTED) || {},
}

const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    setTotalMonthlyEvents(state, { payload }: PayloadAction<number>) {
      state.totalMonthlyEvents = payload
    },
    setProjectPassword: (state, { payload }: PayloadAction<{ id: string; password: string }>) => {
      const { id, password } = payload

      state.password = {
        ...state.password,
        [id]: password,
      }
      setItem(PROJECTS_PROTECTED, JSON.stringify(state.password))
    },
  },
})

export const projectsActions = projectsSlice.actions

export default projectsSlice.reducer
