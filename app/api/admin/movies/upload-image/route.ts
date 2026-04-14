import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing required file upload' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Image is too large. Maximum allowed size is 5MB.' },
        { status: 400 },
      )
    }

    const bytes = Buffer.from(await file.arrayBuffer())
    const base64 = bytes.toString('base64')
    const fileUrl = `data:${file.type};base64,${base64}`

    return NextResponse.json({
      success: true,
      fileUrl,
      storage: 'database',
      size: file.size,
      mimeType: file.type,
    })
  } catch (error) {
    console.error('Movie image upload error (database mode):', error)
    return NextResponse.json({ error: 'Failed to process image upload' }, { status: 500 })
  }
}