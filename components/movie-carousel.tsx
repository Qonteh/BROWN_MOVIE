"use client"

import { useRef, useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MovieCard } from "@/components/movie-card"
import { type Movie } from "@/lib/movies-data"

interface MovieCarouselProps {
  title: string
  movies: Movie[]
  accentColor?: "red" | "orange" | "green" | "blue" | "pink" | "purple"
  onViewAll?: () => void
}

export function MovieCarousel({ 
  title, 
  movies, 
  accentColor = "orange",
  onViewAll 
}: MovieCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  useEffect(() => {
    checkScroll()
    const ref = scrollRef.current
    if (ref) {
      ref.addEventListener('scroll', checkScroll)
      return () => ref.removeEventListener('scroll', checkScroll)
    }
  }, [])

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 400
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
    }
  }

  const accentColors = {
    red: "bg-red",
    orange: "bg-orange",
    green: "bg-green",
    blue: "bg-blue",
    pink: "bg-pink-500",
    purple: "bg-purple-500",
  }

  return (
    <section className="py-5 md:py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 md:mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-1 h-7 ${accentColors[accentColor]} rounded-full`} />
            <h2 className="text-lg md:text-xl font-bold text-foreground uppercase tracking-wide">
              {title}
            </h2>
          </div>
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="flex items-center gap-1 text-orange hover:text-orange/80 text-sm font-medium transition-colors"
            >
              Tazama Zote
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Carousel */}
        <div className="relative group">
          {/* Left Arrow */}
          {canScrollLeft && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => scroll("left")}
              className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-secondary/90 backdrop-blur hover:bg-secondary text-foreground rounded-full shadow-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}

          {/* Right Arrow */}
          {canScrollRight && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => scroll("right")}
              className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-secondary/90 backdrop-blur hover:bg-secondary text-foreground rounded-full shadow-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          )}

          {/* Movies Container */}
          <div
            ref={scrollRef}
            className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide pb-3 md:pb-4 -mx-4 px-4"
          >
            {movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>

          {/* Fade Edges */}
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-4 w-12 bg-gradient-to-r from-background to-transparent pointer-events-none" />
          )}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
          )}
        </div>
      </div>
    </section>
  )
}
