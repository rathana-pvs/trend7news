import type { Metadata } from 'next'
import { APTopStoryPackage } from '@/components/sections/APTopStoryPackage'
import { Top7Trending } from '@/components/sections/Top7Trending'
import { LatestNewsGrid } from '@/components/sections/LatestNewsGrid'
import { MoreNews } from '@/components/sections/MoreNews'
import { getArticles, getFeatured, getMostRead } from '@/lib/api-server'
import { Article } from '@/types'

export const metadata: Metadata = {
  title: 'Trend7News — Real-time Trends & Independent News',
  description: 'Breaking news, world affairs, politics, tech trends, and deep investigations from Trend7News.',
}

export const revalidate = 60

export default async function HomePage() {
  const [{ hero, secondary }, latest, mostRead] = await Promise.all([
    getFeatured(),
    getArticles({ limit: 40 }),
    getMostRead(7),
  ])

  // Each story appears once: lead package first, then latest, then the rest
  const shown = new Set<Article['id']>()
  const take = (list: Article[], n: number) => {
    const out: Article[] = []
    for (const a of list) {
      if (out.length >= n) break
      if (shown.has(a.id)) continue
      shown.add(a.id)
      out.push(a)
    }
    return out
  }

  const leadHero = hero
  if (leadHero) shown.add(leadHero.id)
  const topStories = take(secondary, 4)
  const latestStories = take(latest.docs as Article[], 9)
  const moreStories = take(latest.docs as Article[], 12)

  return (
    <>
      <APTopStoryPackage hero={leadHero} secondary={topStories} />
      {/* Trending is ranked by views and may repeat a story from above — that's intended */}
      <Top7Trending articles={mostRead} />
      <LatestNewsGrid articles={latestStories} />
      <MoreNews articles={moreStories} />
    </>
  )
}
