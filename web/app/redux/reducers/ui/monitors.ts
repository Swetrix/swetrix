import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Monitor } from 'redux/models/Uptime'

interface IInitialState {
  monitors: Monitor[]
  total: number
  pageTotal: number
  loading: boolean
}

const initialState: IInitialState = {
  monitors: [],
  total: 0,
  pageTotal: 0,
  loading: false,
}

const monitorsSlice = createSlice({
  name: 'monitors',
  initialState,
  reducers: {
    setMonitors(state, action: PayloadAction<Monitor[]>) {
      state.monitors = action.payload
    },
    setMonitorsTotal(state, { payload }: PayloadAction<{ total: number; pageTotal?: number }>) {
      state.total = payload.total
      state.pageTotal = payload.pageTotal || state.pageTotal
    },
    setMonitorsLoading(state, { payload }: PayloadAction<boolean>) {
      state.loading = payload
    },
  },
})

export const monitorActions = monitorsSlice.actions

export default monitorsSlice.reducer
