import { NextResponse } from 'next/server'
import { getClient } from '@/lib/db'
import { ensureMovieMediaSchema } from '@/lib/movie-media'

export async function GET() {
  const client = await getClient()

  try {
    await ensureMovieMediaSchema(client)

    const result = await client.query(
      `SELECT
        m.id,
        m.title,
        m.poster_url,
        m.download_url,
        CEIL(m.price)::int AS price,
        m.release_year,
        m.quality,
        m.episodes_count,
        m.seasons_count,
        m.content_type,
        m.is_featured,
        m.is_new,
        m.created_at,
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
        ), '[]'::json) AS series_seasons,
        COALESCE(ARRAY_REMOVE(ARRAY_AGG(DISTINCT c.slug), NULL), '{}') AS category_slugs,
        COALESCE(ARRAY_REMOVE(ARRAY_AGG(DISTINCT c.name), NULL), '{}') AS category_names
      FROM movies m
      LEFT JOIN movie_categories mc ON mc.movie_id = m.id
      LEFT JOIN categories c ON c.id = mc.category_id
      WHERE m.is_active = TRUE
      GROUP BY m.id
      ORDER BY m.is_featured DESC, m.is_new DESC, m.created_at DESC`,
    )

    return NextResponse.json({ success: true, movies: result.rows })
  } catch (error) {
    console.error('Public movies error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch movies' }, { status: 500 })
  } finally {
    client.release()
  }
}