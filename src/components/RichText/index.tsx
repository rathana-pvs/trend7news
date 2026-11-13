import { serializeLexical } from './serialize'
import { AdsKeeper } from '@/components/ads/AdsKeeper'
import { ArticleExpander } from './ArticleExpander'

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

/**
 * Server-rendered article body. Layout:
 *   p1 → in_article_1 ad → p2 (faded preview) → "Read full article" → in_article_2 ad → rest
 * All text is in the HTML (fast first paint, SEO); only the expand toggle runs on the client.
 */
export const RichText = ({ content, className, articleTitle }: RichTextProps) => {
  if (!content) return null

  const rawNodes = content.root?.children || []

  // Drop a leading paragraph that just repeats the title
  let nodes = rawNodes
  if (articleTitle && rawNodes.length > 0) {
    const cleanTitle = articleTitle.trim().toLowerCase()
    const titlePrefix = cleanTitle.substring(0, Math.min(25, cleanTitle.length))
    nodes = rawNodes.filter((node: any, idx: number) => {
      if (idx >= 3) return true
      const text = extractNodeText(node).trim().toLowerCase()
      if (!text) return true
      return !(
        text === cleanTitle ||
        (titlePrefix.length > 5 && text.startsWith(titlePrefix)) ||
        (text.length > 5 && cleanTitle.startsWith(text.substring(0, 25)))
      )
    })
  }

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

  const p1 = serializeLexical(nodes.slice(0, p1EndIndex), 'p1')
  const p2Nodes = nodes.slice(p1EndIndex, p2EndIndex)
  const p3 = serializeLexical(nodes.slice(p2EndIndex), 'p3')

  if (p2Nodes.length === 0) {
    return (
      <div className={`rich-text ${className || ''}`}>
        {p1}
        <AdsKeeper slot="in_article_1" />
        {p3}
      </div>
    )
  }

  return (
    <div className={`rich-text ${className || ''}`}>
      {p1}
      <AdsKeeper slot="in_article_1" />
      <ArticleExpander preview={serializeLexical(p2Nodes, 'p2')} rest={p3} />
    </div>
  )
}
