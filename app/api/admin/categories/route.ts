import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db'

let ensureCategoryImageColumnPromise: Promise<void> | null = null

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function getSeasonParentId(client: Awaited<ReturnType<typeof getClient>>) {
  const existing = await client.query('SELECT id FROM categories WHERE slug = $1 LIMIT 1', ['season'])
  if (existing.rowCount && existing.rows[0]) {
    return existing.rows[0].id as string
  }

  const created = await client.query(
    `INSERT INTO categories (name, name_sw, slug, sort_order, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     RETURNING id`,
    ['Season', 'Season', 'season', 0],
  )

  return created.rows[0].id as string
}

async function ensureCategoryImageColumn(client: Awaited<ReturnType<typeof getClient>>) {
  await client.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT')
}

async function ensureCategorySchema(client: Awaited<ReturnType<typeof getClient>>) {
  if (!ensureCategoryImageColumnPromise) {
    ensureCategoryImageColumnPromise = ensureCategoryImageColumn(client).catch((error) => {
      ensureCategoryImageColumnPromise = null
      throw error
    })
  }

  await ensureCategoryImageColumnPromise
}

export async function GET() {
  const client = await getClient()

  try {
    await ensureCategorySchema(client)

    const result = await client.query(
      `SELECT
        c.id,
        c.name,
        c.name_sw,
        c.slug,
        c.image_url,
        c.sort_order,
        c.parent_id,
        parent.slug AS parent_slug,
        COALESCE(COUNT(mc.movie_id), 0)::int AS content_count,
        COALESCE(COUNT(mc.movie_id) FILTER (WHERE m.content_type = 'series'), 0)::int AS series_count,
        COALESCE(COUNT(mc.movie_id) FILTER (WHERE m.content_type = 'movie'), 0)::int AS movie_count
      FROM categories c
      LEFT JOIN categories parent ON parent.id = c.parent_id
      LEFT JOIN movie_categories mc ON mc.category_id = c.id
      LEFT JOIN movies m ON m.id = mc.movie_id
      GROUP BY c.id, parent.slug
      ORDER BY c.parent_id NULLS FIRST, c.sort_order ASC, c.name ASC`,
    )

    return NextResponse.json({ success: true, categories: result.rows })
  } catch (error) {
    console.error('List categories error:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  } finally {
    client.release()
  }
}

export async function POST(request: NextRequest) {
  const client = await getClient()

  try {
    await ensureCategorySchema(client)

    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const explicitSlug = typeof body.slug === 'string' ? body.slug.trim() : ''
    const type = body.type === 'season' ? 'season' : 'main'
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : ''
    const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 999

    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    const slug = slugify(explicitSlug || name)
    if (!slug) {
      return NextResponse.json({ error: 'Could not generate category slug' }, { status: 400 })
    }

    const duplicate = await client.query('SELECT id FROM categories WHERE slug = $1 LIMIT 1', [slug])
    if (duplicate.rowCount) {
      return NextResponse.json({ error: 'Category slug already exists' }, { status: 409 })
    }

    let parentId: string | null = null
    if (type === 'season') {
      parentId = await getSeasonParentId(client)
    }

    const result = await client.query(
      `INSERT INTO categories (name, name_sw, slug, image_url, sort_order, parent_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, name, name_sw, slug, image_url, sort_order, parent_id`,
      [name, name, slug, imageUrl || null, sortOrder, parentId],
    )

    return NextResponse.json({ success: true, category: result.rows[0] }, { status: 201 })
  } catch (error) {
    console.error('Create category error:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  } finally {
    client.release()
  }
}
