import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromHeaders, verifyToken } from '@/lib/auth-helpers'
import { query } from '@/lib/db'

type BulkAction = 'activate' | 'deactivate'
const PROTECTED_EMAIL = 'abdulyusuph051@gmail.com'

async function requireAdmin(request: NextRequest) {
  const token = getTokenFromHeaders(Object.fromEntries(request.headers))

  if (!token) {
    return { ok: false as const, response: NextResponse.json({ error: 'No token provided' }, { status: 401 }) }
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }),
    }
  }

  const adminCheck = await query('SELECT role FROM users WHERE id = $1', [decoded.userId])
  if (adminCheck.rows.length === 0) {
    return { ok: false as const, response: NextResponse.json({ error: 'User not found' }, { status: 404 }) }
  }

  if (adminCheck.rows[0].role !== 'admin') {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { ok: true as const }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (!auth.ok) return auth.response

    const body = await request.json()
    const action = body?.action as BulkAction
    const ids = Array.isArray(body?.ids)
      ? body.ids.filter((id: unknown) => typeof id === 'string' && id.trim().length > 0)
      : []

    if (!ids.length) {
      return NextResponse.json({ success: false, error: 'No user ids provided' }, { status: 400 })
    }

    if (!['activate', 'deactivate'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid bulk action' }, { status: 400 })
    }

    const protectedRows = await query(
      'SELECT id FROM users WHERE id = ANY($1::uuid[]) AND LOWER(email) = $2',
      [ids, PROTECTED_EMAIL],
    )
    const protectedIds = new Set<string>(protectedRows.rows.map((row: { id: string }) => row.id))
    const targetIds = ids.filter((id: string) => !protectedIds.has(id))

    if (!targetIds.length) {
      return NextResponse.json({ success: true, affected: 0, skippedProtected: protectedIds.size })
    }

    const result = await query(
      `UPDATE users
       SET is_active = $1,
           updated_at = NOW()
       WHERE id = ANY($2::uuid[])
       RETURNING id`,
      [action === 'activate', targetIds],
    )

    return NextResponse.json({
      success: true,
      action,
      affected: result.rowCount ?? 0,
      skippedProtected: protectedIds.size,
    })
  } catch (error) {
    console.error('Admin users bulk action error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
