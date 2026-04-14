import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db'

type SettingsResponse = {
  siteName: string
  siteTagline: string
  contactEmail: string
  contactPhone: string
  defaultCurrency: string
  mpesaEnabled: boolean
  airtelEnabled: boolean
  halopesaEnabled: boolean
  mixxEnabled: boolean
  cardEnabled: boolean
  emailNotifications: boolean
  pushNotifications: boolean
  maintenanceMode: boolean
}

const DEFAULT_SETTINGS: SettingsResponse = {
  siteName: 'Brown Movies',
  siteTagline: 'Premium Entertainment',
  contactEmail: 'support@brownmovies.com',
  contactPhone: '+255 700 000 000',
  defaultCurrency: 'TSH',
  mpesaEnabled: true,
  airtelEnabled: true,
  halopesaEnabled: true,
  mixxEnabled: true,
  cardEnabled: true,
  emailNotifications: true,
  pushNotifications: false,
  maintenanceMode: false,
}

const SETTING_KEYS = {
  siteName: 'site_name',
  siteTagline: 'site_tagline',
  contactEmail: 'contact_email',
  contactPhone: 'contact_phone',
  defaultCurrency: 'default_currency',
  mpesaEnabled: 'mpesa_enabled',
  airtelEnabled: 'airtel_enabled',
  halopesaEnabled: 'halopesa_enabled',
  mixxEnabled: 'mixx_enabled',
  cardEnabled: 'card_enabled',
  emailNotifications: 'email_notifications',
  pushNotifications: 'push_notifications',
  maintenanceMode: 'maintenance_mode',
} as const

const BOOLEAN_FIELDS: Array<keyof SettingsResponse> = [
  'mpesaEnabled',
  'airtelEnabled',
  'halopesaEnabled',
  'mixxEnabled',
  'cardEnabled',
  'emailNotifications',
  'pushNotifications',
  'maintenanceMode',
]

function parseBoolean(value: string | null | undefined, fallback: boolean) {
  if (value == null) return fallback
  return value.toLowerCase() === 'true'
}

function normalizeSettingsRecord(rows: Array<{ key: string; value: string }>): SettingsResponse {
  const byKey = new Map(rows.map((row) => [row.key, row.value]))

  return {
    siteName: byKey.get(SETTING_KEYS.siteName) ?? DEFAULT_SETTINGS.siteName,
    siteTagline: byKey.get(SETTING_KEYS.siteTagline) ?? DEFAULT_SETTINGS.siteTagline,
    contactEmail: byKey.get(SETTING_KEYS.contactEmail) ?? DEFAULT_SETTINGS.contactEmail,
    contactPhone: byKey.get(SETTING_KEYS.contactPhone) ?? DEFAULT_SETTINGS.contactPhone,
    defaultCurrency: byKey.get(SETTING_KEYS.defaultCurrency) ?? DEFAULT_SETTINGS.defaultCurrency,
    mpesaEnabled: parseBoolean(byKey.get(SETTING_KEYS.mpesaEnabled), DEFAULT_SETTINGS.mpesaEnabled),
    airtelEnabled: parseBoolean(byKey.get(SETTING_KEYS.airtelEnabled), DEFAULT_SETTINGS.airtelEnabled),
    halopesaEnabled: parseBoolean(byKey.get(SETTING_KEYS.halopesaEnabled), DEFAULT_SETTINGS.halopesaEnabled),
    mixxEnabled: parseBoolean(byKey.get(SETTING_KEYS.mixxEnabled), DEFAULT_SETTINGS.mixxEnabled),
    cardEnabled: parseBoolean(byKey.get(SETTING_KEYS.cardEnabled), DEFAULT_SETTINGS.cardEnabled),
    emailNotifications: parseBoolean(byKey.get(SETTING_KEYS.emailNotifications), DEFAULT_SETTINGS.emailNotifications),
    pushNotifications: parseBoolean(byKey.get(SETTING_KEYS.pushNotifications), DEFAULT_SETTINGS.pushNotifications),
    maintenanceMode: parseBoolean(byKey.get(SETTING_KEYS.maintenanceMode), DEFAULT_SETTINGS.maintenanceMode),
  }
}

function sanitizePayload(body: unknown): SettingsResponse {
  const candidate = typeof body === 'object' && body !== null ? body as Partial<SettingsResponse> : {}

  const normalized: SettingsResponse = {
    siteName: typeof candidate.siteName === 'string' ? candidate.siteName.trim() : DEFAULT_SETTINGS.siteName,
    siteTagline: typeof candidate.siteTagline === 'string' ? candidate.siteTagline.trim() : DEFAULT_SETTINGS.siteTagline,
    contactEmail: typeof candidate.contactEmail === 'string' ? candidate.contactEmail.trim() : DEFAULT_SETTINGS.contactEmail,
    contactPhone: typeof candidate.contactPhone === 'string' ? candidate.contactPhone.trim() : DEFAULT_SETTINGS.contactPhone,
    defaultCurrency: typeof candidate.defaultCurrency === 'string' ? candidate.defaultCurrency.trim().toUpperCase() : DEFAULT_SETTINGS.defaultCurrency,
    mpesaEnabled: Boolean(candidate.mpesaEnabled),
    airtelEnabled: Boolean(candidate.airtelEnabled),
    halopesaEnabled: Boolean(candidate.halopesaEnabled),
    mixxEnabled: Boolean(candidate.mixxEnabled),
    cardEnabled: Boolean(candidate.cardEnabled),
    emailNotifications: Boolean(candidate.emailNotifications),
    pushNotifications: Boolean(candidate.pushNotifications),
    maintenanceMode: Boolean(candidate.maintenanceMode),
  }

  if (!normalized.siteName) {
    normalized.siteName = DEFAULT_SETTINGS.siteName
  }
  if (!normalized.contactEmail) {
    normalized.contactEmail = DEFAULT_SETTINGS.contactEmail
  }
  if (!normalized.defaultCurrency) {
    normalized.defaultCurrency = DEFAULT_SETTINGS.defaultCurrency
  }

  return normalized
}

function toPairs(settings: SettingsResponse) {
  return (Object.keys(SETTING_KEYS) as Array<keyof SettingsResponse>).map((field) => {
    const key = SETTING_KEYS[field]
    const isBoolean = BOOLEAN_FIELDS.includes(field)
    const type = isBoolean ? 'boolean' : 'string'
    const rawValue = settings[field]
    const value = isBoolean ? String(rawValue) : String(rawValue ?? '')
    return { key, value, type }
  })
}

export async function GET() {
  const client = await getClient()

  try {
    const result = await client.query(
      'SELECT key, value FROM settings WHERE key = ANY($1::text[])',
      [Object.values(SETTING_KEYS)],
    )

    return NextResponse.json({ success: true, settings: normalizeSettingsRecord(result.rows) })
  } catch (error) {
    console.error('Get settings error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 })
  } finally {
    client.release()
  }
}

export async function PATCH(request: NextRequest) {
  const client = await getClient()

  try {
    const body = await request.json()
    const settings = sanitizePayload(body)
    const pairs = toPairs(settings)

    await client.query('BEGIN')

    for (const pair of pairs) {
      await client.query(
        `INSERT INTO settings (key, value, type, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (key)
         DO UPDATE SET value = EXCLUDED.value, type = EXCLUDED.type, updated_at = NOW()`,
        [pair.key, pair.value, pair.type],
      )
    }

    await client.query('COMMIT')

    return NextResponse.json({ success: true, settings })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    console.error('Update settings error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 500 })
  } finally {
    client.release()
  }
}