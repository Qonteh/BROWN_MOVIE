import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromHeaders, verifyToken } from '@/lib/auth-helpers'
import { getClient } from '@/lib/db'
import { verifyClickPesaPayment } from '@/lib/clickpesa'

export async function GET(request: NextRequest) {
  const token = getTokenFromHeaders(Object.fromEntries(request.headers))
  if (!token) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
  }

  const decoded = verifyToken(token)
  if (!decoded?.userId) {
    return NextResponse.json({ success: false, error: 'Invalid or expired session' }, { status: 401 })
  }

  const purchaseId = request.nextUrl.searchParams.get('purchaseId')
  if (!purchaseId) {
    return NextResponse.json({ success: false, error: 'purchaseId is required' }, { status: 400 })
  }

  const client = await getClient()
  try {
    const purchaseResult = await client.query(
      `SELECT id, status, transaction_id
       FROM purchases
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [purchaseId, decoded.userId],
    )

    if (!purchaseResult.rowCount) {
      return NextResponse.json({ success: false, error: 'Purchase not found' }, { status: 404 })
    }

    const purchase = purchaseResult.rows[0] as { id: string; status: string; transaction_id: string | null }
    if (purchase.status === 'completed') {
      return NextResponse.json({ success: true, paymentStatus: 'completed', purchaseId })
    }

    if (!purchase.transaction_id) {
      return NextResponse.json({ success: true, paymentStatus: 'pending', purchaseId })
    }

    const verifyResult = await verifyClickPesaPayment(purchase.transaction_id)
    const nextStatus = verifyResult.paymentStatus

    await client.query(
      `UPDATE purchases
       SET status = $1,
           paid_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE paid_at END,
           updated_at = NOW()
       WHERE id = $2`,
      [nextStatus, purchaseId],
    )

    return NextResponse.json({
      success: true,
      paymentStatus: nextStatus,
      purchaseId,
      message: verifyResult.message,
    })
  } catch (error) {
    console.error('ClickPesa status check error:', error)
    return NextResponse.json({ success: false, error: 'Failed to verify payment status' }, { status: 500 })
  } finally {
    client.release()
  }
}
