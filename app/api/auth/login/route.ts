import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, randomUUID } from 'crypto';
import { query } from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

    // Validation
    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password' },
        { status: 400 }
      );
    }

    // Find user by email
    const result = await query(
      `SELECT id, email, password_hash, full_name, role
       FROM users
       WHERE email = $1`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      // Log failed attempt
      try {
        await query(
          `INSERT INTO login_attempts (email, success, failure_reason, ip_address, user_agent, attempted_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            normalizedEmail,
            false,
            'user_not_found',
            request.headers.get('x-forwarded-for') || 'unknown',
            request.headers.get('user-agent') || 'unknown',
          ]
        );
      } catch (logError) {
        console.error('Login attempts log error:', logError)
      }

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Best effort: lockout fields may be missing if auth migration was not applied.
    let lockedUntil: string | null = null
    try {
      const lockoutResult = await query(
        `SELECT locked_until, COALESCE(failed_login_attempts, 0) AS failed_login_attempts
         FROM users
         WHERE id = $1`,
        [user.id]
      )
      lockedUntil = lockoutResult.rows[0]?.locked_until ?? null
    } catch (lockoutError) {
      console.error('Lockout fields read error:', lockoutError)
    }

    // Check if user is locked
    if (lockedUntil && new Date(lockedUntil) > new Date()) {
      return NextResponse.json(
        { error: 'Account temporarily locked due to too many failed login attempts. Try again later.' },
        { status: 429 }
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      // Log failed attempt and increment counter
      try {
        await query(
          `INSERT INTO login_attempts (email, user_id, success, failure_reason, ip_address, user_agent, attempted_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            normalizedEmail,
            user.id,
            false,
            'invalid_password',
            request.headers.get('x-forwarded-for') || 'unknown',
            request.headers.get('user-agent') || 'unknown',
          ]
        );
      } catch (logError) {
        console.error('Login attempts log error:', logError)
      }

      try {
        await query(
          `UPDATE users
           SET
             failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
             locked_until = CASE
               WHEN COALESCE(failed_login_attempts, 0) + 1 >= 5 THEN NOW() + INTERVAL '15 minutes'
               ELSE locked_until
             END,
             updated_at = NOW()
           WHERE id = $1`,
          [user.id],
        )
      } catch (counterError) {
        console.error('Failed attempts update error:', counterError)
      }

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last login and reset failed attempts
    try {
      await query(
        `UPDATE users
         SET
           last_login_at = NOW(),
           failed_login_attempts = 0,
           locked_until = NULL,
           updated_at = NOW()
         WHERE id = $1`,
        [user.id],
      )
    } catch (markLoginError) {
      console.error('Mark login update error:', markLoginError)
    }

    // Log successful login
    try {
      await query(
        `INSERT INTO login_attempts (email, user_id, success, ip_address, user_agent, attempted_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          normalizedEmail,
          user.id,
          true,
          request.headers.get('x-forwarded-for') || 'unknown',
          request.headers.get('user-agent') || 'unknown',
        ]
      );
    } catch (logError) {
      console.error('Login success log error:', logError)
    }

    // Create auth session
    try {
      const sessionToken = randomUUID();
      await query(
        `INSERT INTO auth_sessions (user_id, session_token, refresh_token_hash, expires_at, ip_address, user_agent, created_at, updated_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '7 days', $4, $5, NOW(), NOW())`,
        [
          user.id,
          sessionToken,
          randomBytes(32).toString('hex'),
          request.headers.get('x-forwarded-for') || 'unknown',
          request.headers.get('user-agent') || 'unknown',
        ]
      );
    } catch (sessionError) {
      console.error('Auth session insert error:', sessionError)
    }

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
