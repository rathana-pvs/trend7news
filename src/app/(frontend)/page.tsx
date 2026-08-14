import type { Metadata } from 'next'
import { APTopStoryPackage } from '@/components/sections/APTopStoryPackage'
import { Top7Trending } from '@/components/sections/Top7Trending'
import { LatestNewsGrid } from '@/components/sections/LatestNewsGrid'
import { MostRead } from '@/components/sections/MostRead'
import { getArticles, getFeatured } from '@/lib/api-server'
import { Article } from '@/types'

export const metadata: Metadata = {
  title: 'Trend7News — Real-time Trends & Independent News',
  description: 'Breaking news, world affairs, politics, tech trends, and deep investigations from Trend7News.',
}

export const revalidate = 60

export default async function HomePage() {
  const [{ hero, secondary }, allArticles] = await Promise.all([
    getFeatured(),
    getArticles({ limit: 40 }),
  ])

  const articles = allArticles.docs as Article[]

  const editorPicks = articles.filter((a) => !a.isFeatured).slice(0, 3)
  const mostRead = articles.slice(0, 5)

  return (
    <>
      {/* AP News Lead Story Package */}
      <APTopStoryPackage hero={hero} secondary={secondary} />

      {/* Top 7 Trends Today Numbered List */}
      <Top7Trending articles={articles} />

      {/* Latest News Grid */}
      <LatestNewsGrid articles={articles.slice(0, 8)} />

      {/* Most Read + Editor's Picks */}
      <MostRead editorPicks={editorPicks} mostRead={mostRead} />
    </>
  )
}
