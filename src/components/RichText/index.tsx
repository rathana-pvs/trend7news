'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { serializeLexical } from './serialize'
import { AdsKeeper } from '@/components/ads/AdsKeeper'

export type RichTextProps = {
  content: any
  className?: string
  articleTitle?: string
}

function extractNodeText(node: any): string {
  if (!node) return ''
  if (typeof node.text === 'string') return node.text
  if (node.children && Array.isArray(node.children)) {
    return node.children.map(extractNodeText).join(' ')
  }
  return ''
}

export const RichText = ({
  content,
  className,
  articleTitle,
}: RichTextProps) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleExpand = () => {
    setIsExpanded(true)
    // Instantly trigger AdsKeeper ad load for in_article_2 upon expansion
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        try {
          const w = window as any
          w._mgq = w._mgq || []
          w._mgq.push(['_mgc.load'])
        } catch (err) {
          console.error('AdsKeeper instant load error:', err)
        }
      }, 100)
    }
  }

  if (!content) return null

  const rawNodes = content.root?.children || []

  let nodes = rawNodes
  if (articleTitle && rawNodes.length > 0) {
    const cleanTitle = articleTitle.trim().toLowerCase()
    const titlePrefix = cleanTitle.substring(0, Math.min(25, cleanTitle.length))
    nodes = rawNodes.filter((node: any, idx: number) => {
      if (idx >= 3) return true
      const text = extractNodeText(node).trim().toLowerCase()
      if (!text) return true
      if (
        text === cleanTitle || 
        (titlePrefix.length > 5 && text.startsWith(titlePrefix)) || 
        (text.length > 5 && cleanTitle.startsWith(text.substring(0, 25)))
      ) {
        return false
      }
      return true
    })
  }

  // Find boundaries for paragraph 1 and paragraph 2
  let paragraphCount = 0
  let p1EndIndex = nodes.length
  let p2EndIndex = nodes.length

  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].type === 'paragraph') {
      paragraphCount++
      if (paragraphCount === 1) p1EndIndex = i + 1
      if (paragraphCount === 2) p2EndIndex = i + 1
    }
  }

  const p1Nodes = nodes.slice(0, p1EndIndex)
  const p2Nodes = nodes.slice(p1EndIndex, p2EndIndex)
  const p3Nodes = nodes.slice(p2EndIndex)

  const p1Elements = serializeLexical(p1Nodes, 'p1')
  const p2Elements = serializeLexical(p2Nodes, 'p2')
  const p3Elements = serializeLexical(p3Nodes, 'p3')

  // If article has only 1 paragraph or no p2 nodes, show p1 + in_article_1 + rest without blur trigger
  if (p2Nodes.length === 0) {
    return (
      <div className={`rich-text ${className || ''}`}>
        {p1Elements}
        <AdsKeeper slot="in_article_1" />
        {p3Elements}
      </div>
    )
  }

  return (
    <div className={`rich-text relative ${className || ''}`}>
      {/* 1. Paragraph 1 (p1) */}
      {p1Elements}

      {/* 2. ads (in_article_1) */}
      <AdsKeeper slot="in_article_1" />

      {/* 3. Paragraph 2 (p2) & Read More / Collapsed vs Expanded State */}
      {!isExpanded ? (
        <div className="relative my-4 select-none">
          {/* p2 (very subtle 0.5px blur with smooth gradient fade) */}
          <div className="relative overflow-hidden max-h-20 pointer-events-none">
            <div className="[filter:blur(0.5px)] opacity-90">
              {p2Elements}
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/60 to-white" />
          </div>

          {/* Clean Pill Button */}
          <div className="relative z-10 w-full flex justify-center py-2">
            <button
              type="button"
              onClick={handleExpand}
              className="group inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full cursor-pointer font-sans font-medium text-sm text-gray-900 bg-white border border-gray-300 hover:border-gray-400 hover:bg-gray-50 shadow-xs transition-all duration-200"
            >
              <span>Read full article</span>
              <svg
                className="w-4 h-4 text-gray-600 transition-transform duration-200 group-hover:translate-y-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          {/* p2 (unblurred) */}
          {p2Elements}

          {/* 4. ads (in_article_2) */}
          <AdsKeeper slot="in_article_2" />

          {/* 5. p3 ...... (and the rest of article content) */}
          {p3Elements}
        </motion.div>
      )}
    </div>
  )
}
