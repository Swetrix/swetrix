import { createContext, useCallback, useContext, useState } from 'react'

import { LS_THEME_SETTING, ThemeType } from '~/lib/constants'
import { setCookie } from '~/utils/cookie'

interface ThemeContextType {
  theme: ThemeType
  setTheme: (theme: ThemeType) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: React.ReactNode
  initialTheme: ThemeType
}

export const ThemeProvider = ({ children, initialTheme }: ThemeProviderProps) => {
  const [theme, setTheme] = useState(initialTheme)

  const _setTheme = useCallback((theme: ThemeType) => {
    setTheme(theme)
    setCookie(LS_THEME_SETTING, theme, 3600 * 24 * 90)
  }, [])

  return <ThemeContext.Provider value={{ theme, setTheme: _setTheme }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => {
  const context = useContext(ThemeContext)

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}
