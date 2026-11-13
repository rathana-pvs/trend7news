import Link from 'next/link'
import { Article } from '@/types'
import { ResponsiveImage } from '@/components/ui/ResponsiveImage'
import { ArticleCard } from '@/components/ui/ArticleCard'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { formatDate } from '@/lib/utils'

interface APTopStoryPackageProps {
  hero: Article | null
  secondary: Article[]
}

/** Lead story + "Top stories" (side column on desktop, list below on mobile). */
export function APTopStoryPackage({ hero, secondary }: APTopStoryPackageProps) {
  if (!hero) return null

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-4 sm:pt-8 pb-8 grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-6">
      <div className="lg:col-span-8">
        <Link href={`/article/${hero.slug}`} className="group block">
          <div className="-mx-4 sm:mx-0 aspect-[16/9] overflow-hidden sm:rounded-lg bg-gray-100">
            <ResponsiveImage
              media={hero.coverImage}
              alt={hero.coverImage?.alt || hero.title}
              sizes="(max-width: 1024px) 100vw, 760px"
              priority
              className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-500"
            />
          </div>
          <div className="mt-4">
            {hero.isBreaking && (
              <span className="inline-block mb-2 text-[11px] font-bold uppercase tracking-wider text-[#d0021b]">● Breaking</span>
            )}
            <h1 className="font-headline text-[28px] leading-[1.15] sm:text-4xl lg:text-[42px] lg:leading-[1.1] text-gray-950 text-balance group-hover:underline">
              {hero.title}
            </h1>
            {hero.excerpt && (
              <p className="mt-3 text-[17px] sm:text-lg leading-snug text-gray-600 line-clamp-3">{hero.excerpt}</p>
            )}
            {hero.publishedAt && (
              <p className="mt-3 text-[13px] text-gray-500">
                {formatDate(hero.publishedAt, 'MMM d, yyyy')}
                {hero.readTime ? ` · ${hero.readTime} min read` : ''}
              </p>
            )}
          </div>
        </Link>
      </div>

      {secondary.length > 0 && (
        <aside className="lg:col-span-4 lg:border-l lg:border-gray-200 lg:pl-8" aria-labelledby="top-stories">
          <SectionHeading id="top-stories">Top stories</SectionHeading>
          <div className="divide-y divide-gray-200">
            {secondary.slice(0, 4).map((article) => (
              <ArticleCard key={article.id} article={article} size="sm" />
            ))}
          </div>
        </aside>
      )}
    </section>
  )
}
