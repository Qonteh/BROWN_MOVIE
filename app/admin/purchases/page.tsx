"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, Filter, Download, DollarSign, TrendingUp, CreditCard, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type PurchaseStatus = "completed" | "pending" | "failed" | "refunded"

type PurchaseRow = {
  id: string
  transaction_id: string | null
  user_name: string
  user_email: string
  movie_title: string
  amount: number | string
  currency: string | null
  payment_method: string | null
  payment_phone: string | null
  status: PurchaseStatus
  created_at: string
}

type PurchasesStats = {
  todayRevenue: number
  totalTransactions: number
  successRate: number
  pendingCount: number
  changes: {
    todayRevenue: string
    totalTransactions: string
    successRate: string
    pendingCount: string
  }
}

const defaultStats: PurchasesStats = {
  todayRevenue: 0,
  totalTransactions: 0,
  successRate: 0,
  pendingCount: 0,
  changes: {
    todayRevenue: "0%",
    totalTransactions: "0%",
    successRate: "0%",
    pendingCount: "0%",
  },
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString()
}

function normalizeStatus(status: string): PurchaseStatus {
  if (status === "completed" || status === "pending" || status === "failed" || status === "refunded") {
    return status
  }
  return "pending"
}

export default function PurchasesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [purchases, setPurchases] = useState<PurchaseRow[]>([])
  const [stats, setStats] = useState<PurchasesStats>(defaultStats)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadPurchases = async () => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/admin/purchases", { cache: "no-store" })
      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch purchases")
      }

      const nextPurchases = Array.isArray(data.purchases) ? data.purchases : []
      setPurchases(nextPurchases)
      setStats({ ...defaultStats, ...(data.stats || {}) })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch purchases")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPurchases()
  }, [])

  const filteredPurchases = useMemo(() => purchases.filter((purchase) => {
    const normalizedSearch = searchQuery.trim().toLowerCase()
    const txnRef = purchase.transaction_id || purchase.id
    const matchesSearch =
      purchase.user_name.toLowerCase().includes(normalizedSearch) ||
      purchase.movie_title.toLowerCase().includes(normalizedSearch) ||
      txnRef.toLowerCase().includes(normalizedSearch)
    const matchesStatus = statusFilter === "all" || normalizeStatus(purchase.status) === statusFilter
    return matchesSearch && matchesStatus
  }), [purchases, searchQuery, statusFilter])

  const statsCards = [
    {
      label: "Today's Revenue",
      value: `TSH ${Number(stats.todayRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      change: stats.changes.todayRevenue,
      color: "bg-green/10 text-green",
    },
    {
      label: "Total Transactions",
      value: Number(stats.totalTransactions || 0).toLocaleString(),
      icon: CreditCard,
      change: stats.changes.totalTransactions,
      color: "bg-primary/10 text-primary",
    },
    {
      label: "Success Rate",
      value: `${Number(stats.successRate || 0).toFixed(1)}%`,
      icon: TrendingUp,
      change: stats.changes.successRate,
      color: "bg-blue/10 text-blue",
    },
    {
      label: "Pending",
      value: Number(stats.pendingCount || 0).toLocaleString(),
      icon: Clock,
      change: stats.changes.pendingCount,
      color: "bg-copper/10 text-copper",
    },
  ]

  const getStatusIcon = (status: string) => {
    switch (normalizeStatus(status)) {
      case "completed": return <CheckCircle className="w-4 h-4 text-green" />
      case "pending": return <Clock className="w-4 h-4 text-copper" />
      case "failed": return <XCircle className="w-4 h-4 text-red" />
      case "refunded": return <AlertCircle className="w-4 h-4 text-blue" />
      default: return null
    }
  }

  const getStatusStyle = (status: string) => {
    switch (normalizeStatus(status)) {
      case "completed": return "bg-green/10 text-green"
      case "pending": return "bg-copper/10 text-copper"
      case "failed": return "bg-red/10 text-red"
      case "refunded": return "bg-blue/10 text-blue"
      default: return ""
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Purchases</h1>
          <p className="text-muted-foreground">Track and manage all transactions</p>
        </div>
        <Button variant="outline" onClick={loadPurchases} disabled={loading}>
          <Download className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <Card key={stat.label} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                  <p className="text-sm text-green mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {stat.change}
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

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by user, movie, or transaction ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-secondary border-0">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Purchases Table */}
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader>
          <CardTitle className="text-foreground">Recent Transactions ({filteredPurchases.length}/{purchases.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && (
            <div className="mx-4 mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading purchases from database...</div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  <th className="text-left p-4 font-medium text-muted-foreground">Transaction ID</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">User</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Movie</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Payment</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                    <td className="p-4">
                      <span className="font-mono text-sm text-primary">{purchase.transaction_id || purchase.id}</span>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-foreground">{purchase.user_name}</p>
                        <p className="text-sm text-muted-foreground">{purchase.user_email}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-foreground">{purchase.movie_title}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-green">
                        {(purchase.currency || "TSH").toUpperCase()} {Number(purchase.amount || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-foreground">{purchase.payment_method || "-"}</p>
                        <p className="text-sm text-muted-foreground">{purchase.payment_phone || "-"}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(purchase.status)}`}>
                        {getStatusIcon(purchase.status)}
                        {normalizeStatus(purchase.status)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-muted-foreground text-sm">{formatDate(purchase.created_at)}</span>
                    </td>
                  </tr>
                ))}
                {filteredPurchases.length === 0 && (
                  <tr>
                    <td className="p-6 text-sm text-muted-foreground" colSpan={7}>
                      No purchases found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
