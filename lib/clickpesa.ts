type JsonRecord = Record<string, unknown>

export type ClickPesaInitiateInput = {
  amount: number
  currency: string
  orderReference: string
  customerName: string
  customerEmail: string
  customerPhone: string
  provider?: string
  description: string
  callbackUrl?: string
}

export type ClickPesaResult = {
  ok: boolean
  status: number
  raw: unknown
  message: string
  transactionId: string | null
  checkoutUrl: string | null
  paymentStatus: 'completed' | 'pending' | 'failed'
}

function getStringValue(record: JsonRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return null
}

function normalizeStatus(value: string | null): 'completed' | 'pending' | 'failed' {
  if (!value) return 'pending'
  const status = value.toLowerCase()

  if (['success', 'successful', 'completed', 'paid', 'approved'].includes(status)) {
    return 'completed'
  }

  if (['failed', 'declined', 'rejected', 'cancelled', 'canceled', 'error'].includes(status)) {
    return 'failed'
  }

  return 'pending'
}

function parseClickPesaResult(status: number, payload: unknown): ClickPesaResult {
  const body = payload && typeof payload === 'object' ? (payload as JsonRecord) : {}
  const data = body.data && typeof body.data === 'object' ? (body.data as JsonRecord) : null

  const message =
    getStringValue(body, ['message', 'detail', 'error']) ||
    (data ? getStringValue(data, ['message', 'detail']) : null) ||
    (status >= 400 ? 'Payment request failed' : 'Payment request sent')

  const transactionId =
    getStringValue(body, ['transaction_id', 'transactionId', 'merchant_reference', 'order_reference']) ||
    (data ? getStringValue(data, ['transaction_id', 'transactionId', 'merchant_reference', 'order_reference']) : null)

  const checkoutUrl =
    getStringValue(body, ['checkout_url', 'payment_url', 'redirect_url']) ||
    (data ? getStringValue(data, ['checkout_url', 'payment_url', 'redirect_url']) : null)

  const rawStatus =
    getStringValue(body, ['status', 'payment_status', 'state']) ||
    (data ? getStringValue(data, ['status', 'payment_status', 'state']) : null)

  const paymentStatus = normalizeStatus(rawStatus)
  const ok = status >= 200 && status < 300

  return {
    ok,
    status,
    raw: payload,
    message,
    transactionId,
    checkoutUrl,
    paymentStatus: ok ? paymentStatus : 'failed',
  }
}

function getClickPesaBaseUrl() {
  return (process.env.CLICKPESA_BASE_URL || 'https://api.clickpesa.com').replace(/\/$/, '')
}

function getHeaders() {
  const clientId = process.env.CLICKPESA_CLIENT_ID || ''
  const apiKey = process.env.CLICKPESA_API_KEY || ''

  if (!clientId || !apiKey) {
    throw new Error('ClickPesa credentials are missing. Set CLICKPESA_CLIENT_ID and CLICKPESA_API_KEY.')
  }

  return {
    'Content-Type': 'application/json',
    'x-client-id': clientId,
    'x-api-key': apiKey,
    'client-id': clientId,
    'api-key': apiKey,
    Authorization: `Bearer ${apiKey}`,
  }
}

export async function initiateClickPesaPayment(input: ClickPesaInitiateInput): Promise<ClickPesaResult> {
  const endpointPath = process.env.CLICKPESA_INITIATE_PATH || '/third-parties/payments/initiate'
  const endpoint = `${getClickPesaBaseUrl()}${endpointPath}`

  const payload = {
    amount: Number(input.amount),
    currency: input.currency,
    order_reference: input.orderReference,
    description: input.description,
    customer_name: input.customerName,
    customer_email: input.customerEmail,
    customer_phone: input.customerPhone,
    payment_provider: input.provider,
    callback_url: input.callbackUrl,
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  const rawText = await response.text()
  let parsedBody: unknown = null
  try {
    parsedBody = rawText ? JSON.parse(rawText) : null
  } catch {
    parsedBody = { message: rawText }
  }

  return parseClickPesaResult(response.status, parsedBody)
}

export async function verifyClickPesaPayment(transactionReference: string): Promise<ClickPesaResult> {
  const endpointPath = process.env.CLICKPESA_VERIFY_PATH || '/third-parties/payments/status'
  const endpoint = `${getClickPesaBaseUrl()}${endpointPath}`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ transaction_reference: transactionReference }),
    cache: 'no-store',
  })

  const rawText = await response.text()
  let parsedBody: unknown = null
  try {
    parsedBody = rawText ? JSON.parse(rawText) : null
  } catch {
    parsedBody = { message: rawText }
  }

  return parseClickPesaResult(response.status, parsedBody)
}
