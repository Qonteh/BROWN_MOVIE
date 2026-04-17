"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ChevronLeft, ChevronRight, Play, Download } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { formatPrice, type Movie } from "@/lib/movies-data"
import { downloadFileWithProgress } from "@/lib/download-client"
import { getAuthToken } from "@/lib/auth"

interface HeroCarouselProps {
  onMovieClick?: (movie: Movie) => void
}

const DEFAULT_HERO_SUBTITLE =
  "Furaha ya sinema inakuja kwenye kiganja chako. Download sasa na ufurahie movie hii ya kipekee."

type HeroSlideApiRow = {
  id: string
  title: string
  subtitle: string | null
  description: string | null
  image_url: string
  cta_text: string | null
  cta_link: string | null
  trailer_link: string | null
  download_link: string | null
  hero_price: string | number | null
  movie_id: string | null
  movie_title: string | null
  movie_price: string | number | null
  movie_image: string | null
  movie_category: string | null
  movie_year: number | null
  movie_quality: string | null
  movie_download_url: string | null
}

type HeroSlide = {
  id: string
  image: string
  title: string
  subtitle: string
  ctaText: string
  ctaLink: string | null
  trailerLink: string | null
  downloadLink: string | null
  hasDownloadSource: boolean
  movie: Movie
}

export function HeroCarousel({ onMovieClick }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isDownloadingHero, setIsDownloadingHero] = useState(false)
  const [heroDownloadProgress, setHeroDownloadProgress] = useState<number | null>(null)
  const [heroDownloadedBytes, setHeroDownloadedBytes] = useState(0)
  const [heroDownloadSpeed, setHeroDownloadSpeed] = useState<number | null>(null)
  const [heroDownloadEta, setHeroDownloadEta] = useState<number | null>(null)
  const [heroDownloadToastId, setHeroDownloadToastId] = useState<string | number | null>(null)
  const [slides, setSlides] = useState<HeroSlide[]>([])
  const [failedSlideIds, setFailedSlideIds] = useState<string[]>([])
  const touchStartXRef = useRef<number | null>(null)
  const touchEndXRef = useRef<number | null>(null)

  useEffect(() => {
    const loadSlides = async () => {
      try {
        const response = await fetch("/api/hero-slides", { cache: "no-store" })
        const data = await response.json().catch(() => ({}))
        if (!response.ok || !data.success || !Array.isArray(data.slides)) {
          return
        }

        const mappedSlides = (data.slides as HeroSlideApiRow[])
          .filter((row) => row.image_url && row.title)
          .map((row) => ({
            id: row.id,
            image: row.image_url,
            title: row.title,
            subtitle: row.subtitle?.trim() || DEFAULT_HERO_SUBTITLE,
            ctaText: row.cta_text || "Nunua",
            ctaLink: row.cta_link,
            trailerLink: row.trailer_link,
            downloadLink: row.download_link,
            hasDownloadSource: Boolean(row.download_link || row.movie_download_url),
            movie: {
              id: row.movie_id || row.id,
              title: row.movie_title || row.title,
              price: Number(row.hero_price ?? row.movie_price ?? 0),
              image: row.movie_image || row.image_url,
              category: row.movie_category || "hero",
              year: row.movie_year || undefined,
              quality: row.movie_quality || "HD",
            },
          }))

        if (mappedSlides.length > 0) {
          setSlides(mappedSlides)
          setCurrentIndex(0)
        }
      } catch {
        setSlides([])
      }
    }

    loadSlides()
  }, [])

  const activeSlides: HeroSlide[] = slides.filter((slide) => !failedSlideIds.includes(slide.id))
  const hasActiveSlides = activeSlides.length > 0
  const safeCurrentIndex = hasActiveSlides && currentIndex < activeSlides.length ? currentIndex : 0
  const currentSlide = activeSlides[safeCurrentIndex] ?? null

  const nextSlide = useCallback(() => {
    if (activeSlides.length === 0) return
    if (isAnimating) return
    setIsAnimating(true)
    setCurrentIndex((prev) => (prev + 1) % activeSlides.length)
    setTimeout(() => setIsAnimating(false), 500)
  }, [isAnimating, activeSlides.length])

  const prevSlide = () => {
    if (activeSlides.length === 0) return
    if (isAnimating) return
    setIsAnimating(true)
    setCurrentIndex((prev) => (prev - 1 + activeSlides.length) % activeSlides.length)
    setTimeout(() => setIsAnimating(false), 500)
  }

  useEffect(() => {
    if (activeSlides.length === 0) {
      setCurrentIndex(0)
      return
    }

    if (currentIndex >= activeSlides.length) {
      setCurrentIndex(0)
    }
  }, [activeSlides.length, currentIndex])

  // Keep hero static by default to avoid repeated heavy image decoding on low-memory devices.

  if (!currentSlide) {
    return null
  }

  const currentMovie = currentSlide.movie

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

  const formatDownloadedMb = (bytes: number) => {
    if (!bytes || bytes <= 0) return "0 MB"
    return `${Math.max(1, Math.round(bytes / (1024 * 1024)))} MB`
  }

  const updateHeroToast = (text: string) => {
    if (!heroDownloadToastId) return
    toast.loading(text, { id: heroDownloadToastId })
  }

  const handleHeroDownload = async () => {
    if (!currentSlide.hasDownloadSource || isDownloadingHero) return

    setIsDownloadingHero(true)
    setHeroDownloadProgress(0)
    setHeroDownloadedBytes(0)
    setHeroDownloadSpeed(null)
    setHeroDownloadEta(null)

    const initialToastId = toast.loading(`Downloading ${currentMovie.title}...`)
    setHeroDownloadToastId(initialToastId)

    try {
      const token = getAuthToken()
      await downloadFileWithProgress({
        url: `/api/hero-slides/${currentSlide.id}/download`,
        fallbackFileName: `${currentMovie.title}.mp4`,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        onProgress: ({ percentage, loadedBytes, speedBytesPerSecond, etaSeconds }) => {
          setHeroDownloadProgress(percentage)
          setHeroDownloadedBytes(loadedBytes)
          setHeroDownloadSpeed(speedBytesPerSecond)
          setHeroDownloadEta(etaSeconds)

          const progressLabel =
            percentage !== null
              ? `${percentage}%`
              : formatDownloadedMb(loadedBytes)
          const speedLabel =
            speedBytesPerSecond && speedBytesPerSecond > 0
              ? `${(speedBytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`
              : "--"
          const etaLabel =
            etaSeconds !== null && Number.isFinite(etaSeconds)
              ? `${Math.max(0, Math.ceil(etaSeconds))}s`
              : "--"

          updateHeroToast(`Downloading ${progressLabel} • ${speedLabel} • ETA ${etaLabel}`)
        },
      })

      toast.success(`Downloaded ${currentMovie.title}`, { id: initialToastId })
    } catch {
      toast.error(`Download failed for ${currentMovie.title}`, { id: initialToastId })
      onMovieClick?.(currentMovie)
    } finally {
      setIsDownloadingHero(false)
      setHeroDownloadProgress(null)
      setHeroDownloadedBytes(0)
      setHeroDownloadSpeed(null)
      setHeroDownloadEta(null)
      setHeroDownloadToastId(null)
    }
  }

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = event.changedTouches[0]?.clientX ?? null
    touchEndXRef.current = null
  }

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    touchEndXRef.current = event.changedTouches[0]?.clientX ?? null
  }

  const handleTouchEnd = () => {
    const start = touchStartXRef.current
    const end = touchEndXRef.current
    if (start === null || end === null) return

    const deltaX = start - end
    const swipeThreshold = 50

    if (deltaX > swipeThreshold) {
      nextSlide()
    } else if (deltaX < -swipeThreshold) {
      prevSlide()
    }
  }

  return (
    <div
      className="relative w-full h-[60vh] md:h-[70vh] lg:h-[85vh] overflow-hidden touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Active background image only to avoid loading all hero images at once */}
      <div className="absolute inset-0 pointer-events-none transition-all duration-700 opacity-100 scale-100">
        <img
          src={currentSlide.image}
          alt={currentSlide.title}
          className="h-full w-full object-cover"
          loading="eager"
          decoding="async"
          onError={() => {
            setFailedSlideIds((prev) =>
              prev.includes(currentSlide.id) ? prev : [...prev, currentSlide.id],
            )
          }}
        />
      </div>
      
      {/* Gradient Overlays */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-background via-background/60 to-transparent" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-background/90 via-background/40 to-transparent" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-background/50 via-transparent to-transparent h-32" />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-end pb-20 md:pb-28 lg:pb-32 px-4 md:px-8 lg:px-16">
        <div className="container mx-auto">
          {/* Quality Badge */}
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-orange text-primary-foreground text-xs font-bold rounded-full">
              {currentMovie.quality || "HD"}
            </span>
            <span className="px-3 py-1 bg-secondary/80 backdrop-blur text-foreground text-xs font-medium rounded-full">
              {currentMovie.year || "New"}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold text-foreground mb-4 tracking-tight max-w-3xl">
            {currentSlide.title}
          </h1>

          {/* Description */}
          <p
            suppressHydrationWarning
            className="text-muted-foreground text-sm md:text-base lg:text-lg max-w-2xl mb-6 line-clamp-2"
          >
            {currentSlide.subtitle}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Button 
              onClick={handleHeroDownload}
              disabled={!currentSlide.hasDownloadSource || isDownloadingHero}
              size="lg"
              className="bg-orange hover:bg-orange/90 text-primary-foreground font-bold px-6 md:px-8 rounded-full glow-orange text-base md:text-lg"
            >
              <Download className="w-5 h-5 mr-2" />
              <span suppressHydrationWarning translate="no" className="notranslate">
                {isDownloadingHero
                  ? heroDownloadProgress !== null
                    ? `Downloading ${heroDownloadProgress}%`
                    : `Downloading ${formatDownloadedMb(heroDownloadedBytes)}`
                  : currentSlide.ctaText || "Download"}
                {currentMovie.price > 0 ? ` - ${formatPrice(currentMovie.price)}` : ""}
              </span>
            </Button>
            {isDownloadingHero ? (
              <span className="text-xs text-muted-foreground">
                {formatDownloadedMb(heroDownloadedBytes)} • {formatSpeed(heroDownloadSpeed)} • ETA {formatEta(heroDownloadEta)}
              </span>
            ) : null}
            <Button 
              variant="outline"
              size="lg"
              className="border-foreground/20 text-foreground hover:bg-foreground/10 px-6 md:px-8 rounded-full"
              disabled={!currentSlide.trailerLink}
              onClick={() => {
                if (currentSlide.trailerLink) {
                  window.open(currentSlide.trailerLink, "_blank", "noopener,noreferrer")
                }
              }}
            >
              <Play className="w-5 h-5 mr-2" />
              <span suppressHydrationWarning translate="no" className="notranslate">
                Trailer
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-2 sm:left-4 md:left-8 bottom-20 sm:bottom-24 md:bottom-auto md:top-1/2 md:-translate-y-1/2 z-20 p-2 md:p-3 rounded-full bg-secondary/60 backdrop-blur text-foreground hover:bg-secondary transition-all hover:scale-110 pointer-events-auto"
        aria-label="Previous slide"
        type="button"
      >
        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-2 sm:right-4 md:right-8 bottom-20 sm:bottom-24 md:bottom-auto md:top-1/2 md:-translate-y-1/2 z-20 p-2 md:p-3 rounded-full bg-secondary/60 backdrop-blur text-foreground hover:bg-secondary transition-all hover:scale-110 pointer-events-auto"
        aria-label="Next slide"
        type="button"
      >
        <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
      </button>

      {/* Progress Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {activeSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className="group relative h-1.5 rounded-full overflow-hidden transition-all"
            style={{ width: index === safeCurrentIndex ? '48px' : '24px' }}
            aria-label={`Go to slide ${index + 1}`}
            type="button"
          >
            <div className="absolute inset-0 bg-foreground/30" />
            <div 
              className={`absolute inset-0 bg-orange transition-transform duration-300 origin-left ${
                index === safeCurrentIndex ? "scale-x-100" : "scale-x-0"
              }`}
              style={{ transitionTimingFunction: 'linear' }}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
