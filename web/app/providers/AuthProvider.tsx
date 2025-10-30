import { isCancel } from 'axios'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

import { authMe } from '~/api'
import { User } from '~/lib/models/User'
import { getAccessToken } from '~/utils/accessToken'
import { logout as logoutCookies } from '~/utils/auth'
import { getRefreshToken } from '~/utils/refreshToken'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
  totalMonthlyEvents: number
  logout: (invalidateAllSessions?: boolean) => void
  setUser: (user: User) => void
  mergeUser: (newUser: Partial<User>) => void
  setTotalMonthlyEvents: (totalMonthlyEvents: number) => void
  loadUser: (signal?: AbortSignal) => Promise<void>
  setIsAuthenticated: (isAuthenticated: boolean) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
  initialIsAuthenticated: boolean
}

export const AuthProvider = ({ children, initialIsAuthenticated }: AuthProviderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(initialIsAuthenticated)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  // TODO: @deprecated
  const [totalMonthlyEvents, setTotalMonthlyEvents] = useState(0)

  const logout = useCallback((invalidateAllSessions?: boolean) => {
    setIsAuthenticated(false)
    setUser(null)
    logoutCookies(invalidateAllSessions)
  }, [])

  const mergeUser = useCallback((newUser: Partial<User>) => {
    setUser((prev) => {
      if (!prev) {
        return null
      }

      return { ...prev, ...newUser }
    })
  }, [])

  const loadUser = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const { user, totalMonthlyEvents } = await authMe({ signal })
        setUser(user)
        setTotalMonthlyEvents(totalMonthlyEvents)
        setIsAuthenticated(true)
      } catch (error) {
        if (isCancel(error)) {
          return
        }

        logout()
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    },
    [logout],
  )

  useEffect(() => {
    if (!initialIsAuthenticated) {
      setIsLoading(false)
      return
    }

    const abortController = new AbortController()

    loadUser(abortController.signal)

    return () => abortController.abort()
  }, [initialIsAuthenticated, loadUser])

  useEffect(() => {
    const abortController = new AbortController()

    if (initialIsAuthenticated) {
      loadUser(abortController.signal)
      return () => abortController.abort()
    }

    // Client-side rehydration: if tokens exist but SSR did not receive cookies
    const hasClientToken = Boolean(getAccessToken() || getRefreshToken())

    if (hasClientToken) {
      setIsLoading(true)
      loadUser(abortController.signal)
      return () => abortController.abort()
    }

    setIsLoading(false)
    return () => abortController.abort()
  }, [initialIsAuthenticated, loadUser])

  return (
    <AuthContext.Provider
      value={{
        //
        isAuthenticated,
        user,
        isLoading,
        logout,
        totalMonthlyEvents,
        setTotalMonthlyEvents,
        setUser,
        mergeUser,
        loadUser,
        setIsAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth must be used within a AuthProvider')
  }

  return context
}
