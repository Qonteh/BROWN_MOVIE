"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Search, User, Menu, X, Film, Tv, Info, ShoppingBag, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/components/auth-provider"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { user, isAuthenticated, logout } = useAuth()
  const displayName = user?.name?.split(" ")[0] ?? "Mteja"

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-12 h-12 lg:w-14 lg:h-14 rounded-full overflow-hidden ring-2 ring-primary/30 group-hover:ring-primary/60 transition-all">
              <Image 
                src="/logo.png" 
                alt="Brown Movies" 
                fill
                className="object-cover"
              />
            </div>
            <div className="block min-w-0">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gradient leading-none">
                Brown Movies
              </h1>
              <p className="hidden sm:block text-[10px] lg:text-xs text-muted-foreground tracking-wider">
                PREMIUM ENTERTAINMENT
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {[
              { href: "/", label: "Nyumbani", icon: Film, active: true },
              { href: "#movies", label: "Movies", icon: Film },
              { href: "#series", label: "Series", icon: Tv },
              { href: "#about", label: "Kuhusu", icon: Info },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  link.active 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <link.icon className="w-4 h-4" />
                <span suppressHydrationWarning>{link.label}</span>
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Search Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSearchOpen(!searchOpen)}
              className="text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full"
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* My Purchases Button */}
            {isAuthenticated ? (
              <Button asChild className="hidden sm:flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 rounded-full glow-orange">
                <Link href="/nilizolipia">
                  <ShoppingBag className="h-4 w-4" />
                  <span suppressHydrationWarning>Nilizolipia</span>
                </Link>
              </Button>
            ) : null}

            {isAuthenticated ? (
              <div className="hidden md:flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span suppressHydrationWarning>{displayName}</span>
                </div>
                <Button
                  variant="ghost"
                  className="rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary"
                  onClick={logout}
                >
                  Toka
                </Button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Button asChild variant="ghost" className="rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary">
                  <Link href="/auth?mode=login"><span suppressHydrationWarning>Ingia</span></Link>
                </Button>
                <Button asChild className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold glow-orange">
                  <Link href="/auth?mode=signup"><span suppressHydrationWarning>Jisajili</span></Link>
                </Button>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden text-muted-foreground hover:text-foreground rounded-full"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Search Bar - Expandable */}
        {searchOpen && (
          <div className="pb-4 animate-in slide-in-from-top-2">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Tafuta movies, series, katuni..."
                className="w-full pl-12 pr-4 py-3 bg-secondary rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border animate-in slide-in-from-top-2">
            <nav className="flex flex-col gap-1">
              {[
                { href: "/", label: "Nyumbani", icon: Film, active: true },
                { href: "#movies", label: "Movies", icon: Film },
                { href: "#series", label: "Series", icon: Tv },
                { href: "/admin", label: "Admin", icon: Settings },
                { href: "#about", label: "Kuhusu", icon: Info },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                    link.active 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <link.icon className="w-5 h-5" />
                  <span suppressHydrationWarning>{link.label}</span>
                </Link>
              ))}
              {isAuthenticated ? (
                <Button asChild className="flex sm:hidden items-center gap-2 mt-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full">
                  <Link href="/nilizolipia" onClick={() => setMobileMenuOpen(false)}>
                    <ShoppingBag className="h-4 w-4" />
                    <span suppressHydrationWarning>Nilizolipia</span>
                  </Link>
                </Button>
              ) : null}
              {isAuthenticated ? (
                <Button
                  variant="ghost"
                  className="mt-2 justify-start rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                  onClick={logout}
                >
                  <User className="h-4 w-4" />
                  <span suppressHydrationWarning>Toka, {displayName}</span>
                </Button>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button asChild variant="outline" className="w-full rounded-full" onClick={() => setMobileMenuOpen(false)}>
                    <Link href="/auth?mode=login"><span suppressHydrationWarning>Ingia</span></Link>
                  </Button>
                  <Button asChild className="w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setMobileMenuOpen(false)}>
                    <Link href="/auth?mode=signup"><span suppressHydrationWarning>Jisajili</span></Link>
                  </Button>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
