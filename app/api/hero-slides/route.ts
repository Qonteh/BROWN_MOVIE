import { NextResponse } from 'next/server'
import { getClient } from '@/lib/db'
import { sanitizeImageUrl } from '@/lib/image-url'

export async function GET() {
  const client = await getClient()

  try {
    await client.query('ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS trailer_link TEXT')
    await client.query('ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS download_link TEXT')
    await client.query('ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS price NUMERIC(10,2)')

    const result = await client.query(
      `SELECT
        hs.id,
        hs.title,
        hs.subtitle,
        hs.description,
        hs.image_url,
        hs.cta_text,
        hs.cta_link,
        hs.trailer_link,
        hs.download_link,
        hs.price AS hero_price,
        hs.sort_order,
        hs.start_date,
        hs.end_date,
        hs.movie_id,
        m.title AS movie_title,
        CEIL(m.price)::int AS movie_price,
        m.poster_url AS movie_image,
        m.content_type AS movie_category,
        m.release_year AS movie_year,
        m.quality AS movie_quality,
        m.download_url AS movie_download_url
      FROM hero_slides hs
      LEFT JOIN movies m ON m.id = hs.movie_id
      WHERE hs.is_active = TRUE
        AND (hs.start_date IS NULL OR hs.start_date <= NOW())
        AND (hs.end_date IS NULL OR hs.end_date >= NOW())
      ORDER BY hs.sort_order ASC, hs.created_at DESC`,
    )

    const slides = result.rows
      .map((row: { image_url?: unknown; movie_image?: unknown } & Record<string, unknown>) => ({
        ...row,
        image_url: sanitizeImageUrl(row.image_url),
        movie_image: sanitizeImageUrl(row.movie_image),
      }))
      .filter((row: { image_url: string | null }) => row.image_url)

    return NextResponse.json({ success: true, slides })
  } catch (error) {
    console.error('Public hero slides error:', error)
    return NextResponse.json({ error: 'Failed to fetch hero slides' }, { status: 500 })
  } finally {
    client.release()
  }
}
