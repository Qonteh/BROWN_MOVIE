import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromHeaders, hashPassword, verifyToken } from '@/lib/auth-helpers'
import { query } from '@/lib/db'

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

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (!auth.ok) return auth.response

    const result = await query(
      `SELECT
        u.id,
        u.full_name,
        u.email,
        u.phone_number,
        u.role,
        u.is_active,
        u.created_at,
        COALESCE(COUNT(p.id), 0)::int AS purchases
      FROM users u
      LEFT JOIN purchases p
        ON p.user_id = u.id
       AND p.status = 'completed'
      GROUP BY u.id
      ORDER BY u.created_at DESC`,
    )

    const users = result.rows.map((row: {
      id: string
      full_name: string
      email: string
      phone_number: string | null
      role: string
      is_active: boolean
      created_at: string
      purchases: number
    }) => ({
      id: row.id,
      name: row.full_name,
      email: row.email,
      phone: row.phone_number,
      role: row.role,
      purchases: row.purchases,
      joined: row.created_at,
      status: row.is_active ? 'active' : 'inactive',
    }))

    return NextResponse.json({ success: true, users }, { status: 200 })
  } catch (error) {
    console.error('Admin users fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (!auth.ok) return auth.response

    const body = await request.json()
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const phoneNumber = typeof body.phoneNumber === 'string' ? body.phoneNumber.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const role = body.role === 'admin' ? 'admin' : 'user'
    const isActive = body.isActive !== false

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: fullName, email, password' },
        { status: 400 },
      )
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email])
    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)
    const created = await query(
      `INSERT INTO users (email, password_hash, full_name, phone_number, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, full_name, email, phone_number, role, is_active, created_at`,
      [email, passwordHash, fullName, phoneNumber || null, role, isActive],
    )

    const row = created.rows[0]
    return NextResponse.json(
      {
        success: true,
        user: {
          id: row.id,
          name: row.full_name,
          email: row.email,
          phone: row.phone_number,
          role: row.role,
          purchases: 0,
          joined: row.created_at,
          status: row.is_active ? 'active' : 'inactive',
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Admin create user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
