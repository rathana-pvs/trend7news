import type { Metadata } from 'next'
import { getArticles } from '@/lib/api-server'
import { ArticleCard } from '@/components/ui/ArticleCard'
import { dict } from '@/lib/i18n'

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { q } = await searchParams
  return {
    title: q ? `Search: ${q}` : 'Search Articles',
    description: `Search results for ${q || 'latest news'} on Trend7News.`,
  }
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q = '' } = await searchParams

  const results = q ? await getArticles({
    limit: 20,
    where: {
      or: [
        { title: { like: q } },
        { excerpt: { like: q } },
      ]
    }
  }) : await getArticles({ limit: 12 })

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
      <div className="max-w-2xl mx-auto mb-10 text-center">
        <h1 className="font-headline font-black text-3xl mb-4 text-gray-900 uppercase">
          SEARCH TREND7NEWS
        </h1>
        <form action="/search" method="GET" className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder={dict.searchPlaceholder}
            className="flex-1 px-4 py-3 border border-gray-300 rounded font-sans text-sm focus:outline-none focus:border-[#d0021b]"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-[#d0021b] text-white font-bold text-sm uppercase font-mono rounded hover:bg-[#b00217] transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {q && (
        <div className="mb-6 font-mono text-xs text-gray-500 uppercase">
          Showing {results.docs.length} {dict.resultsFor} "{q}"
        </div>
      )}

      {results.docs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {results.docs.map((article, i) => (
            <ArticleCard key={article.id} article={article} index={i} size="md" />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 rounded border border-gray-200">
          <p className="text-lg font-bold text-gray-700 mb-2">{dict.noResults}</p>
          <p className="text-sm text-gray-500 font-mono">{dict.tryDifferent}</p>
        </div>
      )}
    </div>
  )
}
