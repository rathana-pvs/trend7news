import { Fragment, JSX } from 'react'
import Link from 'next/link'
import { ResponsiveImage } from '@/components/ui/ResponsiveImage'

type Node = {
  type: string
  value?: any
  text?: string
  children?: Node[]
  tag?: string
  format?: number
  metadata?: any
  [key: string]: any
}

export function serializeLexical(nodes: Node[], keyPrefix: string = 'node'): JSX.Element[] {
  return nodes.map((node, i) => {
    const nodeKey = `${keyPrefix}-${i}`
    if (node.type === 'text') {
      let text = <Fragment key={nodeKey}>{node.text}</Fragment>

      if ((node.format || 0) & 1) {
        text = <strong key={nodeKey}>{text}</strong>
      }
      if ((node.format || 0) & 2) {
        text = <em key={nodeKey}>{text}</em>
      }
      if ((node.format || 0) & 4) {
        text = <u key={nodeKey}>{text}</u>
      }
      if ((node.format || 0) & 8) {
        text = <s key={nodeKey}>{text}</s>
      }
      if ((node.format || 0) & 16) {
        text = <code key={nodeKey}>{text}</code>
      }

      return text as any
    }

    if (!node) {
      return null
    }

    const children = node.children ? serializeLexical(node.children, `${nodeKey}-c`) : null

    switch (node.type) {
      case 'h1':
        return (
          <h2 key={nodeKey}>
            {children}
          </h2>
        )
      case 'h2':
        return (
          <h2 key={nodeKey}>
            {children}
          </h2>
        )
      case 'h3':
        return (
          <h3 key={nodeKey}>
            {children}
          </h3>
        )
      case 'h4':
        return (
          <h4 key={nodeKey}>
            {children}
          </h4>
        )
      case 'quote':
        return (
          <blockquote key={nodeKey}>
            {children}
          </blockquote>
        )
      case 'link':
        return (
          <Link
            key={nodeKey}
            href={node.fields?.url || ''}
            {...(node.fields?.newTab || /^https?:/.test(node.fields?.url || '')
              ? { target: '_blank', rel: 'noopener noreferrer' }
              : {})}
          >
            {children}
          </Link>
        )
      case 'block':
        const block = node.fields
        if (!block || block.blockType !== 'videoEmbed') return null

        const embedUrl = block.url
        const ytId = embedUrl?.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)?.[1]

        return (
          <div key={nodeKey} className="my-8">
            <div className="rounded overflow-hidden aspect-video bg-black">
              <iframe
                src={ytId ? `https://www.youtube.com/embed/${ytId}` : embedUrl}
                className="w-full h-full"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            {block.caption && (
              <p className="text-xs font-mono text-center mt-2 text-gray-500">{block.caption}</p>
            )}
          </div>
        )

      case 'upload':
        const media = node.value
        if (!media || node.relationTo !== 'media') return null
        
        const isVideo = media.mimeType?.startsWith('video/')

        if (isVideo) {
          return (
            <div key={nodeKey} className="my-8 rounded overflow-hidden bg-black">
              <video
                src={media.url || ''}
                preload="metadata"
                controls
                className="w-full aspect-video"
                playsInline
              />
              {media.caption && (
                <div className="p-3 bg-gray-100">
                  <p className="text-xs font-mono text-gray-600">
                    {media.caption}
                  </p>
                </div>
              )}
            </div>
          )
        }

        return (
          <figure key={nodeKey} className="article-figure">
            <ResponsiveImage
              media={media}
              alt={media.alt || ''}
              sizes="(max-width: 720px) 100vw, 720px"
              className="w-full h-auto bg-gray-100"
            />
            {media.caption && <figcaption>{media.caption}</figcaption>}
          </figure>
        )
      case 'embed':
      case 'youtube':
        const url = node.value || node.fields?.url
        if (!url) return null
        
        const youtubeId = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)?.[1]
        
        if (youtubeId) {
          return (
            <div key={nodeKey} className="my-8 rounded overflow-hidden aspect-video bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}`}
                className="w-full h-full"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )
        }

        return (
          <div key={nodeKey} className="my-8 rounded overflow-hidden aspect-video bg-black">
             <iframe 
               src={url}
               className="w-full h-full"
               loading="lazy"
               allowFullScreen 
             />
          </div>
        )

      case 'list':
        const ListTag = node.tag === 'ol' ? 'ol' : 'ul'
        return (
          <ListTag key={nodeKey} className={node.tag === 'ol' ? 'list-decimal' : 'list-disc'}>
            {children}
          </ListTag>
        )
      case 'listitem':
        return (
          <li key={nodeKey}>
            {children}
          </li>
        )
      case 'horizontalrule':
        return (
          <hr key={nodeKey} />
        )
      case 'paragraph':
      default:
        const hasBlockChild = node.children?.some((child) => 
          ['upload', 'block', 'embed', 'video', 'youtube', 'list', 'horizontalrule'].includes(child.type)
        )
        const Tag = hasBlockChild ? 'div' : 'p'
        
        return (
          <Tag key={nodeKey}>
            {children}
          </Tag>
        )
    }
  }) as any
}
