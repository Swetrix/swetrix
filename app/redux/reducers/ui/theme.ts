import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import _includes from 'lodash/includes'
import { setCookie, getCookie } from 'utils/cookie'
import { isBrowser } from 'redux/constants'
import { LS_THEME_SETTING, SUPPORTED_THEMES, THEME_TYPE } from 'redux/constants'

const setThemeToDOM = (theme: string) => {
  if (!isBrowser) {
    return
  }

  const root = window.document.documentElement
  const isDark = theme === 'dark'

  root.classList.remove(isDark ? 'light' : 'dark')
  root.classList.add(theme)
}

const setTheme = (theme: string): string => {
  setThemeToDOM(theme)
  setCookie(LS_THEME_SETTING, theme)
  return theme
}

const getInitialTheme = (): 'light' | 'dark' => {
  if (!isBrowser) {
    return 'light'
  }

  const lsTheme: any = getCookie(LS_THEME_SETTING)

  if (_includes(SUPPORTED_THEMES, lsTheme)) {
    setThemeToDOM(lsTheme)
    return lsTheme
  }

  const userMedia = window.matchMedia('(prefers-color-scheme: dark)')
  if (userMedia.matches) {
    setTheme('dark')
    return 'dark'
  }

  setTheme('light')
  return 'light' // light theme as the default
}

interface IInitialState {
    theme: 'light' | 'dark'
    type: string
}

const getInitialState = (): IInitialState => {
  return {
    theme: getInitialTheme(),
    type: THEME_TYPE.classic,
  }
}

const themeSlice = createSlice({
  name: 'theme',
  initialState: getInitialState(),
  reducers: {
    setTheme(state, { payload }: PayloadAction<'light' | 'dark'>) {
      setTheme(payload)
      state.theme = payload
    },
    setThemeType(state, { payload }: PayloadAction<string>) {
      state.type = payload
    },
  },
})

export const themeActions = themeSlice.actions

export default themeSlice.reducer
