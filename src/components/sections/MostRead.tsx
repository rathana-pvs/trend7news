'use client'

import { Article } from '@/types'
import { ArticleCard } from '@/components/ui/ArticleCard'

interface MostReadProps {
  editorPicks: Article[]
  mostRead: Article[]
}

export function MostRead({ editorPicks, mostRead }: MostReadProps) {
  return (
    <section className="w-full bg-white py-8">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Editor's Picks (8 cols) */}
          <div className="lg:col-span-8">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="font-headline font-black text-xl tracking-tighter text-[#111111] uppercase">
                EDITOR'S PICKS
              </h2>
              <div className="flex-1 h-px bg-gray-300" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {editorPicks.slice(0, 3).map((article, i) => (
                <ArticleCard key={article.id} article={article} index={i} size="md" />
              ))}
            </div>
          </div>

          {/* Most Read Sidebar (4 cols) */}
          <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-gray-300 lg:pl-6">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="font-headline font-black text-xl tracking-tighter text-[#d0021b] uppercase">
                MOST READ
              </h2>
              <div className="flex-1 h-px bg-gray-300" />
            </div>

            <div className="divide-y divide-gray-200">
              {mostRead.slice(0, 5).map((article, i) => (
                <ArticleCard key={article.id} article={article} index={i} size="sm" />
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
