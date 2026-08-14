'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Article } from '@/types'
import { AuthorChip } from './AuthorChip'
import { BreakingBadge } from './BreakingBadge'
import { truncate, formatDate } from '@/lib/utils'
import { dict } from '@/lib/i18n'

interface ArticleCardProps {
  article: Article
  size?: 'sm' | 'md' | 'lg'
  index?: number
  className?: string
}

export function ArticleCard({ article, size = 'md', index = 0, className }: ArticleCardProps) {
  const href = `/article/${article.slug}`
  const imageUrl = article.coverImage?.url || 'https://picsum.photos/seed/default/800/600'

  if (size === 'sm') {
    return (
      <motion.article
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04, duration: 0.3 }}
        className={`group border-b border-gray-200 py-3.5 cursor-pointer ${className || ''}`}
      >
        <Link href={href} className="flex gap-3 w-full items-start">
          <div className="relative flex-shrink-0 w-24 h-16 bg-gray-100 overflow-hidden">
            <Image
              src={imageUrl}
              alt={article.coverImage?.alt || article.title}
              fill
              sizes="96px"
              unoptimized
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div className="flex flex-col justify-between min-w-0 flex-1">
            <h3 className="font-card-title text-sm leading-snug text-gray-900 line-clamp-2 group-hover:underline">
              {article.title}
            </h3>
            <div className="font-mono text-[10px] text-gray-500 uppercase tracking-wider mt-1">
              {article.publishedAt ? formatDate(article.publishedAt, 'MMM. d') : 'TODAY'}
            </div>
          </div>
        </Link>
      </motion.article>
    )
  }

  if (size === 'lg') {
    return (
      <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.4 }}
        className={`group border-b border-gray-200 pb-6 cursor-pointer ${className || ''}`}
      >
        <Link href={href}>
          <div className="relative w-full aspect-video overflow-hidden mb-4 bg-gray-100">
            <Image
              src={imageUrl}
              alt={article.coverImage?.alt || article.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              unoptimized
              className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
            />
            {article.isBreaking && (
              <div className="absolute top-3 left-3">
                <BreakingBadge />
              </div>
            )}
          </div>
          <div>
            <h2 className="font-headline text-2xl sm:text-3xl leading-tight text-gray-900 mb-2 group-hover:underline">
              {article.title}
            </h2>
            <p className="text-base text-gray-700 leading-relaxed line-clamp-3 mb-3 font-serif-body">
              {article.excerpt}
            </p>
            <AuthorChip author={article.author || null} date={article.publishedAt} readTime={article.readTime} />
          </div>
        </Link>
      </motion.article>
    )
  }

  // md default
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className={`group border-b border-gray-200 pb-5 cursor-pointer ${className || ''}`}
    >
      <Link href={href}>
        <div className="relative w-full aspect-video overflow-hidden mb-3 bg-gray-100">
          <Image
            src={imageUrl}
            alt={article.coverImage?.alt || article.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            unoptimized
            className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
          />
          {article.isBreaking && (
            <div className="absolute top-3 left-3">
              <BreakingBadge />
            </div>
          )}
        </div>
        <div>
          <h3 className="font-card-title text-lg leading-snug text-gray-900 mb-2 line-clamp-3 group-hover:underline">
            {article.title}
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-3 line-clamp-2 font-serif-body">
            {truncate(article.excerpt, 120)}
          </p>
          <AuthorChip author={article.author || null} date={article.publishedAt} readTime={article.readTime} size="sm" />
        </div>
      </Link>
    </motion.article>
  )
}
