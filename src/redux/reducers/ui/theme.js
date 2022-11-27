import _includes from 'lodash/includes'
import { types } from 'redux/actions/ui/types'
import { LS_THEME_SETTING, SUPPORTED_THEMES, THEME_TYPE } from 'redux/constants'

const setThemeToDOM = (theme) => {
  const root = window.document.documentElement
  const isDark = theme === 'dark'

  root.classList.remove(isDark ? 'light' : 'dark')
  root.classList.add(theme)
}

const setTheme = (theme) => {
  setThemeToDOM(theme)
  localStorage.setItem(LS_THEME_SETTING, theme)
  return theme
}

const getInitialTheme = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const lsTheme = window.localStorage.getItem(LS_THEME_SETTING)
    if (_includes(SUPPORTED_THEMES, lsTheme)) {
      setThemeToDOM(lsTheme)
      return lsTheme
    }

    const userMedia = window.matchMedia('(prefers-color-scheme: dark)')
    if (userMedia.matches) {
      setThemeToDOM('dark')
      return 'dark'
    }
  }

  setThemeToDOM('light')
  return 'light' // light theme as the default
}

const getInitialState = () => {
  return {
    theme: getInitialTheme(),
    type: THEME_TYPE.christmas,
  }
}

// eslint-disable-next-line default-param-last
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

    case types.SET_THEME_TYPE: {
      const { theme } = payload

      return {
        ...state,
        type: theme,
      }
    }

    default:
      return state
  }
}

export default themeReducer
