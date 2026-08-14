'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Article } from '@/types'
import { AuthorChip } from '@/components/ui/AuthorChip'
import { BreakingBadge } from '@/components/ui/BreakingBadge'
import { formatDate } from '@/lib/utils'

interface APTopStoryPackageProps {
  hero: Article | null
  secondary: Article[]
}

export function APTopStoryPackage({ hero, secondary }: APTopStoryPackageProps) {
  if (!hero) return null

  const heroImage = hero.coverImage?.url || 'https://picsum.photos/seed/hero/1200/800'

  return (
    <section className="w-full bg-white border-b border-gray-300 py-6 sm:py-8">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* AP Lead Top Story (8 cols) */}
          <div className="lg:col-span-8">
            <Link href={`/article/${hero.slug}`} className="group block">
              <div className="relative w-full aspect-[16/10] overflow-hidden mb-4 bg-gray-100">
                <Image
                  src={heroImage}
                  alt={hero.coverImage?.alt || hero.title}
                  fill
                  priority
                  unoptimized
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  className="object-cover group-hover:scale-[1.01] transition-transform duration-500"
                />
                {hero.isBreaking && (
                  <div className="absolute top-4 left-4">
                    <BreakingBadge />
                  </div>
                )}
              </div>

              <h1 className="font-headline text-3xl sm:text-4xl lg:text-5xl leading-tight text-gray-900 mb-3 group-hover:underline">
                {hero.title}
              </h1>

              <p className="text-base sm:text-lg text-gray-700 leading-relaxed font-serif-body mb-4 line-clamp-3">
                {hero.excerpt}
              </p>

              <div className="flex items-center gap-3 text-xs font-mono uppercase text-gray-500">
                <span>{hero.publishedAt ? formatDate(hero.publishedAt, 'MMM. d, yyyy') : 'TODAY'}</span>
                {hero.readTime && <span>· {hero.readTime} min read</span>}
                {hero.credit && <span className="text-[#d0021b] font-bold">· {hero.credit}</span>}
              </div>
            </Link>
          </div>

          {/* AP Secondary Side Stories (4 cols) */}
          <div className="lg:col-span-4 flex flex-col divide-y divide-gray-200 border-t lg:border-t-0 lg:border-l lg:border-gray-200 lg:pl-6">
            <h3 className="label-caps mb-4 text-[#d0021b]">
              TOP DEVELOPMENTS
            </h3>

            {secondary.slice(0, 4).map((article, i) => (
              <div key={article.id} className="py-4 first:pt-0 last:pb-0">
                <Link href={`/article/${article.slug}`} className="group flex gap-3 items-start">
                  <div className="relative w-24 h-16 flex-shrink-0 bg-gray-100 overflow-hidden">
                    <Image
                      src={article.coverImage?.url || `https://picsum.photos/seed/${article.id}/300/200`}
                      alt={article.title}
                      fill
                      unoptimized
                      sizes="96px"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-card-title text-sm leading-snug text-gray-900 line-clamp-3 group-hover:underline">
                      {article.title}
                    </h4>
                    <div className="font-mono text-[10px] text-gray-500 uppercase mt-1">
                      {article.publishedAt ? formatDate(article.publishedAt, 'MMM. d') : 'TODAY'}
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}
