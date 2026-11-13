import Link from 'next/link'
import type { Article } from '@/types'

/** Numbered "Most read" list for the desktop right rail. */
export function MostReadRail({ articles }: { articles: Article[] }) {
  if (!articles.length) return null

  return (
    <section aria-labelledby="most-read-rail">
      <h2 id="most-read-rail" className="flex items-center gap-2 font-headline text-base text-gray-900 mb-2">
        <span className="w-1 h-4 bg-[#d0021b] rounded-full" aria-hidden />
        Most read
      </h2>
      <ol className="divide-y divide-gray-200">
        {articles.map((a, i) => (
          <li key={a.id}>
            <Link href={`/article/${a.slug}`} className="flex gap-3 py-3 group">
              <span className="font-headline text-2xl leading-none text-gray-300 w-6 shrink-0 tabular-nums">
                {i + 1}
              </span>
              <span className="font-card-title text-[15px] leading-snug text-gray-900 line-clamp-3 group-hover:underline">
                {a.title}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
