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

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const client = await getClient()

  try {
    await ensureCategorySchema(client)

    const { id } = await context.params
    const body = await request.json()

    const existing = await client.query('SELECT id, slug FROM categories WHERE id = $1 LIMIT 1', [id])
    if (!existing.rowCount) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

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

    if (existing.rows[0].slug === 'season' && type !== 'main') {
      return NextResponse.json({ error: 'Season root cannot be changed to season child' }, { status: 400 })
    }

    const duplicate = await client.query('SELECT id FROM categories WHERE slug = $1 AND id <> $2 LIMIT 1', [slug, id])
    if (duplicate.rowCount) {
      return NextResponse.json({ error: 'Category slug already exists' }, { status: 409 })
    }

    let parentId: string | null = null
    if (type === 'season') {
      parentId = await getSeasonParentId(client)
    }

    const result = await client.query(
      `UPDATE categories
       SET name = $1,
           name_sw = $2,
           slug = $3,
           image_url = $4,
           sort_order = $5,
           parent_id = $6,
           updated_at = NOW()
         WHERE id = $7
         RETURNING id, name, name_sw, slug, image_url, sort_order, parent_id`,
        [name, name, slug, imageUrl || null, sortOrder, parentId, id],
    )

    return NextResponse.json({ success: true, category: result.rows[0] })
  } catch (error) {
    console.error('Update category error:', error)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  } finally {
    client.release()
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const client = await getClient()

  try {
    const { id } = await context.params

    const existing = await client.query('SELECT id, slug FROM categories WHERE id = $1 LIMIT 1', [id])
    if (!existing.rowCount) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    if (existing.rows[0].slug === 'season') {
      return NextResponse.json({ error: 'Cannot delete root season category' }, { status: 400 })
    }

    await client.query('DELETE FROM categories WHERE id = $1', [id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete category error:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  } finally {
    client.release()
  }
}
