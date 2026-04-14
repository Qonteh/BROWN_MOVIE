import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db'

const MAX_HERO_IMAGE_BYTES = 700 * 1024

function escapeXml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function heroPlaceholderSvg(title: string) {
  const safeTitle = escapeXml(title || 'Hero Slide')
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" role="img" aria-label="${safeTitle}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1f2937"/>
      <stop offset="100%" stop-color="#111827"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#g)"/>
  <text x="80" y="790" fill="#f59e0b" font-size="56" font-family="Arial, sans-serif" font-weight="700">${safeTitle}</text>
</svg>`
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: 'Missing hero slide id' }, { status: 400 })
  }

  const client = await getClient()

  try {
    const result = await client.query(
      `SELECT image_url, title
       FROM hero_slides
       WHERE id = $1
       LIMIT 1`,
      [id],
    )

    const imageUrl = result.rows[0]?.image_url
    const title = typeof result.rows[0]?.title === 'string' ? result.rows[0].title : 'Hero Slide'
    if (typeof imageUrl !== 'string' || !imageUrl.trim()) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    const trimmed = imageUrl.trim()
    const dataUrlMatch = trimmed.match(/^data:(image\/[\w.+-]+);base64,(.+)$/s)
    if (dataUrlMatch) {
      const contentType = dataUrlMatch[1]
      const base64 = dataUrlMatch[2]
      const bytes = Buffer.from(base64, 'base64')

      if (bytes.length > MAX_HERO_IMAGE_BYTES) {
        return new NextResponse(heroPlaceholderSvg(title), {
          status: 200,
          headers: {
            'Content-Type': 'image/svg+xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          },
        })
      }

      return new NextResponse(bytes, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      })
    }

    return NextResponse.redirect(trimmed)
  } catch (error) {
    console.error('Hero slide image route error:', error)
    return NextResponse.json({ error: 'Failed to load image' }, { status: 500 })
  } finally {
    client.release()
  }
}
