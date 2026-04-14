"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, BadgeCheck, Lock, Mail, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"

type AuthMode = "login" | "signup"

export function AuthClient({
  initialMode,
  redirectTo,
}: {
  initialMode: AuthMode
  redirectTo: string
}) {
  const router = useRouter()
  const { user, login, register, isAuthenticated, hydrated, isLoading, error } = useAuth()

  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  useEffect(() => {
    if (hydrated && isAuthenticated && user) {
      if (user.role === "admin") {
        router.replace("/admin")
      } else {
        router.replace(redirectTo)
      }
    }
  }, [hydrated, isAuthenticated, user, redirectTo, router])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Jaza barua pepe na nenosiri")
      return
    }

    if (mode === "signup") {
      if (!name.trim()) {
        setErrorMessage("Jaza jina lako")
        return
      }

      if (password !== confirmPassword) {
        setErrorMessage("Maneno ya siri hayafanani")
        return
      }

      if (password.length < 6) {
        setErrorMessage("Nenosiri lazima liwe na herufi kamili 6")
        return
      }
    }

    setIsSubmitting(true)

    try {
      if (mode === "signup") {
        await register({
          fullName: name.trim(),
          email: email.trim(),
          password: password.trim(),
        })
      } else {
        await login({
          email: email.trim(),
          password: password.trim(),
        })
      }

      // Redirect after successful auth
      router.replace(redirectTo)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Authentication failed"
      setErrorMessage(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(203,108,45,0.18),_transparent_30%),linear-gradient(180deg,rgba(15,15,18,1)_0%,rgba(10,10,12,1)_100%)] text-foreground">
      <div className="container mx-auto flex min-h-screen items-center px-4 py-8">
        <div className="grid w-full overflow-hidden rounded-3xl border border-border/70 bg-card/80 shadow-2xl shadow-black/30 backdrop-blur xl:grid-cols-[1.1fr_0.9fr]">
          <section className="relative hidden min-h-[720px] overflow-hidden xl:block">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(139,90,43,0.95),rgba(31,41,55,0.92))]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,176,101,0.20),transparent_32%)]" />
            <div className="relative flex h-full flex-col justify-between p-10 text-primary-foreground">
              <Link href="/" className="inline-flex w-fit items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
                  BM
                </div>
                Brown Movies
              </Link>

              <div className="max-w-lg space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm">
                  <BadgeCheck className="h-4 w-4" />
                  Signup keeps your checkout flow smooth
                </div>
                <h1 className="text-5xl font-black leading-tight tracking-tight">
                  Sign up once. Buy movies without interruptions.
                </h1>
                <p className="text-lg text-white/80">
                  Guests go to signup first. Logged-in users move straight to the payment page with the selected movie already saved.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Fast checkout", value: "1 tap" },
                  { label: "Secure flow", value: "Protected" },
                  { label: "Saved movie", value: "Auto resume" },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                    <div className="text-2xl font-bold">{item.value}</div>
                    <div className="text-sm text-white/70">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="p-6 sm:p-10">
            <div className="mx-auto flex max-w-md flex-col justify-center gap-8">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/70 px-4 py-2 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4 text-orange" />
                  Account required for checkout
                </div>
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">
                    {mode === "signup" ? "Create your account" : "Welcome back"}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {mode === "signup"
                      ? "Register now so the movie you clicked can continue to payment automatically."
                      : "Log in to continue directly to payment."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary/50 p-1">
                <Button
                  type="button"
                  variant={mode === "signup" ? "default" : "ghost"}
                  className="rounded-xl"
                  onClick={() => setMode("signup")}
                >
                  Register
                </Button>
                <Button
                  type="button"
                  variant={mode === "login" ? "default" : "ghost"}
                  className="rounded-xl"
                  onClick={() => setMode("login")}
                >
                  Login
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {(errorMessage || error) && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
                    {errorMessage || error}
                  </div>
                )}
                {mode === "signup" && (
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-muted-foreground">Full name</span>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Your name"
                        className="w-full rounded-xl border border-border bg-background py-3.5 pl-11 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange/50"
                      />
                    </div>
                  </label>
                )}

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">Email</span>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-border bg-background py-3.5 pl-11 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange/50"
                    />
                  </div>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">Password</span>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-border bg-background py-3.5 pl-11 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange/50"
                    />
                  </div>
                </label>

                {mode === "signup" && (
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-muted-foreground">Confirm password</span>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-border bg-background py-3.5 pl-11 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange/50"
                      />
                    </div>
                  </label>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className="w-full rounded-xl bg-primary py-6 text-base font-semibold text-primary-foreground hover:bg-primary/90 glow-orange"
                >
                  {isSubmitting || isLoading ? (
                    "Please wait..."
                  ) : mode === "signup" ? (
                    <span className="flex items-center gap-2">
                      Create account
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Continue to checkout
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                By continuing you return to{` `}
                <span className="font-medium text-foreground">{redirectTo}</span>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}