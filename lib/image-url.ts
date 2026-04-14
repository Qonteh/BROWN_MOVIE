const MAX_INLINE_IMAGE_URL_LENGTH = 200_000

export function sanitizeImageUrl(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  // Large base64 data URLs can freeze the browser when many are returned in JSON.
  if (trimmed.startsWith('data:image/') && trimmed.length > MAX_INLINE_IMAGE_URL_LENGTH) {
    return null
  }

  return trimmed
}
