import type { MediaItem } from '@/types'
import { getImageSources } from '@/lib/image'

type Props = {
  media: Partial<MediaItem> | null | undefined
  alt: string
  /** The `sizes` attribute: how wide the image renders at each breakpoint. */
  sizes: string
  className?: string
  priority?: boolean
  maxWidth?: number
}

/**
 * Plain <img> with a srcset built from Payload's generated sizes.
 * No client JS and no dependency on the host running an image optimizer.
 */
export function ResponsiveImage({ media, alt, sizes, className, priority = false, maxWidth }: Props) {
  const { src, srcSet, width, height } = getImageSources(media, maxWidth)
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      width={width}
      height={height}
      alt={alt}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : 'auto'}
    />
  )
}
