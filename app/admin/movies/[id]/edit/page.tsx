"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Film, Link as LinkIcon, Upload, Loader2, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

type CategoryOption = {
  id: string
  name: string
  slug: string
  parent_slug: string | null
}

const qualities = [
  { value: "HD", label: "HD (720p)" },
  { value: "FHD", label: "Full HD (1080p)" },
  { value: "4K", label: "4K Ultra HD" },
]

type MoviePartForm = {
  url: string
}

type EpisodeForm = {
  title: string
  episodeNumber: string
  url: string
}

type SeasonForm = {
  title: string
  seasonNumber: string
  episodes: EpisodeForm[]
}

export default function EditMoviePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const movieId = params?.id

  const [loadingMovie, setLoadingMovie] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [submitSuccess, setSubmitSuccess] = useState("")
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [contentType, setContentType] = useState<"movie" | "series">("movie")
  const [posterInputMode, setPosterInputMode] = useState<"link" | "upload">("link")
  const [backdropInputMode, setBackdropInputMode] = useState<"link" | "upload">("link")
  const [isUploadingPoster, setIsUploadingPoster] = useState(false)
  const [isUploadingBackdrop, setIsUploadingBackdrop] = useState(false)
  const [mediaStatus, setMediaStatus] = useState("")

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    seasonCategory: "",
    quality: "HD",
    releaseYear: new Date().getFullYear().toString(),
    language: "English",
    posterUrl: "",
    backdropUrl: "",
    trailerUrl: "",
    downloadUrl: "",
    episodes: "1",
    seasons: "1",
    movieParts: [{ url: "" }] as MoviePartForm[],
    seriesSeasons: [{
      title: "Season 1",
      seasonNumber: "1",
      episodes: [{ title: "Episode 1", episodeNumber: "1", url: "" }],
    }] as SeasonForm[],
    isFeatured: false,
    isNew: false,
    isTrending: false,
    isActive: true,
  })

  const movieCategoryOptions = useMemo(
    () => categories.filter((category) => category.parent_slug === null && category.slug !== "season"),
    [categories],
  )

  const seasonCategoryOptions = useMemo(
    () => categories.filter((category) => category.parent_slug === "season"),
    [categories],
  )

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  useEffect(() => {
    const loadCategories = async () => {
      setIsLoadingCategories(true)
      try {
        const response = await fetch("/api/admin/categories", { cache: "no-store" })
        const data = await response.json().catch(() => ({}))
        if (!response.ok || !data.success || !Array.isArray(data.categories)) {
          setCategories([])
          return
        }

        setCategories(
          data.categories
            .filter((category: { id?: string; name?: string; slug?: string }) => category.id && category.name && category.slug)
            .map((category: CategoryOption) => ({
              id: category.id,
              name: category.name,
              slug: category.slug,
              parent_slug: category.parent_slug,
            })),
        )
      } catch {
        setCategories([])
      } finally {
        setIsLoadingCategories(false)
      }
    }

    loadCategories()
  }, [])

  useEffect(() => {
    const loadMovie = async () => {
      if (!movieId) return

      setLoadingMovie(true)
      setSubmitError("")

      try {
        const response = await fetch(`/api/admin/movies/${movieId}`, { cache: "no-store" })
        const data = await response.json().catch(() => ({}))

        if (!response.ok || !data.success || !data.movie) {
          throw new Error(data.error || "Failed to load movie")
        }

        const movie = data.movie
        const nextType: "movie" | "series" = movie.content_type === "series" ? "series" : "movie"
        setContentType(nextType)

        const movieParts = Array.isArray(movie.movie_parts)
          ? movie.movie_parts.map((part: { url?: string }) => ({
              url: part?.url || "",
            }))
          : []

        const seriesSeasons = Array.isArray(movie.series_seasons)
          ? movie.series_seasons.map((season: {
              title?: string
              seasonNumber?: number
              episodes?: Array<{ title?: string; episodeNumber?: number; url?: string }>
            }, seasonIndex: number) => ({
              title: season?.title || `Season ${seasonIndex + 1}`,
              seasonNumber: String(season?.seasonNumber || seasonIndex + 1),
              episodes: Array.isArray(season?.episodes) && season.episodes.length > 0
                ? season.episodes.map((episode, episodeIndex) => ({
                    title: episode?.title || `Episode ${episodeIndex + 1}`,
                    episodeNumber: String(episode?.episodeNumber || episodeIndex + 1),
                    url: episode?.url || "",
                  }))
                : [{ title: "Episode 1", episodeNumber: "1", url: "" }],
            }))
          : []

        setFormData({
          title: movie.title || "",
          description: movie.description || "",
          price: String(Number(movie.price || 0)),
          category: nextType === "movie" ? (movie.category_slug || "") : "",
          seasonCategory: nextType === "series" ? (movie.category_slug || "") : "",
          quality: movie.quality || "HD",
          releaseYear: movie.release_year ? String(movie.release_year) : new Date().getFullYear().toString(),
          language: movie.language || "English",
          posterUrl: movie.poster_url || "",
          backdropUrl: movie.backdrop_url || "",
          trailerUrl: movie.trailer_url || "",
          downloadUrl: movie.download_url || "",
          episodes: String(Number(movie.episodes_count || 1)),
          seasons: String(Number(movie.seasons_count || 1)),
          movieParts: movieParts.length > 0 ? movieParts : [{ url: "" }],
          seriesSeasons: seriesSeasons.length > 0
            ? seriesSeasons
            : [{ title: "Season 1", seasonNumber: "1", episodes: [{ title: "Episode 1", episodeNumber: "1", url: "" }] }],
          isFeatured: Boolean(movie.is_featured),
          isNew: Boolean(movie.is_new),
          isTrending: Boolean(movie.is_trending),
          isActive: Boolean(movie.is_active),
        })
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : "Failed to load movie")
      } finally {
        setLoadingMovie(false)
      }
    }

    loadMovie()
  }, [movieId])

  const uploadMovieImage = async (file: File, target: "poster" | "backdrop") => {
    const setLoading = target === "poster" ? setIsUploadingPoster : setIsUploadingBackdrop
    const field = target === "poster" ? "posterUrl" : "backdropUrl"

    setLoading(true)
    setSubmitError("")
    setMediaStatus(`Uploading ${target} image: ${file.name}...`)

    try {
      const payload = new FormData()
      payload.append("file", file)

      const response = await fetch("/api/admin/movies/upload-image", {
        method: "POST",
        body: payload,
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success || !data.fileUrl) {
        throw new Error(data.error || `Failed to upload ${target} image`)
      }

      handleChange(field, data.fileUrl)
      setMediaStatus(`${target === "poster" ? "Poster" : "Backdrop"} uploaded successfully.`)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : `Failed to upload ${target} image`)
      setMediaStatus("")
    } finally {
      setLoading(false)
    }
  }

  const getCategorySlug = () => (contentType === "series" ? formData.seasonCategory : formData.category)

  const normalizeMovieParts = (parts: MoviePartForm[]): MoviePartForm[] => {
    return parts.map((part) => ({ url: part.url }))
  }

  const updateMoviePart = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      movieParts: prev.movieParts.map((part, partIndex) =>
        partIndex === index ? { ...part, url: value } : part,
      ),
    }))
  }

  const addMoviePart = () => {
    setFormData((prev) => ({
      ...prev,
      movieParts: normalizeMovieParts([...prev.movieParts, { url: "" }]),
    }))
  }

  const removeMoviePart = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      movieParts: normalizeMovieParts(prev.movieParts.filter((_, partIndex) => partIndex !== index)),
    }))
  }

  const updateSeasonField = (seasonIndex: number, field: keyof Omit<SeasonForm, "episodes">, value: string) => {
    setFormData((prev) => ({
      ...prev,
      seriesSeasons: prev.seriesSeasons.map((season, currentIndex) =>
        currentIndex === seasonIndex ? { ...season, [field]: value } : season,
      ),
    }))
  }

  const addSeason = () => {
    setFormData((prev) => ({
      ...prev,
      seriesSeasons: [
        ...prev.seriesSeasons,
        {
          title: `Season ${prev.seriesSeasons.length + 1}`,
          seasonNumber: String(prev.seriesSeasons.length + 1),
          episodes: [{ title: "Episode 1", episodeNumber: "1", url: "" }],
        },
      ],
    }))
  }

  const removeSeason = (seasonIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      seriesSeasons: prev.seriesSeasons.filter((_, currentIndex) => currentIndex !== seasonIndex),
    }))
  }

  const updateEpisodeField = (
    seasonIndex: number,
    episodeIndex: number,
    field: keyof EpisodeForm,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      seriesSeasons: prev.seriesSeasons.map((season, currentSeasonIndex) => {
        if (currentSeasonIndex !== seasonIndex) return season
        return {
          ...season,
          episodes: season.episodes.map((episode, currentEpisodeIndex) =>
            currentEpisodeIndex === episodeIndex ? { ...episode, [field]: value } : episode,
          ),
        }
      }),
    }))
  }

  const addEpisode = (seasonIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      seriesSeasons: prev.seriesSeasons.map((season, currentSeasonIndex) => {
        if (currentSeasonIndex !== seasonIndex) return season
        return {
          ...season,
          episodes: [
            ...season.episodes,
            {
              title: `Episode ${season.episodes.length + 1}`,
              episodeNumber: String(season.episodes.length + 1),
              url: "",
            },
          ],
        }
      }),
    }))
  }

  const removeEpisode = (seasonIndex: number, episodeIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      seriesSeasons: prev.seriesSeasons.map((season, currentSeasonIndex) => {
        if (currentSeasonIndex !== seasonIndex) return season
        return {
          ...season,
          episodes: season.episodes.filter((_, currentEpisodeIndex) => currentEpisodeIndex !== episodeIndex),
        }
      }),
    }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (isSubmitting || !movieId) return

    if (!formData.title.trim()) {
      setSubmitError("Title is required")
      return
    }

    if (!getCategorySlug()) {
      setSubmitError("Please select category")
      return
    }

    const sanitizedMovieParts = formData.movieParts
      .map((part, index) => ({ title: `Part ${index + 1}`, url: part.url.trim() }))
      .filter((part) => part.url)

    const sanitizedSeriesSeasons = formData.seriesSeasons
      .map((season, seasonIndex) => ({
        title: season.title.trim() || `Season ${seasonIndex + 1}`,
        seasonNumber: Number(season.seasonNumber) || seasonIndex + 1,
        episodes: season.episodes
          .map((episode, episodeIndex) => ({
            title: episode.title.trim() || `Episode ${episodeIndex + 1}`,
            episodeNumber: Number(episode.episodeNumber) || episodeIndex + 1,
            url: episode.url.trim(),
          }))
          .filter((episode) => episode.url),
      }))
      .filter((season) => season.episodes.length > 0)

    if (contentType === "movie" && !formData.downloadUrl.trim() && sanitizedMovieParts.length === 0) {
      setSubmitError("Add at least one movie part URL or fallback URL")
      return
    }

    if (contentType === "series" && !formData.downloadUrl.trim() && sanitizedSeriesSeasons.length === 0) {
      setSubmitError("Add season episode links or a fallback URL")
      return
    }

    setIsSubmitting(true)
    setSubmitError("")
    setSubmitSuccess("")

    try {
      const response = await fetch(`/api/admin/movies/${movieId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          category: getCategorySlug(),
          downloadUrl: formData.downloadUrl.trim(),
          movieParts: sanitizedMovieParts,
          seriesSeasons: sanitizedSeriesSeasons,
          contentType,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to update movie")
      }

      setSubmitSuccess("Movie updated successfully")
      setTimeout(() => {
        router.push("/admin/movies")
      }, 600)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Update failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loadingMovie) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Edit Movie</h1>
        <p className="text-muted-foreground">Loading movie details...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-8">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="rounded-full">
          <Link href="/admin/movies">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Edit Movie</h1>
          <p className="text-muted-foreground">Update movie details and save changes</p>
        </div>
      </div>

      {submitError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {submitError}
        </div>
      ) : null}

      {submitSuccess ? (
        <div className="rounded-lg border border-green/30 bg-green/10 p-3 text-sm text-green">
          {submitSuccess}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Film className="w-5 h-5 text-primary" />
              Content Type
            </CardTitle>
            <CardDescription>Choose movie or series content type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button
                type="button"
                variant={contentType === "movie" ? "default" : "outline"}
                className={contentType === "movie" ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white" : ""}
                onClick={() => setContentType("movie")}
              >
                Movie
              </Button>
              <Button
                type="button"
                variant={contentType === "series" ? "default" : "outline"}
                className={contentType === "series" ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white" : ""}
                onClick={() => setContentType("series")}
              >
                Series / Season
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price (TSH) *</Label>
                <input
                  id="price"
                  type="number"
                  min="0"
                  value={formData.price}
                  onChange={(e) => handleChange("price", e.target.value)}
                  className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                rows={4}
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{contentType === "series" ? "Season Category *" : "Category *"}</Label>
                <select
                  value={contentType === "series" ? formData.seasonCategory : formData.category}
                  onChange={(e) => handleChange(contentType === "series" ? "seasonCategory" : "category", e.target.value)}
                  disabled={
                    isLoadingCategories ||
                    (contentType === "series" ? seasonCategoryOptions.length === 0 : movieCategoryOptions.length === 0)
                  }
                  className="w-full rounded-lg border-0 bg-secondary px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">
                    {isLoadingCategories
                      ? "Loading categories..."
                      : contentType === "series"
                        ? "Select season category"
                        : "Select movie category"}
                  </option>
                  {(contentType === "series" ? seasonCategoryOptions : movieCategoryOptions).map((cat) => (
                    <option key={cat.id} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {!isLoadingCategories && contentType === "movie" && movieCategoryOptions.length === 0 ? (
                  <p className="text-xs text-amber-500">No movie categories found. Add categories first in Admin Categories.</p>
                ) : null}
                {!isLoadingCategories && contentType === "series" && seasonCategoryOptions.length === 0 ? (
                  <p className="text-xs text-amber-500">No season categories found. Add season categories first in Admin Categories.</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Quality</Label>
                <select
                  value={formData.quality}
                  onChange={(e) => handleChange("quality", e.target.value)}
                  className="w-full rounded-lg border-0 bg-secondary px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {qualities.map((q) => (
                    <option key={q.value} value={q.value}>
                      {q.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="releaseYear">Release Year</Label>
                <input
                  id="releaseYear"
                  type="number"
                  min="1900"
                  max={new Date().getFullYear() + 5}
                  value={formData.releaseYear}
                  onChange={(e) => handleChange("releaseYear", e.target.value)}
                  className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <input
                  id="language"
                  type="text"
                  value={formData.language}
                  onChange={(e) => handleChange("language", e.target.value)}
                  className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            {contentType === "series" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="episodes">Number of Episodes</Label>
                  <input
                    id="episodes"
                    type="number"
                    min="1"
                    value={formData.episodes}
                    onChange={(e) => handleChange("episodes", e.target.value)}
                    className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seasons">Number of Seasons</Label>
                  <input
                    id="seasons"
                    type="number"
                    min="1"
                    value={formData.seasons}
                    onChange={(e) => handleChange("seasons", e.target.value)}
                    className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-primary" />
              Media Links
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="posterUrl">Poster Image URL *</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={posterInputMode === "link" ? "default" : "outline"}
                    className={posterInputMode === "link" ? "btn-gradient text-white" : ""}
                    onClick={() => setPosterInputMode("link")}
                  >
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Link
                  </Button>
                  <Button
                    type="button"
                    variant={posterInputMode === "upload" ? "default" : "outline"}
                    className={posterInputMode === "upload" ? "btn-gradient text-white" : ""}
                    onClick={() => setPosterInputMode("upload")}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                </div>

                {posterInputMode === "link" ? (
                  <input
                    id="posterUrl"
                    type="url"
                    value={formData.posterUrl}
                    onChange={(e) => handleChange("posterUrl", e.target.value)}
                    className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                ) : (
                  <div className="space-y-2 rounded-lg border border-border bg-secondary/30 p-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        await uploadMovieImage(file, "poster")
                      }}
                      className="w-full text-sm text-foreground"
                    />
                    {isUploadingPoster ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="backdropUrl">Backdrop Image URL</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={backdropInputMode === "link" ? "default" : "outline"}
                    className={backdropInputMode === "link" ? "btn-gradient text-white" : ""}
                    onClick={() => setBackdropInputMode("link")}
                  >
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Link
                  </Button>
                  <Button
                    type="button"
                    variant={backdropInputMode === "upload" ? "default" : "outline"}
                    className={backdropInputMode === "upload" ? "btn-gradient text-white" : ""}
                    onClick={() => setBackdropInputMode("upload")}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                </div>

                {backdropInputMode === "link" ? (
                  <input
                    id="backdropUrl"
                    type="url"
                    value={formData.backdropUrl}
                    onChange={(e) => handleChange("backdropUrl", e.target.value)}
                    className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                ) : (
                  <div className="space-y-2 rounded-lg border border-border bg-secondary/30 p-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        await uploadMovieImage(file, "backdrop")
                      }}
                      className="w-full text-sm text-foreground"
                    />
                    {isUploadingBackdrop ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  </div>
                )}
              </div>
            </div>

            {mediaStatus ? <p className="text-xs text-muted-foreground">{mediaStatus}</p> : null}

            <div className="space-y-2">
              <Label htmlFor="trailerUrl">Trailer URL</Label>
              <input
                id="trailerUrl"
                type="url"
                value={formData.trailerUrl}
                onChange={(e) => handleChange("trailerUrl", e.target.value)}
                className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="downloadUrl">Fallback Download URL</Label>
              <input
                id="downloadUrl"
                type="url"
                value={formData.downloadUrl}
                onChange={(e) => handleChange("downloadUrl", e.target.value)}
                className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <p className="text-xs text-muted-foreground">
                Optional fallback URL. If empty, the first part or first episode URL will be used.
              </p>
            </div>

            {contentType === "movie" ? (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Movie Parts</p>
                  <Button type="button" variant="outline" size="sm" onClick={addMoviePart}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Part
                  </Button>
                </div>

                {formData.movieParts.map((part, index) => (
                  <div key={`movie-part-${index}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end rounded-md bg-secondary/30 p-2">
                    <div className="md:col-span-4 space-y-1">
                      <Label>Part</Label>
                      <div className="w-full px-3 py-2 bg-secondary rounded-lg text-foreground font-medium">
                        {`Part ${index + 1}`}
                      </div>
                    </div>
                    <div className="md:col-span-7 space-y-1">
                      <Label>Part URL</Label>
                      <input
                        type="url"
                        value={part.url}
                        onChange={(e) => updateMoviePart(index, e.target.value)}
                        className="w-full px-3 py-2 bg-secondary rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMoviePart(index)}
                        disabled={formData.movieParts.length <= 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Series Seasons and Episodes</p>
                  <Button type="button" variant="outline" size="sm" onClick={addSeason}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Season
                  </Button>
                </div>

                {formData.seriesSeasons.map((season, seasonIndex) => (
                  <div key={`season-${seasonIndex}`} className="rounded-md border border-border p-3 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                      <div className="md:col-span-5 space-y-1">
                        <Label>Season Title</Label>
                        <input
                          type="text"
                          value={season.title}
                          onChange={(e) => updateSeasonField(seasonIndex, "title", e.target.value)}
                          className="w-full px-3 py-2 bg-secondary rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                      <div className="md:col-span-3 space-y-1">
                        <Label>Season Number</Label>
                        <input
                          type="number"
                          min="1"
                          value={season.seasonNumber}
                          onChange={(e) => updateSeasonField(seasonIndex, "seasonNumber", e.target.value)}
                          className="w-full px-3 py-2 bg-secondary rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                      <div className="md:col-span-4 flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => addEpisode(seasonIndex)}>
                          <Plus className="w-4 h-4 mr-1" />
                          Add Episode
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSeason(seasonIndex)}
                          disabled={formData.seriesSeasons.length <= 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {season.episodes.map((episode, episodeIndex) => (
                        <div key={`season-${seasonIndex}-episode-${episodeIndex}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end rounded-md bg-secondary/30 p-2">
                          <div className="md:col-span-3 space-y-1">
                            <Label>Episode Title</Label>
                            <input
                              type="text"
                              value={episode.title}
                              onChange={(e) => updateEpisodeField(seasonIndex, episodeIndex, "title", e.target.value)}
                              className="w-full px-3 py-2 bg-secondary rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                          </div>
                          <div className="md:col-span-2 space-y-1">
                            <Label>No</Label>
                            <input
                              type="number"
                              min="1"
                              value={episode.episodeNumber}
                              onChange={(e) => updateEpisodeField(seasonIndex, episodeIndex, "episodeNumber", e.target.value)}
                              className="w-full px-3 py-2 bg-secondary rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                          </div>
                          <div className="md:col-span-6 space-y-1">
                            <Label>Episode URL</Label>
                            <input
                              type="url"
                              value={episode.url}
                              onChange={(e) => updateEpisodeField(seasonIndex, episodeIndex, "url", e.target.value)}
                              className="w-full px-3 py-2 bg-secondary rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                          </div>
                          <div className="md:col-span-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeEpisode(seasonIndex, episodeIndex)}
                              disabled={season.episodes.length <= 1}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Visibility & Flags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <Label htmlFor="isFeatured">Featured</Label>
                <Switch id="isFeatured" checked={formData.isFeatured} onCheckedChange={(value) => handleChange("isFeatured", value)} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <Label htmlFor="isNew">New</Label>
                <Switch id="isNew" checked={formData.isNew} onCheckedChange={(value) => handleChange("isNew", value)} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <Label htmlFor="isTrending">Trending</Label>
                <Switch id="isTrending" checked={formData.isTrending} onCheckedChange={(value) => handleChange("isTrending", value)} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <Label htmlFor="isActive">Active</Label>
                <Switch id="isActive" checked={formData.isActive} onCheckedChange={(value) => handleChange("isActive", value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-end gap-3">
          <Button asChild variant="outline">
            <Link href="/admin/movies">Cancel</Link>
          </Button>
          <Button type="submit" className="btn-gradient text-white" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  )
}
