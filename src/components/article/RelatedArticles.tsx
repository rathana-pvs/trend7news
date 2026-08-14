'use client'

import { Article } from '@/types'
import { ArticleCard } from '@/components/ui/ArticleCard'

interface RelatedArticlesProps {
  articles: Article[]
}

export function RelatedArticles({ articles }: RelatedArticlesProps) {
  if (!articles || articles.length === 0) return null

  return (
    <div className="w-full mt-12 pt-8 border-t border-gray-300">
      <h3 className="font-headline font-black text-xl tracking-tighter text-[#111111] uppercase mb-6">
        RELATED STORIES
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {articles.slice(0, 3).map((article, i) => (
          <ArticleCard key={article.id} article={article} index={i} size="md" />
        ))}
      </div>
    </div>
  )
}
