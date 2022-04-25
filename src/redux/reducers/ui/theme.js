import { types } from 'redux/actions/ui/types'
import { LS_THEME_SETTING } from 'redux/constants'

const getInitialTheme = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedPrefs = window.localStorage.getItem(LS_THEME_SETTING)
    if (typeof storedPrefs === 'string') {
      return storedPrefs
    }

    const userMedia = window.matchMedia('(prefers-color-scheme: dark)')
    if (userMedia.matches) {
      return 'dark'
    }
  }

  return 'light' // light theme as the default
}

const setTheme = (rawTheme) => {
  const root = window.document.documentElement
  const isDark = rawTheme === 'dark'

  root.classList.remove(isDark ? 'light' : 'dark')
  root.classList.add(rawTheme)

  localStorage.setItem(LS_THEME_SETTING, rawTheme)
  return rawTheme
}

const getInitialState = () => {
  return {
    theme: getInitialTheme(),
  }
}

const themeReducer = (state = getInitialState(), { type, payload }) => {
  switch (type) {
    case types.SET_THEME: {
      const { theme } = payload

      setTheme(theme)
      return {
        ...state,
        theme,
      }
    }

    default:
      return state
  }
}

export default themeReducer
