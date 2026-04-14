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

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const client = await getClient()

  try {
    await client.query('ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS trailer_link TEXT')
    await client.query('ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS download_link TEXT')
    await client.query('ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS price NUMERIC(10,2)')

    const { id } = await context.params
    const body = await request.json()

    const title = toNullableString(body.title)
    const imageUrl = toNullableString(body.imageUrl)

    if (!title || !imageUrl) {
      return NextResponse.json({ error: 'Title and image URL are required' }, { status: 400 })
    }

    const movieId = toNullableString(body.movieId)
    const subtitle = toNullableString(body.subtitle)
    const description = toNullableString(body.description)
    const ctaText = toNullableString(body.ctaText) ?? 'Download'
    const ctaLink = toNullableString(body.ctaLink)
    const trailerLink = toNullableString(body.trailerLink)
    const downloadLink = toNullableString(body.downloadLink)
    const price = Number.isFinite(Number(body.price)) ? Number(body.price) : 0
    const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0
    const isActive = Boolean(body.isActive)
    const startDate = toNullableDate(body.startDate)
    const endDate = toNullableDate(body.endDate)

    const result = await client.query(
      `UPDATE hero_slides
       SET movie_id = $1,
           title = $2,
           subtitle = $3,
           description = $4,
           image_url = $5,
           cta_text = $6,
           cta_link = $7,
           trailer_link = $8,
           download_link = $9,
           price = $10,
           sort_order = $11,
           is_active = $12,
           start_date = $13,
           end_date = $14,
           updated_at = NOW()
       WHERE id = $15
       RETURNING id`,
      [movieId, title, subtitle, description, imageUrl, ctaText, ctaLink, trailerLink, downloadLink, price, sortOrder, isActive, startDate, endDate, id],
    )

    if (!result.rowCount) {
      return NextResponse.json({ error: 'Hero slide not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update hero slide error:', error)
    return NextResponse.json({ error: 'Failed to update hero slide' }, { status: 500 })
  } finally {
    client.release()
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const client = await getClient()

  try {
    const { id } = await context.params

    const result = await client.query('DELETE FROM hero_slides WHERE id = $1 RETURNING id', [id])
    if (!result.rowCount) {
      return NextResponse.json({ error: 'Hero slide not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete hero slide error:', error)
    return NextResponse.json({ error: 'Failed to delete hero slide' }, { status: 500 })
  } finally {
    client.release()
  }
}
