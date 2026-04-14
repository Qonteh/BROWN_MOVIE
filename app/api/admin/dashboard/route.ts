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
    const [
      totalsResult,
      moviesMonthlyResult,
      usersMonthlyResult,
      salesMonthlyResult,
      purchasesDailyResult,
      recentPurchasesResult,
      topMoviesResult,
    ] = await Promise.all([
      client.query(
        `SELECT
          (SELECT COUNT(*)::int FROM movies) AS total_movies,
          (SELECT COUNT(*)::int FROM users) AS total_users,
          (SELECT COALESCE(SUM(amount), 0)::numeric FROM purchases WHERE status = 'completed') AS total_sales,
          (SELECT COUNT(*)::int FROM purchases WHERE status = 'completed' AND created_at::date = CURRENT_DATE) AS purchases_today`,
      ),
      client.query(
        `SELECT
          COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int AS current,
          COUNT(*) FILTER (
            WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '1 month'
              AND created_at < date_trunc('month', NOW())
          )::int AS previous
        FROM movies`,
      ),
      client.query(
        `SELECT
          COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int AS current,
          COUNT(*) FILTER (
            WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '1 month'
              AND created_at < date_trunc('month', NOW())
          )::int AS previous
        FROM users`,
      ),
      client.query(
        `SELECT
          COALESCE(SUM(amount) FILTER (WHERE status = 'completed' AND created_at >= date_trunc('month', NOW())), 0)::numeric AS current,
          COALESCE(SUM(amount) FILTER (
            WHERE status = 'completed'
              AND created_at >= date_trunc('month', NOW()) - INTERVAL '1 month'
              AND created_at < date_trunc('month', NOW())
          ), 0)::numeric AS previous
        FROM purchases`,
      ),
      client.query(
        `SELECT
          COUNT(*) FILTER (WHERE status = 'completed' AND created_at::date = CURRENT_DATE)::int AS current,
          COUNT(*) FILTER (WHERE status = 'completed' AND created_at::date = CURRENT_DATE - INTERVAL '1 day')::int AS previous
        FROM purchases`,
      ),
      client.query(
        `SELECT
          p.id,
          p.amount,
          p.created_at,
          p.status,
          COALESCE(u.full_name, 'Unknown User') AS user_name,
          COALESCE(m.title, 'Unknown Movie') AS movie_title
        FROM purchases p
        LEFT JOIN users u ON u.id = p.user_id
        LEFT JOIN movies m ON m.id = p.movie_id
        ORDER BY p.created_at DESC
        LIMIT 5`,
      ),
      client.query(
        `SELECT
          m.id,
          m.title,
          m.view_count,
          m.download_count,
          COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'), 0)::numeric AS revenue
        FROM movies m
        LEFT JOIN purchases p ON p.movie_id = m.id
        GROUP BY m.id
        ORDER BY revenue DESC, m.download_count DESC, m.view_count DESC
        LIMIT 5`,
      ),
    ])

    const totals = totalsResult.rows[0]
    const moviesMonthly = moviesMonthlyResult.rows[0]
    const usersMonthly = usersMonthlyResult.rows[0]
    const salesMonthly = salesMonthlyResult.rows[0]
    const purchasesDaily = purchasesDailyResult.rows[0]

    return NextResponse.json({
      success: true,
      stats: {
        totalMovies: Number(totals.total_movies || 0),
        totalUsers: Number(totals.total_users || 0),
        totalSales: Number(totals.total_sales || 0),
        purchasesToday: Number(totals.purchases_today || 0),
        changes: {
          totalMovies: computeDelta({ current: Number(moviesMonthly.current || 0), previous: Number(moviesMonthly.previous || 0) }),
          totalUsers: computeDelta({ current: Number(usersMonthly.current || 0), previous: Number(usersMonthly.previous || 0) }),
          totalSales: computeDelta({ current: Number(salesMonthly.current || 0), previous: Number(salesMonthly.previous || 0) }),
          purchasesToday: computeDelta({ current: Number(purchasesDaily.current || 0), previous: Number(purchasesDaily.previous || 0) }),
        },
      },
      recentPurchases: recentPurchasesResult.rows,
      topMovies: topMoviesResult.rows,
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  } finally {
    client.release()
  }
}
