import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromHeaders, verifyToken } from '@/lib/auth-helpers';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromHeaders(Object.fromEntries(request.headers));

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Log logout to audit
    await query(
      `INSERT INTO auth_audit_logs (user_id, action, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        decoded.userId,
        'logout',
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown',
      ]
    );

    return NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
