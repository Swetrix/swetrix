import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import _includes from 'lodash/includes'

import { isBrowser, LS_THEME_SETTING, SUPPORTED_THEMES, ThemeType } from '~/lib/constants'
import { setCookie, getCookie } from '~/utils/cookie'

const setThemeToDOM = (theme: string) => {
  if (!isBrowser) {
    return
  }

  const root = window.document.documentElement
  const isDark = theme === 'dark'

  root.classList.remove(isDark ? 'light' : 'dark')
  root.classList.add(theme)
}

const setTheme = (theme: string, storeToCookie = true): string => {
  setThemeToDOM(theme)

  if (storeToCookie) {
    setCookie(LS_THEME_SETTING, theme, 3600 * 24 * 90) // storing theme data for 90 days
  }

  return theme
}

const getInitialTheme = (): ThemeType => {
  if (!isBrowser) {
    return 'light'
  }

  const queryTheme = new URLSearchParams(window.location.search).get('theme') as ThemeType | null

  if (queryTheme && _includes(SUPPORTED_THEMES, queryTheme)) {
    setThemeToDOM(queryTheme)
    return queryTheme
  }

  const lsTheme: any = getCookie(LS_THEME_SETTING)

  if (_includes(SUPPORTED_THEMES, lsTheme)) {
    setThemeToDOM(lsTheme)
    return lsTheme
  }

  // const userMedia = window.matchMedia('(prefers-color-scheme: dark)')
  // if (userMedia.matches) {
  //   setTheme('dark')
  //   return 'dark'
  // }

  setTheme('light', false)
  return 'light' // light theme as the default
}

interface InitialState {
  theme: ThemeType
}

const getInitialState = (): InitialState => {
  return {
    theme: getInitialTheme(),
  }
}

const themeSlice = createSlice({
  name: 'theme',
  initialState: getInitialState(),
  reducers: {
    setTheme(state, { payload }: PayloadAction<ThemeType>) {
      setTheme(payload)
      state.theme = payload
    },
  },
})

export const themeActions = themeSlice.actions

export default themeSlice.reducer
