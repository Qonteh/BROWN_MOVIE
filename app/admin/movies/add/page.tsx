"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, X, Film, Save, ImageIcon, Link as LinkIcon, Upload, Loader2, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

const movieCategories = [
  { value: "action-kusisimua", label: "Movies za Action/Kusisimua" },
  { value: "kivita", label: "Movies za Kivita" },
  { value: "kutisha-horror", label: "Movies za Kutisha/Horror" },
  { value: "sayansi-sci-fi", label: "Movies za Sayansi/SCI-FI" },
  { value: "kuchekesha-comedy", label: "Movies za Kuchekesha/Comedy" },
  { value: "mapenzi-drama", label: "Movies za Mapenzi/Drama" },
  { value: "katuni-animation", label: "Movies za Katuni/Animation" },
  { value: "wahindi", label: "Movies za Kihindi" },
  { value: "kitambo-zilizotamba", label: "Movies za Kitambo/Zilizotamba" },
  { value: "afrika", label: "Movies za Afrika" },
]

const seasonCategories = [
  { value: "kichina", label: "Season za Kichina" },
  { value: "wachina-japan", label: "Season za Wachina/Japan" },
  { value: "indian-series", label: "Season za Kihindi" },
  { value: "kizungu", label: "Season za Kizungu" },
  { value: "korea", label: "Season za Korea" },
  { value: "kifilipino", label: "Season za Kifilipino" },
  { value: "kituruki", label: "Season za Kituruki" },
  { value: "thailand", label: "Season za Thailand" },
]

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

export default function AddMoviePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
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
    isNew: true,
    isTrending: false,
  })

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

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
      setMediaStatus(`${target === "poster" ? "Poster" : "Backdrop"} uploaded and saved in database mode.`)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : `Failed to upload ${target} image`)
      setMediaStatus("")
    } finally {
      setLoading(false)
    }
  }

  const handlePosterFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    await uploadMovieImage(file, "poster")
  }

  const handleBackdropFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    await uploadMovieImage(file, "backdrop")
  }

  const getCategorySlug = () => {
    return contentType === "series" ? formData.seasonCategory : formData.category
  }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isSubmitting) {
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
      setSubmitError("Weka link ya movie au ongeza part angalau moja.")
      return
    }

    if (contentType === "series" && !formData.downloadUrl.trim() && sanitizedSeriesSeasons.length === 0) {
      setSubmitError("Weka season/episode links au fallback URL angalau moja.")
      return
    }

    if (contentType === "movie" && !formData.category) {
      setSubmitError("Tafadhali chagua category ya movie kwanza.")
      return
    }

    if (contentType === "series" && !formData.seasonCategory) {
      setSubmitError("Tafadhali chagua season category kwanza.")
      return
    }

    setIsSubmitting(true)
    setSubmitError("")

    try {
      const saveResponse = await fetch("/api/admin/movies", {
        method: "POST",
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

      if (!saveResponse.ok) {
        const errorBody = await saveResponse.json().catch(() => ({}))
        throw new Error(errorBody.error || "Failed to save movie metadata")
      }

      router.push("/admin/movies")
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Save failed")
    } finally {
      setIsSubmitting(false)
    }
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
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Add New Movie</h1>
          <p className="text-muted-foreground">Fill in the details and paste your hosted S3 movie URL</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Film className="w-5 h-5 text-primary" />
              Content Type
            </CardTitle>
            <CardDescription>Select whether this is a movie or a series</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button
                type="button"
                variant={contentType === "movie" ? "default" : "outline"}
                className={contentType === "movie" ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white" : ""}
                onClick={() => setContentType("movie")}
              >
                <Film className="w-4 h-4 mr-2" />
                Movie
              </Button>
              <Button
                type="button"
                variant={contentType === "series" ? "default" : "outline"}
                className={contentType === "series" ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white" : ""}
                onClick={() => setContentType("series")}
              >
                <Film className="w-4 h-4 mr-2" />
                Series / Season
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Basic Information</CardTitle>
            <CardDescription>Enter the main details of the {contentType}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <input
                  id="title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="Enter movie title"
                  className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price (TSH) *</Label>
                <input
                  id="price"
                  type="number"
                  required
                  min="0"
                  value={formData.price}
                  onChange={(e) => handleChange("price", e.target.value)}
                  placeholder="e.g., 2000"
                  className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                placeholder="Enter movie description..."
                className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{contentType === "series" ? "Season Category *" : "Category *"}</Label>
                {contentType === "series" ? (
                  <select
                    value={formData.seasonCategory}
                    onChange={(e) => handleChange("seasonCategory", e.target.value)}
                    className="w-full rounded-lg border-0 bg-secondary px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Select season category</option>
                    {seasonCategories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={formData.category}
                    onChange={(e) => handleChange("category", e.target.value)}
                    className="w-full rounded-lg border-0 bg-secondary px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Select movie category</option>
                    {movieCategories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                )}
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
                  placeholder="e.g., English, Swahili"
                  className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            {contentType === "series" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="episodes">Number of Episodes</Label>
                  <input
                    id="episodes"
                    type="text"
                    value={formData.episodes}
                    onChange={(e) => handleChange("episodes", e.target.value)}
                    placeholder="e.g., 1-10"
                    className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-primary" />
              Media Links
            </CardTitle>
            <CardDescription>
              For poster and backdrop, choose either direct link or upload from your files. Uploaded images are saved in database mode.
            </CardDescription>
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
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="posterUrl"
                      type="url"
                      required
                      value={formData.posterUrl}
                      onChange={(e) => handleChange("posterUrl", e.target.value)}
                      placeholder="https://example.com/poster.jpg"
                      className="w-full pl-10 pr-4 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                ) : (
                  <div className="space-y-2 rounded-lg border border-border bg-secondary/30 p-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePosterFileChange}
                      className="w-full text-sm text-foreground"
                    />
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {isUploadingPoster ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      {isUploadingPoster ? "Uploading poster..." : formData.posterUrl ? "Poster image ready." : "Select file to upload poster."}
                    </p>
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
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="backdropUrl"
                      type="url"
                      value={formData.backdropUrl}
                      onChange={(e) => handleChange("backdropUrl", e.target.value)}
                      placeholder="https://example.com/backdrop.jpg"
                      className="w-full pl-10 pr-4 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                ) : (
                  <div className="space-y-2 rounded-lg border border-border bg-secondary/30 p-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBackdropFileChange}
                      className="w-full text-sm text-foreground"
                    />
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {isUploadingBackdrop ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      {isUploadingBackdrop ? "Uploading backdrop..." : formData.backdropUrl ? "Backdrop image ready." : "Select file to upload backdrop."}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {mediaStatus && (
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-xs text-primary">{mediaStatus}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trailerUrl">Trailer URL (YouTube)</Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="trailerUrl"
                    type="url"
                    value={formData.trailerUrl}
                    onChange={(e) => handleChange("trailerUrl", e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full pl-10 pr-4 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="downloadUrl">Fallback S3 URL</Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="downloadUrl"
                    type="url"
                    value={formData.downloadUrl}
                    onChange={(e) => handleChange("downloadUrl", e.target.value)}
                    placeholder="https://brown-movies.s3.eu-north-1.amazonaws.com/movies/your-file.mp4"
                    className="w-full pl-10 pr-4 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Optional fallback. If blank, the first part/episode URL will be used automatically.
                </p>
              </div>
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
                        placeholder="https://..."
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
                          placeholder={`Season ${seasonIndex + 1}`}
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
                              placeholder={`Episode ${episodeIndex + 1}`}
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
                              placeholder="https://..."
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

            {submitError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-500">{submitError}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Display Settings</CardTitle>
            <CardDescription>Control how this {contentType} appears on the site</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
              <div>
                <p className="font-medium text-foreground">Featured</p>
                <p className="text-sm text-muted-foreground">Show in hero carousel on homepage</p>
              </div>
              <Switch
                checked={formData.isFeatured}
                onCheckedChange={(checked) => handleChange("isFeatured", checked)}
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
              <div>
                <p className="font-medium text-foreground">New Release</p>
                <p className="text-sm text-muted-foreground">Show in &quot;Mpya za Wiki&quot; section</p>
              </div>
              <Switch
                checked={formData.isNew}
                onCheckedChange={(checked) => handleChange("isNew", checked)}
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
              <div>
                <p className="font-medium text-foreground">Trending</p>
                <p className="text-sm text-muted-foreground">Mark as trending content</p>
              </div>
              <Switch
                checked={formData.isTrending}
                onCheckedChange={(checked) => handleChange("isTrending", checked)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 justify-end">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/admin/movies">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Link>
          </Button>
          <Button
            type="submit"
            className="bg-gradient-to-r from-orange-500 to-amber-600 text-white w-full sm:w-auto hover:from-orange-600 hover:to-amber-700"
            disabled={isSubmitting}
          >
            <span className="inline-flex items-center">
              <span
                aria-hidden="true"
                className={`w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2 ${isSubmitting ? "inline-block" : "hidden"}`}
              />
              <Save className={`w-4 h-4 mr-2 ${isSubmitting ? "hidden" : "inline-block"}`} />
              <span>{isSubmitting ? "Saving..." : "Save Movie"}</span>
            </span>
          </Button>
        </div>
      </form>
    </div>
  )
}