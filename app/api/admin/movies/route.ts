import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db'
import {
  computeSeriesCounts,
  ensureMovieMediaSchema,
  normalizeMovieParts,
  normalizeSeriesSeasons,
  replaceMovieMedia,
  resolvePrimaryMediaUrl,
} from '@/lib/movie-media'

type CategoryDefinition = {
  name: string
  nameSw: string
  sortOrder: number
  parentSlug?: string
}

const CATEGORY_DEFINITIONS: Record<string, CategoryDefinition> = {
  'season': { name: 'Season', nameSw: 'Season', sortOrder: 0 },
  'action-kusisimua': { name: 'Movies za Action/Kusisimua', nameSw: 'Movies za Action/Kusisimua', sortOrder: 1 },
  'kivita': { name: 'Movies za Kivita', nameSw: 'Movies za Kivita', sortOrder: 2 },
  'kutisha-horror': { name: 'Movies za Kutisha/Horror', nameSw: 'Movies za Kutisha/Horror', sortOrder: 3 },
  'sayansi-sci-fi': { name: 'Movies za Sayansi/SCI-FI', nameSw: 'Movies za Sayansi/SCI-FI', sortOrder: 4 },
  'kuchekesha-comedy': { name: 'Movies za Kuchekesha/Comedy', nameSw: 'Movies za Kuchekesha/Comedy', sortOrder: 5 },
  'mapenzi-drama': { name: 'Movies za Mapenzi/Drama', nameSw: 'Movies za Mapenzi/Drama', sortOrder: 6 },
  'katuni-animation': { name: 'Movies za Katuni/Animation', nameSw: 'Movies za Katuni/Animation', sortOrder: 7 },
  'wahindi': { name: 'Movies za Kihindi', nameSw: 'Movies za Kihindi', sortOrder: 8 },
  'kitambo-zilizotamba': { name: 'Movies za Kitambo/Zilizotamba', nameSw: 'Movies za Kitambo/Zilizotamba', sortOrder: 9 },
  'afrika': { name: 'Movies za Afrika', nameSw: 'Movies za Afrika', sortOrder: 10 },
  'kichina': { name: 'Season za Kichina', nameSw: 'Season za Kichina', sortOrder: 1, parentSlug: 'season' },
  'wachina-japan': { name: 'Season za Wachina/Japan', nameSw: 'Season za Wachina/Japan', sortOrder: 2, parentSlug: 'season' },
  'indian-series': { name: 'Season za Kihindi', nameSw: 'Season za Kihindi', sortOrder: 3, parentSlug: 'season' },
  'kizungu': { name: 'Season za Kizungu', nameSw: 'Season za Kizungu', sortOrder: 4, parentSlug: 'season' },
  'korea': { name: 'Season za Korea', nameSw: 'Season za Korea', sortOrder: 5, parentSlug: 'season' },
  'kifilipino': { name: 'Season za Kifilipino', nameSw: 'Season za Kifilipino', sortOrder: 6, parentSlug: 'season' },
  'kituruki': { name: 'Season za Kituruki', nameSw: 'Season za Kituruki', sortOrder: 7, parentSlug: 'season' },
  'thailand': { name: 'Season za Thailand', nameSw: 'Season za Thailand', sortOrder: 8, parentSlug: 'season' },
}

const MOVIE_CATEGORY_ALIASES: Record<string, string> = {
  action: 'action-kusisimua',
  kusisimua: 'action-kusisimua',
  thriller: 'action-kusisimua',
  horror: 'kutisha-horror',
  kutisha: 'kutisha-horror',
  sci: 'sayansi-sci-fi',
  'sci-fi': 'sayansi-sci-fi',
  sayansi: 'sayansi-sci-fi',
  comedy: 'kuchekesha-comedy',
  kuchekesha: 'kuchekesha-comedy',
  drama: 'mapenzi-drama',
  mapenzi: 'mapenzi-drama',
  cartoon: 'katuni-animation',
  animation: 'katuni-animation',
  katuni: 'katuni-animation',
  bollywood: 'wahindi',
  wahindi: 'wahindi',
  kihindi: 'wahindi',
  'kitambo': 'kitambo-zilizotamba',
  'zilizotamba': 'kitambo-zilizotamba',
  africa: 'afrika',
}

const SEASON_CATEGORY_ALIASES: Record<string, string> = {
  korean: 'korea',
  chinese: 'kichina',
  'wachina': 'wachina-japan',
  'japan': 'wachina-japan',
  kihindi: 'indian-series',
  indian: 'indian-series',
  western: 'kizungu',
  turkish: 'kituruki',
  filipino: 'kifilipino',
  thai: 'thailand',
  spanish: 'kizungu',
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function extractInteger(value: unknown, fallback = 1) {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function normalizeCategorySlug(contentType: string, category: string) {
  const trimmed = category.trim().toLowerCase()

  if (contentType === 'series') {
    return SEASON_CATEGORY_ALIASES[trimmed] ?? trimmed
  }

  return MOVIE_CATEGORY_ALIASES[trimmed] ?? trimmed
}

function resolveCategoryDefinition(categorySlug: string): CategoryDefinition {
  return CATEGORY_DEFINITIONS[categorySlug] ?? {
    name: categorySlug.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
    nameSw: categorySlug.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
    sortOrder: 999,
  }
}

async function ensureCategoryId(client: Awaited<ReturnType<typeof getClient>>, categorySlug: string): Promise<string> {
  const definition = resolveCategoryDefinition(categorySlug)

  let parentId: string | null = null
  if (definition.parentSlug) {
    parentId = await ensureCategoryId(client, definition.parentSlug)
  }

  const result = await client.query(
    `INSERT INTO categories (name, name_sw, slug, sort_order, parent_id)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (slug) DO UPDATE SET
       name = EXCLUDED.name,
       name_sw = EXCLUDED.name_sw,
       sort_order = EXCLUDED.sort_order,
       parent_id = COALESCE(categories.parent_id, EXCLUDED.parent_id),
       updated_at = NOW()
     RETURNING id`,
    [definition.name, definition.nameSw, categorySlug, definition.sortOrder, parentId],
  )

  return result.rows[0].id
}

export async function GET() {
  const client = await getClient()

  try {
    await ensureMovieMediaSchema(client)

    const result = await client.query(
      `SELECT
        m.id,
        m.title,
        m.slug,
        m.poster_url,
        m.download_url,
        m.price,
        m.view_count,
        m.download_count,
        m.is_active,
        m.created_at,
        COALESCE(c.name, 'Uncategorized') AS category_name,
        COALESCE(c.slug, 'uncategorized') AS category_slug
      FROM movies m
      LEFT JOIN LATERAL (
        SELECT c2.name, c2.slug
        FROM movie_categories mc2
        JOIN categories c2 ON c2.id = mc2.category_id
        WHERE mc2.movie_id = m.id
        ORDER BY c2.sort_order ASC, c2.created_at ASC
        LIMIT 1
      ) c ON true
      ORDER BY m.created_at DESC`,
    )

    return NextResponse.json({
      success: true,
      movies: result.rows,
    })
  } catch (error) {
    console.error('List movies error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch movies' },
      { status: 500 },
    )
  } finally {
    client.release()
  }
}

export async function POST(request: NextRequest) {
  const client = await getClient()

  try {
    await ensureMovieMediaSchema(client)

    const body = await request.json()

    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : null
    const posterUrl = typeof body.posterUrl === 'string' ? body.posterUrl.trim() : ''
    const backdropUrl = typeof body.backdropUrl === 'string' ? body.backdropUrl.trim() : null
    const trailerUrl = typeof body.trailerUrl === 'string' ? body.trailerUrl.trim() : null
    const rawDownloadUrl = typeof body.downloadUrl === 'string' ? body.downloadUrl.trim() : ''
    const category = typeof body.category === 'string' ? body.category.trim() : ''
    const contentType = body.contentType === 'series' ? 'series' : 'movie'
    const movieParts = normalizeMovieParts(body)
    const seriesSeasons = normalizeSeriesSeasons(body)
    const downloadUrl = resolvePrimaryMediaUrl(rawDownloadUrl, movieParts, seriesSeasons)

    if (!title || !posterUrl || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: title, posterUrl, category' },
        { status: 400 },
      )
    }

    if (!downloadUrl) {
      return NextResponse.json(
        { error: 'At least one media link is required' },
        { status: 400 },
      )
    }

    if (contentType === 'series' && seriesSeasons.length === 0 && !rawDownloadUrl) {
      return NextResponse.json(
        { error: 'Series requires season episode links or a fallback download URL' },
        { status: 400 },
      )
    }

    const inferredSeriesCounts = computeSeriesCounts(seriesSeasons)

    await client.query('BEGIN')

    const categorySlug = normalizeCategorySlug(contentType, category)
    const categoryId = await ensureCategoryId(client, categorySlug)

    const slug = `${slugify(title)}-${Date.now().toString(36)}`
    const movieResult = await client.query(
      `INSERT INTO movies (
        title,
        slug,
        description,
        poster_url,
        backdrop_url,
        trailer_url,
        download_url,
        price,
        release_year,
        quality,
        language,
        is_featured,
        is_new,
        is_trending,
        content_type,
        episodes_count,
        seasons_count,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
      RETURNING id, title, slug, download_url`,
      [
        title,
        slug,
        description,
        posterUrl,
        backdropUrl,
        trailerUrl,
        downloadUrl,
        Number(body.price) || 0,
        body.releaseYear ? Number(body.releaseYear) : null,
        typeof body.quality === 'string' ? body.quality : 'HD',
        typeof body.language === 'string' ? body.language : 'English',
        Boolean(body.isFeatured),
        Boolean(body.isNew),
        Boolean(body.isTrending),
        contentType,
        contentType === 'series'
          ? Math.max(inferredSeriesCounts.episodesCount, extractInteger(body.episodes, 1))
          : 1,
        contentType === 'series'
          ? Math.max(inferredSeriesCounts.seasonsCount, extractInteger(body.seasons, 1))
          : 1,
      ],
    )

    await client.query(
      'INSERT INTO movie_categories (movie_id, category_id) VALUES ($1, $2)',
      [movieResult.rows[0].id, categoryId],
    )

    await replaceMovieMedia(client, movieResult.rows[0].id, movieParts, seriesSeasons)

    await client.query('COMMIT')

    return NextResponse.json(
      {
        success: true,
        movie: movieResult.rows[0],
      },
      { status: 201 },
    )
  } catch (error) {
    await client.query('ROLLBACK').catch(() => null)
    console.error('Create movie error:', error)
    return NextResponse.json(
      { error: 'Failed to save movie' },
      { status: 500 },
    )
  } finally {
    client.release()
  }
}
