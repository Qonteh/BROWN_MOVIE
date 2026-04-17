import { NextResponse } from 'next/server'
import { getClient } from '@/lib/db'

let ensureCategoryImageColumnPromise: Promise<void> | null = null

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
  let client: Awaited<ReturnType<typeof getClient>> | null = null

  try {
    client = await getClient()
    await ensureCategorySchema(client)

    const result = await client.query(
      `SELECT
         c.id,
         c.name,
         c.slug,
         c.image_url,
         c.sort_order,
         parent.slug AS parent_slug,
         COALESCE(COUNT(mc.movie_id), 0)::int AS content_count,
         COALESCE(COUNT(mc.movie_id) FILTER (WHERE m.content_type = 'series'), 0)::int AS series_count,
         COALESCE(COUNT(mc.movie_id) FILTER (WHERE m.content_type = 'movie'), 0)::int AS movie_count
       FROM categories c
       LEFT JOIN categories parent ON parent.id = c.parent_id
       LEFT JOIN movie_categories mc ON mc.category_id = c.id
       LEFT JOIN movies m ON m.id = mc.movie_id
       WHERE c.is_active = TRUE
       GROUP BY c.id, parent.slug
       ORDER BY c.parent_id NULLS FIRST, c.sort_order ASC, c.name ASC`,
    )

    return NextResponse.json(
      { success: true, categories: result.rows },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
        },
      },
    )
  } catch (error) {
    console.error('Public categories error:', error)
    return NextResponse.json(
      { success: true, categories: [] },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
        },
      },
    )
  } finally {
    client?.release()
  }
}
