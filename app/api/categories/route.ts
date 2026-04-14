import { NextResponse } from 'next/server'
import { getClient } from '@/lib/db'

async function ensureCategoryImageColumn(client: Awaited<ReturnType<typeof getClient>>) {
  await client.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT')
}

export async function GET() {
  let client: Awaited<ReturnType<typeof getClient>> | null = null

  try {
    client = await getClient()
    await ensureCategoryImageColumn(client)

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

    return NextResponse.json({ success: true, categories: result.rows })
  } catch (error) {
    console.error('Public categories error:', error)
    return NextResponse.json({ success: true, categories: [] })
  } finally {
    client?.release()
  }
}
