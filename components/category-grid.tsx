"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { Grid3X3, ChevronRight } from "lucide-react"

interface CategoryGridProps {
  onCategoryClick?: (categorySlug: string) => void
  onAllClick?: () => void
  activeCategorySlug?: string
  showSeasons?: boolean
}

type ApiCategory = {
  id: string
  name: string
  slug: string
  image_url: string | null
  parent_slug: string | null
  sort_order: number
}

const CATEGORIES_CACHE_KEY = "brown:public-categories"

let cachedCategories: ApiCategory[] | null = null
let categoriesRequest: Promise<ApiCategory[]> | null = null

async function fetchSharedCategories() {
  if (cachedCategories) {
    return cachedCategories
  }

  if (categoriesRequest) {
    return categoriesRequest
  }

  categoriesRequest = (async () => {
    const response = await fetch("/api/categories")
    const data = await response.json().catch(() => ({}))

    if (!response.ok || !data.success || !Array.isArray(data.categories)) {
      throw new Error("Failed to load categories")
    }

    cachedCategories = data.categories as ApiCategory[]

    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(cachedCategories))
      }
    } catch {
      // Ignore storage limitations and keep runtime cache only.
    }

    return cachedCategories
  })()

  try {
    return await categoriesRequest
  } finally {
    categoriesRequest = null
  }
}

export function CategoryGrid({ onCategoryClick, onAllClick, activeCategorySlug = "all", showSeasons = false }: CategoryGridProps) {
  const [apiCategories, setApiCategories] = useState<ApiCategory[]>([])

  useEffect(() => {
    let mounted = true

    if (cachedCategories && mounted) {
      setApiCategories(cachedCategories)
    } else {
      try {
        const stored = window.sessionStorage.getItem(CATEGORIES_CACHE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed) && parsed.length > 0) {
            cachedCategories = parsed as ApiCategory[]
            setApiCategories(cachedCategories)
          }
        }
      } catch {
        // Ignore invalid storage payload.
      }
    }

    const loadCategories = async () => {
      try {
        const categories = await fetchSharedCategories()
        if (mounted && categories.length > 0) {
          setApiCategories(categories)
        }
      } catch {
        // Keep last good categories to avoid UI flicker on transient failures.
      }
    }

    loadCategories()
    return () => {
      mounted = false
    }
  }, [])

  const displayCategories = useMemo(() => {
    const filtered = apiCategories
      .filter((category) => (showSeasons ? category.parent_slug === "season" : category.parent_slug === null && category.slug !== "season"))
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

    return filtered.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      image: category.image_url || "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?w=900&h=560&fit=crop",
      color: "from-orange-500 to-amber-700",
    }))
  }, [apiCategories, showSeasons])

  if (displayCategories.length === 0) {
    return null
  }

  return (
    <section className="container mx-auto px-4 py-8 md:py-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-orange rounded-full" />
          <Grid3X3 className="w-5 h-5 text-orange" />
          <h2 className="text-lg md:text-xl font-bold text-foreground uppercase tracking-wide">
            {showSeasons ? "Seasons" : "Single Movies"}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => onAllClick?.()}
          className={`flex items-center gap-1 text-sm font-medium transition-colors ${
            activeCategorySlug === "all"
              ? "text-orange"
              : "text-muted-foreground hover:text-orange"
          }`}
        >
          Zote
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2.5 md:gap-4">
        {displayCategories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onCategoryClick?.(category.slug)}
            className={`group relative aspect-[5/4] rounded-xl overflow-hidden movie-card-hover border transition-all ${
              activeCategorySlug === category.slug
                ? "border-orange ring-2 ring-orange/60"
                : "border-white/10"
            }`}
          >
            {/* Background Image */}
            <Image
              src={category.image}
              alt={category.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
            />
            
            {/* No color overlay: keep image-only visual */}
            
            {/* Category Name */}
            <div className="absolute inset-0 flex items-end p-2.5 md:p-3">
              <p className="text-white text-[11px] md:text-sm font-bold leading-tight line-clamp-2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                {category.name.toUpperCase()}
              </p>
            </div>

            {/* Hover Border */}
            <div
              className={`absolute inset-0 rounded-xl border-2 transition-colors ${
                activeCategorySlug === category.slug
                  ? "border-orange"
                  : "border-transparent group-hover:border-orange/50"
              }`}
            />
          </button>
        ))}
      </div>
    </section>
  )
}
