import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password' },
        { status: 400 }
      );
    }

    // Find user by email
    const result = await query(
      'SELECT id, email, password_hash, full_name, role, locked_until FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      // Log failed attempt
      await query(
        `INSERT INTO login_attempts (email, success, failure_reason, ip_address, user_agent, attempted_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          email,
          false,
          'user_not_found',
          request.headers.get('x-forwarded-for') || 'unknown',
          request.headers.get('user-agent') || 'unknown',
        ]
      );

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Check if user is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return NextResponse.json(
        { error: 'Account temporarily locked due to too many failed login attempts. Try again later.' },
        { status: 429 }
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      // Log failed attempt and increment counter
      await query(
        `INSERT INTO login_attempts (email, user_id, success, failure_reason, ip_address, user_agent, attempted_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          email,
          user.id,
          false,
          'invalid_password',
          request.headers.get('x-forwarded-for') || 'unknown',
          request.headers.get('user-agent') || 'unknown',
        ]
      );

      // Increment failed attempts
      await query(
        `SELECT increment_failed_login_attempts($1)`,
        [user.id]
      );

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last login and reset failed attempts
    await query(
      `SELECT mark_user_login($1)`,
      [user.id]
    );

    // Log successful login
    await query(
      `INSERT INTO login_attempts (email, user_id, success, ip_address, user_agent, attempted_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        email,
        user.id,
        true,
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown',
      ]
    );

    // Create auth session
    const sessionToken = crypto.randomUUID();
    const sessionResult = await query(
      `INSERT INTO auth_sessions (user_id, session_token, refresh_token_hash, expires_at, ip_address, user_agent, created_at, updated_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '7 days', $4, $5, NOW(), NOW())
       RETURNING session_token`,
      [
        user.id,
        sessionToken,
        Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex'),
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown',
      ]
    );

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
        },
        token,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
