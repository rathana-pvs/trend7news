import Link from 'next/link'
import { ResponsiveImage } from '@/components/ui/ResponsiveImage'
import { Article } from '@/types'
import { truncate, formatDate } from '@/lib/utils'

interface ArticleCardProps {
  article: Article
  /** sm: thumbnail row · md: grid card · lg: large card */
  size?: 'sm' | 'md' | 'lg'
  /** Kept for backwards compatibility; no longer used (no entrance animations). */
  index?: number
  className?: string
}

function Meta({ article }: { article: Article }) {
  if (!article.publishedAt && !article.readTime) return null
  return (
    <p className="mt-1.5 text-xs text-gray-500">
      {article.publishedAt && <time dateTime={article.publishedAt}>{formatDate(article.publishedAt, 'MMM d, yyyy')}</time>}
      {article.publishedAt && article.readTime ? ' · ' : ''}
      {article.readTime ? `${article.readTime} min read` : ''}
    </p>
  )
}

function Breaking() {
  return (
    <span className="inline-block mb-1 text-[11px] font-bold uppercase tracking-wider text-[#d0021b]">● Breaking</span>
  )
}

export function ArticleCard({ article, size = 'md', className = '' }: ArticleCardProps) {
  const href = `/article/${article.slug}`
  const alt = article.coverImage?.alt || article.title

  if (size === 'sm') {
    return (
      <article className={`group ${className}`}>
        <Link href={href} className="flex gap-3 py-3.5 items-start">
          <div className="w-[112px] sm:w-[128px] aspect-[3/2] shrink-0 overflow-hidden rounded-md bg-gray-100">
            <ResponsiveImage
              media={article.coverImage}
              alt={alt}
              sizes="128px"
              maxWidth={768}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-card-title text-[16px] leading-snug text-gray-900 line-clamp-3 group-hover:underline">
              {article.title}
            </h3>
            <Meta article={article} />
          </div>
        </Link>
      </article>
    )
  }

  if (size === 'lg') {
    return (
      <article className={`group ${className}`}>
        <Link href={href} className="block">
          <div className="w-full aspect-video overflow-hidden rounded-lg bg-gray-100 mb-3">
            <ResponsiveImage
              media={article.coverImage}
              alt={alt}
              sizes="(max-width: 768px) 100vw, 50vw"
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
            />
          </div>
          {article.isBreaking && <Breaking />}
          <h3 className="font-headline text-2xl leading-tight text-gray-900 group-hover:underline">{article.title}</h3>
          <p className="mt-2 text-base text-gray-600 leading-relaxed line-clamp-3">{article.excerpt}</p>
          <Meta article={article} />
        </Link>
      </article>
    )
  }

  return (
    <article className={`group ${className}`}>
      <Link href={href} className="block">
        <div className="w-full aspect-[3/2] overflow-hidden rounded-lg bg-gray-100 mb-3">
          <ResponsiveImage
            media={article.coverImage}
            alt={alt}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
            maxWidth={768}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
          />
        </div>
        <h3 className="font-card-title text-[17px] leading-snug text-gray-900 line-clamp-3 group-hover:underline">
          {article.title}
        </h3>
        <p className="mt-1.5 text-sm text-gray-600 leading-relaxed line-clamp-2">{truncate(article.excerpt, 140)}</p>
        <Meta article={article} />
      </Link>
    </article>
  )
}
