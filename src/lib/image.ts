import type { MediaItem } from '@/types'

/** Serve uploaded files through Payload, including files created after a build. */
export function normalizeImageUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined
  if (url.startsWith('/media/')) return `/api/media/file/${url.slice('/media/'.length)}`
  if (url.startsWith('/api/media/file/')) return url

  try {
    const parsed = new URL(url, 'https://trend7news.com')
    const localHosts = ['trend7news.com', 'www.trend7news.com', '2.25.107.30', 'localhost', '127.0.0.1']
    if (localHosts.includes(parsed.hostname)) {
      const path = parsed.pathname
      if (path.startsWith('/media/') || path.startsWith('/api/media/file/')) {
        return normalizeImageUrl(path + parsed.search + parsed.hash)
      }
    }
  } catch {
    // Keep external or unrecognized URLs unchanged.
  }
  return url
}

export type ImageSources = {
  src: string
  srcSet?: string
  width: number
  height: number
}

const FALLBACK =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><rect width="16" height="9" fill="#e5e7eb"/></svg>')

/**
 * Builds a responsive <img> source set from the sizes Payload generates
 * (thumbnail 400w, card 768w, hero 1920w) plus the original file, so phones
 * download a ~50KB image instead of the full-size original.
 */
export function getImageSources(media: Partial<MediaItem> | null | undefined, maxWidth = 1920): ImageSources {
  const original = normalizeImageUrl(media?.url) || FALLBACK
  const width = media?.width || 1200
  const height = media?.height || Math.round(width * 0.5625)

  const candidates: { url: string; w: number }[] = []
  const sizes = media?.sizes
  for (const key of ['thumbnail', 'card', 'hero'] as const) {
    const s = sizes?.[key]
    const url = normalizeImageUrl(s?.url)
    if (url && s?.width && s.width <= maxWidth) candidates.push({ url, w: s.width })
  }
  if (media?.width && media.width <= maxWidth) candidates.push({ url: original, w: media.width })

  // Dedupe by width and sort ascending
  const seen = new Set<number>()
  const unique = candidates
    .filter((c) => (seen.has(c.w) ? false : (seen.add(c.w), true)))
    .sort((a, b) => a.w - b.w)

  if (unique.length === 0) return { src: original, width, height }

  // Default src: smallest candidate >= 768w (good for mobile), else largest
  const preferred = unique.find((c) => c.w >= 768) || unique[unique.length - 1]
  return {
    src: preferred.url,
    srcSet: unique.map((c) => `${c.url} ${c.w}w`).join(', '),
    width,
    height,
  }
}
