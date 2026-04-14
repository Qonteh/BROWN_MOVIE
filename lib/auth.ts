import type { Movie } from "@/lib/movies-data"

export interface AuthUser {
  id: string
  name: string
  email: string
  fullName: string
  role: "user" | "admin" | "moderator"
  token?: string
}

export interface PendingPurchase {
  movie: Movie
  returnTo: string
}

export interface SignupData {
  fullName: string
  email: string
  password: string
}

export interface LoginData {
  email: string
  password: string
}

const AUTH_STORAGE_KEY = "brown-movies-auth-user"
const AUTH_TOKEN_KEY = "brown-movies-auth-token"
const PENDING_PURCHASE_KEY = "brown-movies-pending-purchase"

function readJson<T>(storage: Storage, key: string): T | null {
  const raw = storage.getItem(key)
  if (!raw) return null

  try {
    return JSON.parse(raw) as T
  } catch {
    storage.removeItem(key)
    return null
  }
}

// API-based authentication functions
export async function apiSignup(data: SignupData): Promise<{ user: AuthUser; token: string }> {
  const response = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: data.fullName,
      email: data.email,
      password: data.password,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Signup failed")
  }

  const result = await response.json()
  const user: AuthUser = {
    id: result.user.id,
    name: result.user.fullName.split(" ")[0],
    email: result.user.email,
    fullName: result.user.fullName,
    role: result.user.role || "user",
    token: result.token,
  }

  saveStoredUser(user)
  saveAuthToken(result.token)

  return { user, token: result.token }
}

export async function apiLogin(data: LoginData): Promise<{ user: AuthUser; token: string }> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: data.email,
      password: data.password,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Login failed")
  }

  const result = await response.json()
  const user: AuthUser = {
    id: result.user.id,
    name: result.user.fullName.split(" ")[0],
    email: result.user.email,
    fullName: result.user.fullName,
    role: result.user.role || "user",
    token: result.token,
  }

  saveStoredUser(user)
  saveAuthToken(result.token)

  return { user, token: result.token }
}

export async function apiLogout(token: string): Promise<void> {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
  } catch (error) {
    console.error("Logout error:", error)
  }

  clearStoredUser()
  clearAuthToken()
}

export async function apiGetCurrentUser(token: string): Promise<AuthUser | null> {
  try {
    const response = await fetch("/api/auth/me", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      return null
    }

    const result = await response.json()
    const user: AuthUser = {
      id: result.user.id,
      name: result.user.fullName.split(" ")[0],
      email: result.user.email,
      fullName: result.user.fullName,
      token,
    }

    return user
  } catch (error) {
    console.error("Get current user error:", error)
    return null
  }
}

// Token storage functions
export function getAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null
  }

  return window.localStorage.getItem(AUTH_TOKEN_KEY)
}

export function saveAuthToken(token: string) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function clearAuthToken() {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem(AUTH_TOKEN_KEY)
}

// User storage functions
export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null
  }

  return readJson<AuthUser>(window.localStorage, AUTH_STORAGE_KEY)
}

export function saveStoredUser(user: AuthUser) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
}

export function clearStoredUser() {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY)
}

// Pending purchase storage functions
export function getPendingPurchase(): PendingPurchase | null {
  if (typeof window === "undefined") {
    return null
  }

  return readJson<PendingPurchase>(window.sessionStorage, PENDING_PURCHASE_KEY)
}

export function savePendingPurchase(movie: Movie, returnTo = "/checkout") {
  if (typeof window === "undefined") {
    return
  }

  const pendingPurchase: PendingPurchase = {
    movie,
    returnTo,
  }

  window.sessionStorage.setItem(PENDING_PURCHASE_KEY, JSON.stringify(pendingPurchase))
}

export function clearPendingPurchase() {
  if (typeof window === "undefined") {
    return
  }

  window.sessionStorage.removeItem(PENDING_PURCHASE_KEY)
}