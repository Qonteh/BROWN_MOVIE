import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const region = process.env.AWS_REGION?.trim()
const bucket = process.env.AWS_S3_BUCKET?.trim()
const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim()
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim()
const sessionToken = process.env.AWS_SESSION_TOKEN?.trim()
const endpoint = process.env.AWS_S3_ENDPOINT?.trim()

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
    if (!region || !bucket || !accessKeyId || !secretAccessKey) {
      return NextResponse.json(
        { error: 'S3 environment variables are not configured' },
        { status: 500 },
      )
    }

    const body = await request.json()
    const fileName = typeof body.fileName === 'string' ? body.fileName : ''
    const fileType = typeof body.fileType === 'string' ? body.fileType : ''
    const title = typeof body.title === 'string' ? body.title : 'movie'

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: 'Missing required fields: fileName, fileType' },
        { status: 400 },
      )
    }

    if (!fileType.startsWith('video/')) {
      return NextResponse.json(
        { error: 'Only video files are allowed' },
        { status: 400 },
      )
    }

    const safeTitle = slugify(title) || 'movie'
    const extension = getFileExtension(fileName)
    const key = `movies/${safeTitle}-${Date.now()}${extension}`

    const client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
        ...(sessionToken ? { sessionToken } : {}),
      },
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    })

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: fileType,
    })

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 })
    const fileUrl = `https://${bucket}.s3.${region}.amazonaws.com/${encodeURI(key)}`

    return NextResponse.json({
      success: true,
      uploadUrl,
      fileUrl,
      key,
    })
  } catch (error) {
    console.error('Create upload URL error:', error)
    return NextResponse.json(
      { error: 'Failed to create upload URL' },
      { status: 500 },
    )
  }
}
