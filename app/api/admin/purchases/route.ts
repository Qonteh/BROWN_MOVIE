import { NextResponse } from 'next/server'
import { getClient } from '@/lib/db'

type DeltaInput = {
  current: number
  previous: number
}

function computeDelta({ current, previous }: DeltaInput) {
  if (previous <= 0 && current <= 0) {
    return '0%'
  }

  if (previous <= 0 && current > 0) {
    return '+100%'
  }

  const raw = ((current - previous) / previous) * 100
  const rounded = Math.round(Math.abs(raw))
  return `${raw >= 0 ? '+' : '-'}${rounded}%`
}

export async function GET() {
  const client = await getClient()

  try {
    const [statsResult, growthResult, purchasesResult] = await Promise.all([
      client.query(
        `SELECT
          COALESCE(SUM(amount) FILTER (WHERE status = 'completed' AND created_at::date = CURRENT_DATE), 0)::numeric AS today_revenue,
          COUNT(*)::int AS total_transactions,
          COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_count,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
          COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_count,
          COUNT(*) FILTER (WHERE status = 'refunded')::int AS refunded_count
        FROM purchases`,
      ),
      client.query(
        `SELECT
          COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)::int AS tx_current,
          COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE - INTERVAL '1 day')::int AS tx_previous,
          COUNT(*) FILTER (WHERE status = 'completed' AND created_at::date = CURRENT_DATE)::int AS success_current,
          COUNT(*) FILTER (WHERE status = 'completed' AND created_at::date = CURRENT_DATE - INTERVAL '1 day')::int AS success_previous,
          COALESCE(SUM(amount) FILTER (WHERE status = 'completed' AND created_at::date = CURRENT_DATE), 0)::numeric AS revenue_current,
          COALESCE(SUM(amount) FILTER (WHERE status = 'completed' AND created_at::date = CURRENT_DATE - INTERVAL '1 day'), 0)::numeric AS revenue_previous,
          COUNT(*) FILTER (WHERE status = 'pending' AND created_at::date = CURRENT_DATE)::int AS pending_current,
          COUNT(*) FILTER (WHERE status = 'pending' AND created_at::date = CURRENT_DATE - INTERVAL '1 day')::int AS pending_previous
        FROM purchases`,
      ),
      client.query(
        `SELECT
          p.id,
          p.transaction_id,
          p.amount,
          p.currency,
          p.payment_method,
          p.payment_phone,
          p.status,
          p.created_at,
          COALESCE(u.full_name, 'Unknown User') AS user_name,
          COALESCE(u.email, 'unknown@example.com') AS user_email,
          COALESCE(m.title, 'Unknown Movie') AS movie_title
        FROM purchases p
        LEFT JOIN users u ON u.id = p.user_id
        LEFT JOIN movies m ON m.id = p.movie_id
        ORDER BY p.created_at DESC
        LIMIT 200`,
      ),
    ])

    const totals = statsResult.rows[0]
    const growth = growthResult.rows[0]

    const completedCount = Number(totals.completed_count || 0)
    const totalTransactions = Number(totals.total_transactions || 0)
    const successRate = totalTransactions > 0
      ? Number(((completedCount / totalTransactions) * 100).toFixed(1))
      : 0

    return NextResponse.json({
      success: true,
      stats: {
        todayRevenue: Number(totals.today_revenue || 0),
        totalTransactions,
        successRate,
        pendingCount: Number(totals.pending_count || 0),
        failedCount: Number(totals.failed_count || 0),
        refundedCount: Number(totals.refunded_count || 0),
        changes: {
          todayRevenue: computeDelta({
            current: Number(growth.revenue_current || 0),
            previous: Number(growth.revenue_previous || 0),
          }),
          totalTransactions: computeDelta({
            current: Number(growth.tx_current || 0),
            previous: Number(growth.tx_previous || 0),
          }),
          successRate: computeDelta({
            current: Number(growth.success_current || 0),
            previous: Number(growth.success_previous || 0),
          }),
          pendingCount: computeDelta({
            current: Number(growth.pending_current || 0),
            previous: Number(growth.pending_previous || 0),
          }),
        },
      },
      purchases: purchasesResult.rows,
    })
  } catch (error) {
    console.error('List purchases error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch purchases' }, { status: 500 })
  } finally {
    client.release()
  }
}