import { isCancel } from 'axios'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

import { authMe } from '~/api'
import { User } from '~/lib/models/User'
import { getAccessToken } from '~/utils/accessToken'
import { clearLocalStorageOnLogout } from '~/utils/auth'
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
  initialUser?: User | null
  initialTotalMonthlyEvents?: number
}

export const AuthProvider = ({
  children,
  initialIsAuthenticated,
  initialUser,
  initialTotalMonthlyEvents,
}: AuthProviderProps) => {
  // If we have initial user from loader, we're definitely authenticated
  const [isAuthenticated, setIsAuthenticated] = useState(initialIsAuthenticated || !!initialUser)

  // If we have initial user data from loader, no need to load - start with isLoading = false
  const [isLoading, setIsLoading] = useState(!initialUser && initialIsAuthenticated)

  const [user, setUser] = useState<User | null>(initialUser || null)

  // TODO: @deprecated
  const [totalMonthlyEvents, setTotalMonthlyEvents] = useState(initialTotalMonthlyEvents || 0)

  // Sync state with props when they change (e.g., after login redirect)
  useEffect(() => {
    if (initialUser) {
      setUser(initialUser)
      setIsAuthenticated(true)
      setIsLoading(false)
      setTotalMonthlyEvents(initialTotalMonthlyEvents || 0)
    }
  }, [initialUser, initialTotalMonthlyEvents])

  const logout = useCallback((invalidateAllSessions?: boolean) => {
    setIsAuthenticated(false)
    setUser(null)
    clearLocalStorageOnLogout()

    // Navigate to server-side logout route which handles cookie cleanup
    const logoutUrl = invalidateAllSessions ? '/logout?logoutAll=true' : '/logout'
    window.location.href = logoutUrl
  }, [])

  const mergeUser = useCallback((newUser: Partial<User>) => {
    setUser((prev) => {
      if (!prev) {
        // If no previous user, set the new user as full user (if it has required fields)
        if ('id' in newUser && 'email' in newUser) {
          return newUser as User
        }
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
    // If we already have user data from loader, no need to fetch again
    if (initialUser) {
      setIsLoading(false)
      return
    }

    if (!initialIsAuthenticated) {
      setIsLoading(false)
      return
    }

    // No initial user but have cookies - need to fetch user data
    const abortController = new AbortController()
    loadUser(abortController.signal)

    return () => abortController.abort()
  }, [initialIsAuthenticated, initialUser, loadUser])

  useEffect(() => {
    // Skip if we already have user or are loading
    if (user || isLoading) {
      return
    }

    // Skip if initially authenticated (already handled above)
    if (initialIsAuthenticated || initialUser) {
      return
    }

    // Client-side rehydration: if tokens exist but SSR did not receive cookies
    const hasClientToken = Boolean(getAccessToken() || getRefreshToken())

    if (hasClientToken) {
      const abortController = new AbortController()
      setIsLoading(true)
      loadUser(abortController.signal)
      return () => abortController.abort()
    }
  }, [initialIsAuthenticated, initialUser, user, isLoading, loadUser])

  return (
    <AuthContext.Provider
      value={{
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
