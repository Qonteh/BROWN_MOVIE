import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db'
import {
  computeSeriesCounts,
  ensureMovieMediaSchema,
  fetchMovieMedia,
  normalizeMovieParts,
  normalizeSeriesSeasons,
  replaceMovieMedia,
  resolvePrimaryMediaUrl,
} from '@/lib/movie-media'

function toCategoryNameFromSlug(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

async function resolveCategoryId(
  client: Awaited<ReturnType<typeof getClient>>,
  categorySlug: string,
): Promise<string> {
  const existing = await client.query('SELECT id FROM categories WHERE slug = $1 LIMIT 1', [categorySlug])
  if (existing.rows[0]?.id) return existing.rows[0].id as string

  const fallbackName = toCategoryNameFromSlug(categorySlug)
  const created = await client.query(
    `INSERT INTO categories (name, name_sw, slug, sort_order, is_active)
     VALUES ($1, $2, $3, 999, true)
     ON CONFLICT (slug) DO UPDATE SET updated_at = NOW()
     RETURNING id`,
    [fallbackName, fallbackName, categorySlug],
  )

  return created.rows[0].id
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const client = await getClient()

  try {
    await ensureMovieMediaSchema(client)

    const { id } = await context.params
    const result = await client.query(
      `SELECT
         m.id,
         m.title,
         m.slug,
         m.description,
         m.poster_url,
         m.backdrop_url,
         m.trailer_url,
         m.download_url,
         m.price,
         m.release_year,
         m.quality,
         m.language,
         m.is_featured,
         m.is_new,
         m.is_trending,
         m.content_type,
         m.episodes_count,
         m.seasons_count,
         m.is_active,
         m.created_at,
         m.updated_at,
         COALESCE(c.name, 'Uncategorized') AS category_name,
         COALESCE(c.slug, 'uncategorized') AS category_slug
       FROM movies m
       LEFT JOIN LATERAL (
         SELECT c2.id, c2.name, c2.slug
         FROM movie_categories mc2
         JOIN categories c2 ON c2.id = mc2.category_id
         WHERE mc2.movie_id = m.id
         ORDER BY c2.sort_order ASC, c2.created_at ASC
         LIMIT 1
       ) c ON true
       WHERE m.id = $1
       LIMIT 1`,
      [id],
    )

    if (result.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Movie not found' }, { status: 404 })
    }

    const movie = result.rows[0]
    const media = await fetchMovieMedia(client, id)
    return NextResponse.json({
      success: true,
      movie: {
        ...movie,
        movie_parts: media.movieParts,
        series_seasons: media.seriesSeasons,
      },
    })
  } catch (error) {
    console.error('Get movie error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch movie' }, { status: 500 })
  } finally {
    client.release()
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const client = await getClient()

  try {
    await ensureMovieMediaSchema(client)

    const { id } = await context.params
    const body = await request.json()

    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const categorySlugRaw =
      typeof body.categorySlug === 'string'
        ? body.categorySlug.trim()
        : typeof body.category === 'string'
          ? body.category.trim()
          : ''
    const categorySlug = categorySlugRaw.toLowerCase()

    const isActive = typeof body.isActive === 'boolean' ? body.isActive : true
    const price = Number(body.price)
    const movieParts = normalizeMovieParts(body)
    const seriesSeasons = normalizeSeriesSeasons(body)
    const inputDownloadUrl =
      typeof body.downloadUrl === 'string'
        ? body.downloadUrl.trim()
        : typeof body.download_url === 'string'
          ? body.download_url.trim()
          : ''
    const resolvedDownloadUrl = resolvePrimaryMediaUrl(inputDownloadUrl, movieParts, seriesSeasons)
    const contentType = body.contentType === 'series' || body.content_type === 'series' ? 'series' : 'movie'
    const inferredSeriesCounts = computeSeriesCounts(seriesSeasons)

    if (!title || !categorySlug) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: title, category/categorySlug' },
        { status: 400 },
      )
    }

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        { success: false, error: 'Price must be a valid non-negative number' },
        { status: 400 },
      )
    }

    if (!resolvedDownloadUrl) {
      return NextResponse.json(
        { success: false, error: 'At least one media link is required' },
        { status: 400 },
      )
    }

    if (contentType === 'series' && seriesSeasons.length === 0 && !inputDownloadUrl) {
      return NextResponse.json(
        { success: false, error: 'Series requires season episode links or a fallback download URL' },
        { status: 400 },
      )
    }

    await client.query('BEGIN')

    const updateResult = await client.query(
      `UPDATE movies
       SET title = $1,
           description = $2,
           poster_url = $3,
           backdrop_url = $4,
           trailer_url = $5,
           download_url = $6,
           price = $7,
           release_year = $8,
           quality = $9,
           language = $10,
           is_featured = $11,
           is_new = $12,
           is_trending = $13,
           content_type = $14,
           episodes_count = $15,
           seasons_count = $16,
           is_active = $17,
           updated_at = NOW()
       WHERE id = $18
       RETURNING id`,
      [
        title,
        typeof body.description === 'string' ? body.description.trim() || null : null,
        typeof body.posterUrl === 'string' ? body.posterUrl.trim() : typeof body.poster_url === 'string' ? body.poster_url.trim() : null,
        typeof body.backdropUrl === 'string' ? body.backdropUrl.trim() || null : typeof body.backdrop_url === 'string' ? body.backdrop_url.trim() || null : null,
        typeof body.trailerUrl === 'string' ? body.trailerUrl.trim() || null : typeof body.trailer_url === 'string' ? body.trailer_url.trim() || null : null,
        resolvedDownloadUrl || null,
        price,
        body.releaseYear ? Number(body.releaseYear) : body.release_year ? Number(body.release_year) : null,
        typeof body.quality === 'string' ? body.quality : 'HD',
        typeof body.language === 'string' ? body.language : 'English',
        Boolean(body.isFeatured),
        Boolean(body.isNew),
        Boolean(body.isTrending),
        contentType,
        contentType === 'series'
          ? Math.max(inferredSeriesCounts.episodesCount, Math.max(1, Number(body.episodes || body.episodes_count || 1) || 1))
          : 1,
        contentType === 'series'
          ? Math.max(inferredSeriesCounts.seasonsCount, Math.max(1, Number(body.seasons || body.seasons_count || 1) || 1))
          : 1,
        isActive,
        id,
      ],
    )

    if (updateResult.rowCount === 0) {
      await client.query('ROLLBACK')
      return NextResponse.json({ success: false, error: 'Movie not found' }, { status: 404 })
    }

    const categoryId = await resolveCategoryId(client, categorySlug)
    await client.query('DELETE FROM movie_categories WHERE movie_id = $1', [id])
    await client.query(
      `INSERT INTO movie_categories (movie_id, category_id)
       VALUES ($1, $2)
       ON CONFLICT (movie_id, category_id) DO NOTHING`,
      [id, categoryId],
    )

    await replaceMovieMedia(client, id, movieParts, seriesSeasons)

    const updated = await client.query(
      `SELECT
         m.id,
         m.title,
         m.price,
         m.is_active,
         COALESCE(c.name, 'Uncategorized') AS category_name,
         COALESCE(c.slug, 'uncategorized') AS category_slug
       FROM movies m
       LEFT JOIN categories c ON c.id = $2
       WHERE m.id = $1
       LIMIT 1`,
      [id, categoryId],
    )

    await client.query('COMMIT')

    return NextResponse.json({ success: true, movie: updated.rows[0] })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => null)
    console.error('Update movie error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update movie' }, { status: 500 })
  } finally {
    client.release()
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const client = await getClient()

  try {
    const { id } = await context.params
    const deleted = await client.query('DELETE FROM movies WHERE id = $1 RETURNING id, title', [id])

    if (deleted.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Movie not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, movie: deleted.rows[0] })
  } catch (error) {
    console.error('Delete movie error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete movie' }, { status: 500 })
  } finally {
    client.release()
  }
}
