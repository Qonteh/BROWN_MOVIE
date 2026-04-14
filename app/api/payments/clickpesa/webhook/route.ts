import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db'

type CallbackBody = {
  transaction_id?: string
  transactionId?: string
  order_reference?: string
  orderReference?: string
  status?: string
  payment_status?: string
  state?: string
}

function normalizeStatus(raw: string | undefined) {
  const status = (raw || '').toLowerCase()
  if (['success', 'successful', 'completed', 'paid', 'approved'].includes(status)) return 'completed'
  if (['failed', 'declined', 'rejected', 'cancelled', 'canceled', 'error'].includes(status)) return 'failed'
  return 'pending'
}

function toComparableBuffer(signature: string) {
  return Buffer.from(signature.trim().toLowerCase(), 'utf8')
}

function constantTimeMatch(expected: string, provided: string) {
  const expectedBuffer = toComparableBuffer(expected)
  const providedBuffer = toComparableBuffer(provided)

  if (expectedBuffer.length !== providedBuffer.length) {
    return false
  }

  return timingSafeEqual(expectedBuffer, providedBuffer)
}

function normalizeSignature(rawSignature: string) {
  return rawSignature.replace(/^sha256=/i, '').trim()
}

function isRecentTimestamp(rawTimestamp: string | null) {
  if (!rawTimestamp) return true
  const parsed = Number(rawTimestamp)
  if (!Number.isFinite(parsed) || parsed <= 0) return false

  const nowSeconds = Math.floor(Date.now() / 1000)
  return Math.abs(nowSeconds - parsed) <= 300
}

export async function POST(request: NextRequest) {
  const secret = process.env.CLICKPESA_WEBHOOK_SECRET || ''
  if (!secret) {
    return NextResponse.json({ success: false, error: 'Webhook secret is not configured' }, { status: 503 })
  }

  const rawBody = await request.text()
  const providedSignature =
    request.headers.get('x-clickpesa-signature') ||
    request.headers.get('x-signature') ||
    request.headers.get('signature')

  if (!providedSignature) {
    return NextResponse.json({ success: false, error: 'Missing webhook signature' }, { status: 401 })
  }

  const timestampHeader = request.headers.get('x-clickpesa-timestamp') || request.headers.get('x-timestamp')
  if (!isRecentTimestamp(timestampHeader)) {
    return NextResponse.json({ success: false, error: 'Webhook timestamp is invalid or expired' }, { status: 401 })
  }

  const signedPayload = timestampHeader ? `${timestampHeader}.${rawBody}` : rawBody
  const expectedSignature = createHmac('sha256', secret).update(signedPayload).digest('hex')
  const normalizedProvidedSignature = normalizeSignature(providedSignature)

  if (!constantTimeMatch(expectedSignature, normalizedProvidedSignature)) {
    return NextResponse.json({ success: false, error: 'Invalid webhook signature' }, { status: 401 })
  }

  let body: CallbackBody
  try {
    body = JSON.parse(rawBody || '{}') as CallbackBody
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid webhook payload' }, { status: 400 })
  }

  const reference =
    body.transaction_id ||
    body.transactionId ||
    body.order_reference ||
    body.orderReference

  if (!reference) {
    return NextResponse.json({ success: false, error: 'Missing transaction reference' }, { status: 400 })
  }

  const nextStatus = normalizeStatus(body.status || body.payment_status || body.state)

  const client = await getClient()
  try {
    await client.query(
      `UPDATE purchases
       SET status = $1,
           paid_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE paid_at END,
           updated_at = NOW()
       WHERE transaction_id = $2`,
      [nextStatus, reference],
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('ClickPesa webhook error:', error)
    return NextResponse.json({ success: false, error: 'Failed to process webhook' }, { status: 500 })
  } finally {
    client.release()
  }
}
