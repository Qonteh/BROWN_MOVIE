"use client"

import { useEffect, useMemo, useState } from "react"
import { ImageIcon, Plus, Edit, Trash2, Link2, Upload, Loader2, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

type HeroSlide = {
  id: string
  movie_id: string | null
  movie_title: string | null
  title: string
  subtitle: string | null
  description: string | null
  image_url: string
  cta_text: string | null
  cta_link: string | null
  trailer_link: string | null
  download_link: string | null
  price: string | number | null
  sort_order: number
  is_active: boolean
  start_date: string | null
  end_date: string | null
}

type MovieOption = {
  id: string
  title: string
  release_year?: number | null
  is_active?: boolean
}

type SlideFormState = {
  movieId: string
  title: string
  subtitle: string
  description: string
  imageUrl: string
  ctaText: string
  ctaLink: string
  trailerLink: string
  downloadLink: string
  price: string
  sortOrder: string
  isActive: boolean
  startDate: string
  endDate: string
}

const defaultSlideFormState: SlideFormState = {
  movieId: "",
  title: "",
  subtitle: "",
  description: "",
  imageUrl: "",
  ctaText: "Download",
  ctaLink: "",
  trailerLink: "",
  downloadLink: "",
  price: "0",
  sortOrder: "0",
  isActive: true,
  startDate: "",
  endDate: "",
}

function toDateInputValue(value: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}

export default function HeroSlidesPage() {
  const [slides, setSlides] = useState<HeroSlide[]>([])
  const [movies, setMovies] = useState<MovieOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [linkFilter, setLinkFilter] = useState<"all" | "linked" | "unlinked">("all")

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [formState, setFormState] = useState<SlideFormState>(defaultSlideFormState)
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null)
  const [imageSourceMode, setImageSourceMode] = useState<"link" | "upload">("link")
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [uploadStatus, setUploadStatus] = useState("")

  const normalizeMovieOptions = (rows: unknown[]): MovieOption[] => {
    if (!Array.isArray(rows)) return []

    return rows
      .map((row) => {
        const candidate = row as Record<string, unknown>
        const id = typeof candidate.id === "string" ? candidate.id : ""
        const title = typeof candidate.title === "string" ? candidate.title.trim() : ""
        const releaseYearRaw = candidate.release_year
        const releaseYear =
          typeof releaseYearRaw === "number"
            ? releaseYearRaw
            : typeof releaseYearRaw === "string"
              ? Number.parseInt(releaseYearRaw, 10)
              : null

        return {
          id,
          title,
          release_year: Number.isFinite(releaseYear as number) ? (releaseYear as number) : null,
          is_active: typeof candidate.is_active === "boolean" ? candidate.is_active : undefined,
        }
      })
      .filter((movie) => movie.id && movie.title)
  }

  const mergeMovieOptions = (primary: MovieOption[], fallback: MovieOption[]) => {
    const byId = new Map<string, MovieOption>()

    for (const movie of [...primary, ...fallback]) {
      if (!byId.has(movie.id)) {
        byId.set(movie.id, movie)
      }
    }

    return Array.from(byId.values()).sort((a, b) => {
      const activeA = a.is_active === false ? 0 : 1
      const activeB = b.is_active === false ? 0 : 1
      if (activeA !== activeB) return activeB - activeA
      return a.title.localeCompare(b.title)
    })
  }

  const loadSlides = async () => {
    setLoading(true)
    setError("")

    try {
      const [heroResponse, moviesResponse] = await Promise.all([
        fetch("/api/admin/hero-slides", { cache: "no-store" }),
        fetch("/api/admin/movies", { cache: "no-store" }),
      ])

      const heroData = await heroResponse.json().catch(() => ({}))
      const moviesData = await moviesResponse.json().catch(() => ({}))

      if (!heroResponse.ok || !heroData.success) {
        throw new Error(heroData.error || "Failed to fetch hero slides")
      }

      setSlides(Array.isArray(heroData.slides) ? heroData.slides : [])

      const heroMovies = normalizeMovieOptions(heroData.movies)
      const fallbackMovies = moviesResponse.ok && moviesData.success
        ? normalizeMovieOptions(moviesData.movies)
        : []
      setMovies(mergeMovieOptions(heroMovies, fallbackMovies))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch hero slides")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSlides()
  }, [])

  const resetForm = () => {
    setFormState(defaultSlideFormState)
    setEditingSlideId(null)
    setImageSourceMode("link")
    setSelectedImageFile(null)
    setIsUploadingImage(false)
    setUploadStatus("")
  }

  const updateForm = (field: keyof SlideFormState, value: string | boolean) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const createSlide = async () => {
    try {
      setError("")

      if (!formState.title.trim()) {
        throw new Error("Title is required")
      }

      if (!formState.imageUrl.trim()) {
        throw new Error("Image URL is required. Use link mode or upload an image first.")
      }

      const response = await fetch("/api/admin/hero-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create hero slide")
      }

      setIsCreateOpen(false)
      resetForm()
      await loadSlides()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create hero slide")
    }
  }

  const openEdit = (slide: HeroSlide) => {
    setEditingSlideId(slide.id)
    setFormState({
      movieId: slide.movie_id ?? "",
      title: slide.title ?? "",
      subtitle: slide.subtitle ?? "",
      description: slide.description ?? "",
      imageUrl: slide.image_url ?? "",
      ctaText: slide.cta_text ?? "Download",
      ctaLink: slide.cta_link ?? "",
      trailerLink: slide.trailer_link ?? "",
      downloadLink: slide.download_link ?? "",
      price: String(slide.price ?? 0),
      sortOrder: String(slide.sort_order ?? 0),
      isActive: Boolean(slide.is_active),
      startDate: toDateInputValue(slide.start_date),
      endDate: toDateInputValue(slide.end_date),
    })
    setIsEditOpen(true)
  }

  const updateSlide = async () => {
    if (!editingSlideId) return

    try {
      setError("")

      if (!formState.title.trim()) {
        throw new Error("Title is required")
      }

      if (!formState.imageUrl.trim()) {
        throw new Error("Image URL is required. Use link mode or upload an image first.")
      }

      const response = await fetch(`/api/admin/hero-slides/${editingSlideId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to update hero slide")
      }

      setIsEditOpen(false)
      resetForm()
      await loadSlides()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update hero slide")
    }
  }

  const deleteSlide = async (slide: HeroSlide) => {
    const confirmed = window.confirm(`Delete hero slide \"${slide.title}\"?`)
    if (!confirmed) return

    try {
      setError("")
      const response = await fetch(`/api/admin/hero-slides/${slide.id}`, { method: "DELETE" })
      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to delete hero slide")
      }

      await loadSlides()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete hero slide")
    }
  }

  const activeSlidesCount = useMemo(() => slides.filter((slide) => slide.is_active).length, [slides])

  const filteredSlides = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return slides.filter((slide) => {
      const matchesQuery =
        query.length === 0 ||
        [
          slide.title,
          slide.subtitle,
          slide.description,
          slide.movie_title,
          slide.image_url,
          slide.trailer_link,
          slide.download_link,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query))

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && slide.is_active) ||
        (statusFilter === "inactive" && !slide.is_active)

      const isLinked = Boolean(slide.movie_id)
      const matchesLink =
        linkFilter === "all" ||
        (linkFilter === "linked" && isLinked) ||
        (linkFilter === "unlinked" && !isLinked)

      return matchesQuery && matchesStatus && matchesLink
    })
  }, [slides, searchQuery, statusFilter, linkFilter])

  const uploadSelectedImage = async (file: File) => {
    if (isUploadingImage) return

    setIsUploadingImage(true)
    setError("")
    setUploadStatus(`Uploading ${file.name}...`)

    try {
      const payload = new FormData()
      payload.append("file", file)
      payload.append("title", formState.title || "hero-slide")

      const response = await fetch("/api/admin/hero-slides/upload", {
        method: "POST",
        body: payload,
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success || !data.fileUrl) {
        throw new Error(data.error || "Failed to upload image")
      }

      updateForm("imageUrl", data.fileUrl)
      setUploadStatus("Upload complete. Image URL has been set.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image")
      setUploadStatus("")
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setSelectedImageFile(file)

    if (!file) {
      setUploadStatus("")
      return
    }

    await uploadSelectedImage(file)
  }

  const formFields = (
    <div className="space-y-6 py-2">
      <div className="space-y-2">
        <Label htmlFor="movieId">Linked Movie (optional)</Label>
        <select
          id="movieId"
          value={formState.movieId}
          onChange={(e) => updateForm("movieId", e.target.value)}
          className="w-full rounded-lg border-0 bg-secondary px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">No linked movie</option>
          {movies.map((movie) => (
            <option key={movie.id} value={movie.id}>
              {movie.title}
              {movie.release_year ? ` (${movie.release_year})` : ""}
              {movie.is_active === false ? " [inactive]" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="title">Title *</Label>
          <input
            id="title"
            type="text"
            value={formState.title}
            onChange={(e) => updateForm("title", e.target.value)}
            className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Hero title"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="subtitle">Subtitle</Label>
          <input
            id="subtitle"
            type="text"
            value={formState.subtitle}
            onChange={(e) => updateForm("subtitle", e.target.value)}
            className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Short subtitle"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sortOrder">Sort Order</Label>
          <input
            id="sortOrder"
            type="number"
            value={formState.sortOrder}
            onChange={(e) => updateForm("sortOrder", e.target.value)}
            className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            rows={3}
            value={formState.description}
            onChange={(e) => updateForm("description", e.target.value)}
            className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Slide description"
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Hero Media *</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button
            type="button"
            variant={imageSourceMode === "link" ? "default" : "outline"}
            className={imageSourceMode === "link" ? "btn-gradient text-white" : ""}
            onClick={() => setImageSourceMode("link")}
          >
            <Link2 className="w-4 h-4 mr-2" />
            Use Image Link
          </Button>
          <Button
            type="button"
            variant={imageSourceMode === "upload" ? "default" : "outline"}
            className={imageSourceMode === "upload" ? "btn-gradient text-white" : ""}
            onClick={() => {
              setImageSourceMode("upload")
              setUploadStatus("")
            }}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Image
          </Button>
        </div>

        {imageSourceMode === "link" ? (
          <div className="space-y-2">
            <Label htmlFor="imageUrl">Image URL *</Label>
            <input
              id="imageUrl"
              type="url"
              value={formState.imageUrl}
              onChange={(e) => updateForm("imageUrl", e.target.value)}
              className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="https://..."
            />
          </div>
        ) : (
          <div className="space-y-3 rounded-lg border border-border bg-secondary/30 p-3">
            <input
              id="imageFile"
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              className="w-full text-sm text-foreground"
            />
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {selectedImageFile ? <span>Selected: {selectedImageFile.name}</span> : <span>Select a file to upload</span>}
              {uploadStatus ? <span>{uploadStatus}</span> : null}
              {formState.imageUrl ? <span className="break-all">Current: {formState.imageUrl}</span> : null}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ctaText">CTA Text</Label>
          <input
            id="ctaText"
            type="text"
            value={formState.ctaText}
            onChange={(e) => updateForm("ctaText", e.target.value)}
            className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Download"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ctaLink">CTA Link</Label>
          <input
            id="ctaLink"
            type="url"
            value={formState.ctaLink}
            onChange={(e) => updateForm("ctaLink", e.target.value)}
            className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="https://..."
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="trailerLink">Trailer Link</Label>
          <input
            id="trailerLink"
            type="url"
            value={formState.trailerLink}
            onChange={(e) => updateForm("trailerLink", e.target.value)}
            className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="https://youtube.com/watch?v=..."
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="downloadLink">Download Link</Label>
          <input
            id="downloadLink"
            type="url"
            value={formState.downloadLink}
            onChange={(e) => updateForm("downloadLink", e.target.value)}
            className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="https://.../movie.mp4"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Price (TSH)</Label>
          <input
            id="price"
            type="number"
            min="0"
            step="100"
            value={formState.price}
            onChange={(e) => updateForm("price", e.target.value)}
            className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="2000"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="isActive">Status</Label>
          <select
            id="isActive"
            value={formState.isActive ? "active" : "inactive"}
            onChange={(e) => updateForm("isActive", e.target.value === "active")}
            className="w-full rounded-lg border-0 bg-secondary px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <input
            id="startDate"
            type="date"
            value={formState.startDate}
            onChange={(e) => updateForm("startDate", e.target.value)}
            className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <input
            id="endDate"
            type="date"
            value={formState.endDate}
            onChange={(e) => updateForm("endDate", e.target.value)}
            className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Hero Slides</h1>
          <p className="text-muted-foreground">Manage homepage carousel slides from real database data</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={loadSlides} disabled={loading}>Refresh</Button>
          <Dialog
            open={isCreateOpen}
            onOpenChange={(open) => {
              setIsCreateOpen(open)
              if (!open) resetForm()
            }}
          >
            <DialogTrigger asChild>
              <Button className="btn-gradient text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Hero Slide
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-foreground">Create Hero Slide</DialogTitle>
                <DialogDescription>Add a new slide for homepage hero carousel</DialogDescription>
              </DialogHeader>
              <div className="max-h-[62vh] overflow-y-auto pr-1">
                {formFields}
              </div>
              <DialogFooter className="border-t border-border pt-4">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button className="btn-gradient text-white" onClick={createSlide}>Create Slide</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent className="bg-card border-border w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Hero Slide</DialogTitle>
            <DialogDescription>Update slide fields and save to database</DialogDescription>
          </DialogHeader>
          <div className="max-h-[62vh] overflow-y-auto pr-1">
            {formFields}
          </div>
          <DialogFooter className="border-t border-border pt-4">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button className="btn-gradient text-white" onClick={updateSlide}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardDescription>Total Slides</CardDescription>
            <CardTitle className="text-2xl">{slides.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardDescription>Active Slides</CardDescription>
            <CardTitle className="text-2xl">{activeSlidesCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardDescription>Linked Movies</CardDescription>
            <CardTitle className="text-2xl">{slides.filter((slide) => Boolean(slide.movie_id)).length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="bg-card border-border overflow-hidden">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            Hero Slides ({filteredSlides.length})
          </CardTitle>
          <CardDescription>These slides power your homepage hero carousel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, subtitle, movie, image..."
                className="w-full rounded-lg border border-border bg-secondary py-2 pl-9 pr-10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              {searchQuery.trim() ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
              className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>

            <select
              value={linkFilter}
              onChange={(e) => setLinkFilter(e.target.value as "all" | "linked" | "unlinked")}
              className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              aria-label="Filter by linked movie"
            >
              <option value="all">All slides</option>
              <option value="linked">Linked movie</option>
              <option value="unlinked">Not linked</option>
            </select>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading slides from database...</p>
          ) : slides.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hero slides yet. Create your first one.</p>
          ) : filteredSlides.length === 0 ? (
            <p className="text-sm text-muted-foreground">No slides match your current search or filters.</p>
          ) : (
            <div className="space-y-3">
              {filteredSlides.map((slide) => (
                <div
                  key={slide.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-border bg-secondary/40 p-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{slide.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{slide.subtitle || "No subtitle"}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">Movie: {slide.movie_title || "Not linked"}</p>
                    <p className="text-xs text-muted-foreground truncate">Image: {slide.image_url}</p>
                    <p className="text-xs text-muted-foreground truncate">Trailer: {slide.trailer_link || "Not set"}</p>
                    <p className="text-xs text-muted-foreground truncate">Download: {slide.download_link || "Not set"}</p>
                    <p className="text-xs text-muted-foreground truncate">Price: TSH {Number(slide.price || 0).toLocaleString()}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${slide.is_active ? "bg-green/10 text-green" : "bg-red/10 text-red"}`}>
                      {slide.is_active ? "active" : "inactive"}
                    </span>
                    <span className="text-xs text-muted-foreground">order: {slide.sort_order}</span>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(slide)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteSlide(slide)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
