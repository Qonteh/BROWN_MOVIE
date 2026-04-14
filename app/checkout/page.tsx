"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle, ChevronDown, CreditCard, Lock, Phone, Smartphone, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import {
  clearPendingPurchase,
  getAuthToken,
  getPendingPurchase,
  type PendingPurchase,
} from "@/lib/auth"
import { formatPrice } from "@/lib/movies-data"

export default function CheckoutPage() {
  const router = useRouter()
  const { isAuthenticated, hydrated } = useAuth()
  const [pendingPurchase, setPendingPurchase] = useState<PendingPurchase | null>(null)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [showCardOptions, setShowCardOptions] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [paymentMessage, setPaymentMessage] = useState("")
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null)

  useEffect(() => {
    setPendingPurchase(getPendingPurchase())
  }, [])

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace("/auth?mode=signup&redirect=/checkout")
    }
  }, [hydrated, isAuthenticated, router])

  const movie = pendingPurchase?.movie

  const handlePayment = async () => {
    if (!movie) return

    if (!phoneNumber) {
      alert("Tafadhali weka namba ya simu")
      return
    }

    if (!selectedProvider) {
      alert("Tafadhali chagua mtandao wa malipo")
      return
    }

    setIsProcessing(true)
    setPaymentMessage("")

    try {
      const token = getAuthToken()
      if (!token) {
        router.replace("/auth?mode=signup&redirect=/checkout")
        return
      }

      const response = await fetch("/api/payments/clickpesa/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          movieId: movie.id,
          phoneNumber,
          provider: selectedProvider,
        }),
      })

      const data = await response.json().catch(() => ({})) as {
        success?: boolean
        error?: string
        message?: string
        paymentStatus?: "pending" | "completed" | "failed"
        purchaseId?: string
        checkoutUrl?: string | null
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || "Payment request failed")
      }

      if (data.paymentStatus === "completed") {
        clearPendingPurchase()
        alert(`Malipo yamefanikiwa! Sasa unaweza kupakua ${movie.title}.`)
        router.push("/")
        return
      }

      if (data.paymentStatus === "failed") {
        throw new Error(data.message || "Payment failed. Please try again.")
      }

      setPendingPaymentId(data.purchaseId || null)
      setPaymentMessage(data.message || "Thibitisha malipo kwenye simu yako, kisha bonyeza " + '"Nimeshalipa".')

      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, "_blank", "noopener,noreferrer")
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Payment failed. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const checkPaymentStatus = async () => {
    if (!pendingPaymentId) return

    const token = getAuthToken()
    if (!token) {
      router.replace("/auth?mode=signup&redirect=/checkout")
      return
    }

    setIsCheckingStatus(true)
    setPaymentMessage("")

    try {
      const response = await fetch(`/api/payments/clickpesa/status?purchaseId=${encodeURIComponent(pendingPaymentId)}`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json().catch(() => ({})) as {
        success?: boolean
        error?: string
        message?: string
        paymentStatus?: "pending" | "completed" | "failed"
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to verify payment")
      }

      if (data.paymentStatus === "completed") {
        clearPendingPurchase()
        alert(`Malipo yamefanikiwa! Sasa unaweza kupakua ${movie.title}.`)
        router.push("/")
        return
      }

      if (data.paymentStatus === "failed") {
        setPaymentMessage(data.message || "Malipo yamekataliwa. Jaribu tena.")
        return
      }

      setPaymentMessage(data.message || "Bado inasubiri uthibitisho wa malipo. Jaribu tena baada ya sekunde chache.")
    } catch (error) {
      setPaymentMessage(error instanceof Error ? error.message : "Failed to verify payment")
    } finally {
      setIsCheckingStatus(false)
    }
  }

  if (!movie) {
    return (
      <main className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center">
          <div className="w-full rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <CreditCard className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="text-3xl font-bold">No movie selected</h1>
            <p className="mt-2 text-muted-foreground">
              Click a movie card from the home page to start checkout.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/">
                  Back to home
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/auth?mode=signup">
                  Create account
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  const mobileProviders = [
    { id: "mpesa", name: "M-Pesa", color: "bg-red-600" },
    { id: "airtel", name: "Airtel Money", color: "bg-red-500" },
    { id: "halopesa", name: "HaloPesa", color: "bg-orange-500" },
    { id: "mixx", name: "MiXX", color: "bg-blue-500" },
  ]

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Back to movies
          </Link>
          <div className="rounded-full border border-border bg-secondary px-4 py-2 text-sm text-muted-foreground">
            Logged in checkout
          </div>
        </div>

        <div className="grid gap-0 overflow-hidden rounded-3xl border border-border bg-card shadow-2xl lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative min-h-[260px] lg:min-h-full">
            <Image src={movie.image} alt={movie.title} fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
            <button
              type="button"
              onClick={() => router.push("/")}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur hover:bg-black/70"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="absolute bottom-0 left-0 right-0 p-6">
              <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Your selected movie</p>
              <h1 className="mt-2 text-3xl font-bold text-foreground">{movie.title}</h1>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-3xl font-black text-green">{formatPrice(movie.price)}</span>
                {movie.quality && (
                  <span className="rounded-full bg-orange px-3 py-1 text-xs font-bold text-primary-foreground">
                    {movie.quality}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Complete payment</h2>
                <p className="text-sm text-muted-foreground">Continue with mobile money or card.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <div className="absolute left-4 top-1/2 flex -translate-y-1/2 items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">+255</span>
                </div>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  placeholder="7XX XXX XXX"
                  className="w-full rounded-xl border border-border bg-background py-3.5 pl-24 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {mobileProviders.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => setSelectedProvider(provider.id)}
                    className={`flex items-center gap-2 rounded-xl border-2 p-3 text-left transition-all ${
                      selectedProvider === provider.id
                        ? "border-orange bg-orange/10"
                        : "border-border bg-secondary/50 hover:border-muted-foreground"
                    }`}
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${provider.color} text-xs font-bold text-white`}>
                      {provider.name.charAt(0)}
                    </div>
                    <span className="text-sm font-medium">{provider.name}</span>
                    {selectedProvider === provider.id && <CheckCircle className="ml-auto h-4 w-4 text-orange" />}
                  </button>
                ))}
              </div>

              <Button
                type="button"
                onClick={handlePayment}
                disabled={isProcessing || !phoneNumber}
                className="w-full rounded-xl bg-orange py-6 text-lg font-bold text-primary-foreground hover:bg-orange/90 disabled:opacity-50"
              >
                {isProcessing ? "Processing..." : `Pay ${formatPrice(movie.price)}`}
              </Button>

              {pendingPaymentId ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={checkPaymentStatus}
                  disabled={isCheckingStatus}
                  className="w-full rounded-xl"
                >
                  {isCheckingStatus ? "Checking..." : "Nimeshalipa, hakiki malipo"}
                </Button>
              ) : null}

              {paymentMessage ? (
                <p className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
                  {paymentMessage}
                </p>
              ) : null}

              <div className="relative py-2">
                <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
                <div className="relative mx-auto w-fit bg-card px-3 text-sm text-muted-foreground">or</div>
              </div>

              <button
                type="button"
                onClick={() => setShowCardOptions((value) => !value)}
                className="flex w-full items-center justify-between rounded-xl bg-secondary/50 p-4 text-left hover:bg-secondary"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Pay with bank card</span>
                </div>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${showCardOptions ? "rotate-180" : ""}`} />
              </button>

              {showCardOptions && (
                <div className="rounded-xl bg-secondary/30 p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <button className="rounded-lg bg-foreground p-3 font-bold text-background hover:bg-foreground/90">
                      VISA
                    </button>
                    <button className="rounded-lg bg-foreground p-3 font-bold text-background hover:bg-foreground/90">
                      Mastercard
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Secure payment
                </span>
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                <span>Fast checkout</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}