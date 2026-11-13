import { Article } from '@/types'
import { ArticleCard } from '@/components/ui/ArticleCard'
import { SectionHeading } from '@/components/ui/SectionHeading'

interface LatestNewsGridProps {
  articles: Article[]
}

/** Latest stories: thumbnail list on phones, 3-column card grid on desktop. */
export function LatestNewsGrid({ articles }: LatestNewsGridProps) {
  if (!articles || articles.length === 0) return null

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8" aria-labelledby="latest">
      <SectionHeading id="latest" href="/search" linkLabel="All news">
        Latest
      </SectionHeading>

      {/* Mobile: compact rows */}
      <div className="sm:hidden divide-y divide-gray-200">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} size="sm" />
        ))}
      </div>

      {/* Tablet / desktop: card grid */}
      <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8 mt-2">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} size="md" />
        ))}
      </div>
    </section>
  )
}
