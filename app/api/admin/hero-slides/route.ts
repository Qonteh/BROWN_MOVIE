import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db'

function toNullableString(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toNullableDate(value: unknown) {
  if (typeof value !== 'string' || value.trim().length === 0) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export async function GET() {
  const client = await getClient()

  try {
    await client.query('ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS trailer_link TEXT')
    await client.query('ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS download_link TEXT')
    await client.query('ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS price NUMERIC(10,2)')

    const [slidesResult, moviesResult] = await Promise.all([
      client.query(
        `SELECT
          hs.id,
          hs.movie_id,
          hs.title,
          hs.subtitle,
          hs.description,
          hs.image_url,
          hs.cta_text,
          hs.cta_link,
          hs.trailer_link,
          hs.download_link,
          hs.price,
          hs.sort_order,
          hs.is_active,
          hs.start_date,
          hs.end_date,
          hs.created_at,
          hs.updated_at,
          m.title AS movie_title
        FROM hero_slides hs
        LEFT JOIN movies m ON m.id = hs.movie_id
        ORDER BY hs.sort_order ASC, hs.created_at DESC`,
      ),
      client.query(
        `SELECT id, title, release_year, is_active
         FROM movies
         ORDER BY is_active DESC, created_at DESC`,
      ),
    ])

    return NextResponse.json({
      success: true,
      slides: slidesResult.rows,
      movies: moviesResult.rows,
    })
  } catch (error) {
    console.error('List hero slides error:', error)
    return NextResponse.json({ error: 'Failed to fetch hero slides' }, { status: 500 })
  } finally {
    client.release()
  }
}

export async function POST(request: NextRequest) {
  const client = await getClient()

  try {
    await client.query('ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS trailer_link TEXT')
    await client.query('ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS download_link TEXT')
    await client.query('ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS price NUMERIC(10,2)')

    const body = await request.json()

    const title = toNullableString(body.title)
    const imageUrl = toNullableString(body.imageUrl)

    if (!title || !imageUrl) {
      return NextResponse.json({ error: 'Title and image URL are required' }, { status: 400 })
    }

    const movieId = toNullableString(body.movieId)
    const subtitle = toNullableString(body.subtitle)
    const description = toNullableString(body.description)
    const ctaText = toNullableString(body.ctaText)
    const ctaLink = toNullableString(body.ctaLink)
    const trailerLink = toNullableString(body.trailerLink)
    const downloadLink = toNullableString(body.downloadLink)
    const price = Number.isFinite(Number(body.price)) ? Number(body.price) : 0
    const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0
    const isActive = Boolean(body.isActive)
    const startDate = toNullableDate(body.startDate)
    const endDate = toNullableDate(body.endDate)

    const result = await client.query(
      `INSERT INTO hero_slides (
        movie_id,
        title,
        subtitle,
        description,
        image_url,
        cta_text,
        cta_link,
        trailer_link,
        download_link,
        price,
        sort_order,
        is_active,
        start_date,
        end_date,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      RETURNING id`,
      [movieId, title, subtitle, description, imageUrl, ctaText, ctaLink, trailerLink, downloadLink, price, sortOrder, isActive, startDate, endDate],
    )

    return NextResponse.json({ success: true, id: result.rows[0].id }, { status: 201 })
  } catch (error) {
    console.error('Create hero slide error:', error)
    return NextResponse.json({ error: 'Failed to create hero slide' }, { status: 500 })
  } finally {
    client.release()
  }
}
