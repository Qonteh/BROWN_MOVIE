"use client"

import { useState } from "react"
import Image from "next/image"
import { X, Phone, CreditCard, ChevronDown, Lock, CheckCircle, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatPrice, type Movie } from "@/lib/movies-data"

interface PaymentModalProps {
  movie: Movie | null
  isOpen: boolean
  onClose: () => void
}

export function PaymentModal({ movie, isOpen, onClose }: PaymentModalProps) {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [showCardOptions, setShowCardOptions] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)

  if (!isOpen || !movie) return null

  const handlePayment = async () => {
    if (!phoneNumber) {
      alert("Tafadhali weka namba ya simu")
      return
    }
    
    setIsProcessing(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsProcessing(false)
    alert(`Malipo yamefanikiwa! Utapokea ${movie.title} kwenye simu yako.`)
    onClose()
  }

  const mobileProviders = [
    { id: "mpesa", name: "M-Pesa", color: "bg-red-600", logo: "🔴" },
    { id: "airtel", name: "Airtel Money", color: "bg-red-500", logo: "🔴" },
    { id: "halopesa", name: "HaloPesa", color: "bg-orange-500", logo: "🟠" },
    { id: "mixx", name: "MiXX", color: "bg-blue-500", logo: "🔵" },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header with Movie Info */}
        <div className="relative h-32 overflow-hidden">
          <Image
            src={movie.image}
            alt={movie.title}
            fill
            className="object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary/80 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Movie Title & Price */}
          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="text-lg font-bold text-foreground line-clamp-1">{movie.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-green text-xl font-bold">{formatPrice(movie.price)}</span>
              {movie.quality && (
                <span className="px-2 py-0.5 bg-orange text-primary-foreground text-xs font-bold rounded">
                  {movie.quality}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Mobile Money Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="w-5 h-5 text-orange" />
              <h3 className="text-foreground font-semibold">Lipa kwa Mobile Money</h3>
            </div>
            
            {/* Phone Input */}
            <div className="relative mb-4">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">+255</span>
              </div>
              <input
                type="tel"
                placeholder="7XX XXX XXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full pl-24 pr-4 py-3.5 bg-secondary rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange/50 transition-all"
              />
            </div>

            {/* Provider Selection */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {mobileProviders.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => setSelectedProvider(provider.id)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    selectedProvider === provider.id
                      ? "border-orange bg-orange/10"
                      : "border-border bg-secondary/50 hover:border-muted-foreground"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full ${provider.color} flex items-center justify-center text-white text-xs font-bold`}>
                    {provider.name.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-foreground">{provider.name}</span>
                  {selectedProvider === provider.id && (
                    <CheckCircle className="w-4 h-4 text-orange ml-auto" />
                  )}
                </button>
              ))}
            </div>

            {/* Pay Button */}
            <Button
              onClick={handlePayment}
              disabled={isProcessing || !phoneNumber}
              className="w-full bg-orange hover:bg-orange/90 text-primary-foreground py-6 text-lg font-bold rounded-xl glow-orange disabled:opacity-50"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Inaendelea...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Lipa {formatPrice(movie.price)}
                </span>
              )}
            </Button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-4 text-sm text-muted-foreground">au</span>
            </div>
          </div>

          {/* Bank Card Option */}
          <button
            onClick={() => setShowCardOptions(!showCardOptions)}
            className="w-full flex items-center justify-between p-4 bg-secondary/50 rounded-xl text-foreground hover:bg-secondary transition-colors"
          >
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium">Lipa kwa Kadi ya Benki</span>
            </div>
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${showCardOptions ? "rotate-180" : ""}`} />
          </button>

          {showCardOptions && (
            <div className="mt-3 p-4 bg-secondary/30 rounded-xl animate-in slide-in-from-top-2">
              <div className="flex gap-3">
                <button className="flex-1 p-3 bg-foreground rounded-lg text-background font-bold hover:bg-foreground/90 transition-colors">
                  VISA
                </button>
                <button className="flex-1 p-3 bg-foreground rounded-lg text-background font-bold hover:bg-foreground/90 transition-colors">
                  Mastercard
                </button>
              </div>
            </div>
          )}

          {/* Trust Badges */}
          <div className="mt-6 flex items-center justify-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-1 text-xs">
              <Lock className="w-3 h-3" />
              <span>Salama 100%</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-muted-foreground" />
            <span className="text-xs">Malipo ya Haraka</span>
          </div>
        </div>
      </div>
    </div>
  )
}
