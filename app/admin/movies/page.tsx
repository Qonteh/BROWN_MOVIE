"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Download,
  DollarSign,
  CheckCheck,
  Ban,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type MovieRow = {
  id: string
  title: string
  category_name: string
  category_slug: string
  price: number | string
  view_count: number | string
  download_count: number | string
  poster_url: string | null
  is_active: boolean
}

type BulkAction = "activate" | "deactivate" | "delete"

export default function MoviesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [movies, setMovies] = useState<MovieRow[]>([])
  const [selectedMovieIds, setSelectedMovieIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [bulkLoading, setBulkLoading] = useState(false)

  const loadMovies = async () => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/admin/movies", { cache: "no-store" })
      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch movies")
      }

      const nextMovies = Array.isArray(data.movies) ? data.movies : []
      setMovies(nextMovies)

      const nextIds = new Set(nextMovies.map((movie: MovieRow) => movie.id))
      setSelectedMovieIds((prev) => prev.filter((id) => nextIds.has(id)))

      const availableCategorySlugs = new Set(nextMovies.map((movie: MovieRow) => movie.category_slug))
      if (categoryFilter !== "all" && !availableCategorySlugs.has(categoryFilter)) {
        setCategoryFilter("all")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch movies")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMovies()
  }, [])

  const categoryOptions = useMemo(() => {
    const seen = new Set<string>()
    return movies
      .map((movie) => ({ value: movie.category_slug, label: movie.category_name }))
      .filter((category) => {
        if (seen.has(category.value)) return false
        seen.add(category.value)
        return true
      })
  }, [movies])

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()

  const filteredMovies = movies.filter((movie) => {
    const matchesSearch = movie.title.toLowerCase().includes(normalizedSearchQuery)
    const matchesCategory = categoryFilter === "all" || movie.category_slug === categoryFilter
    return matchesSearch && matchesCategory
  })

  const filteredMovieIds = filteredMovies.map((movie) => movie.id)
  const allFilteredSelected =
    filteredMovieIds.length > 0 && filteredMovieIds.every((id) => selectedMovieIds.includes(id))

  const toggleMovieSelection = (movieId: string) => {
    setSelectedMovieIds((prev) =>
      prev.includes(movieId) ? prev.filter((id) => id !== movieId) : [...prev, movieId],
    )
  }

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedMovieIds((prev) => prev.filter((id) => !filteredMovieIds.includes(id)))
      return
    }

    setSelectedMovieIds((prev) => Array.from(new Set([...prev, ...filteredMovieIds])))
  }

  const deleteMovie = async (movie: MovieRow) => {
    const confirmed = window.confirm(`Delete movie \"${movie.title}\"?`)
    if (!confirmed) return

    try {
      setError("")
      const response = await fetch(`/api/admin/movies/${movie.id}`, { method: "DELETE" })
      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to delete movie")
      }

      await loadMovies()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete movie")
    }
  }

  const runBulkAction = async (action: BulkAction) => {
    if (bulkLoading || selectedMovieIds.length === 0) return

    const label =
      action === "delete"
        ? "delete"
        : action === "activate"
          ? "activate"
          : "deactivate"

    const confirmed = window.confirm(`Are you sure you want to ${label} ${selectedMovieIds.length} selected movie(s)?`)
    if (!confirmed) return

    try {
      setBulkLoading(true)
      setError("")

      const response = await fetch("/api/admin/movies/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: selectedMovieIds }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Bulk action failed")
      }

      setSelectedMovieIds([])
      await loadMovies()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk action failed")
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Movies</h1>
          <p className="text-muted-foreground">Manage your movie library</p>
        </div>
        <Button asChild className="btn-gradient text-white">
          <Link href="/admin/movies/add">
            <Plus className="w-4 h-4 mr-2" />
            Add New Movie
          </Link>
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search movies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-secondary border-0">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoryOptions.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadMovies} disabled={loading || bulkLoading}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="space-y-3">
          <CardTitle className="text-foreground">
            All Movies ({filteredMovies.length}/{movies.length})
          </CardTitle>

          {selectedMovieIds.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary/40 p-2.5">
              <span className="text-sm text-foreground">{selectedMovieIds.length} selected</span>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => runBulkAction("activate")}
                disabled={bulkLoading}
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Activate
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => runBulkAction("deactivate")}
                disabled={bulkLoading}
              >
                <Ban className="w-4 h-4 mr-1" />
                Deactivate
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-8"
                onClick={() => runBulkAction("delete")}
                disabled={bulkLoading}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </div>
          ) : null}
        </CardHeader>

        <CardContent className="p-0">
          {error ? (
            <div className="mx-4 mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading movies from database...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/50 border-b border-border">
                  <tr>
                    <th className="text-left p-4 font-medium text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleSelectAllFiltered}
                        aria-label="Select all filtered movies"
                        className="h-4 w-4 rounded border-border bg-secondary"
                      />
                    </th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Movie</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Category</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Price</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Views</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Downloads</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovies.map((movie) => (
                    <tr key={movie.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedMovieIds.includes(movie.id)}
                          onChange={() => toggleMovieSelection(movie.id)}
                          aria-label={`Select ${movie.title}`}
                          className="h-4 w-4 rounded border-border bg-secondary"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-16 rounded-lg overflow-hidden bg-secondary">
                            <Image
                              src={movie.poster_url || "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=100&h=150&fit=crop"}
                              alt={movie.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <span className="font-medium text-foreground">{movie.title}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {movie.category_name}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-medium text-green flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          TSH {Number(movie.price || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Eye className="w-4 h-4" />
                          {Number(movie.view_count || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Download className="w-4 h-4" />
                          {Number(movie.download_count || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            movie.is_active ? "bg-green/10 text-green" : "bg-red/10 text-red"
                          }`}
                        >
                          {movie.is_active ? "active" : "inactive"}
                        </span>
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild className="cursor-pointer">
                              <Link href={`/admin/movies/${movie.id}/edit`}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => {
                                window.open(`/api/movies/${movie.id}/download`, "_blank", "noopener,noreferrer")
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer text-destructive"
                              onClick={() => deleteMovie(movie)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}

                  {filteredMovies.length === 0 ? (
                    <tr>
                      <td className="p-6 text-sm text-muted-foreground" colSpan={8}>
                        No movies found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
