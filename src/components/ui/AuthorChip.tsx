'use client'

import { formatDate } from '@/lib/utils'
import { Author } from '@/types'
import { dict } from '@/lib/i18n'

interface AuthorChipProps {
  author?: Author | null
  date?: string
  readTime?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function AuthorChip({ author, date, readTime, size = 'md', className }: AuthorChipProps) {
  const hasAuthor = author && typeof author === 'object' && author.name

  return (
    <div className={`font-mono text-xs uppercase text-gray-500 flex flex-wrap items-center gap-1.5 ${className || ''}`}>
      {hasAuthor && (
        <>
          <span className="font-bold text-gray-900">By {author.name}</span>
          {(date || readTime) && <span>·</span>}
        </>
      )}
      {date && <span suppressHydrationWarning>{formatDate(date, 'MMM. d, yyyy')}</span>}
      {date && readTime && <span>·</span>}
      {readTime && <span>{readTime} {dict.minRead}</span>}
    </div>
  )
}

