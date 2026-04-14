import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromHeaders, verifyToken } from '@/lib/auth-helpers'
import { getClient } from '@/lib/db'
import { initiateClickPesaPayment } from '@/lib/clickpesa'

function normalizePhoneNumber(input: string) {
  const digits = input.replace(/\D+/g, '')
  if (!digits) return ''
  if (digits.startsWith('0')) return `255${digits.slice(1)}`
  if (digits.startsWith('255')) return digits
  return `255${digits}`
}

export async function POST(request: NextRequest) {
  const token = getTokenFromHeaders(Object.fromEntries(request.headers))
  if (!token) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
  }

  const decoded = verifyToken(token)
  if (!decoded?.userId) {
    return NextResponse.json({ success: false, error: 'Invalid or expired session' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as {
    movieId?: string
    phoneNumber?: string
    provider?: string
  }

  if (!body.movieId) {
    return NextResponse.json({ success: false, error: 'movieId is required' }, { status: 400 })
  }

  const normalizedPhone = normalizePhoneNumber(body.phoneNumber || '')
  if (!/^255\d{9}$/.test(normalizedPhone)) {
    return NextResponse.json({ success: false, error: 'Invalid Tanzania phone number' }, { status: 400 })
  }

  const client = await getClient()
  try {
    const movieResult = await client.query(
      `SELECT id, title, price
       FROM movies
       WHERE id = $1 AND is_active = TRUE
       LIMIT 1`,
      [body.movieId],
    )

    if (!movieResult.rowCount) {
      return NextResponse.json({ success: false, error: 'Movie not found' }, { status: 404 })
    }

    const movie = movieResult.rows[0] as { id: string; title: string; price: string | number }

    const existingAccess = await client.query(
      `SELECT id
       FROM purchases
       WHERE user_id = $1 AND movie_id = $2 AND status = 'completed'
       ORDER BY created_at DESC
       LIMIT 1`,
      [decoded.userId, movie.id],
    )

    if (existingAccess.rowCount) {
      return NextResponse.json({ success: true, paymentStatus: 'completed', alreadyPaid: true })
    }

    const initialRef = `CP-${Date.now()}-${randomUUID().slice(0, 8)}`
    const inserted = await client.query(
      `INSERT INTO purchases (user_id, movie_id, amount, currency, payment_method, payment_phone, status, transaction_id, created_at, updated_at)
       VALUES ($1, $2, $3, 'TZS', $4, $5, 'pending', $6, NOW(), NOW())
       RETURNING id`,
      [decoded.userId, movie.id, Number(movie.price || 0), `clickpesa:${body.provider || 'mobile'}`, normalizedPhone, initialRef],
    )

    const purchaseId = String(inserted.rows[0]?.id || '')
    const callbackUrl = `${request.nextUrl.origin}/api/payments/clickpesa/webhook`

    const paymentResult = await initiateClickPesaPayment({
      amount: Number(movie.price || 0),
      currency: 'TZS',
      orderReference: initialRef,
      customerName: decoded.email || 'Brown Movies User',
      customerEmail: decoded.email || 'customer@brownmovies.local',
      customerPhone: normalizedPhone,
      provider: body.provider,
      description: `Purchase: ${movie.title}`,
      callbackUrl,
    })

    const finalTransactionId = paymentResult.transactionId || initialRef
    const nextStatus = paymentResult.paymentStatus

    await client.query(
      `UPDATE purchases
       SET status = $1,
           transaction_id = $2,
           paid_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE paid_at END,
           updated_at = NOW()
       WHERE id = $3`,
      [nextStatus, finalTransactionId, purchaseId],
    )

    if (!paymentResult.ok && nextStatus === 'failed') {
      return NextResponse.json(
        {
          success: false,
          paymentStatus: 'failed',
          purchaseId,
          error: paymentResult.message,
          gatewayResponse: paymentResult.raw,
        },
        { status: 502 },
      )
    }

    return NextResponse.json({
      success: true,
      paymentStatus: nextStatus,
      purchaseId,
      checkoutUrl: paymentResult.checkoutUrl,
      message: paymentResult.message,
      transactionId: finalTransactionId,
    })
  } catch (error) {
    console.error('ClickPesa initiate payment error:', error)
    return NextResponse.json({ success: false, error: 'Failed to initiate payment' }, { status: 500 })
  } finally {
    client.release()
  }
}
