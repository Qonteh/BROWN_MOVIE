"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Download } from "lucide-react"
import { toast } from "sonner"
import { formatPrice, type Movie } from "@/lib/movies-data"
import { getAuthToken, savePendingPurchase } from "@/lib/auth"
import { downloadFileWithProgress, DownloadRequestError } from "@/lib/download-client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface MovieCardProps {
  movie: Movie
}

export function MovieCard({ movie }: MovieCardProps) {
  const router = useRouter()
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null)
  const [downloadedBytes, setDownloadedBytes] = useState(0)
  const [downloadSpeed, setDownloadSpeed] = useState<number | null>(null)
  const [downloadEta, setDownloadEta] = useState<number | null>(null)
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

  const getCompactProgressLabel = () => {
    if (downloadProgress !== null) return `${downloadProgress}%`
    if (downloadedBytes > 0) return `${Math.max(1, Math.round(downloadedBytes / (1024 * 1024)))}M`
    return "..."
  }

  const getProgressBarWidth = () => {
    if (downloadProgress !== null) return `${downloadProgress}%`
    if (downloadedBytes <= 0) return "12%"
    const simulated = (Math.round(downloadedBytes / (1024 * 1024)) % 85) + 10
    return `${simulated}%`
  }

  const updateDownloadToast = (text: string) => {
    if (!downloadToastId) return
    toast.loading(text, { id: downloadToastId })
  }

  const downloadTargets = [
    ...(movie.movieParts || []).map((part) => ({
      key: `part-${part.id || part.partNumber || part.title}`,
      label: part.title,
      query: part.id ? `?partId=${encodeURIComponent(part.id)}` : "",
      kind: "part" as const,
    })),
    ...((movie.seriesSeasons || []).flatMap((season) =>
      (season.episodes || []).map((episode) => ({
        key: `episode-${episode.id || `${season.title}-${episode.title}`}`,
        label: `${season.title} - ${episode.title}`,
        query: episode.id ? `?episodeId=${encodeURIComponent(episode.id)}` : "",
        kind: "episode" as const,
      })),
    )),
  ]

  const effectiveTargets =
    downloadTargets.length > 0
      ? downloadTargets
      : movie.downloadUrl
        ? [{ key: `fallback-${movie.id}`, label: "Main File", query: "", kind: "fallback" as const }]
        : []

  const mediaGroups = (() => {
    const groups: Array<{
      title: string
      countLabel: string
      items: typeof effectiveTargets
    }> = []

    if ((movie.movieParts || []).length > 0) {
      groups.push({
        title: "Movie Parts",
        countLabel: `${movie.movieParts?.length || 0} file${(movie.movieParts?.length || 0) === 1 ? "" : "s"}`,
        items: downloadTargets.filter((target) => target.kind === "part"),
      })
    }

    if ((movie.seriesSeasons || []).length > 0) {
      for (const season of movie.seriesSeasons || []) {
        groups.push({
          title: season.title,
          countLabel: `${season.episodes?.length || 0} episode${(season.episodes?.length || 0) === 1 ? "" : "s"}`,
          items: downloadTargets.filter((target) => target.kind === "episode" && target.label.startsWith(season.title)),
        })
      }
    }

    if (groups.length === 0 && effectiveTargets.length > 0) {
      groups.push({
        title: "Available File",
        countLabel: "1 file",
        items: effectiveTargets,
      })
    }

    return groups
  })()

  const handleDownload = async (query = "", label = movie.title) => {
    if (isDownloading) return
    if (!movie.downloadUrl && downloadTargets.length === 0) return

    const token = getAuthToken()
    if (!token) {
      savePendingPurchase(movie)
      router.push("/auth?mode=signup&redirect=/checkout")
      return
    }

    setIsDownloading(true)
    setDownloadProgress(0)
    setDownloadedBytes(0)
    setDownloadSpeed(null)
    setDownloadEta(null)

    const initialToastId = toast.loading(`Downloading ${label}...`)
    setDownloadToastId(initialToastId)

    try {
      await downloadFileWithProgress({
        url: `/api/movies/${movie.id}/download${query}`,
        fallbackFileName: `${movie.title}.mp4`,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        onProgress: ({ percentage, loadedBytes, speedBytesPerSecond, etaSeconds }) => {
          setDownloadProgress(percentage)
          setDownloadedBytes(loadedBytes)
          setDownloadSpeed(speedBytesPerSecond)
          setDownloadEta(etaSeconds)

          const progressLabel =
            percentage !== null
              ? `${percentage}%`
              : `${Math.max(1, Math.round(loadedBytes / (1024 * 1024)))} MB`
          const speedLabel =
            speedBytesPerSecond && speedBytesPerSecond > 0
              ? `${(speedBytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`
              : "--"
          const etaLabel =
            etaSeconds !== null && Number.isFinite(etaSeconds)
              ? `${Math.max(0, Math.ceil(etaSeconds))}s`
              : "--"

          updateDownloadToast(`Downloading ${progressLabel} • ${speedLabel} • ETA ${etaLabel}`)
        },
      })

      toast.success(`Downloaded ${label}`, { id: initialToastId })
    } catch (error) {
      if (error instanceof DownloadRequestError && (error.status === 401 || error.status === 402)) {
        savePendingPurchase(movie)
        router.push(error.status === 401 ? "/auth?mode=signup&redirect=/checkout" : "/checkout")
        toast.info("Complete payment to unlock this download.", { id: initialToastId })
        return
      }

      toast.error(`Download failed for ${label}`, { id: initialToastId })
      window.alert("Download failed. Please try again.")
    } finally {
      setIsDownloading(false)
      setDownloadProgress(null)
      setDownloadedBytes(0)
      setDownloadSpeed(null)
      setDownloadEta(null)
      setDownloadToastId(null)
    }
  }

  const onCardClick = () => {
    if (effectiveTargets.length > 0) {
      setSelectorOpen(true)
    }
  }

  const onDownloadClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()

    if (effectiveTargets.length > 1) {
      setSelectorOpen(true)
      return
    }

    const target = effectiveTargets[0]
    if (!target) return
    await handleDownload(target.query, target.label)
  }

  return (
    <>
      <div
        className="group flex-shrink-0 w-28 sm:w-36 md:w-40 lg:w-44 text-left movie-card-hover"
        role="button"
        tabIndex={0}
        onClick={onCardClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            onCardClick()
          }
        }}
      >
      {/* Poster */}
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-2.5 bg-secondary border border-white/10">
        <Image
          src={movie.image}
          alt={movie.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.14),_transparent_52%)]" />

        {/* Download Button */}
        <button
          type="button"
          onClick={onDownloadClick}
          disabled={effectiveTargets.length === 0 || isDownloading}
          aria-disabled={effectiveTargets.length === 0 || isDownloading}
          aria-label={isDownloading ? "Downloading" : "Download"}
          title={isDownloading ? "Downloading" : "Download"}
          className={`absolute bottom-2 right-2 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full transition-all ${
            effectiveTargets.length > 0 && !isDownloading
              ? "bg-orange text-primary-foreground shadow-lg hover:bg-orange/90"
              : "pointer-events-none bg-white/20 text-white/60"
          }`}
        >
          {isDownloading ? (
            <span className="text-[10px] font-bold leading-none">
              {getCompactProgressLabel()}
            </span>
          ) : (
            <Download className="h-4 w-4" />
          )}
        </button>

        {isDownloading ? (
          <div className="absolute left-2 right-2 top-2 z-20 h-1 overflow-hidden rounded-full bg-black/45">
            <div
              className="h-full bg-orange transition-all"
              style={{ width: getProgressBarWidth() }}
            />
          </div>
        ) : null}

        {isDownloading ? (
          <div className="absolute left-2 top-4 z-20 rounded bg-black/65 px-1.5 py-0.5 text-[9px] text-white">
            {formatSpeed(downloadSpeed)} • {formatEta(downloadEta)}
          </div>
        ) : null}

        {/* Price Tag */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
          <span className="text-green font-bold text-xs sm:text-sm">
            {formatPrice(movie.price)}
          </span>
        </div>

        {/* Quality Badge */}
        {movie.quality && (
          <div className="absolute top-2 right-2">
              <span className="px-1.5 sm:px-2 py-0.5 bg-orange text-primary-foreground text-[10px] font-bold rounded">
              {movie.quality}
            </span>
          </div>
        )}

        {/* Episodes Badge */}
        {movie.episodes && (
          <div className="absolute top-2 left-2">
              <span className="px-1.5 sm:px-2 py-0.5 bg-blue text-foreground text-[10px] font-bold rounded">
              EP {movie.episodes}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div>
        <h3 className="text-foreground font-medium text-xs sm:text-sm line-clamp-2 group-hover:text-orange transition-colors">
          {movie.title}
        </h3>
        {movie.year && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-muted-foreground text-xs">{movie.year}</span>
          </div>
        )}
      </div>
      </div>

      <Dialog open={selectorOpen} onOpenChange={setSelectorOpen}>
        <DialogContent className="max-w-6xl overflow-hidden border border-white/10 bg-[#090909] p-0 shadow-[0_30px_120px_rgba(0,0,0,0.6)]">
          <div className="relative">
            <div className="relative h-[26rem] overflow-hidden sm:h-[28rem]">
              <Image
                src={movie.image}
                alt={movie.title}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.25),_transparent_32%),radial-gradient(circle_at_left,_rgba(255,255,255,0.14),_transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.05),transparent_40%)]" />

              <div className="absolute left-0 right-0 top-0 flex items-center justify-between gap-3 p-4 sm:p-6">
                <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-xl">
                  <span className="h-2 w-2 rounded-full bg-orange shadow-[0_0_18px_rgba(249,115,22,0.8)]" />
                  Media Library
                </div>
                <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-xl">
                  {movie.quality || "HD"}
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                <div className="grid gap-4 lg:grid-cols-[220px_1fr] lg:items-end">
                  <div className="relative hidden aspect-[2/3] overflow-hidden rounded-3xl border border-white/15 shadow-2xl lg:block">
                    <Image
                      src={movie.image}
                      alt={movie.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                  </div>

                  <div className="space-y-4 text-left">
                    <DialogHeader className="max-w-3xl text-left">
                      <DialogTitle className="text-3xl font-black tracking-tight text-white sm:text-5xl">
                        {movie.title}
                      </DialogTitle>
                      <DialogDescription className="max-w-2xl text-sm leading-6 text-white/72 sm:text-base">
                        Open the media, browse each available version, and download one item at a time using the same cover artwork for a consistent premium feel.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                      <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-white backdrop-blur-xl">
                        {formatPrice(movie.price)}
                      </span>
                      {movie.year ? (
                        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-white backdrop-blur-xl">
                          {movie.year}
                        </span>
                      ) : null}
                      {movie.episodes ? (
                        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-white backdrop-blur-xl">
                          {movie.episodes} episodes
                        </span>
                      ) : null}
                      {movie.quality ? (
                        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-white backdrop-blur-xl">
                          {movie.quality}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 bg-[#0f0f0f] px-4 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-lg font-semibold text-white sm:text-xl">Choose what to download</h4>
                  <p className="text-sm text-white/55">Each item has its own download action.</p>
                </div>
                <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 sm:block">
                  {mediaGroups.length} group{mediaGroups.length === 1 ? "" : "s"}
                </div>
              </div>

              <div className="max-h-[50vh] space-y-6 overflow-y-auto pr-1">
                {mediaGroups.length > 0 ? (
                  mediaGroups.map((group) => (
                    <section key={group.title} className="space-y-3">
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <h5 className="text-base font-semibold text-white sm:text-lg">{group.title}</h5>
                          <p className="text-xs text-white/55">{group.countLabel}</p>
                        </div>
                        <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
                      </div>

                      <div className="grid gap-3">
                        {group.items.map((target) => (
                          <div
                            key={target.key}
                            className="group/item relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-orange/40 hover:bg-white/[0.07] hover:shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
                          >
                            <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.03),transparent)] opacity-0 transition-opacity duration-300 group-hover/item:opacity-100" />
                            <div className="relative flex items-center gap-3 sm:gap-4">
                              <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-2xl border border-white/10 shadow-lg sm:h-20 sm:w-14">
                                <Image
                                  src={movie.image}
                                  alt={movie.title}
                                  fill
                                  className="object-cover"
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-white sm:text-base">
                                  {target.label}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-white/55 sm:text-xs">
                                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">{movie.title}</span>
                                  {movie.quality ? (
                                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">{movie.quality}</span>
                                  ) : null}
                                </div>
                              </div>

                              <Button
                                type="button"
                                size="icon"
                                className="shrink-0 rounded-full bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/25 transition-transform hover:scale-105 hover:from-orange-400 hover:to-amber-500"
                                onClick={async () => {
                                  setSelectorOpen(false)
                                  await handleDownload(target.query, target.label)
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))
                ) : (
                  <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-sm text-white/60">
                    No downloadable items found.
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
