import { LS_VIEW_PREFS_SETTING } from 'redux/constants'
import { getInitialViewPrefs } from 'redux/reducers/ui/cache'

export default function setProjectViewPrefs({ payload: { pid, period, timeBucket } }) {
  if (typeof window !== 'undefined' && window.localStorage) {
    const viewPrefs = {
      ...getInitialViewPrefs(),
      [pid]: {
        period, timeBucket,
      },
    }

    window.localStorage.setItem(LS_VIEW_PREFS_SETTING, JSON.stringify(viewPrefs))
  }
}
