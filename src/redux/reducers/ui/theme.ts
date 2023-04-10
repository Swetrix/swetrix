import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import _includes from 'lodash/includes'
import { LS_THEME_SETTING, SUPPORTED_THEMES, THEME_TYPE } from 'redux/constants'

const setThemeToDOM = (theme: string) => {
  const root = window.document.documentElement
  const isDark = theme === 'dark'

  root.classList.remove(isDark ? 'light' : 'dark')
  root.classList.add(theme)
}

const setTheme = (theme: string): string => {
  setThemeToDOM(theme)
  localStorage.setItem(LS_THEME_SETTING, theme)
  return theme
}

const getInitialTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const lsTheme: any = window.localStorage.getItem(LS_THEME_SETTING)
    if (_includes(SUPPORTED_THEMES, lsTheme)) {
      setThemeToDOM(lsTheme)
      return lsTheme
    }

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // Deprecated
        removeListener: jest.fn(), // Deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    })

    const userMedia = window.matchMedia('(prefers-color-scheme: dark)')
    if (userMedia.matches) {
      setThemeToDOM('dark')
      return 'dark'
    }
  }

  setThemeToDOM('light')
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
