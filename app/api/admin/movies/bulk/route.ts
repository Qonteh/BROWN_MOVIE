import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db'

type BulkAction = 'activate' | 'deactivate' | 'delete'

export async function POST(request: NextRequest) {
  const client = await getClient()

  try {
    const body = await request.json()
    const action = body?.action as BulkAction
    const ids = Array.isArray(body?.ids)
      ? body.ids.filter((id: unknown) => typeof id === 'string' && id.trim().length > 0)
      : []

    if (!ids.length) {
      return NextResponse.json({ success: false, error: 'No movie ids provided' }, { status: 400 })
    }

    if (!['activate', 'deactivate', 'delete'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid bulk action' }, { status: 400 })
    }

    await client.query('BEGIN')

    let result
    if (action === 'delete') {
      result = await client.query(
        'DELETE FROM movies WHERE id = ANY($1::uuid[]) RETURNING id',
        [ids],
      )
    } else {
      result = await client.query(
        `UPDATE movies
         SET is_active = $1,
             updated_at = NOW()
         WHERE id = ANY($2::uuid[])
         RETURNING id`,
        [action === 'activate', ids],
      )
    }

    await client.query('COMMIT')

    return NextResponse.json({
      success: true,
      action,
      affected: result.rowCount ?? 0,
    })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => null)
    console.error('Bulk movies action error:', error)
    return NextResponse.json({ success: false, error: 'Bulk action failed' }, { status: 500 })
  } finally {
    client.release()
  }
}
