"use client"

import * as React from "react"
import {
  clearStoredUser,
  clearAuthToken,
  getStoredUser,
  getAuthToken,
  apiSignup,
  apiLogin,
  apiLogout,
  apiGetCurrentUser,
  type AuthUser,
  type SignupData,
  type LoginData,
} from "@/lib/auth"

type AuthContextValue = {
  user: AuthUser | null
  isAuthenticated: boolean
  hydrated: boolean
  login: (input: LoginData) => Promise<void>
  register: (input: SignupData) => Promise<void>
  logout: () => Promise<void>
  isLoading: boolean
  error: string | null
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [hydrated, setHydrated] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Hydrate from localStorage on mount
  React.useEffect(() => {
    const storedUser = getStoredUser()
    const token = getAuthToken()

    if (storedUser && token) {
      setUser({ ...storedUser, token })
    }

    setHydrated(true)
  }, [])

  // Listen for storage changes (multi-tab sync)
  React.useEffect(() => {
    const handleStorage = () => {
      const storedUser = getStoredUser()
      const token = getAuthToken()

      if (storedUser && token) {
        setUser({ ...storedUser, token })
      } else {
        setUser(null)
      }
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  const handleLogin = React.useCallback(async (input: LoginData) => {
    setIsLoading(true)
    setError(null)

    try {
      const { user: newUser, token } = await apiLogin(input)
      setUser({ ...newUser, token })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed"
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleRegister = React.useCallback(async (input: SignupData) => {
    setIsLoading(true)
    setError(null)

    try {
      const { user: newUser, token } = await apiSignup(input)
      setUser({ ...newUser, token })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Signup failed"
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleLogout = React.useCallback(async () => {
    setIsLoading(true)
    const token = getAuthToken()

    try {
      if (token) {
        await apiLogout(token)
      }
    } catch (err) {
      console.error("Logout error:", err)
    } finally {
      clearStoredUser()
      clearAuthToken()
      setUser(null)
      setIsLoading(false)
    }
  }, [])

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      hydrated,
      login: handleLogin,
      register: handleRegister,
      logout: handleLogout,
      isLoading,
      error,
    }),
    [hydrated, user, handleLogin, handleRegister, handleLogout, isLoading, error],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }

  return context
}