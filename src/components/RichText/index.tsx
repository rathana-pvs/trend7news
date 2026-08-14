'use client'

import React, { useState } from 'react'
import { serializeLexical } from './serialize'

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

  if (nodes.length < 2) {
    return (
      <div className={`rich-text ${className || ''}`}>
        {serializeLexical(nodes)}
      </div>
    )
  }

  let paragraphCount = 0
  let p1EndIndex = nodes.length

  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].type === 'paragraph') {
      paragraphCount++
      if (paragraphCount === 1) p1EndIndex = i + 1
    }
  }

  const topElements: React.ReactNode[] = []
  topElements.push(...serializeLexical(nodes.slice(0, p1EndIndex), 'top-p1'))

  const bottomElements: React.ReactNode[] = []
  const restNodes = nodes.slice(p1EndIndex)
  if (restNodes.length > 0) {
    bottomElements.push(...serializeLexical(restNodes, 'bot-p2'))
  }

  if (!isExpanded) {
    const teaserElement = bottomElements[0]

    return (
      <div className={`rich-text relative ${className || ''}`}>
        {topElements}

        {teaserElement && (
          <div className="relative overflow-hidden h-20 mt-4 mb-0 select-none pointer-events-none">
            <div className="blur-[1px] opacity-50 line-clamp-3">
              {teaserElement}
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
          </div>
        )}

        <div className="relative z-10 w-full flex justify-center pt-2 pb-6 mt-1 mb-4">
          <button
            onClick={() => setIsExpanded(true)}
            className="group inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full cursor-pointer font-sans font-semibold text-sm text-gray-800 bg-white border border-gray-300 shadow-xs transition-all duration-200 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900"
          >
            <span>Read full article</span>
            <svg
              className="w-4 h-4 text-gray-500 transition-transform duration-200 group-hover:translate-y-0.5"
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
    )
  }

  return (
    <div className={`rich-text ${className || ''}`}>
      {topElements}
      {bottomElements}
    </div>
  )
}
