"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Edit, Trash2, FolderOpen, GripVertical, ChevronRight, Upload, Loader2, Image as ImageIcon } from "lucide-react"
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
import Image from "next/image"

type CategoryRow = {
  id: string
  name: string
  slug: string
  image_url: string | null
  sort_order: number
  parent_slug: string | null
  movie_count: number
  series_count: number
  content_count: number
}

type CategoryType = "main" | "season"

const categoryColorClasses = [
  "from-orange-500 to-red-700",
  "from-gray-600 to-gray-900",
  "from-slate-700 to-black",
  "from-indigo-600 to-blue-800",
  "from-yellow-500 to-orange-600",
  "from-rose-500 to-pink-700",
  "from-pink-500 to-purple-700",
  "from-amber-500 to-orange-700",
  "from-emerald-600 to-teal-800",
  "from-green-600 to-emerald-800",
]

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [isEditingCategory, setIsEditingCategory] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)

  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategorySlug, setNewCategorySlug] = useState("")
  const [newCategorySortOrder, setNewCategorySortOrder] = useState("999")
  const [newCategoryImageUrl, setNewCategoryImageUrl] = useState("")
  const [categoryType, setCategoryType] = useState<"main" | "season">("main")
  const [isUploadingNewImage, setIsUploadingNewImage] = useState(false)

  const [editCategoryName, setEditCategoryName] = useState("")
  const [editCategorySlug, setEditCategorySlug] = useState("")
  const [editCategorySortOrder, setEditCategorySortOrder] = useState("999")
  const [editCategoryImageUrl, setEditCategoryImageUrl] = useState("")
  const [editCategoryType, setEditCategoryType] = useState<CategoryType>("main")
  const [isUploadingEditImage, setIsUploadingEditImage] = useState(false)

  const uploadCategoryImage = async (file: File, mode: "new" | "edit") => {
    const setLoading = mode === "new" ? setIsUploadingNewImage : setIsUploadingEditImage
    const setUrl = mode === "new" ? setNewCategoryImageUrl : setEditCategoryImageUrl

    setLoading(true)
    setError("")
    try {
      const payload = new FormData()
      payload.append("file", file)

      const response = await fetch("/api/admin/movies/upload-image", {
        method: "POST",
        body: payload,
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success || !data.fileUrl) {
        throw new Error(data.error || "Failed to upload category image")
      }

      setUrl(data.fileUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload category image")
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/admin/categories", { cache: "no-store" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch categories")
      }

      setCategories(Array.isArray(data.categories) ? data.categories : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch categories")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const mainCategories = useMemo(
    () => categories.filter((category) => category.parent_slug === null && category.slug !== "season"),
    [categories],
  )

  const seasonCategories = useMemo(
    () => categories.filter((category) => category.parent_slug === "season"),
    [categories],
  )

  const resetCreateForm = () => {
    setNewCategoryName("")
    setNewCategorySlug("")
    setNewCategorySortOrder("999")
    setNewCategoryImageUrl("")
    setCategoryType("main")
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      setError("Category name is required")
      return
    }

    try {
      setError("")
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCategoryName,
          slug: newCategorySlug,
          sortOrder: Number(newCategorySortOrder) || 999,
          imageUrl: newCategoryImageUrl,
          type: categoryType,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create category")
      }

      resetCreateForm()
      setIsAddingCategory(false)
      await loadCategories()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create category")
    }
  }

  const openEditDialog = (category: CategoryRow) => {
    setEditingCategoryId(category.id)
    setEditCategoryName(category.name)
    setEditCategorySlug(category.slug)
    setEditCategorySortOrder(String(category.sort_order ?? 999))
    setEditCategoryImageUrl(category.image_url || "")
    setEditCategoryType(category.parent_slug === "season" ? "season" : "main")
    setIsEditingCategory(true)
  }

  const handleEditCategory = async () => {
    if (!editingCategoryId) return
    if (!editCategoryName.trim()) {
      setError("Category name is required")
      return
    }

    try {
      setError("")
      const response = await fetch(`/api/admin/categories/${editingCategoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editCategoryName,
          slug: editCategorySlug,
          sortOrder: Number(editCategorySortOrder) || 999,
          imageUrl: editCategoryImageUrl,
          type: editCategoryType,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to update category")
      }

      setIsEditingCategory(false)
      setEditingCategoryId(null)
      await loadCategories()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update category")
    }
  }

  const handleDeleteCategory = async (category: CategoryRow) => {
    const confirmed = window.confirm(`Delete category "${category.name}"? This will remove category mapping from movies.`)
    if (!confirmed) return

    try {
      setError("")
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: "DELETE",
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to delete category")
      }

      await loadCategories()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category")
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Categories</h1>
          <p className="text-muted-foreground">Manage movie and series categories</p>
        </div>
        <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
          <DialogTrigger asChild>
            <Button className="btn-gradient text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Add New Category</DialogTitle>
              <DialogDescription>Create a new category for organizing content</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Category Type</Label>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={categoryType === "main" ? "default" : "outline"}
                    className={categoryType === "main" ? "btn-gradient text-white" : ""}
                    onClick={() => setCategoryType("main")}
                  >
                    Movie Category
                  </Button>
                  <Button
                    type="button"
                    variant={categoryType === "season" ? "default" : "outline"}
                    className={categoryType === "season" ? "btn-gradient text-white" : ""}
                    onClick={() => setCategoryType("season")}
                  >
                    Season Category
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryName">Category Name</Label>
                <input
                  id="categoryName"
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Movies za Sci-Fi"
                  className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categorySlug">Slug (optional)</Label>
                <input
                  id="categorySlug"
                  type="text"
                  value={newCategorySlug}
                  onChange={(e) => setNewCategorySlug(e.target.value)}
                  placeholder="e.g., sayansi-sci-fi"
                  className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categorySortOrder">Sort Order</Label>
                <input
                  id="categorySortOrder"
                  type="number"
                  value={newCategorySortOrder}
                  onChange={(e) => setNewCategorySortOrder(e.target.value)}
                  className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryImageUrl">Category Image URL</Label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="categoryImageUrl"
                    type="url"
                    value={newCategoryImageUrl}
                    onChange={(e) => setNewCategoryImageUrl(e.target.value)}
                    placeholder="https://example.com/category.jpg"
                    className="w-full pl-10 pr-4 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="rounded-lg border border-border bg-secondary/30 p-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      await uploadCategoryImage(file, "new")
                    }}
                    className="w-full text-sm text-foreground"
                  />
                  <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                    {isUploadingNewImage ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    {isUploadingNewImage ? "Uploading image..." : newCategoryImageUrl ? "Image ready." : "Paste URL or upload image."}
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  resetCreateForm()
                  setIsAddingCategory(false)
                }}
              >
                Cancel
              </Button>
              <Button className="btn-gradient text-white" onClick={handleAddCategory}>
                Add Category
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={isEditingCategory} onOpenChange={setIsEditingCategory}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Edit Category</DialogTitle>
              <DialogDescription>Update category details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Category Type</Label>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={editCategoryType === "main" ? "default" : "outline"}
                    className={editCategoryType === "main" ? "btn-gradient text-white" : ""}
                    onClick={() => setEditCategoryType("main")}
                  >
                    Movie Category
                  </Button>
                  <Button
                    type="button"
                    variant={editCategoryType === "season" ? "default" : "outline"}
                    className={editCategoryType === "season" ? "btn-gradient text-white" : ""}
                    onClick={() => setEditCategoryType("season")}
                  >
                    Season Category
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCategoryName">Category Name</Label>
                <input
                  id="editCategoryName"
                  type="text"
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCategorySlug">Slug</Label>
                <input
                  id="editCategorySlug"
                  type="text"
                  value={editCategorySlug}
                  onChange={(e) => setEditCategorySlug(e.target.value)}
                  className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCategorySortOrder">Sort Order</Label>
                <input
                  id="editCategorySortOrder"
                  type="number"
                  value={editCategorySortOrder}
                  onChange={(e) => setEditCategorySortOrder(e.target.value)}
                  className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCategoryImageUrl">Category Image URL</Label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="editCategoryImageUrl"
                    type="url"
                    value={editCategoryImageUrl}
                    onChange={(e) => setEditCategoryImageUrl(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="rounded-lg border border-border bg-secondary/30 p-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      await uploadCategoryImage(file, "edit")
                    }}
                    className="w-full text-sm text-foreground"
                  />
                  <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                    {isUploadingEditImage ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    {isUploadingEditImage ? "Uploading image..." : editCategoryImageUrl ? "Image ready." : "Paste URL or upload image."}
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditingCategory(false)}>
                Cancel
              </Button>
              <Button className="btn-gradient text-white" onClick={handleEditCategory}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Loading categories from database...
        </div>
      )}

      {/* Main Categories */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            Single Movies
          </CardTitle>
          <CardDescription>Categories for organizing movies</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {mainCategories.map((category, index) => (
              <div 
                key={category.id} 
                className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl hover:bg-secondary transition-colors"
              >
                <div className="flex items-center gap-4">
                  <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-border bg-secondary">
                    {category.image_url ? (
                      <Image src={category.image_url} alt={category.name} fill className="object-cover" />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-r ${categoryColorClasses[index % categoryColorClasses.length]}`} />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{category.name}</p>
                    <p className="text-sm text-muted-foreground">/{category.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">{category.movie_count} movies</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(category)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteCategory(category)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {!loading && mainCategories.length === 0 && (
              <p className="text-sm text-muted-foreground">No movie categories yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Season Categories */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue" />
            Season Categories
          </CardTitle>
          <CardDescription>Sub-categories for TV series and seasons</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {seasonCategories.map((category) => (
              <div 
                key={category.id} 
                className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl hover:bg-secondary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-border bg-secondary">
                    {category.image_url ? (
                      <Image src={category.image_url} alt={category.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-blue-500 to-cyan-700" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{category.name}</p>
                    <p className="text-sm text-muted-foreground">{category.series_count} series</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(category)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteCategory(category)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {!loading && seasonCategories.length === 0 && (
              <p className="text-sm text-muted-foreground">No season categories yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
