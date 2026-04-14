"use client"

import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SearchBarProps {
  activeFilter: string
  onFilterChange: (filter: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  onSearch?: (query: string) => void
}

const filters = [
  { id: "all", label: "Zote" },
  { id: "movies", label: "Movies" },
  { id: "series", label: "Series" },
  { id: "cartoons", label: "Katuni" },
]

export function SearchBar({
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  onSearch,
}: SearchBarProps) {

  const handleSearch = () => {
    onSearch?.(searchQuery)
  }

  return (
    <section className="container mx-auto px-4 -mt-8 relative z-30">
      {/* Search Box */}
      <div className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border/50 p-4 md:p-6 shadow-2xl shadow-black/20">
        {/* Search Input */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tafuta movies, series, katuni..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-12 pr-4 py-3.5 bg-secondary/50 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange/50 transition-all"
            />
          </div>
          <Button 
            onClick={handleSearch}
            className="bg-orange hover:bg-orange/90 text-primary-foreground font-semibold px-6 md:px-8 rounded-xl"
          >
            Tafuta
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => onFilterChange(filter.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeFilter === filter.id
                  ? "bg-orange text-primary-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
