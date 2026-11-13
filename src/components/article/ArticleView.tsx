import type { Article } from '@/types'
import { RichText } from '@/components/RichText'
import { AdsKeeper } from '@/components/ads/AdsKeeper'
import { ReadingBar } from '@/components/ui/ReadingBar'
import { ResponsiveImage } from '@/components/ui/ResponsiveImage'
import { getImageSources } from '@/lib/image'
import { formatDate } from '@/lib/utils'
import { ViewTracker } from './ViewTracker'
import { MoreStories } from './MoreStories'
import { MostReadRail } from './MostReadRail'

type Props = {
  article: Article
  /** Absolute site URL, e.g. https://trend7news.com */
  siteUrl: string
  /** Path of this page, e.g. /article/my-story or /article/ab12c/my-story */
  path: string
  moreArticles: Article[]
  /** Desktop right-rail list */
  mostRead?: Article[]
  /** Share-link key when visited through a tracked link */
  shareKey?: string
}

/** Shared mobile-first article layout used by both article routes. */
export function ArticleView({ article, siteUrl, path, moreArticles, mostRead = [], shareKey }: Props) {
  const pageUrl = `${siteUrl}${path}`
  const hero = getImageSources(article.coverImage)
  const heroAbs = hero.src.startsWith('/') ? `${siteUrl}${hero.src}` : hero.src
  const authorName = article.author?.name || 'Trend7News Staff'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
    headline: article.title,
    description: article.excerpt,
    image: [{ '@type': 'ImageObject', url: heroAbs, width: hero.width, height: hero.height }],
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: [{ '@type': 'Person', name: authorName, url: `${siteUrl}/about` }],
    publisher: { '@type': 'Organization', name: 'Trend7News', url: siteUrl },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ReadingBar />
      <ViewTracker articleId={article.id} shareKey={shareKey} />

      <div className="max-w-[1100px] mx-auto flex justify-center items-start lg:gap-10 lg:px-6">
        <article className="w-full max-w-[720px] min-w-0 px-4 sm:px-6 lg:px-0 pt-5 sm:pt-8 pb-8">
          <header>
            {article.isBreaking && (
              <span className="inline-block mb-3 text-[11px] font-bold uppercase tracking-wider text-[#d0021b]">
                ● Breaking
              </span>
            )}

            <h1 className="font-headline text-[27px] leading-[1.15] sm:text-4xl lg:text-[44px] lg:leading-[1.1] text-gray-950 text-balance">
              {article.title}
            </h1>

            {article.excerpt && (
              <p className="mt-3 text-[17px] sm:text-lg leading-snug text-gray-600">{article.excerpt}</p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-gray-500">
              <span className="font-semibold text-gray-900">By {authorName}</span>
              {article.publishedAt && (
                <>
                  <span aria-hidden>·</span>
                  <time dateTime={article.publishedAt}>{formatDate(article.publishedAt, 'MMM d, yyyy')}</time>
                </>
              )}
              {article.readTime ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{article.readTime} min read</span>
                </>
              ) : null}
            </div>
          </header>

          <figure className="mt-5 -mx-4 sm:mx-0">
            <ResponsiveImage
              media={article.coverImage}
              alt={article.coverImage?.alt || article.title}
              sizes="(max-width: 720px) 100vw, 720px"
              priority
              className="w-full aspect-[16/9] object-cover bg-gray-100 sm:rounded-lg"
            />
            {article.coverImage?.caption && (
              <figcaption className="px-4 sm:px-0 mt-2 text-[13px] leading-snug text-gray-500">
                {article.coverImage.caption}
              </figcaption>
            )}
          </figure>

          <div className="article-body mt-6">
            {article.content ? (
              <RichText content={article.content} articleTitle={article.title} />
            ) : (
              <p className="italic text-gray-500">Content unavailable.</p>
            )}
          </div>

          {article.credit && (
            <p className="mt-6 pt-4 border-t border-gray-200 text-[13px] text-gray-500">
              Source: <span className="font-semibold text-gray-800">{article.credit}</span>
            </p>
          )}

          {/* End-of-article native widget (AdsKeeper's best-fit position) */}
          <AdsKeeper slot="feed_bottom" className="!mt-8" />

          <MoreStories articles={moreArticles} />
        </article>

        {/* Desktop right rail: sticky ad + most read (hidden below 1024px) */}
        <aside className="hidden lg:block w-[300px] shrink-0 self-stretch pt-8">
          <div className="sticky top-16 flex flex-col gap-8">
            <AdsKeeper slot="sidebar_right" className="!my-0" />
            <MostReadRail articles={mostRead.filter((a) => a.id !== article.id).slice(0, 5)} />
          </div>
        </aside>
      </div>
    </>
  )
}
