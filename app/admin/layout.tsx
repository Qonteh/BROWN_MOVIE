"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { 
  Film, 
  LayoutDashboard, 
  FolderOpen, 
  Users, 
  CreditCard, 
  Settings, 
  ImageIcon,
  ChevronLeft,
  Menu,
  LogOut,
  Home
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { AdminGuard } from "@/components/admin-guard"

const sidebarSections = [
  {
    title: "Overview",
    links: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/purchases", label: "Purchases", icon: CreditCard },
    ],
  },
  {
    title: "Content",
    links: [
      { href: "/admin/movies", label: "Movies", icon: Film },
      { href: "/admin/categories", label: "Categories", icon: FolderOpen },
      { href: "/admin/hero-slides", label: "Hero Slides", icon: ImageIcon },
    ],
  },
  {
    title: "System",
    links: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <AdminGuard>
      <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border h-16 flex items-center px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="mr-4"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Link href="/admin" className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary/30">
            <Image src="/logo.png" alt="Brown Movies" fill className="object-cover" />
          </div>
          <span className="font-bold text-lg text-gradient">Admin Panel</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full bg-card border-r border-border transition-all duration-300 flex flex-col
        ${sidebarOpen ? "w-64" : "w-20"}
        ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        {/* Sidebar Header */}
        <div className="h-16 lg:h-20 flex items-center justify-between px-4 border-b border-border">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="relative w-10 h-10 lg:w-12 lg:h-12 rounded-full overflow-hidden ring-2 ring-primary/30">
              <Image src="/logo.png" alt="Brown Movies" fill className="object-cover" />
            </div>
            {sidebarOpen && (
              <div className="hidden lg:block">
                <span className="font-bold text-lg text-gradient">Brown Movies</span>
                <p className="text-xs text-muted-foreground">Admin Panel</p>
              </div>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex"
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${!sidebarOpen ? "rotate-180" : ""}`} />
          </Button>
        </div>

        {/* Sidebar Links */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-4">
          {sidebarSections.map((section) => (
            <div key={section.title} className="space-y-2">
              {(sidebarOpen || mobileMenuOpen) && (
                <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                  {section.title}
                </p>
              )}
              {section.links.map((link) => {
                const isActive = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href))
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all
                      ${isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }
                      ${!sidebarOpen && "lg:justify-center lg:px-3"}
                    `}
                  >
                    <link.icon className="w-5 h-5 flex-shrink-0" />
                    {(sidebarOpen || mobileMenuOpen) && <span>{link.label}</span>}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border bg-card">
          <div className="flex items-center gap-3 mb-3">
            <ThemeToggle />
            {sidebarOpen && <span className="text-sm text-muted-foreground">Theme</span>}
          </div>
          <Button
            asChild
            variant="ghost"
            className={`w-full justify-start mb-2 ${!sidebarOpen && "lg:justify-center lg:px-3"}`}
          >
            <Link href="/">
              <Home className="w-4 h-4" />
              {sidebarOpen && <span className="ml-2">Home</span>}
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className={`w-full ${!sidebarOpen && "lg:px-3"}`}
          >
            <Link href="/">
              <LogOut className="w-4 h-4" />
              {sidebarOpen && <span className="ml-2">Back to Site</span>}
            </Link>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`
        pt-16 lg:pt-0 transition-all duration-300
        ${sidebarOpen ? "lg:pl-64" : "lg:pl-20"}
      `}>
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
    </AdminGuard>
  )
}
