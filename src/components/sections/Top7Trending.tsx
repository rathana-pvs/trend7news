'use client'

import Link from 'next/link'
import { Article } from '@/types'
import { formatDate } from '@/lib/utils'

interface Top7TrendingProps {
  articles: Article[]
}

export function Top7Trending({ articles }: Top7TrendingProps) {
  if (!articles || articles.length === 0) return null

  const top10 = articles.slice(0, 10)

  return (
    <section id="trending-7" className="w-full bg-[#f8f9fa] border-b border-gray-300 py-8">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        
        {/* Section Title */}
        <div className="flex items-center gap-3 mb-6">
          <span className="font-headline font-black text-2xl tracking-tighter text-[#111111]">
            TOP <span className="text-[#d0021b]">10</span> TRENDS TODAY
          </span>
          <div className="flex-1 h-0.5 bg-[#d0021b]" />
        </div>

        {/* 10 Item Numbered List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {top10.map((article, index) => (
            <Link
              key={article.id}
              href={`/article/${article.slug}`}
              className="group flex gap-3 items-start border-b sm:border-b-0 border-gray-200 pb-4 sm:pb-0"
            >
              {/* Number Rank 1-10 */}
              <span className="font-headline font-black text-3xl leading-none text-[#d0021b] w-7 text-center flex-shrink-0">
                {index + 1}
              </span>

              <div className="flex-1 min-w-0">
                <h3 className="font-card-title text-sm leading-snug font-bold text-gray-900 line-clamp-3 group-hover:underline">
                  {article.title}
                </h3>
                <div className="font-mono text-[10px] uppercase text-gray-500 mt-1.5 flex items-center gap-2">
                  <span>{article.publishedAt ? formatDate(article.publishedAt, 'MMM. d') : 'TODAY'}</span>
                  {article.readTime && <span>· {article.readTime} min read</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  )
}
