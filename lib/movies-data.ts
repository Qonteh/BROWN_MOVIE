export interface Movie {
  id: string
  title: string
  price: number
  image: string
  category: string
  downloadUrl?: string
  year?: number
  rating?: string
  episodes?: string
  quality?: string
  movieParts?: Array<{
    id?: string
    title: string
    partNumber?: number
    url: string
  }>
  seriesSeasons?: Array<{
    id?: string
    title: string
    seasonNumber?: number
    episodes: Array<{
      id?: string
      title: string
      episodeNumber?: number
      url: string
    }>
  }>
}

export interface Category {
  id: string
  name: string
  slug: string
  image: string
  color: string
}

export interface SeasonCategory {
  id: string
  name: string
  slug: string
  movies: Movie[]
}

export function formatPrice(price: number): string {
  return `TSH ${Number(price || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
