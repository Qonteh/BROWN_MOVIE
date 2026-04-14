import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db'
import { getTokenFromHeaders, verifyToken } from '@/lib/auth-helpers'
import { ensureMovieMediaSchema } from '@/lib/movie-media'

function getFileNameFromUrl(url: string, fallbackTitle: string) {
  try {
    const parsed = new URL(url)
    const pathname = parsed.pathname || ''
    const lastSegment = pathname.split('/').filter(Boolean).pop()
    if (lastSegment) {
      return decodeURIComponent(lastSegment)
    }
  } catch {
    // Ignore and fallback below.
  }

  return `${fallbackTitle.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'movie'}.mp4`
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const client = await getClient()

  try {
    await ensureMovieMediaSchema(client)

    const { id } = await context.params
    const partId = _request.nextUrl.searchParams.get('partId')
    const episodeId = _request.nextUrl.searchParams.get('episodeId')
    const token = getTokenFromHeaders(Object.fromEntries(_request.headers))
    const decoded = token ? verifyToken(token) : null

    if (!decoded?.userId) {
      return NextResponse.json(
        { success: false, code: 'AUTH_REQUIRED', error: 'Login required before download' },
        { status: 401 },
      )
    }

    const result = await client.query(
      `SELECT id, title, download_url, price
       FROM movies
       WHERE id = $1 AND is_active = TRUE
       LIMIT 1`,
      [id],
    )

    if (!result.rowCount) {
      return NextResponse.json({ success: false, error: 'Movie not found' }, { status: 404 })
    }

    const row = result.rows[0] as { id: string; title: string; download_url: string | null; price: number | string }

    const accessResult = await client.query(
      `SELECT id
       FROM purchases
       WHERE user_id = $1
         AND movie_id = $2
         AND status = 'completed'
       ORDER BY created_at DESC
       LIMIT 1`,
      [decoded.userId, row.id],
    )

    if (!accessResult.rowCount) {
      return NextResponse.json(
        { success: false, code: 'PAYMENT_REQUIRED', error: 'Please complete payment before downloading this movie.' },
        { status: 402 },
      )
    }

    let sourceUrl = row.download_url || ''
    let sourceLabel = row.title

    if (partId) {
      const partResult = await client.query(
        `SELECT part_title, download_url
         FROM movie_parts
         WHERE id = $1 AND movie_id = $2
         LIMIT 1`,
        [partId, id],
      )

      if (!partResult.rowCount) {
        return NextResponse.json({ success: false, error: 'Requested movie part was not found' }, { status: 404 })
      }

      sourceUrl = String(partResult.rows[0].download_url || '')
      sourceLabel = `${row.title} - ${String(partResult.rows[0].part_title || 'Part')}`
    }

    if (episodeId) {
      const episodeResult = await client.query(
        `SELECT me.episode_title, me.download_url, ms.season_title
         FROM movie_episodes me
         LEFT JOIN movie_seasons ms ON ms.id = me.season_id
         WHERE me.id = $1 AND me.movie_id = $2
         LIMIT 1`,
        [episodeId, id],
      )

      if (!episodeResult.rowCount) {
        return NextResponse.json({ success: false, error: 'Requested episode was not found' }, { status: 404 })
      }

      sourceUrl = String(episodeResult.rows[0].download_url || '')
      sourceLabel = `${row.title} - ${String(episodeResult.rows[0].season_title || 'Season')} - ${String(episodeResult.rows[0].episode_title || 'Episode')}`
    }

    if (!sourceUrl) {
      const fallbackPart = await client.query(
        `SELECT part_title, download_url
         FROM movie_parts
         WHERE movie_id = $1
         ORDER BY sort_order ASC, part_number ASC
         LIMIT 1`,
        [id],
      )

      if (fallbackPart.rowCount) {
        sourceUrl = String(fallbackPart.rows[0].download_url || '')
        sourceLabel = `${row.title} - ${String(fallbackPart.rows[0].part_title || 'Part')}`
      }
    }

    if (!sourceUrl) {
      const fallbackEpisode = await client.query(
        `SELECT me.episode_title, ms.season_title, me.download_url
         FROM movie_episodes me
         LEFT JOIN movie_seasons ms ON ms.id = me.season_id
         WHERE me.movie_id = $1
         ORDER BY me.sort_order ASC, me.episode_number ASC
         LIMIT 1`,
        [id],
      )

      if (fallbackEpisode.rowCount) {
        sourceUrl = String(fallbackEpisode.rows[0].download_url || '')
        sourceLabel = `${row.title} - ${String(fallbackEpisode.rows[0].season_title || 'Season')} - ${String(fallbackEpisode.rows[0].episode_title || 'Episode')}`
      }
    }

    if (!sourceUrl) {
      return NextResponse.json({ success: false, error: 'Download URL is missing for this movie' }, { status: 400 })
    }

    const upstream = await fetch(sourceUrl)
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ success: false, error: 'Unable to fetch movie file' }, { status: 502 })
    }

    const fileName = getFileNameFromUrl(sourceUrl, sourceLabel)
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream'
    const contentLength = upstream.headers.get('content-length')

    const headers = new Headers()
    headers.set('Content-Type', contentType)
    headers.set('Content-Disposition', `attachment; filename="${fileName}"`)
    headers.set('Cache-Control', 'no-store')
    if (contentLength) {
      headers.set('Content-Length', contentLength)
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error('Movie download proxy error:', error)
    return NextResponse.json({ success: false, error: 'Failed to process download' }, { status: 500 })
  } finally {
    client.release()
  }
}