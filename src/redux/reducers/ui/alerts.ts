import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { IAlerts } from 'redux/models/IAlerts'

interface IInitialState {
    alerts: IAlerts[]
    total: number
    pageTotal: number
    loading: boolean
}

const initialState: IInitialState = {
  alerts: [],
  total: 0,
  pageTotal: 0,
  loading: false,
}

const alertsSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    setProjectAlerts(state, action: PayloadAction<IAlerts[]>) {
      state.alerts = action.payload
    },
    setProjectAlertsTotal(state, { payload }: PayloadAction<{ total: number, pageTotal: number }>) {
      state.total = payload.total
      state.pageTotal = payload.pageTotal
    },
    setProjectAlertsLoading(state, { payload }: PayloadAction<boolean>) {
      state.loading = payload
    },
  },
})

export const alertsActions = alertsSlice.actions

export default alertsSlice.reducer
