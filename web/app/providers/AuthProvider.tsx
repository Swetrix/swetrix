import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

import { useAuthProxy } from '~/hooks/useAuthProxy'
import { User } from '~/lib/models/User'
import { clearLocalStorageOnLogout } from '~/utils/auth'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
  totalMonthlyEvents: number
  logout: (invalidateAllSessions?: boolean) => void
  setUser: (user: User) => void
  mergeUser: (newUser: Partial<User>) => void
  setTotalMonthlyEvents: (totalMonthlyEvents: number) => void
  setIsAuthenticated: (isAuthenticated: boolean) => void
  loadUser: (signal?: AbortSignal) => Promise<void>
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
  const { authMe } = useAuthProxy()

  const [isAuthenticated, setIsAuthenticated] = useState(initialIsAuthenticated || !!initialUser)
  const [user, setUserState] = useState<User | null>(initialUser || null)
  // TODO: @deprecated
  const [totalMonthlyEvents, setTotalMonthlyEvents] = useState(initialTotalMonthlyEvents || 0)

  // Track whether this is the initial mount
  const isInitialMount = useRef(true)

  // Sync state with loader data when it changes (e.g., after login redirect)
  useEffect(() => {
    // Skip the initial mount since state is already initialized from props
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    if (initialUser) {
      // Defer state updates to avoid synchronous cascading renders
      queueMicrotask(() => {
        setUserState(initialUser)
        setIsAuthenticated(true)
        setTotalMonthlyEvents(initialTotalMonthlyEvents || 0)
      })
    }
  }, [initialUser, initialTotalMonthlyEvents])

  const setUser = useCallback((newUser: User) => {
    setUserState(newUser)
  }, [])

  const logout = useCallback((invalidateAllSessions?: boolean) => {
    setIsAuthenticated(false)
    setUserState(null)
    clearLocalStorageOnLogout()

    // Navigate to server-side logout route which handles cookie cleanup
    const logoutUrl = invalidateAllSessions ? '/logout?logoutAll=true' : '/logout'
    window.location.href = logoutUrl
  }, [])

  const mergeUser = useCallback((newUser: Partial<User>) => {
    setUserState((prev) => {
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
        const { user, totalMonthlyEvents } = await authMe(signal)
        setUserState(user)
        setTotalMonthlyEvents(totalMonthlyEvents)
        setIsAuthenticated(true)
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }
        logout()
        setIsAuthenticated(false)
      }
    },
    [logout, authMe],
  )

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading: false,
        user,
        logout,
        totalMonthlyEvents,
        setTotalMonthlyEvents,
        setUser,
        mergeUser,
        setIsAuthenticated,
        loadUser,
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
