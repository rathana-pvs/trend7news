import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { getArticle, getArticles, getRelatedArticles } from '@/lib/api-server'
import { getPayloadClient } from '@/lib/payload'
import { BreakingBadge } from '@/components/ui/BreakingBadge'
import { AuthorChip } from '@/components/ui/AuthorChip'
import { ReadingBar } from '@/components/ui/ReadingBar'
import { RichText } from '@/components/RichText'
import { RelatedArticles } from '@/components/article/RelatedArticles'
import { formatDate } from '@/lib/utils'

interface PageProps {
  params: Promise<{ slug: string }>
}

export const dynamicParams = true

export async function generateStaticParams() {
  try {
    const articles = await getArticles({ limit: 30 })
    return articles.docs.map((a) => ({ slug: a.slug }))
  } catch (error) {
    console.warn('⚠️ Postgres connection failed in generateStaticParams (expected during build):', error)
    return []
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
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
      canonical: `/article/${slug}`,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${siteUrl}/article/${slug}`,
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

export const revalidate = 0

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL
  const siteUrl = envUrl && !envUrl.includes('placeholder.com') ? envUrl : 'https://trend7news.com'

  const article = await getArticle(slug)
  if (!article) notFound()

  // Track page view count for non-bot requests
  try {
    const headersList = await headers()
    const userAgent = headersList.get('user-agent') || ''
    const isBot = /bot|googlebot|crawler|spider|robot|crawling|facebookexternalhit/i.test(userAgent)

    if (!isBot && article.id) {
      const payload = await getPayloadClient()
      await payload.update({
        collection: 'articles',
        id: article.id,
        data: {
          views: (article.views || 0) + 1,
        },
      })
    }
  } catch (e) {
    console.error('Error incrementing article views:', e)
  }

  const relatedArticles = await getRelatedArticles(article.id)
  const heroImage = article.coverImage?.url || 'https://picsum.photos/seed/article/1400/900'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteUrl}/article/${slug}`,
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

      {/* AP Editorial Article Header */}
      <article className="w-full bg-white pt-6 pb-12">
        <div className="max-w-[840px] mx-auto px-4 sm:px-6">
          
          {/* Breaking Tag */}
          {article.isBreaking && (
            <div className="mb-3">
              <BreakingBadge />
            </div>
          )}

          {/* Headline */}
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

          {/* Featured Hero Image */}
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

          {/* Lead Executive Summary */}
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

          {/* AP Dateline + Article Body */}
          <div className="article-body">
            <p>
              <span className="ap-dateline">WASHINGTON (Trend7News) —</span>
            </p>
            {article.content ? (
              <RichText
                content={article.content}
                articleTitle={article.title}
              />
            ) : (
              <p className="text-xl leading-relaxed mt-4 italic opacity-50">
                Content loading...
              </p>
            )}
          </div>

          {/* Attribution Source */}
          {article.credit && (
            <div className="mt-8 pt-4 border-t border-gray-300 font-mono text-xs text-gray-500 italic">
              Source: <span className="font-bold text-gray-800">{article.credit}</span>
            </div>
          )}

          {/* Related Articles */}
          <RelatedArticles articles={relatedArticles} />

        </div>
      </article>
    </>
  )
}
