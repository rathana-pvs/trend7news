import Link from 'next/link'
import type { Article } from '@/types'
import { ResponsiveImage } from '@/components/ui/ResponsiveImage'
import { formatDate } from '@/lib/utils'

/** "Read next" list under the article — keeps visitors from Facebook on the site. */
export function MoreStories({ articles }: { articles: Article[] }) {
  if (!articles.length) return null

  return (
    <section className="mt-10" aria-labelledby="more-stories">
      <h2 id="more-stories" className="flex items-center gap-2 font-headline text-lg text-gray-900 mb-1">
        <span className="w-1 h-5 bg-[#d0021b] rounded-full" aria-hidden />
        Read next
      </h2>
      <ul className="divide-y divide-gray-200">
        {articles.map((a) => (
          <li key={a.id}>
            <Link href={`/article/${a.slug}`} className="flex gap-3 py-4 items-start group">
              <div className="w-[112px] sm:w-[160px] aspect-[3/2] shrink-0 overflow-hidden rounded-md bg-gray-100">
                <ResponsiveImage
                  media={a.coverImage}
                  alt={a.coverImage?.alt || a.title}
                  sizes="(max-width: 640px) 112px, 160px"
                  maxWidth={768}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-card-title text-[16px] sm:text-lg leading-snug text-gray-900 line-clamp-3 group-hover:underline">
                  {a.title}
                </h3>
                {a.publishedAt && (
                  <p className="mt-1.5 text-xs text-gray-500" suppressHydrationWarning>
                    {formatDate(a.publishedAt, 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
