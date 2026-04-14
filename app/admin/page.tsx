"use client"

import { useEffect, useMemo, useState } from "react"
import { Film, Users, CreditCard, TrendingUp, Eye, Download, DollarSign, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"

type DashboardStats = {
  totalMovies: number
  totalUsers: number
  totalSales: number
  purchasesToday: number
  changes: {
    totalMovies: string
    totalUsers: string
    totalSales: string
    purchasesToday: string
  }
}

type RecentPurchase = {
  id: string
  user_name: string
  movie_title: string
  amount: number | string
  created_at: string
  status: string
}

type TopMovie = {
  id: string
  title: string
  view_count: number | string
  download_count: number | string
  revenue: number | string
}

function formatRelativeTime(value: string) {
  const date = new Date(value)
  const now = Date.now()
  const diffMinutes = Math.max(0, Math.floor((now - date.getTime()) / 60000))

  if (diffMinutes < 1) return "just now"
  if (diffMinutes < 60) return `${diffMinutes} min ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentPurchases, setRecentPurchases] = useState<RecentPurchase[]>([])
  const [topMovies, setTopMovies] = useState<TopMovie[]>([])

  const loadDashboard = async () => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/admin/dashboard", { cache: "no-store" })
      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch dashboard")
      }

      setStats(data.stats ?? null)
      setRecentPurchases(Array.isArray(data.recentPurchases) ? data.recentPurchases : [])
      setTopMovies(Array.isArray(data.topMovies) ? data.topMovies : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch dashboard")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const statCards = useMemo(() => {
    if (!stats) return []

    return [
      {
        label: "Total Movies",
        value: stats.totalMovies.toLocaleString(),
        icon: Film,
        change: stats.changes.totalMovies,
        color: "bg-primary/10 text-primary",
      },
      {
        label: "Total Users",
        value: stats.totalUsers.toLocaleString(),
        icon: Users,
        change: stats.changes.totalUsers,
        color: "bg-blue/10 text-blue",
      },
      {
        label: "Total Sales",
        value: `TSH ${Number(stats.totalSales || 0).toLocaleString()}`,
        icon: DollarSign,
        change: stats.changes.totalSales,
        color: "bg-green/10 text-green",
      },
      {
        label: "Purchases Today",
        value: stats.purchasesToday.toLocaleString(),
        icon: CreditCard,
        change: stats.changes.purchasesToday,
        color: "bg-copper/10 text-copper",
      },
    ]
  }, [stats])

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back to Brown Movies Admin</p>
        </div>
        <Button asChild className="btn-gradient text-white">
          <Link href="/admin/movies/add">
            <Film className="w-4 h-4 mr-2" />
            Add New Movie
          </Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Loading dashboard data from database...
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                  <p className="text-sm text-green mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {stat.change} from last month
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Purchases */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <CreditCard className="w-5 h-5 text-primary" />
              Recent Purchases
            </CardTitle>
            <CardDescription>Latest transactions on your platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPurchases.map((purchase) => (
                <div key={purchase.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{purchase.user_name}</p>
                      <p className="text-sm text-muted-foreground">{purchase.movie_title}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green">TSH {Number(purchase.amount || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(purchase.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              {recentPurchases.length === 0 && (
                <p className="text-sm text-muted-foreground">No purchases yet.</p>
              )}
            </div>
            <Button asChild variant="outline" className="w-full mt-4">
              <Link href="/admin/purchases">
                View All Purchases
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Top Movies */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <TrendingUp className="w-5 h-5 text-primary" />
              Top Performing Movies
            </CardTitle>
            <CardDescription>Best sellers this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topMovies.map((movie, index) => (
                <div key={movie.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{movie.title}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {Number(movie.view_count || 0).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="w-3 h-3" />
                          {Number(movie.download_count || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="font-semibold text-green">TSH {Number(movie.revenue || 0).toLocaleString()}</p>
                </div>
              ))}
              {topMovies.length === 0 && (
                <p className="text-sm text-muted-foreground">No movie stats available yet.</p>
              )}
            </div>
            <Button asChild variant="outline" className="w-full mt-4">
              <Link href="/admin/movies">
                View All Movies
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link href="/admin/movies/add">
              <div className="p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-center cursor-pointer">
                <Film className="w-8 h-8 mx-auto text-primary mb-2" />
                <p className="font-medium text-foreground">Add Movie</p>
              </div>
            </Link>
            <Link href="/admin/series/add">
              <div className="p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-center cursor-pointer">
                <Film className="w-8 h-8 mx-auto text-blue mb-2" />
                <p className="font-medium text-foreground">Add Series</p>
              </div>
            </Link>
            <Link href="/admin/categories">
              <div className="p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-center cursor-pointer">
                <Film className="w-8 h-8 mx-auto text-copper mb-2" />
                <p className="font-medium text-foreground">Manage Categories</p>
              </div>
            </Link>
            <Link href="/admin/hero-slides">
              <div className="p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-center cursor-pointer">
                <Film className="w-8 h-8 mx-auto text-green mb-2" />
                <p className="font-medium text-foreground">Edit Hero Slides</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
