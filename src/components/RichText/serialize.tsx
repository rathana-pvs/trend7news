import { Fragment, JSX } from 'react'
import Link from 'next/link'
import Image from 'next/image'

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
          <h1 key={nodeKey} className="font-headline font-black text-3xl sm:text-4xl mb-4 mt-8 text-gray-900">
            {children}
          </h1>
        )
      case 'h2':
        return (
          <h2 key={nodeKey} className="font-headline font-extrabold text-2xl sm:text-3xl mb-4 mt-8 text-gray-900">
            {children}
          </h2>
        )
      case 'h3':
        return (
          <h3 key={nodeKey} className="font-headline font-bold text-xl sm:text-2xl mb-3 mt-6 text-gray-900">
            {children}
          </h3>
        )
      case 'h4':
        return (
          <h4 key={nodeKey} className="font-headline font-bold text-lg mb-3 mt-4 text-gray-900">
            {children}
          </h4>
        )
      case 'quote':
        return (
          <blockquote 
            key={nodeKey} 
            className="border-l-4 border-[#d0021b] pl-5 py-2 my-6 italic text-xl leading-relaxed bg-gray-50 text-gray-900 font-serif-body"
          >
            {children}
          </blockquote>
        )
      case 'link':
        return (
          <Link
            key={nodeKey}
            href={node.fields?.url || ''}
            className="underline font-semibold text-[#d0021b] hover:text-black transition-colors"
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
          <div key={nodeKey} className="my-8 relative rounded overflow-hidden group">
            <Image
              src={media.url || ''}
              alt={media.alt || ''}
              width={media.width || 1200}
              height={media.height || 800}
              className="w-full h-auto object-cover"
            />
            {media.caption && (
              <div className="mt-2 text-xs font-mono text-gray-500">
                {media.caption}
              </div>
            )}
          </div>
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
               allowFullScreen 
             />
          </div>
        )

      case 'list':
        const ListTag = node.tag === 'ol' ? 'ol' : 'ul'
        return (
          <ListTag 
            key={nodeKey} 
            className={`${node.tag === 'ol' ? 'list-decimal' : 'list-disc'} pl-6 mb-6 space-y-2 text-gray-800 font-serif-body`}
          >
            {children}
          </ListTag>
        )
      case 'listitem':
        return (
          <li key={nodeKey} className="leading-relaxed">
            {children}
          </li>
        )
      case 'horizontalrule':
        return (
          <hr key={nodeKey} className="my-8 border-t border-gray-300" />
        )
      case 'paragraph':
      default:
        const hasBlockChild = node.children?.some((child) => 
          ['upload', 'block', 'embed', 'video', 'youtube', 'list', 'horizontalrule'].includes(child.type)
        )
        const Tag = hasBlockChild ? 'div' : 'p'
        
        return (
          <Tag 
            key={nodeKey} 
            className="mb-6 text-lg leading-relaxed text-gray-800 font-serif-body"
          >
            {children}
          </Tag>
        )
    }
  }) as any
}
