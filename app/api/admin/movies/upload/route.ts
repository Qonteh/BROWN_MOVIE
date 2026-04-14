import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

export const runtime = 'nodejs'

const region = process.env.AWS_REGION?.trim()
const bucket = process.env.AWS_S3_BUCKET?.trim()
const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim()
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim()
const sessionToken = process.env.AWS_SESSION_TOKEN?.trim()
const endpoint = process.env.AWS_S3_ENDPOINT?.trim()

function hasPlaceholderValue(value: string | undefined) {
  if (!value) return true

  return /your-(aws-region|s3-bucket-name|access-key-id|secret-access-key)/i.test(value)
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getFileExtension(fileName: string) {
  const parts = fileName.split('.')
  return parts.length > 1 ? `.${parts.pop()}` : ''
}

export async function POST(request: NextRequest) {
  try {
    if (
      !region ||
      !bucket ||
      !accessKeyId ||
      !secretAccessKey ||
      hasPlaceholderValue(region) ||
      hasPlaceholderValue(bucket) ||
      hasPlaceholderValue(accessKeyId) ||
      hasPlaceholderValue(secretAccessKey)
    ) {
      return NextResponse.json(
        {
          error:
            'AWS S3 is still using placeholder values. Set real AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY in .env.local, then restart the dev server.',
        },
        { status: 500 },
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const title = typeof formData.get('title') === 'string' ? (formData.get('title') as string) : 'movie'

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Missing required file upload' },
        { status: 400 },
      )
    }

    if (!file.type.startsWith('video/')) {
      return NextResponse.json(
        { error: 'Only video files are allowed' },
        { status: 400 },
      )
    }

    const safeTitle = slugify(title) || 'movie'
    const extension = getFileExtension(file.name)
    const key = `movies/${safeTitle}-${Date.now()}${extension}`

    const credentials = {
      accessKeyId,
      secretAccessKey,
      ...(sessionToken ? { sessionToken } : {}),
    }

    const client = new S3Client({
      region,
      credentials,
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    })

    const buffer = Buffer.from(await file.arrayBuffer())

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      }),
    )

    const fileUrl = `https://${bucket}.s3.${region}.amazonaws.com/${encodeURI(key)}`

    return NextResponse.json({
      success: true,
      fileUrl,
      key,
    })
  } catch (error) {
    const awsError = error as {
      name?: string
      Code?: string
      code?: string
      message?: string
      Region?: string
      $metadata?: { httpStatusCode?: number; requestId?: string }
    }

    const awsCode = awsError.code ?? awsError.Code ?? awsError.name ?? 'UnknownError'

    console.error('Direct upload error:', {
      awsCode,
      awsMessage: awsError.message ?? 'No AWS error message available',
      configuredRegion: region ?? null,
      awsRegionHint: awsError.Region ?? null,
      requestId: awsError.$metadata?.requestId ?? null,
      statusCode: awsError.$metadata?.httpStatusCode ?? null,
    })

    const signatureHint =
      awsCode === 'SignatureDoesNotMatch'
        ? 'Check AWS credentials (access key/secret/session token), bucket region, and AWS_S3_ENDPOINT (if using non-AWS S3). Also verify system clock synchronization (time skew can break SigV4) and restart the dev server after changing .env.local.'
        : null

    return NextResponse.json(
      {
        error: 'Failed to upload file to S3',
        awsCode,
        awsMessage: awsError.message ?? 'No AWS error message available',
        configuredRegion: region ?? null,
        awsRegionHint: awsError.Region ?? null,
        signatureHint,
        requestId: awsError.$metadata?.requestId ?? null,
        statusCode: awsError.$metadata?.httpStatusCode ?? null,
      },
      { status: 500 },
    )
  }
}
