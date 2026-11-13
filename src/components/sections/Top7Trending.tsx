import Link from 'next/link'
import { Article } from '@/types'
import { SectionHeading } from '@/components/ui/SectionHeading'

interface Top7TrendingProps {
  /** Ranked by views (getMostRead) */
  articles: Article[]
}

/** "Top 7 trending" — the brand section, ranked by real page views. */
export function Top7Trending({ articles }: Top7TrendingProps) {
  const top7 = articles.slice(0, 7)
  if (top7.length === 0) return null

  return (
    <section id="trending-7" className="bg-gray-50 border-y border-gray-200 scroll-mt-4">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-7 sm:py-9">
        <SectionHeading>
          Top <span className="text-[#d0021b]">7</span> trending
        </SectionHeading>
        <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 md:gap-x-8 divide-y md:divide-y-0 divide-gray-200">
          {top7.map((article, index) => (
            <li key={article.id} className="md:border-b md:border-gray-200">
              <Link href={`/article/${article.slug}`} className="group flex gap-4 items-start py-3.5">
                <span className="font-headline text-[32px] leading-none text-[#d0021b] w-7 shrink-0 tabular-nums">
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block font-card-title text-[16px] leading-snug text-gray-900 line-clamp-3 group-hover:underline">
                    {article.title}
                  </span>
                  {article.views ? (
                    <span className="block mt-1 text-xs text-gray-500">
                      {article.views.toLocaleString('en-US')} reads
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
