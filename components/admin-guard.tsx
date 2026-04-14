"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { useEffect } from "react"

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, hydrated } = useAuth()

  useEffect(() => {
    if (hydrated && (!user || user.role !== "admin")) {
      router.replace("/")
    }
  }, [hydrated, user, router])

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user || user.role !== "admin") {
    return null
  }

  return <>{children}</>
}
