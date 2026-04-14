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

// Main Categories
export const categories: Category[] = [
  { id: '1', name: 'Movies za Action/Kusisimua', slug: 'action-kusisimua', image: 'https://images.unsplash.com/photo-1531259683007-016a7b628fc3?w=900&h=560&fit=crop', color: 'from-orange-500 to-red-700' },
  { id: '2', name: 'Movies za Kivita', slug: 'kivita', image: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=900&h=560&fit=crop', color: 'from-gray-600 to-gray-900' },
  { id: '3', name: 'Movies za Kutisha/Horror', slug: 'kutisha-horror', image: 'https://images.unsplash.com/photo-1505635552518-3448ff116af3?w=900&h=560&fit=crop', color: 'from-slate-700 to-black' },
  { id: '4', name: 'Movies za Sayansi/Sci-Fi', slug: 'sayansi-sci-fi', image: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=900&h=560&fit=crop', color: 'from-indigo-600 to-blue-800' },
  { id: '5', name: 'Movies za Kuchekesha/Comedy', slug: 'kuchekesha-comedy', image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=900&h=560&fit=crop', color: 'from-yellow-500 to-orange-600' },
  { id: '6', name: 'Movies za Mapenzi/Drama', slug: 'mapenzi-drama', image: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=900&h=560&fit=crop', color: 'from-rose-500 to-pink-700' },
  { id: '7', name: 'Movies za Katuni/Animation', slug: 'katuni-animation', image: 'https://images.unsplash.com/photo-1586892478025-2b5472316f22?w=900&h=560&fit=crop', color: 'from-pink-500 to-purple-700' },
  { id: '8', name: 'Movies za Kihindi', slug: 'kihindi', image: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=900&h=560&fit=crop', color: 'from-amber-500 to-orange-700' },
  { id: '9', name: 'Movies za Kitambo/Zilizotamba', slug: 'kitambo-zilizotamba', image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=900&h=560&fit=crop', color: 'from-emerald-600 to-teal-800' },
  { id: '10', name: 'Movies za Afrika', slug: 'afrika', image: 'https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=900&h=560&fit=crop', color: 'from-green-600 to-emerald-800' },
]

// Season Sub-Categories
export const seasonCategories: Category[] = [
  { id: 's1', name: 'Season za Kichina', slug: 'kichina', image: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=900&h=560&fit=crop', color: 'from-red-600 to-rose-800' },
  { id: 's2', name: 'Season za Wachina/Japan', slug: 'wachina-japan', image: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=900&h=560&fit=crop', color: 'from-rose-500 to-orange-700' },
  { id: 's3', name: 'Season za Kihindi', slug: 'kihindi', image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=900&h=560&fit=crop', color: 'from-orange-500 to-amber-700' },
  { id: 's4', name: 'Season za Kizungu', slug: 'kizungu', image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=900&h=560&fit=crop', color: 'from-blue-500 to-indigo-700' },
  { id: 's5', name: 'Season za Korea', slug: 'korea', image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900&h=560&fit=crop', color: 'from-pink-500 to-rose-700' },
  { id: 's6', name: 'Season za Kifilipino', slug: 'kifilipino', image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=900&h=560&fit=crop', color: 'from-sky-500 to-blue-700' },
  { id: 's7', name: 'Season za Kituruki', slug: 'kituruki', image: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=900&h=560&fit=crop', color: 'from-teal-500 to-cyan-700' },
  { id: 's8', name: 'Season za Thailand', slug: 'thailand', image: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=900&h=560&fit=crop', color: 'from-purple-500 to-fuchsia-700' },
]

export const featuredMovies: Movie[] = [
  { id: 'f1', title: 'Furiosa: A Mad Max Saga', price: 3000, image: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=1400&h=700&fit=crop', category: 'action', year: 2026, quality: '4K' },
  { id: 'f2', title: 'Kingdom of the Planet', price: 2500, image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1400&h=700&fit=crop', category: 'action', year: 2026, quality: 'HD' },
  { id: 'f3', title: 'Godzilla x Kong Empire', price: 3000, image: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=1400&h=700&fit=crop', category: 'action', year: 2026, quality: '4K' },
  { id: 'f4', title: 'Dune: Messiah', price: 3500, image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1400&h=700&fit=crop', category: 'action', year: 2026, quality: '4K' },
]

export const newThisWeek: Movie[] = [
  { id: '1', title: 'Kabul Express', price: 2000, image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400&h=600&fit=crop', category: 'action', quality: 'HD' },
  { id: '2', title: 'Hoppers: Mission', price: 2000, image: 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=400&h=600&fit=crop', category: 'animation', quality: 'HD' },
  { id: '3', title: 'Bring The Law', price: 2500, image: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=400&h=600&fit=crop', category: 'action', quality: '4K' },
  { id: '4', title: 'Y: Marshals', price: 3000, image: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=400&h=600&fit=crop', category: 'thriller', quality: 'HD' },
  { id: '5', title: 'Peaky Blinders Movie', price: 2000, image: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400&h=600&fit=crop', category: 'drama', quality: '4K' },
  { id: '6', title: 'This Is Not A Drill', price: 1500, image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop', category: 'horror', quality: 'HD' },
  { id: '7', title: 'Silent Night 2', price: 2000, image: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&h=600&fit=crop', category: 'thriller', quality: 'HD' },
  { id: '8', title: 'The Watchers', price: 2500, image: 'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?w=400&h=600&fit=crop', category: 'horror', quality: '4K' },
]

export const cartoons: Movie[] = [
  { id: 'c1', title: 'Boss Baby 3', price: 1000, image: 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=400&h=600&fit=crop', category: 'cartoon', quality: 'HD' },
  { id: 'c2', title: 'Kung Fu Panda 5', price: 1000, image: 'https://images.unsplash.com/photo-1611457194403-d3f8c844d205?w=400&h=600&fit=crop', category: 'cartoon', quality: '4K' },
  { id: 'c3', title: 'Raya and the Last Dragon', price: 1000, image: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=400&h=600&fit=crop', category: 'cartoon', quality: 'HD' },
  { id: 'c4', title: 'Avatar 2', price: 1500, image: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=400&h=600&fit=crop', category: 'cartoon', quality: '4K' },
  { id: 'c5', title: 'Moana 2', price: 1000, image: 'https://images.unsplash.com/photo-1559163499-413811fb2344?w=400&h=600&fit=crop', category: 'cartoon', quality: 'HD' },
  { id: 'c6', title: 'Finding Dory 2', price: 1000, image: 'https://images.unsplash.com/photo-1551829142-d9a58ad5c6fe?w=400&h=600&fit=crop', category: 'cartoon', quality: 'HD' },
  { id: 'c7', title: 'Inside Out 3', price: 1500, image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&h=600&fit=crop', category: 'cartoon', quality: '4K' },
  { id: 'c8', title: 'Despicable Me 5', price: 1500, image: 'https://images.unsplash.com/photo-1517483000871-1dbf64a6e1c6?w=400&h=600&fit=crop', category: 'cartoon', quality: 'HD' },
]

export const actionMovies: Movie[] = [
  { id: 'a1', title: 'John Wick 5', price: 2000, image: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=400&h=600&fit=crop', category: 'action', quality: '4K' },
  { id: 'a2', title: 'Expendables 5', price: 2000, image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400&h=600&fit=crop', category: 'action', quality: 'HD' },
  { id: 'a3', title: 'Escape Plan 3', price: 1500, image: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=400&h=600&fit=crop', category: 'action', quality: 'HD' },
  { id: 'a4', title: 'Fast & Furious 12', price: 2500, image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop', category: 'action', quality: '4K' },
  { id: 'a5', title: 'Creed IV', price: 2000, image: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400&h=600&fit=crop', category: 'action', quality: '4K' },
  { id: 'a6', title: 'Mission Impossible 9', price: 3000, image: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&h=600&fit=crop', category: 'action', quality: '4K' },
  { id: 'a7', title: 'The Equalizer 4', price: 2000, image: 'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?w=400&h=600&fit=crop', category: 'action', quality: 'HD' },
  { id: 'a8', title: 'Rebel Moon 3', price: 2500, image: 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=400&h=600&fit=crop', category: 'action', quality: '4K' },
]

export const bollywoodMovies: Movie[] = [
  { id: 'b1', title: 'Pathaan 2', price: 2000, image: 'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?w=400&h=600&fit=crop', category: 'bollywood', quality: 'HD' },
  { id: 'b2', title: 'Jawan 2', price: 2500, image: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&h=600&fit=crop', category: 'bollywood', quality: '4K' },
  { id: 'b3', title: 'Tiger 4', price: 2000, image: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=400&h=600&fit=crop', category: 'bollywood', quality: 'HD' },
  { id: 'b4', title: 'Dhoom 4', price: 2500, image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop', category: 'bollywood', quality: '4K' },
  { id: 'b5', title: 'KGF Chapter 3', price: 3000, image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400&h=600&fit=crop', category: 'bollywood', quality: '4K' },
  { id: 'b6', title: 'War 2', price: 2000, image: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=400&h=600&fit=crop', category: 'bollywood', quality: 'HD' },
  { id: 'b7', title: 'Pushpa 3', price: 2500, image: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400&h=600&fit=crop', category: 'bollywood', quality: '4K' },
  { id: 'b8', title: 'RRR 2', price: 3000, image: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&h=600&fit=crop', category: 'bollywood', quality: '4K' },
]

export const koreanSeasons: Movie[] = [
  { id: 'k1', title: 'Squid Game S3', price: 3000, image: 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=400&h=600&fit=crop', category: 'korean', episodes: '1-10', quality: '4K' },
  { id: 'k2', title: 'All of Us Are Dead S2', price: 2500, image: 'https://images.unsplash.com/photo-1509248961895-b4d4e49b635c?w=400&h=600&fit=crop', category: 'korean', episodes: '1-12', quality: 'HD' },
  { id: 'k3', title: 'Sweet Home S4', price: 2000, image: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400&h=600&fit=crop', category: 'korean', episodes: '1-8', quality: '4K' },
  { id: 'k4', title: 'Crash Landing S2', price: 2500, image: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&h=600&fit=crop', category: 'korean', episodes: '1-16', quality: 'HD' },
  { id: 'k5', title: 'The Glory S3', price: 2000, image: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=400&h=600&fit=crop', category: 'korean', episodes: '1-8', quality: '4K' },
  { id: 'k6', title: 'Vincenzo S2', price: 2500, image: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=400&h=600&fit=crop', category: 'korean', episodes: '1-20', quality: 'HD' },
  { id: 'k7', title: 'My Name S2', price: 2000, image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400&h=600&fit=crop', category: 'korean', episodes: '1-8', quality: '4K' },
  { id: 'k8', title: 'Extraordinary Attorney', price: 2000, image: 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=400&h=600&fit=crop', category: 'korean', episodes: '1-16', quality: 'HD' },
]

export const chineseSeasons: Movie[] = [
  { id: 'ch1', title: 'The Untamed S2', price: 2500, image: 'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=400&h=600&fit=crop', category: 'chinese', episodes: '1-50', quality: 'HD' },
  { id: 'ch2', title: 'Word of Honor S2', price: 2000, image: 'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?w=400&h=600&fit=crop', category: 'chinese', episodes: '1-36', quality: '4K' },
  { id: 'ch3', title: 'Love Like Galaxy S2', price: 3000, image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop', category: 'chinese', episodes: '1-56', quality: 'HD' },
  { id: 'ch4', title: 'Till the End of Moon', price: 2500, image: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400&h=600&fit=crop', category: 'chinese', episodes: '1-40', quality: '4K' },
  { id: 'ch5', title: 'My Journey to You S2', price: 2000, image: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=400&h=600&fit=crop', category: 'chinese', episodes: '1-24', quality: 'HD' },
  { id: 'ch6', title: 'Hidden Love S2', price: 2000, image: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&h=600&fit=crop', category: 'chinese', episodes: '1-25', quality: '4K' },
  { id: 'ch7', title: 'Love Between Fairy', price: 2500, image: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=400&h=600&fit=crop', category: 'chinese', episodes: '1-36', quality: 'HD' },
  { id: 'ch8', title: 'The Double S2', price: 2000, image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400&h=600&fit=crop', category: 'chinese', episodes: '1-40', quality: '4K' },
]

export const indianSeasons: Movie[] = [
  { id: 'in1', title: 'Sacred Games S3', price: 2500, image: 'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?w=400&h=600&fit=crop', category: 'indian', episodes: '1-8', quality: '4K' },
  { id: 'in2', title: 'Mirzapur S4', price: 2500, image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400&h=600&fit=crop', category: 'indian', episodes: '1-10', quality: 'HD' },
  { id: 'in3', title: 'Family Man S3', price: 2000, image: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=400&h=600&fit=crop', category: 'indian', episodes: '1-10', quality: '4K' },
  { id: 'in4', title: 'Panchayat S4', price: 2000, image: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400&h=600&fit=crop', category: 'indian', episodes: '1-8', quality: 'HD' },
  { id: 'in5', title: 'Delhi Crime S3', price: 2000, image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop', category: 'indian', episodes: '1-6', quality: '4K' },
  { id: 'in6', title: 'Asur S3', price: 2500, image: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=400&h=600&fit=crop', category: 'indian', episodes: '1-8', quality: 'HD' },
  { id: 'in7', title: 'Scam 2026', price: 3000, image: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&h=600&fit=crop', category: 'indian', episodes: '1-12', quality: '4K' },
  { id: 'in8', title: 'Breathe S4', price: 2000, image: 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=400&h=600&fit=crop', category: 'indian', episodes: '1-8', quality: 'HD' },
]

export const westernSeasons: Movie[] = [
  { id: 'w1', title: 'Stranger Things S5', price: 3500, image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop', category: 'western', episodes: '1-10', quality: '4K' },
  { id: 'w2', title: 'The Witcher S4', price: 3000, image: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=400&h=600&fit=crop', category: 'western', episodes: '1-8', quality: '4K' },
  { id: 'w3', title: 'House of Dragon S3', price: 3500, image: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=400&h=600&fit=crop', category: 'western', episodes: '1-10', quality: '4K' },
  { id: 'w4', title: 'The Last of Us S3', price: 3000, image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400&h=600&fit=crop', category: 'western', episodes: '1-9', quality: '4K' },
  { id: 'w5', title: 'Wednesday S2', price: 2500, image: 'https://images.unsplash.com/photo-1509248961895-b4d4e49b635c?w=400&h=600&fit=crop', category: 'western', episodes: '1-8', quality: 'HD' },
  { id: 'w6', title: 'Peaky Blinders S7', price: 3000, image: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400&h=600&fit=crop', category: 'western', episodes: '1-6', quality: '4K' },
  { id: 'w7', title: 'Breaking Bad Movie', price: 2500, image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop', category: 'western', episodes: '1-8', quality: '4K' },
  { id: 'w8', title: 'Arcane S3', price: 2500, image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&h=600&fit=crop', category: 'western', episodes: '1-9', quality: '4K' },
]

export const turkishSeasons: Movie[] = [
  { id: 't1', title: 'Ertugrul S6', price: 2500, image: 'https://images.unsplash.com/photo-1527838832700-5059252407fa?w=400&h=600&fit=crop', category: 'turkish', episodes: '1-100', quality: 'HD' },
  { id: 't2', title: 'Kurulus Osman S6', price: 3000, image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400&h=600&fit=crop', category: 'turkish', episodes: '1-150', quality: '4K' },
  { id: 't3', title: 'Magnificent Century', price: 2000, image: 'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?w=400&h=600&fit=crop', category: 'turkish', episodes: '1-139', quality: 'HD' },
  { id: 't4', title: 'Valley of Wolves', price: 2500, image: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=400&h=600&fit=crop', category: 'turkish', episodes: '1-100', quality: 'HD' },
  { id: 't5', title: 'Alparslan S3', price: 2500, image: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=400&h=600&fit=crop', category: 'turkish', episodes: '1-60', quality: '4K' },
  { id: 't6', title: 'Barbaroslar S3', price: 2000, image: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400&h=600&fit=crop', category: 'turkish', episodes: '1-40', quality: 'HD' },
]

export const horrorMovies: Movie[] = [
  { id: 'h1', title: 'The Conjuring 4', price: 2000, image: 'https://images.unsplash.com/photo-1509248961895-b4d4e49b635c?w=400&h=600&fit=crop', category: 'horror', quality: '4K' },
  { id: 'h2', title: 'A Quiet Place 3', price: 2500, image: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=400&h=600&fit=crop', category: 'horror', quality: 'HD' },
  { id: 'h3', title: 'Insidious 6', price: 2000, image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400&h=600&fit=crop', category: 'horror', quality: 'HD' },
  { id: 'h4', title: 'Annabelle 4', price: 2000, image: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=400&h=600&fit=crop', category: 'horror', quality: '4K' },
  { id: 'h5', title: 'The Nun 3', price: 2500, image: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400&h=600&fit=crop', category: 'horror', quality: 'HD' },
  { id: 'h6', title: 'IT Chapter 3', price: 3000, image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop', category: 'horror', quality: '4K' },
]

export const comedyMovies: Movie[] = [
  { id: 'co1', title: 'Bad Boys 5', price: 2000, image: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=400&h=600&fit=crop', category: 'comedy', quality: 'HD' },
  { id: 'co2', title: 'Jumanji 4', price: 2500, image: 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=400&h=600&fit=crop', category: 'comedy', quality: '4K' },
  { id: 'co3', title: 'Central Intelligence 2', price: 2000, image: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400&h=600&fit=crop', category: 'comedy', quality: 'HD' },
  { id: 'co4', title: 'The Hangover 4', price: 2500, image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop', category: 'comedy', quality: 'HD' },
  { id: 'co5', title: 'Rush Hour 4', price: 2000, image: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=400&h=600&fit=crop', category: 'comedy', quality: '4K' },
  { id: 'co6', title: '22 Jump Street 2', price: 2000, image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400&h=600&fit=crop', category: 'comedy', quality: 'HD' },
]

export function formatPrice(price: number): string {
  return `TSH ${Number(price || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
