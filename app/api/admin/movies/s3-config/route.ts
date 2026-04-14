import { NextResponse } from 'next/server'

function isConfigured(value: string | undefined) {
  return Boolean(value) && !/^your-/i.test(value as string)
}

export async function GET() {
  const region = process.env.AWS_REGION?.trim()
  const bucket = process.env.AWS_S3_BUCKET?.trim()
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim()
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim()
  const sessionToken = process.env.AWS_SESSION_TOKEN?.trim()
  const endpoint = process.env.AWS_S3_ENDPOINT?.trim()

  return NextResponse.json({
    success: true,
    serverTimeIso: new Date().toISOString(),
    region: region ?? null,
    bucket: bucket ?? null,
    endpoint: endpoint ?? null,
    hasAccessKeyId: isConfigured(accessKeyId),
    hasSecretAccessKey: isConfigured(secretAccessKey),
    hasSessionToken: isConfigured(sessionToken),
    uploadHost: region && bucket ? `${bucket}.s3.${region}.amazonaws.com` : null,
  })
}
