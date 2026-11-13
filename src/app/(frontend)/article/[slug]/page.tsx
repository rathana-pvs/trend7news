import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getArticle, getArticles } from '@/lib/api-server'
import { ArticleView } from '@/components/article/ArticleView'

interface PageProps {
  params: Promise<{ slug: string }>
}

const envUrl = process.env.NEXT_PUBLIC_SITE_URL
const siteUrl = envUrl && !envUrl.includes('placeholder.com') ? envUrl : 'https://trend7news.com'

// Cached HTML, refreshed every minute and purged instantly when an article is saved
// (see Articles afterChange hook). View counting happens client-side via /api/track.
export const revalidate = 60
export const dynamicParams = true

export async function generateStaticParams() {
  try {
    const articles = await getArticles({ limit: 30 })
    return articles.docs.map((a) => ({ slug: a.slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticle(slug)
  if (!article) return { title: 'Article Not Found' }

  const title = article.meta?.title || article.title
  const description = article.meta?.description || article.excerpt
  const ogImage = article.coverImage?.url // full-size original for Facebook link previews

  return {
    title,
    description,
    alternates: { canonical: `/article/${slug}` },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${siteUrl}/article/${slug}`,
      siteName: 'Trend7News',
      publishedTime: article.publishedAt ?? undefined,
      authors: [article.author?.name || 'Trend7News Staff'],
      images: ogImage ? [ogImage] : [],
    },
    twitter: { card: 'summary_large_image', title, description, images: ogImage ? [ogImage] : [] },
  }
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params
  const [article, latest] = await Promise.all([getArticle(slug), getArticles({ limit: 9 })])
  if (!article) notFound()

  const moreArticles = latest.docs.filter((a) => a.id !== article.id).slice(0, 8)

  return <ArticleView article={article} siteUrl={siteUrl} path={`/article/${slug}`} moreArticles={moreArticles} />
}
