import { Article, PaginatedArticles } from '@/types'
import { getPayloadClient } from './payload'
import { unstable_cache } from 'next/cache'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('placeholder'))
  ? process.env.NEXT_PUBLIC_SITE_URL
  : 'https://trend7news.com'

function normalizeImageUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined
  if (url.includes('2.25.107.30') || url.includes('trend7news.com')) {
    const filename = url.split('/').pop()
    if (filename) return `/media/${filename}`
  }
  if (url.startsWith('/api/media/file/')) return `/media/${url.replace('/api/media/file/', '')}`
  if (url.startsWith('/media/')) return url
  if (url.startsWith('http')) return url
  return url
}

const isBuildTime = 
  !process.env.DATABASE_URI || 
  process.env.DATABASE_URI.includes('placeholder')

const cachedGetArticles = unstable_cache(
  async (params?: {
    limit?: number
    page?: number
    where?: Record<string, any>
  }): Promise<PaginatedArticles> => {
    try {
      const payload = await getPayloadClient()
      
      const whereClause: any = {
        status: { equals: 'published' },
        ...(params?.where || {}),
      }

      const result = await payload.find({
        collection: 'articles',
        limit: params?.limit || 12,
        page: params?.page || 1,
        where: whereClause,
        depth: 2,
        sort: '-publishedAt',
      })

      const docs = result.docs.map((doc: any) => {
        if (doc.coverImage && typeof doc.coverImage === 'object') {
          doc.coverImage.url = normalizeImageUrl(doc.coverImage.url)
        }
        return doc
      })

      return { ...result, docs } as unknown as PaginatedArticles
    } catch (error) {
      console.warn('⚠️ Postgres connection failed in getArticles (expected during build):', error instanceof Error ? error.message : error)
      return {
        docs: [],
        totalDocs: 0,
        limit: params?.limit || 12,
        totalPages: 1,
        page: params?.page || 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
      } as unknown as PaginatedArticles
    }
  },
  ['articles-list'],
  { tags: ['articles'] }
)

export async function getArticles(params?: {
  limit?: number
  page?: number
  where?: Record<string, any>
}): Promise<PaginatedArticles> {
  if (isBuildTime) {
    return {
      docs: [],
      totalDocs: 0,
      limit: params?.limit || 12,
      totalPages: 1,
      page: params?.page || 1,
      pagingCounter: 1,
      hasPrevPage: false,
      hasNextPage: false,
    } as unknown as PaginatedArticles
  }
  return cachedGetArticles(params)
}

const cachedGetArticle = unstable_cache(
  async (slug: string): Promise<Article | null> => {
    try {
      const payload = await getPayloadClient()

      // 1. Search by slug
      let result = await payload.find({
        collection: 'articles',
        where: { slug: { equals: slug } },
        limit: 1,
        depth: 2,
      })

      // 2. Search by numeric ID if slug is numeric
      if (result.docs.length === 0 && !isNaN(Number(slug))) {
        result = await payload.find({
          collection: 'articles',
          where: { id: { equals: Number(slug) } },
          limit: 1,
          depth: 2,
        })
      }

      // 3. Search by share-links key if not found
      if (result.docs.length === 0) {
        const shareLinkResult = await payload.find({
          collection: 'share-links' as any,
          where: { key: { equals: slug } },
          limit: 1,
          depth: 2,
        })
        const shareLink = shareLinkResult.docs[0] as any
        if (shareLink && shareLink.article) {
          const articleDoc = typeof shareLink.article === 'object' 
            ? shareLink.article 
            : await payload.findByID({ collection: 'articles', id: shareLink.article, depth: 2 })
          if (articleDoc) {
            result.docs = [articleDoc as any]
          }
        }
      }

      const article = (result.docs[0] as unknown as any) || null
      if (article && article.coverImage && typeof article.coverImage === 'object') {
        article.coverImage.url = normalizeImageUrl(article.coverImage.url)
      }
      return (article as unknown as Article) || null
    } catch (error) {
      console.warn(`⚠️ Postgres connection failed in getArticle for slug "${slug}" (expected during build):`, error instanceof Error ? error.message : error)
      return null
    }
  },
  ['article'],
  { tags: ['articles'] }
)

export async function getArticle(slug: string): Promise<Article | null> {
  if (isBuildTime) {
    return null
  }
  return cachedGetArticle(slug)
}

const cachedGetFeatured = unstable_cache(
  async (): Promise<{ hero: Article | null; secondary: Article[] }> => {
    try {
      const payload = await getPayloadClient()
      const result = await payload.find({
        collection: 'articles',
        where: {
          isFeatured: { equals: true },
          status: { equals: 'published' },
        },
        limit: 5,
        depth: 2,
        sort: '-publishedAt',
      })
      let docs = result.docs.map((doc: any) => {
        if (doc.coverImage && typeof doc.coverImage === 'object') {
          doc.coverImage.url = normalizeImageUrl(doc.coverImage.url)
        }
        return doc
      }) as unknown as Article[]

      if (docs.length < 5) {
        const fallbackRes = await payload.find({
          collection: 'articles',
          where: { status: { equals: 'published' } },
          limit: 5,
          depth: 2,
          sort: '-publishedAt',
        })
        const fallbackDocs = fallbackRes.docs.map((doc: any) => {
          if (doc.coverImage && typeof doc.coverImage === 'object') {
            doc.coverImage.url = normalizeImageUrl(doc.coverImage.url)
          }
          return doc
        }) as unknown as Article[]

        const docIds = new Set(docs.map(d => d.id))
        for (const fbDoc of fallbackDocs) {
          if (!docIds.has(fbDoc.id) && docs.length < 5) {
            docs.push(fbDoc)
          }
        }
      }

      return { hero: docs[0] || null, secondary: docs.slice(1, 5) }
    } catch (error) {
      console.warn('⚠️ Postgres connection failed in getFeatured (expected during build):', error instanceof Error ? error.message : error)
      return { hero: null, secondary: [] }
    }
  },
  ['featured-articles'],
  { tags: ['articles'] }
)

export async function getFeatured(): Promise<{ hero: Article | null; secondary: Article[] }> {
  if (isBuildTime) {
    return { hero: null, secondary: [] }
  }
  return cachedGetFeatured()
}

const cachedGetBreakingArticles = unstable_cache(
  async (): Promise<Article[]> => {
    try {
      const payload = await getPayloadClient()
      const result = await payload.find({
        collection: 'articles',
        where: {
          isBreaking: { equals: true },
          status: { equals: 'published' },
        },
        limit: 5,
        depth: 2,
      })
      return result.docs as unknown as Article[]
    } catch (error) {
      console.warn('⚠️ Postgres connection failed in getBreakingArticles (expected during build):', error instanceof Error ? error.message : error)
      return []
    }
  },
  ['breaking-articles'],
  { tags: ['articles'] }
)

export async function getBreakingArticles(): Promise<Article[]> {
  if (isBuildTime) {
    return []
  }
  return cachedGetBreakingArticles()
}

const cachedGetRelatedArticles = unstable_cache(
  async (articleId: string | number): Promise<Article[]> => {
    try {
      const payload = await getPayloadClient()
      const where: any = {
        status: { equals: 'published' },
        id: { not_equals: articleId },
      }

      const result = await payload.find({
        collection: 'articles',
        where,
        limit: 3,
        depth: 2,
      })
      return result.docs as unknown as Article[]
    } catch (error) {
      console.warn(`⚠️ Postgres connection failed in getRelatedArticles for ID "${articleId}" (expected during build):`, error instanceof Error ? error.message : error)
      return []
    }
  },
  ['related-articles'],
  { tags: ['articles'] }
)

export async function getRelatedArticles(articleId: string | number): Promise<Article[]> {
  if (isBuildTime) {
    return []
  }
  return cachedGetRelatedArticles(articleId)
}
