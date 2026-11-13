import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getArticle, getArticles, getMostRead } from '@/lib/api-server'
import { ArticleView } from '@/components/article/ArticleView'

/**
 * Share-link tracking route: /article/{shareKey}/{articleSlug}
 * The page itself is cached; the click + view are recorded client-side via /api/track.
 */
interface PageProps {
  params: Promise<{ slug: string; title: string }>
}

const envUrl = process.env.NEXT_PUBLIC_SITE_URL
const siteUrl = envUrl && !envUrl.includes('placeholder.com') ? envUrl : 'https://trend7news.com'

export const revalidate = 60
export const dynamicParams = true

// Empty list = nothing prebuilt, but each share link is cached after its first visit (ISR).
export async function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: key, title: slug } = await params
  const article = await getArticle(slug)
  if (!article) return { title: 'Article Not Found' }

  const title = article.meta?.title || article.title
  const description = article.meta?.description || article.excerpt
  const ogImage = article.coverImage?.url // full-size original for Facebook link previews

  return {
    title,
    description,
    alternates: { canonical: `/article/${key}/${slug}` },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${siteUrl}/article/${key}/${slug}`,
      siteName: 'Trend7News',
      publishedTime: article.publishedAt ?? undefined,
      authors: [article.author?.name || 'Trend7News Staff'],
      images: ogImage ? [ogImage] : [],
    },
    twitter: { card: 'summary_large_image', title, description, images: ogImage ? [ogImage] : [] },
  }
}

export default async function TrackingArticlePage({ params }: PageProps) {
  const { slug: key, title: slug } = await params
  const [article, latest, mostRead] = await Promise.all([getArticle(slug), getArticles({ limit: 9 }), getMostRead(6)])
  if (!article) notFound()

  const moreArticles = latest.docs.filter((a) => a.id !== article.id).slice(0, 8)

  return (
    <ArticleView
      article={article}
      siteUrl={siteUrl}
      path={`/article/${key}/${slug}`}
      moreArticles={moreArticles}
      mostRead={mostRead}
      shareKey={key}
    />
  )
}
