import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { getArticle } from '@/lib/api-server'
import { getPayloadClient } from '@/lib/payload'
import { BreakingBadge } from '@/components/ui/BreakingBadge'
import { AuthorChip } from '@/components/ui/AuthorChip'
import { ReadingBar } from '@/components/ui/ReadingBar'
import { RichText } from '@/components/RichText'
import { AdsKeeper } from '@/components/ads/AdsKeeper'

interface PageProps {
  params: Promise<{ slug: string; title: string }>
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: key, title: slug } = await params
  const article = await getArticle(slug)
  if (!article) return { title: 'Article Not Found' }

  const envUrl = process.env.NEXT_PUBLIC_SITE_URL
  const siteUrl = envUrl && !envUrl.includes('placeholder.com') ? envUrl : 'https://trend7news.com'
  const title = article.meta?.title || article.title
  const description = article.meta?.description || article.excerpt
  const ogImageUrl = article.coverImage?.url

  return {
    title,
    description,
    alternates: {
      canonical: `/article/${key}/${slug}`,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${siteUrl}/article/${key}/${slug}`,
      siteName: 'Trend7News',
      publishedTime: article.publishedAt ?? undefined,
      authors: [article.author?.name || 'Trend7News Staff'],
      images: ogImageUrl ? [ogImageUrl] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImageUrl ? [ogImageUrl] : [],
    },
  }
}

export default async function TrackingArticlePage({ params }: PageProps) {
  const { slug: key, title: slug } = await params
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL
  const siteUrl = envUrl && !envUrl.includes('placeholder.com') ? envUrl : 'https://trend7news.com'

  const article = await getArticle(slug)
  if (!article) notFound()

  // Track the click on the server side
  try {
    const headersList = await headers()
    const userAgent = headersList.get('user-agent') || ''
    const isBot = /bot|googlebot|crawler|spider|robot|crawling|facebookexternalhit/i.test(userAgent)

    if (!isBot) {
      const payload = await getPayloadClient()
      const shareLinkResult = await payload.find({
        collection: 'share-links' as any,
        where: { key: { equals: key } },
        limit: 1,
      })

      const shareLink = shareLinkResult.docs[0]
      if (shareLink) {
        await payload.update({
          collection: 'share-links' as any,
          id: shareLink.id,
          data: {
            clicks: (shareLink.clicks || 0) + 1,
          },
        })
      }

      if (article.id) {
        await payload.update({
          collection: 'articles',
          id: article.id,
          data: {
            views: (article.views || 0) + 1,
          },
        })
      }
    }
  } catch (e) {
    console.error('Error tracking share link click or views:', e)
  }

  const heroImage = article.coverImage?.url || 'https://picsum.photos/seed/article/1400/900'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteUrl}/article/${key}/${slug}`,
    },
    headline: article.title,
    description: article.excerpt,
    image: [
      {
        '@type': 'ImageObject',
        url: heroImage,
        width: article.coverImage?.width ?? 1400,
        height: article.coverImage?.height ?? 900,
      },
    ],
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: [{
      '@type': 'Person',
      name: article.author?.name || 'Trend7News Staff',
      url: `${siteUrl}/about`,
    }],
    publisher: {
      '@type': 'Organization',
      name: 'Trend7News',
      url: siteUrl,
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ReadingBar />

      <article className="w-full bg-white pt-4 sm:pt-6 pb-12">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 flex justify-center items-start gap-6">
          
          {/* PC Left Sidebar Ad (ads: sidebar_left) */}
          <aside className="hidden xl:block w-[160px] 2xl:w-[220px] shrink-0 sticky top-[70px] self-start">
            <AdsKeeper slot="sidebar_left" />
          </aside>

          {/* Center Article Main Content */}
          <div className="w-full max-w-[840px] shrink-0">
            
            {/* Breaking Tag */}
            {article.isBreaking && (
              <div className="mb-3">
                <BreakingBadge />
              </div>
            )}

            {/* 2. Title */}
            <h1 className="font-headline font-black text-3xl sm:text-4xl lg:text-5xl leading-tight text-gray-900 mb-4">
              {article.title}
            </h1>

            {/* Author Chip & Timestamp */}
            <div className="flex items-center gap-4 mb-6 border-b border-gray-200 pb-4">
              <AuthorChip
                author={article.author || null}
                date={article.publishedAt}
                readTime={article.readTime}
                size="lg"
              />
            </div>

            {/* 3. Image */}
            <div className="relative w-full aspect-video overflow-hidden mb-6 bg-gray-100">
              <Image
                src={heroImage}
                alt={article.coverImage?.alt || article.title}
                fill
                priority
                unoptimized
                sizes="(max-width: 840px) 100vw, 840px"
                className="object-cover"
              />
            </div>
            {article.coverImage?.caption && (
              <p className="font-mono text-xs text-gray-500 mb-8 border-l-2 border-[#d0021b] pl-3 py-0.5">
                {article.coverImage.caption}
              </p>
            )}

            {/* 4. Excerpt (Summary Box) */}
            {article.excerpt && (
              <div className="border-l-4 border-[#d0021b] bg-gray-50 p-4 mb-8">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#d0021b] block mb-1">
                  SUMMARY
                </span>
                <p className="text-lg font-serif-body text-gray-800 leading-relaxed font-semibold italic">
                  {article.excerpt}
                </p>
              </div>
            )}

            {/* 5. Article Body (p1 -> in_article_1 -> p2 (blur) -> read more -> in_article_2 -> p3...) */}
            <div className="article-body">
              {article.content ? (
                <RichText
                  content={article.content}
                  articleTitle={article.title}
                />
              ) : (
                <p className="text-xl leading-relaxed mt-4 italic opacity-50">
                  Content unavailable.
                </p>
              )}
            </div>

            {/* Attribution Source */}
            {article.credit && (
              <div className="mt-8 pt-4 border-t border-gray-300 font-mono text-xs text-gray-500 italic">
                Source: <span className="font-bold text-gray-800">{article.credit}</span>
              </div>
            )}

            {/* 6. ads (feed_bottom) */}
            <AdsKeeper slot="feed_bottom" className="mt-8" />

          </div>

          {/* PC Right Sidebar Ad (ads: sidebar_right) */}
          <aside className="hidden xl:block w-[160px] 2xl:w-[220px] shrink-0 sticky top-[70px] self-start">
            <AdsKeeper slot="sidebar_right" />
          </aside>

        </div>
      </article>
    </>
  )
}
