import Link from 'next/link'
import { Article } from '@/types'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { formatDate } from '@/lib/utils'

interface MoreNewsProps {
  articles: Article[]
}

/** Compact headline-only list for older stories at the end of the homepage. */
export function MoreNews({ articles }: MoreNewsProps) {
  if (!articles.length) return null

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-4" aria-labelledby="more-news">
      <SectionHeading id="more-news">More news</SectionHeading>
      <ul className="grid grid-cols-1 md:grid-cols-2 md:gap-x-8 divide-y md:divide-y-0 divide-gray-200">
        {articles.map((a) => (
          <li key={a.id} className="md:border-b md:border-gray-200">
            <Link href={`/article/${a.slug}`} className="group block py-3">
              <span className="block font-card-title text-[16px] leading-snug text-gray-900 group-hover:underline">
                {a.title}
              </span>
              {a.publishedAt && (
                <span className="block mt-1 text-xs text-gray-500">{formatDate(a.publishedAt, 'MMM d, yyyy')}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
