import { serializeLexical } from './serialize'
import { AdsKeeper } from '@/components/ads/AdsKeeper'
import { ArticleExpander } from './ArticleExpander'

export type RichTextProps = {
  content: any
  className?: string
  articleTitle?: string
}

/** Words of body text before the second in-content ad. */
const WORDS_BETWEEN_ADS = 350

function extractNodeText(node: any): string {
  if (!node) return ''
  if (typeof node.text === 'string') return node.text
  if (node.children && Array.isArray(node.children)) {
    return node.children.map(extractNodeText).join(' ')
  }
  return ''
}

const wordCount = (node: any) => extractNodeText(node).split(/\s+/).filter(Boolean).length

/** True if a paragraph ends like a full sentence (imported text is sometimes split mid-sentence). */
const endsSentence = (node: any) => /[.!?…"”'’)\]]\s*$/.test(extractNodeText(node).trim())

/** A safe place for an ad: after a non-empty paragraph that ends a sentence. */
const isAdBoundary = (node: any) => node?.type === 'paragraph' && wordCount(node) > 0 && endsSentence(node)

/** Index (exclusive) of the n-th paragraph, or -1 if there aren't that many. */
function afterNthParagraph(nodes: any[], n: number): number {
  let count = 0
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].type === 'paragraph' && wordCount(nodes[i]) > 0) {
      count++
      if (count === n) return i + 1
    }
  }
  return -1
}

/** First sentence-ending paragraph boundary at or after the n-th paragraph. */
function adBreakAfterParagraph(nodes: any[], n: number): number {
  const start = afterNthParagraph(nodes, n)
  if (start === -1) return -1
  for (let i = start - 1; i < nodes.length; i++) {
    if (isAdBoundary(nodes[i])) return i + 1
  }
  return -1
}

/**
 * First paragraph boundary after ~WORDS_BETWEEN_ADS words, leaving at least
 * one node after it so the ad never sits at the very end. -1 if too short.
 */
function adBreakByWords(nodes: any[]): number {
  let words = 0
  for (let i = 0; i < nodes.length - 1; i++) {
    words += wordCount(nodes[i])
    if (words >= WORDS_BETWEEN_ADS && isAdBoundary(nodes[i])) return i + 1
  }
  return -1
}

/**
 * Server-rendered article body with ad positions:
 *
 *   p1, p2 → in_article_1 → p3 (faded) + "Read full article" → … ~350 words … → in_article_2 → rest
 *
 * Ads never split a paragraph. Short articles get a single ad after p1 and no gate.
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

  const firstAdAt = adBreakAfterParagraph(nodes, 2)
  const hasEnoughAfter = firstAdAt !== -1 && afterNthParagraph(nodes.slice(firstAdAt), 1) !== -1

  // Short article: p1 → ad → rest, no gate
  if (!hasEnoughAfter) {
    const at = adBreakAfterParagraph(nodes, 1)
    if (at === -1) return <div className={`rich-text ${className || ''}`}>{serializeLexical(nodes, 'all')}</div>
    return (
      <div className={`rich-text ${className || ''}`}>
        {serializeLexical(nodes.slice(0, at), 'a')}
        <AdsKeeper slot="in_article_1" />
        {serializeLexical(nodes.slice(at), 'b')}
      </div>
    )
  }

  const lead = nodes.slice(0, firstAdAt)
  const after = nodes.slice(firstAdAt)
  const previewEnd = afterNthParagraph(after, 1)
  const preview = after.slice(0, previewEnd)
  const rest = after.slice(previewEnd)

  // Second ad ~350 words into the remaining text (counted from the first ad)
  const secondAdAt = adBreakByWords(after)
  const restBreak = secondAdAt === -1 ? -1 : Math.max(0, secondAdAt - previewEnd)

  return (
    <div className={`rich-text ${className || ''}`}>
      {serializeLexical(lead, 'lead')}
      <AdsKeeper slot="in_article_1" />
      <ArticleExpander preview={serializeLexical(preview, 'preview')}>
        {restBreak <= 0 ? (
          serializeLexical(rest, 'rest')
        ) : (
          <>
            {serializeLexical(rest.slice(0, restBreak), 'rest-a')}
            <AdsKeeper slot="in_article_2" />
            {serializeLexical(rest.slice(restBreak), 'rest-b')}
          </>
        )}
      </ArticleExpander>
    </div>
  )
}
