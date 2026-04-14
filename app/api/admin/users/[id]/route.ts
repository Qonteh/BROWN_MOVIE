import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromHeaders, verifyToken } from '@/lib/auth-helpers'
import { query } from '@/lib/db'

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

async function isProtectedUser(userId: string) {
  const result = await query('SELECT email FROM users WHERE id = $1 LIMIT 1', [userId])
  if (result.rows.length === 0) return false
  const email = String(result.rows[0].email || '').toLowerCase()
  return email === PROTECTED_EMAIL
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(request)
    if (!auth.ok) return auth.response

    const { id } = await context.params

    if (await isProtectedUser(id)) {
      return NextResponse.json({ error: 'This user is protected and cannot be modified' }, { status: 403 })
    }

    const body = await request.json()
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : ''
    const phoneNumber = typeof body.phoneNumber === 'string' ? body.phoneNumber.trim() : ''
    const role = body.role === 'admin' ? 'admin' : 'user'
    const isActive = body.isActive !== false

    if (!fullName) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
    }

    const updated = await query(
      `UPDATE users
       SET full_name = $1,
           phone_number = $2,
           role = $3,
           is_active = $4,
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, full_name, email, phone_number, role, is_active, created_at`,
      [fullName, phoneNumber || null, role, isActive, id],
    )

    if (updated.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const row = updated.rows[0]
    const purchases = await query(
      `SELECT COALESCE(COUNT(id), 0)::int AS purchases
       FROM purchases
       WHERE user_id = $1
         AND status = 'completed'`,
      [id],
    )

    return NextResponse.json({
      success: true,
      user: {
        id: row.id,
        name: row.full_name,
        email: row.email,
        phone: row.phone_number,
        role: row.role,
        purchases: Number(purchases.rows[0]?.purchases || 0),
        joined: row.created_at,
        status: row.is_active ? 'active' : 'inactive',
      },
    })
  } catch (error) {
    console.error('Admin update user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(request)
    if (!auth.ok) return auth.response

    const { id } = await context.params

    if (await isProtectedUser(id)) {
      return NextResponse.json({ error: 'This user is protected and cannot be deleted' }, { status: 403 })
    }

    const deleted = await query('DELETE FROM users WHERE id = $1 RETURNING id, full_name, email', [id])

    if (deleted.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, user: deleted.rows[0] })
  } catch (error) {
    console.error('Admin delete user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
