'use client'

import { useState, type ReactNode } from 'react'
import { AdsKeeper } from '@/components/ads/AdsKeeper'

/**
 * Shows paragraph 2 as a faded preview with a "Read full article" button.
 * The remaining text is already in the HTML (hidden), so expanding is instant.
 * The in_article_2 ad only mounts once the reader expands.
 */
export function ArticleExpander({ preview, rest }: { preview: ReactNode; rest: ReactNode }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <div className={expanded ? '' : 'article-preview'} aria-hidden={expanded ? undefined : true}>
        {preview}
      </div>

      {!expanded && (
        <div className="flex justify-center pb-2 -mt-2">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 px-8 rounded-full bg-[#d0021b] text-white font-sans font-bold text-[15px] shadow-sm active:scale-[0.98] transition-transform"
          >
            Read full article
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}

      {expanded && <AdsKeeper slot="in_article_2" />}

      <div hidden={!expanded}>{rest}</div>
    </>
  )
}
