import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromHeaders, verifyToken } from '@/lib/auth-helpers'
import { getClient } from '@/lib/db'
import { ensureMovieMediaSchema } from '@/lib/movie-media'
import { sanitizeImageUrl } from '@/lib/image-url'

export async function GET(request: NextRequest) {
  const token = getTokenFromHeaders(Object.fromEntries(request.headers))
  if (!token) {
    return NextResponse.json({ success: false, error: 'No token provided' }, { status: 401 })
  }

  const decoded = verifyToken(token)
  if (!decoded?.userId) {
    return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 401 })
  }

  const client = await getClient()

  try {
    await ensureMovieMediaSchema(client)

    const result = await client.query(
      `SELECT *
       FROM (
         SELECT DISTINCT ON (p.movie_id)
           p.id,
           p.movie_id,
           p.amount,
           p.currency,
           p.payment_method,
           p.status,
           p.created_at AS downloaded_at,
           m.title,
           m.poster_url,
           m.quality,
           m.release_year,
           m.download_url,
           COALESCE((
             SELECT JSON_AGG(
               JSON_BUILD_OBJECT(
                 'id', mp.id,
                 'title', mp.part_title,
                 'partNumber', mp.part_number,
                 'url', mp.download_url,
                 'sortOrder', mp.sort_order
               )
               ORDER BY mp.sort_order ASC, mp.part_number ASC
             )
             FROM movie_parts mp
             WHERE mp.movie_id = m.id
           ), '[]'::json) AS movie_parts,
           COALESCE((
             SELECT JSON_AGG(
               JSON_BUILD_OBJECT(
                 'id', ms.id,
                 'title', ms.season_title,
                 'seasonNumber', ms.season_number,
                 'sortOrder', ms.sort_order,
                 'episodes', COALESCE((
                   SELECT JSON_AGG(
                     JSON_BUILD_OBJECT(
                       'id', me.id,
                       'title', me.episode_title,
                       'episodeNumber', me.episode_number,
                       'url', me.download_url,
                       'sortOrder', me.sort_order
                     )
                     ORDER BY me.sort_order ASC, me.episode_number ASC
                   )
                   FROM movie_episodes me
                   WHERE me.season_id = ms.id
                 ), '[]'::json)
               )
               ORDER BY ms.sort_order ASC, ms.season_number ASC
             )
             FROM movie_seasons ms
             WHERE ms.movie_id = m.id
           ), '[]'::json) AS series_seasons
         FROM purchases p
         INNER JOIN movies m ON m.id = p.movie_id
         WHERE p.user_id = $1
           AND p.status = 'completed'
         ORDER BY p.movie_id, p.created_at DESC
       ) latest
       ORDER BY latest.downloaded_at DESC`,
      [decoded.userId],
    )

    const movies = result.rows.map((row) => ({
      ...row,
      poster_url: sanitizeImageUrl(row.poster_url),
    }))
    const totalMovies = movies.length
    const totalAmount = movies.reduce((sum, row) => sum + Number(row.amount || 0), 0)

    return NextResponse.json({ success: true, movies, stats: { totalMovies, totalAmount, currency: 'TSH' } })
  } catch (error) {
    console.error('My library error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch library' }, { status: 500 })
  } finally {
    client.release()
  }
}