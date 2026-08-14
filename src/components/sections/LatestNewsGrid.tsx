'use client'

import { Article } from '@/types'
import { ArticleCard } from '@/components/ui/ArticleCard'

interface LatestNewsGridProps {
  articles: Article[]
}

export function LatestNewsGrid({ articles }: LatestNewsGridProps) {
  if (!articles || articles.length === 0) return null

  return (
    <section className="w-full bg-white py-8 border-b border-gray-300">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        
        <div className="flex items-center gap-3 mb-6">
          <h2 className="font-headline font-black text-xl tracking-tighter text-[#111111] uppercase">
            LATEST NEWS & INSIGHTS
          </h2>
          <div className="flex-1 h-px bg-gray-300" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {articles.map((article, i) => (
            <ArticleCard key={article.id} article={article} index={i} size="md" />
          ))}
        </div>

      </div>
    </section>
  )
}
