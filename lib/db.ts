import { Pool, QueryResult } from 'pg';

let pool: Pool | null = null

function normalizeDatabaseUrl(raw: string) {
  // Guard against common typo: channel_binding=requvire
  return raw.replace(/channel_binding=requvire/gi, 'channel_binding=require')
}

function getPool() {
  if (pool) {
    return pool
  }

  const connectionString = normalizeDatabaseUrl(process.env.DATABASE_URL)
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }

  pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  })

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err)
  })

  return pool
}

export async function query(text: string, params?: any[]): Promise<QueryResult> {
  const activePool = getPool()
  const start = Date.now();
  try {
    const result = await activePool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

export async function getClient() {
  return getPool().connect();
}

export default getPool;
