"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { HeroCarousel } from "@/components/hero-carousel"
import { SearchBar } from "@/components/search-bar"
import { CategoryGrid } from "@/components/category-grid"
import { MovieCarousel } from "@/components/movie-carousel"
import { MovieCard } from "@/components/movie-card"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { type Movie } from "@/lib/movies-data"
import { getAuthToken, savePendingPurchase } from "@/lib/auth"

type SectionGroup = "movies" | "series" | "cartoons"

type MovieSection = {
  title: string
  accentColor: "red" | "orange" | "green" | "blue" | "pink" | "purple"
  group: SectionGroup
  movies: Movie[]
}

type MovieApiRow = {
  id: string
  title: string
  poster_url: string | null
  download_url: string | null
  price: number | string
  release_year: number | null
  quality: string | null
  episodes_count: number | null
  seasons_count: number | null
  content_type: "movie" | "series"
  is_featured: boolean
  is_new: boolean
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
  category_slugs: string[] | null
  category_names: string[] | null
}

const SECTION_DEFINITIONS: Array<{
  title: string
  accentColor: MovieSection["accentColor"]
  group: SectionGroup
  slugs: string[]
  includeFeatured?: boolean
}> = [
  { title: "Mpya za Wiki", slugs: ["mpya-za-wiki"], accentColor: "red", group: "movies", includeFeatured: true },
  { title: "Katuni", slugs: ["katuni-animation", "katuni"], accentColor: "pink", group: "cartoons" },
  { title: "Movies za Action", slugs: ["action-kusisimua"], accentColor: "orange", group: "movies" },
  { title: "Movies za Wahindi", slugs: ["wahindi"], accentColor: "orange", group: "movies" },
  { title: "Movies za Kutisha", slugs: ["kutisha-horror"], accentColor: "purple", group: "movies" },
  { title: "Movies za Kuchekesha", slugs: ["kuchekesha-comedy"], accentColor: "green", group: "movies" },
  { title: "Season za Korea", slugs: ["korea"], accentColor: "pink", group: "series" },
  { title: "Season za Kichina", slugs: ["kichina", "wachina-japan"], accentColor: "red", group: "series" },
  { title: "Season za Kihindi", slugs: ["indian-series", "kihindi", "wahindi"], accentColor: "orange", group: "series" },
  { title: "Season za Kizungu", slugs: ["kizungu"], accentColor: "blue", group: "series" },
  { title: "Season za Kituruki", slugs: ["kituruki"], accentColor: "green", group: "series" },
  { title: "Season za Kifilipino", slugs: ["kifilipino"], accentColor: "pink", group: "series" },
  { title: "Season za Thailand", slugs: ["thailand"], accentColor: "purple", group: "series" },
]

function toMovie(row: MovieApiRow): Movie {
  const categorySlug = row.category_slugs?.[0] || (row.content_type === "series" ? "series" : "movie")

  return {
    id: row.id,
    title: row.title,
    price: Number(row.price || 0),
    image: row.poster_url || "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&h=600&fit=crop",
    category: categorySlug,
    downloadUrl: row.download_url || undefined,
    year: row.release_year || undefined,
    episodes: row.content_type === "series" ? String(row.episodes_count || row.seasons_count || "") : undefined,
    quality: row.quality || "HD",
    movieParts: Array.isArray(row.movie_parts)
      ? row.movie_parts
          .map((part, index) => ({
            id: part?.id,
            title: part?.title || `Part ${index + 1}`,
            partNumber: part?.partNumber || index + 1,
            url: part?.url || "",
          }))
          .filter((part) => part.url)
      : [],
    seriesSeasons: Array.isArray(row.series_seasons)
      ? row.series_seasons.map((season, seasonIndex) => ({
          id: season?.id,
          title: season?.title || `Season ${seasonIndex + 1}`,
          seasonNumber: season?.seasonNumber || seasonIndex + 1,
          episodes: Array.isArray(season?.episodes)
            ? season.episodes
                .map((episode, episodeIndex) => ({
                  id: episode?.id,
                  title: episode?.title || `Episode ${episodeIndex + 1}`,
                  episodeNumber: episode?.episodeNumber || episodeIndex + 1,
                  url: episode?.url || "",
                }))
                .filter((episode) => episode.url)
            : [],
        }))
      : [],
  }
}

function matchesSection(movie: MovieApiRow, slugs: string[], includeFeatured = false) {
  const categorySlugs = movie.category_slugs || []
  if (includeFeatured && (movie.is_featured || movie.is_new)) {
    return true
  }

  return categorySlugs.some((slug) => slugs.includes(slug))
}

function matchesSearch(movie: Movie, query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return true

  const searchableFields = [
    movie.title,
    movie.category,
    movie.quality,
    movie.episodes,
    movie.year?.toString(),
  ].filter(Boolean) as string[]

  return searchableFields.some((value) => value.toLowerCase().includes(normalizedQuery))
}

export default function HomePage() {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategorySlug, setSelectedCategorySlug] = useState("all")
  const [viewAllSectionTitle, setViewAllSectionTitle] = useState<string | null>(null)
  const [movieRows, setMovieRows] = useState<MovieApiRow[]>([])
  const [loadingMovies, setLoadingMovies] = useState(true)
  const [movieError, setMovieError] = useState("")

  useEffect(() => {
    const loadMovies = async () => {
      setLoadingMovies(true)
      setMovieError("")

      try {
        const response = await fetch("/api/movies", { cache: "no-store" })
        const data = await response.json().catch(() => ({}))

        if (!response.ok || !data.success || !Array.isArray(data.movies)) {
          throw new Error(data.error || "Failed to load movies")
        }

        setMovieRows(data.movies)
      } catch (error) {
        setMovieError(error instanceof Error ? error.message : "Failed to load movies")
        setMovieRows([])
      } finally {
        setLoadingMovies(false)
      }
    }

    loadMovies()
  }, [])

  const handleMovieClick = (movie: Movie) => {
    savePendingPurchase(movie)

    const token = getAuthToken()
    if (!token) {
      router.push("/auth?mode=signup&redirect=/checkout")
      return
    }

    router.push("/checkout")
  }

  const normalizedSearchQuery = searchQuery.trim()
  const hasSearchQuery = normalizedSearchQuery.length > 0

  const normalizeCategorySlug = (slug: string) => {
    const aliases: Record<string, string> = {
      kihindi: "hindi",
      wahindi: "hindi",
      "indian-series": "hindi",
      cartoon: "katuni-animation",
      katuni: "katuni-animation",
      "wachina-japan": "kichina",
    }
    return aliases[slug] ?? slug
  }

  const scrollToMovies = () => {
    const target = document.getElementById("movies")
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  const handleMainCategoryClick = (slug: string) => {
    setViewAllSectionTitle(null)
    setSelectedCategorySlug(slug)
    setActiveFilter("all")
    scrollToMovies()
  }

  const handleSeasonCategoryClick = (slug: string) => {
    setViewAllSectionTitle(null)
    setSelectedCategorySlug(slug)
    setActiveFilter("series")
    scrollToMovies()
  }

  const handleAllCategoriesClick = () => {
    setViewAllSectionTitle(null)
    setSelectedCategorySlug("all")
    setActiveFilter("all")
    scrollToMovies()
  }

  const movieSections = useMemo(() => {
    const mappedMovies = movieRows.map((row) => ({
      row,
      movie: toMovie(row),
    }))

    const assignedMovieIds = new Set<string>()
    const groupedSections = SECTION_DEFINITIONS
      .map((section) => {
        const movies = mappedMovies
          .filter(({ row, movie }) => {
            if (assignedMovieIds.has(movie.id)) return false
            return matchesSection(row, section.slugs, section.includeFeatured)
          })
          .map(({ movie }) => {
            assignedMovieIds.add(movie.id)
            return movie
          })

        return {
          title: section.title,
          accentColor: section.accentColor,
          group: section.group,
          movies,
        }
      })
      .filter((section) => section.movies.length > 0)

    const uncategorized = mappedMovies
      .map(({ movie }) => movie)
      .filter((movie) => !assignedMovieIds.has(movie.id))

    if (uncategorized.length > 0) {
      groupedSections.push({
        title: "Zilizopakiwa Bila Kundi",
        accentColor: "blue",
        group: "movies",
        movies: uncategorized,
      })
    }

    return groupedSections
  }, [movieRows])

  const visibleSections = useMemo(() => {
    const filterByGroup = (section: MovieSection) => {
      if (activeFilter === "all") return true
      if (activeFilter === "movies") return section.group === "movies"
      if (activeFilter === "series") return section.group === "series"
      if (activeFilter === "cartoons") return section.group === "cartoons"
      return true
    }

    return movieSections
      .filter(filterByGroup)
      .map((section) => ({
        ...section,
        movies: section.movies.filter((movie) => {
          const matchesCategory =
            selectedCategorySlug === "all" ||
            normalizeCategorySlug(movie.category) === normalizeCategorySlug(selectedCategorySlug)
          return matchesCategory && matchesSearch(movie, normalizedSearchQuery)
        }),
      }))
      .filter((section) => section.movies.length > 0)
  }, [activeFilter, normalizedSearchQuery, movieSections, selectedCategorySlug])

  const searchResults = useMemo(() => {
    if (!hasSearchQuery) return [] as Movie[]

    return movieSections
      .filter((section) => {
        if (activeFilter === "all") return true
        if (activeFilter === "movies") return section.group === "movies"
        if (activeFilter === "series") return section.group === "series"
        if (activeFilter === "cartoons") return section.group === "cartoons"
        return true
      })
      .flatMap((section) => section.movies)
      .filter((movie, index, list) => list.findIndex((entry) => entry.id === movie.id) === index)
      .filter(
        (movie) =>
          selectedCategorySlug === "all" ||
          normalizeCategorySlug(movie.category) === normalizeCategorySlug(selectedCategorySlug),
      )
      .filter((movie) => matchesSearch(movie, normalizedSearchQuery))
  }, [activeFilter, hasSearchQuery, normalizedSearchQuery, movieSections, selectedCategorySlug])

  const selectedViewAllSection = useMemo(
    () => (viewAllSectionTitle ? visibleSections.find((section) => section.title === viewAllSectionTitle) ?? null : null),
    [viewAllSectionTitle, visibleSections],
  )

  useEffect(() => {
    if (!viewAllSectionTitle) return
    const stillVisible = visibleSections.some((section) => section.title === viewAllSectionTitle)
    if (!stillVisible) {
      setViewAllSectionTitle(null)
    }
  }, [viewAllSectionTitle, visibleSections])

  let moviesContent: ReactNode
  if (loadingMovies) {
    moviesContent = (
      <div className="container mx-auto px-4 py-10">
        <div className="rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground shadow-lg">
          Loading movies...
        </div>
      </div>
    )
  } else if (hasSearchQuery) {
    moviesContent = searchResults.length > 0 ? (
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/70 p-4 backdrop-blur">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-foreground">
              Matokeo ya Utafutaji
            </h2>
            <p className="text-sm text-muted-foreground">
              Tumepata {searchResults.length} kwa “{normalizedSearchQuery}”
            </p>
          </div>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => setSearchQuery("")}
          >
            Futa Search
          </Button>
        </div>

        <MovieCarousel
          title="Matokeo"
          movies={searchResults}
          accentColor="blue"
          onViewAll={() => {}}
        />
      </div>
    ) : (
      <div className="container mx-auto px-4 py-8 md:py-10">
        <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-lg">
          <h2 className="text-xl font-bold text-foreground">Hakuna matokeo</h2>
          <p className="mt-2 text-muted-foreground">
            Jaribu jina tofauti au badilisha filter ili kupata content.
          </p>
          <Button
            className="mt-5 rounded-full bg-orange text-primary-foreground hover:bg-orange/90"
            onClick={() => setSearchQuery("")}
          >
            Safisha Search
          </Button>
        </div>
      </div>
    )
  } else if (movieError) {
    moviesContent = (
      <div className="container mx-auto px-4 py-10">
        <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-8 text-center text-sm text-destructive shadow-lg">
          Unable to load movies right now. Please try again in a moment.
        </div>
      </div>
    )
  } else if (visibleSections.length === 0) {
    moviesContent = (
      <div className="container mx-auto px-4 py-10">
        <div className="rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground shadow-lg">
          No movies have been uploaded yet.
        </div>
      </div>
    )
  } else {
    moviesContent = (
      <>
        {selectedViewAllSection ? (
          <div className="container mx-auto px-4 py-6 md:py-8">
            <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/70 p-4 backdrop-blur">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-foreground">{selectedViewAllSection.title}</h2>
                <p className="text-sm text-muted-foreground">Content zote: {selectedViewAllSection.movies.length}</p>
              </div>
              <Button variant="outline" className="rounded-full" onClick={() => setViewAllSectionTitle(null)}>
                Funga
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {selectedViewAllSection.movies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          </div>
        ) : null}

        {visibleSections
          .filter((section) => section.group !== "series")
          .filter((section) => !selectedViewAllSection || section.title === selectedViewAllSection.title)
          .map((section) => (
            <MovieCarousel
              key={section.title}
              title={section.title}
              movies={section.movies}
              accentColor={section.accentColor}
              onViewAll={() => {
                setViewAllSectionTitle(section.title)
                scrollToMovies()
              }}
            />
          ))}
      </>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-16 lg:pt-20">
        {/* Hero Carousel */}
        <HeroCarousel onMovieClick={handleMovieClick} />

        {/* Search Bar */}
        <SearchBar 
          activeFilter={activeFilter}
          onFilterChange={(value) => {
            setViewAllSectionTitle(null)
            setActiveFilter(value)
            if (value !== "all") {
              setSelectedCategorySlug("all")
            }
          }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Main Categories */}
        <CategoryGrid
          onCategoryClick={handleMainCategoryClick}
          onAllClick={handleAllCategoriesClick}
          activeCategorySlug={selectedCategorySlug}
        />

        {/* Movie Sections */}
        <div id="movies" className="space-y-2">
          {moviesContent}
        </div>

        {/* Season Sub-Categories */}
        <div className="mt-8">
          <CategoryGrid
            showSeasons
            onCategoryClick={handleSeasonCategoryClick}
            onAllClick={handleAllCategoriesClick}
            activeCategorySlug={selectedCategorySlug}
          />
        </div>

        {/* Series / Seasons Section */}
        {!hasSearchQuery && activeFilter !== "movies" && activeFilter !== "cartoons" && (
          <div id="series" className="space-y-2">
            {visibleSections
              .filter((section) => section.group === "series")
              .map((section) => (
                <MovieCarousel
                  key={section.title}
                  title={section.title}
                  movies={section.movies}
                  accentColor={section.accentColor}
                  onViewAll={() => {
                    setViewAllSectionTitle(section.title)
                    scrollToMovies()
                  }}
                />
              ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
