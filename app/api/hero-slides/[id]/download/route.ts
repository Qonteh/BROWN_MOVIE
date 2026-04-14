import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db'
import { getTokenFromHeaders, verifyToken } from '@/lib/auth-helpers'

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

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const client = await getClient()

  try {
    await client.query('ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS download_link TEXT')

    const { id } = await context.params
    const token = getTokenFromHeaders(Object.fromEntries(request.headers))
    const decoded = token ? verifyToken(token) : null

    if (!decoded?.userId) {
      return NextResponse.json(
        { success: false, code: 'AUTH_REQUIRED', error: 'Login required before download' },
        { status: 401 },
      )
    }

    const result = await client.query(
      `SELECT
         hs.id,
         hs.title,
         hs.movie_id,
         hs.download_link,
         m.download_url AS movie_download_url,
         m.price AS movie_price
       FROM hero_slides hs
       LEFT JOIN movies m ON m.id = hs.movie_id
       WHERE hs.id = $1
       LIMIT 1`,
      [id],
    )

    if (!result.rowCount) {
      return NextResponse.json({ success: false, error: 'Hero slide not found' }, { status: 404 })
    }

    const row = result.rows[0] as {
      id: string
      title: string
      movie_id: string | null
      download_link: string | null
      movie_download_url: string | null
      movie_price: number | string | null
    }

    const sourceUrl = row.download_link || row.movie_download_url
    if (!sourceUrl) {
      return NextResponse.json({ success: false, error: 'Download URL is missing for this hero slide' }, { status: 400 })
    }

    if (!row.movie_id) {
      return NextResponse.json({ success: false, error: 'This download is not linked to a purchasable movie.' }, { status: 400 })
    }

    const accessResult = await client.query(
      `SELECT id
       FROM purchases
       WHERE user_id = $1 AND movie_id = $2 AND status = 'completed'
       ORDER BY created_at DESC
       LIMIT 1`,
      [decoded.userId, row.movie_id],
    )

    if (!accessResult.rowCount) {
      return NextResponse.json(
        { success: false, code: 'PAYMENT_REQUIRED', error: 'Please complete payment before downloading this movie.' },
        { status: 402 },
      )
    }

    const upstream = await fetch(sourceUrl)
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ success: false, error: 'Unable to fetch movie file' }, { status: 502 })
    }

    const fileName = getFileNameFromUrl(sourceUrl, row.title)
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
    console.error('Hero slide download proxy error:', error)
    return NextResponse.json({ success: false, error: 'Failed to process hero download' }, { status: 500 })
  } finally {
    client.release()
  }
}
