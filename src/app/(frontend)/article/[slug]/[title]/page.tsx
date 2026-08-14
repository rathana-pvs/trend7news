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

interface PageProps {
  params: Promise<{ slug: string; title: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: key, title: slug } = await params
  const article = await getArticle(slug)
  if (!article) return { title: 'Article Not Found' }

  const envUrl = process.env.NEXT_PUBLIC_SITE_URL
  const siteUrl = envUrl && !envUrl.includes('placeholder.com') ? envUrl : 'http://localhost:3000'
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

      await payload.update({
        collection: 'articles',
        id: article.id,
        data: {
          views: (article.views || 0) + 1,
        },
      })
    }
  } catch (e) {
    console.error('Error tracking share link click or views:', e)
  }

  const heroImage = article.coverImage?.url || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?q=80&w=2000&auto=format&fit=crop'

  return (
    <>
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

          {/* Featured Image */}
          <div className="relative w-full aspect-video rounded-none overflow-hidden mb-6 bg-gray-100">
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

          {/* Executive Summary */}
          {article.excerpt && (
            <div className="bg-gray-50 border-l-4 border-[#d0021b] p-4 sm:p-5 mb-8">
              <span className="font-mono font-bold text-xs uppercase tracking-widest text-[#d0021b] block mb-2">
                EXECUTIVE SUMMARY
              </span>
              <p className="font-headline font-bold text-lg sm:text-xl text-gray-900 leading-snug">
                {article.excerpt}
              </p>
            </div>
          )}

          {/* Body Content */}
          <div className="article-body prose prose-lg max-w-none text-gray-800 font-serif leading-relaxed mb-12">
            {article.content ? (
              <RichText content={article.content} />
            ) : (
              <p className="italic text-gray-500">Content unavailable.</p>
            )}
          </div>

          {/* Dateline & Credit */}
          {article.credit && (
            <div className="border-t border-b border-gray-200 py-4 font-mono text-xs text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <span className="font-bold text-[#d0021b]">SOURCE:</span>
              <span>{article.credit}</span>
            </div>
          )}
        </div>
      </article>
    </>
  )
}
