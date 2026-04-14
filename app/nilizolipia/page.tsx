"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Download, Film } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getAuthToken } from "@/lib/auth"
import { downloadFileWithProgress, type DownloadProgress } from "@/lib/download-client"
import { Progress } from "@/components/ui/progress"

type LibraryMovie = {
  id: string
  movie_id: string
  amount: number | string
  currency: string | null
  payment_method: string
  status: string
  downloaded_at: string
  title: string
  poster_url: string | null
  quality: string | null
  release_year: number | null
  download_url: string | null
  movie_parts?: Array<{
    id?: string
    title?: string
    partNumber?: number
    url?: string
  }> | null
  series_seasons?: Array<{
    id?: string
    title?: string
    seasonNumber?: number
    episodes?: Array<{
      id?: string
      title?: string
      episodeNumber?: number
      url?: string
    }> | null
  }> | null
}

type LibraryStats = {
  totalMovies: number
  totalAmount: number
  currency: string
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value !== "string") return 0
  const normalized = value.replace(/[^\d.-]/g, "")
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatAmount(amount: number | string, currency: string | null) {
  const code = (currency || "TSH").toUpperCase()
  return `${code} ${toNumber(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function MyLibraryPage() {
  const [items, setItems] = useState<LibraryMovie[]>([])
  const [stats, setStats] = useState<LibraryStats>({ totalMovies: 0, totalAmount: 0, currency: "TSH" })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [downloadingMovieId, setDownloadingMovieId] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<Record<string, DownloadProgress | null>>({})
  const [downloadToastId, setDownloadToastId] = useState<string | number | null>(null)

  const formatSpeed = (bytesPerSecond: number | null) => {
    if (!bytesPerSecond || bytesPerSecond <= 0) return "--"
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`
  }

  const formatEta = (seconds: number | null) => {
    if (seconds === null || !Number.isFinite(seconds)) return "--"
    const wholeSeconds = Math.max(Math.ceil(seconds), 0)
    const minutes = Math.floor(wholeSeconds / 60)
    const remainingSeconds = wholeSeconds % 60
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`
  }

  const formatDownloadedMb = (bytes: number | null | undefined) => {
    if (!bytes || bytes <= 0) return "0 MB"
    return `${Math.max(1, Math.round(bytes / (1024 * 1024)))} MB`
  }

  const updateDownloadToast = (text: string) => {
    if (!downloadToastId) return
    toast.loading(text, { id: downloadToastId })
  }

  const getProgressValue = (snapshot: DownloadProgress | null | undefined) => {
    if (!snapshot) return 12
    if (snapshot.percentage !== null && snapshot.percentage !== undefined) return snapshot.percentage
    if (!snapshot.loadedBytes || snapshot.loadedBytes <= 0) return 12
    return (Math.round(snapshot.loadedBytes / (1024 * 1024)) % 85) + 10
  }

  const getDownloadTargets = (item: LibraryMovie) => {
    const movieParts = Array.isArray(item.movie_parts)
      ? item.movie_parts
          .map((part, index) => ({
            key: `part-${part?.id || index}`,
            label: part?.title || `Part ${index + 1}`,
            query: part?.id ? `?partId=${encodeURIComponent(part.id)}` : "",
          }))
          .filter((part) => part.query)
      : []

    const episodes = Array.isArray(item.series_seasons)
      ? item.series_seasons.flatMap((season, seasonIndex) =>
          Array.isArray(season?.episodes)
            ? season.episodes
                .map((episode, episodeIndex) => ({
                  key: `episode-${episode?.id || `${seasonIndex}-${episodeIndex}`}`,
                  label: `${season?.title || `Season ${seasonIndex + 1}`} - ${episode?.title || `Episode ${episodeIndex + 1}`}`,
                  query: episode?.id ? `?episodeId=${encodeURIComponent(episode.id)}` : "",
                }))
                .filter((episode) => episode.query)
            : [],
        )
      : []

    return [...movieParts, ...episodes]
  }

  const loadLibrary = async () => {
    setLoading(true)
    setError("")

    try {
      const token = getAuthToken()
      if (!token) {
        throw new Error("Ingia kwanza kuona Nilizolipia zako")
      }

      const response = await fetch("/api/my-library", {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load library")
      }

      const movies = Array.isArray(data.movies) ? data.movies : []
      setItems(movies)

      const fallbackAmount = movies.reduce((sum, item) => sum + toNumber(item.amount), 0)
      const apiTotalMovies = Number(data?.stats?.totalMovies)
      const apiTotalAmount = Number(data?.stats?.totalAmount)

      setStats({
        totalMovies: Number.isFinite(apiTotalMovies) && apiTotalMovies >= 0 ? apiTotalMovies : movies.length,
        totalAmount: Number.isFinite(apiTotalAmount) && apiTotalAmount >= 0 ? apiTotalAmount : fallbackAmount,
        currency: typeof data?.stats?.currency === "string" && data.stats.currency ? data.stats.currency : "TSH",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load library")
      setItems([])
      setStats({ totalMovies: 0, totalAmount: 0, currency: "TSH" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLibrary()
  }, [])

  const totalSpent = useMemo(() => {
    if (stats.totalAmount > 0) return stats.totalAmount
    return items.reduce((sum, item) => sum + toNumber(item.amount), 0)
  }, [items, stats.totalAmount])

  const totalMovies = useMemo(() => {
    if (stats.totalMovies > 0) return stats.totalMovies
    return items.length
  }, [items.length, stats.totalMovies])

  const handleDownload = async (movieId: string, title: string, query = "") => {
    if (downloadingMovieId === movieId) return

    setDownloadingMovieId(movieId)
    setDownloadProgress((prev) => ({
      ...prev,
      [movieId]: {
        loadedBytes: 0,
        totalBytes: null,
        percentage: 0,
        speedBytesPerSecond: null,
        etaSeconds: null,
      },
    }))

    const initialToastId = toast.loading(`Downloading ${title}...`)
    setDownloadToastId(initialToastId)

    try {
      const token = getAuthToken()
      await downloadFileWithProgress({
        url: `/api/movies/${movieId}/download${query}`,
        fallbackFileName: `${title}.mp4`,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        onProgress: (snapshot) => {
          setDownloadProgress((prev) => ({ ...prev, [movieId]: snapshot }))

          const progressLabel =
            snapshot.percentage !== null
              ? `${snapshot.percentage}%`
              : `${formatDownloadedMb(snapshot.loadedBytes)}`
          const speedLabel =
            snapshot.speedBytesPerSecond && snapshot.speedBytesPerSecond > 0
              ? `${(snapshot.speedBytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`
              : "--"
          const etaLabel =
            snapshot.etaSeconds !== null && Number.isFinite(snapshot.etaSeconds)
              ? `${Math.max(0, Math.ceil(snapshot.etaSeconds))}s`
              : "--"

          updateDownloadToast(`Downloading ${progressLabel} • ${speedLabel} • ETA ${etaLabel}`)
        },
      })

      toast.success(`Downloaded ${title}`, { id: initialToastId })
    } catch {
      toast.error(`Download failed for ${title}`, { id: initialToastId })
      window.alert("Imeshindikana kudownload movie hii.")
    } finally {
      setDownloadingMovieId(null)
      setDownloadToastId(null)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="rounded-full">
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Nilizolipia</h1>
            <p className="text-sm text-muted-foreground">Movies ulizolipia au kudownload</p>
          </div>
        </div>
        <Button variant="outline" onClick={loadLibrary} disabled={loading}>
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Movies</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalMovies}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
              <p className="text-2xl font-bold">{stats.currency} {totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
      </div>

      {error ? (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Library ({totalMovies})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading your library...</p>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Film className="h-8 w-8 mx-auto mb-2" />
              Bado huna movie yoyote kwenye Nilizolipia.
            </div>
          ) : (
            items.map((item) => (
              <div key={item.movie_id} className="space-y-2 rounded-xl border border-border p-3">
                {(() => {
                  const targets = getDownloadTargets(item)
                  const defaultQuery = targets[0]?.query || ""
                  const canDownload = Boolean(item.download_url) || targets.length > 0

                  return (
                    <>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-secondary">
                      <Image
                        src={item.poster_url || "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=100&h=150&fit=crop"}
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatAmount(item.amount, item.currency)} • {item.quality || "HD"} • {new Date(item.downloaded_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleDownload(item.movie_id, item.title, defaultQuery)}
                    disabled={!canDownload || downloadingMovieId === item.movie_id}
                    className="rounded-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {downloadingMovieId === item.movie_id
                      ? downloadProgress[item.movie_id]?.percentage !== null && downloadProgress[item.movie_id]?.percentage !== undefined
                        ? `Downloading ${downloadProgress[item.movie_id]?.percentage}%`
                        : `Downloading ${formatDownloadedMb(downloadProgress[item.movie_id]?.loadedBytes)}`
                      : "Download"}
                  </Button>
                </div>

                {targets.length > 1 ? (
                  <div className="flex flex-wrap gap-2">
                    {targets.map((target) => (
                      <Button
                        key={target.key}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(item.movie_id, `${item.title} - ${target.label}`, target.query)}
                        disabled={downloadingMovieId === item.movie_id}
                      >
                        {target.label}
                      </Button>
                    ))}
                  </div>
                ) : null}

                {downloadingMovieId === item.movie_id ? (
                  <div className="space-y-1">
                    <Progress value={getProgressValue(downloadProgress[item.movie_id])} className="h-1.5" />
                    <p className="text-[11px] text-muted-foreground">
                      {formatDownloadedMb(downloadProgress[item.movie_id]?.loadedBytes)} • {formatSpeed(downloadProgress[item.movie_id]?.speedBytesPerSecond ?? null)} • ETA {formatEta(downloadProgress[item.movie_id]?.etaSeconds ?? null)}
                    </p>
                  </div>
                ) : null}
                    </>
                  )
                })()}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}