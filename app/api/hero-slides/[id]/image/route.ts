import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db'

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
      `SELECT image_url
       FROM hero_slides
       WHERE id = $1
       LIMIT 1`,
      [id],
    )

    const imageUrl = result.rows[0]?.image_url
    if (typeof imageUrl !== 'string' || !imageUrl.trim()) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    const trimmed = imageUrl.trim()
    const dataUrlMatch = trimmed.match(/^data:(image\/[\w.+-]+);base64,(.+)$/s)
    if (dataUrlMatch) {
      const contentType = dataUrlMatch[1]
      const base64 = dataUrlMatch[2]
      const bytes = Buffer.from(base64, 'base64')

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
