export type DownloadProgress = {
  loadedBytes: number
  totalBytes: number | null
  percentage: number | null
  speedBytesPerSecond: number | null
  etaSeconds: number | null
}

export type DownloadFileOptions = {
  url: string
  fallbackFileName: string
  headers?: HeadersInit
  onProgress?: (progress: DownloadProgress) => void
}

export class DownloadRequestError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'DownloadRequestError'
    this.status = status
    this.code = code
  }
}

const PROGRESS_EMIT_INTERVAL_MS = 180

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[\\/:*?"<>|]+/g, "-").trim() || "download.bin"
}

function getFileNameFromContentDisposition(contentDisposition: string | null) {
  if (!contentDisposition) return null

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      return utf8Match[1]
    }
  }

  const asciiMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
  return asciiMatch?.[1] ?? null
}

function triggerBrowserDownload(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = objectUrl
  link.download = sanitizeFileName(fileName)
  document.body.appendChild(link)
  link.click()
  link.remove()

  // Delay revocation slightly to avoid race conditions in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}

function createProgressSnapshot(
  loadedBytes: number,
  totalBytes: number | null,
  startedAtMs: number,
  speedBytesPerSecondOverride?: number | null,
): DownloadProgress {
  const elapsedSeconds = Math.max((performance.now() - startedAtMs) / 1000, 0.001)
  const averageSpeed = loadedBytes > 0 ? loadedBytes / elapsedSeconds : null
  const speedBytesPerSecond = speedBytesPerSecondOverride ?? averageSpeed
  const percentage = totalBytes ? Math.min(100, Math.round((loadedBytes / totalBytes) * 100)) : null
  const etaSeconds =
    totalBytes && speedBytesPerSecond && speedBytesPerSecond > 0
      ? Math.max((totalBytes - loadedBytes) / speedBytesPerSecond, 0)
      : null

  return {
    loadedBytes,
    totalBytes,
    percentage,
    speedBytesPerSecond,
    etaSeconds,
  }
}

export async function downloadFileWithProgress({
  url,
  fallbackFileName,
  headers,
  onProgress,
}: DownloadFileOptions) {
  const startedAtMs = performance.now()
  const response = await fetch(url, {
    method: "GET",
    headers,
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({})) as {
      error?: string
      code?: string
    }
    throw new DownloadRequestError(errorBody.error || 'Download failed', response.status, errorBody.code)
  }

  const totalBytesHeader = response.headers.get("content-length")
  const parsedTotalBytes = totalBytesHeader ? Number(totalBytesHeader) : NaN
  const totalBytes = Number.isFinite(parsedTotalBytes) && parsedTotalBytes > 0 ? parsedTotalBytes : null
  const fileNameFromHeader = getFileNameFromContentDisposition(response.headers.get("content-disposition"))
  const resolvedFileName = fileNameFromHeader || fallbackFileName

  if (!response.body) {
    const blob = await response.blob()
    onProgress?.({
      ...createProgressSnapshot(blob.size, blob.size, startedAtMs),
      percentage: 100,
      etaSeconds: 0,
    })
    triggerBrowserDownload(blob, resolvedFileName)
    return
  }

  const reader = response.body.getReader()
  const chunks: BlobPart[] = []
  let loadedBytes = 0
  let smoothedSpeedBytesPerSecond: number | null = null
  let previousLoadedBytes = 0
  let previousReadAtMs = performance.now()
  let lastProgressEmitAtMs = performance.now()
  const emaAlpha = 0.2

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue

    // Keep the original chunk to avoid extra copying for very large downloads.
    chunks.push(value as unknown as BlobPart)
    loadedBytes += value.byteLength

    const nowMs = performance.now()
    const deltaBytes = loadedBytes - previousLoadedBytes
    const deltaSeconds = Math.max((nowMs - previousReadAtMs) / 1000, 0.001)
    const instantSpeedBytesPerSecond = deltaBytes / deltaSeconds
    smoothedSpeedBytesPerSecond =
      smoothedSpeedBytesPerSecond === null
        ? instantSpeedBytesPerSecond
        : smoothedSpeedBytesPerSecond * (1 - emaAlpha) + instantSpeedBytesPerSecond * emaAlpha

    previousLoadedBytes = loadedBytes
    previousReadAtMs = nowMs

    const shouldEmitProgress = nowMs - lastProgressEmitAtMs >= PROGRESS_EMIT_INTERVAL_MS
    if (shouldEmitProgress) {
      onProgress?.(createProgressSnapshot(loadedBytes, totalBytes, startedAtMs, smoothedSpeedBytesPerSecond))
      lastProgressEmitAtMs = nowMs
    }
  }

  const mimeType = response.headers.get("content-type") || "application/octet-stream"
  const blob = new Blob(chunks, { type: mimeType })
  onProgress?.({
    ...createProgressSnapshot(loadedBytes, totalBytes ?? blob.size, startedAtMs, smoothedSpeedBytesPerSecond),
    percentage: 100,
    etaSeconds: 0,
  })
  triggerBrowserDownload(blob, resolvedFileName)
}
