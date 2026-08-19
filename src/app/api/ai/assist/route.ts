import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText } from 'ai'
import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import * as cheerio from 'cheerio'

function resolveUrl(baseUrl: string, relativeUrl: string): string {
  try {
    return new URL(relativeUrl, baseUrl).toString()
  } catch {
    return relativeUrl
  }
}

function extractBestSrcset(srcsetValue: string): string | null {
  if (!srcsetValue) return null
  const candidates = srcsetValue.split(',').map(s => s.trim()).filter(Boolean)
  let bestUrl: string | null = null
  let maxWidth = 0
  for (const c of candidates) {
    const parts = c.split(/\s+/)
    const candidateUrl = parts[0]
    const descriptor = parts[1] || ''
    let width = 0
    if (descriptor.endsWith('w')) {
      width = parseInt(descriptor.replace('w', ''), 10) || 0
    } else if (descriptor.endsWith('x')) {
      width = (parseFloat(descriptor.replace('x', '')) || 1) * 1000
    }
    if (width >= maxWidth || !bestUrl) {
      maxWidth = width
      bestUrl = candidateUrl
    }
  }
  return bestUrl
}

function cleanTitle(rawTitle: string): string {
  if (!rawTitle) return ''
  let t = rawTitle.replace(/\s+/g, ' ').trim()
  // Remove trailing "See more", "Read more", "Continue reading", etc.
  t = t.replace(/(?:[\s\.\-–—\:\,\…\«\»\(\)\[\]]*)(?:see\s+more|read\s+more|continue\s+reading|full\s+story|read\s+full\s+article|click\s+here\s+to\s+read\s+more|view\s+more)[\s\.\!]*$/i, '')
  // Remove trailing site name suffixes like " - SiteName", " | SiteName", " — SiteName"
  t = t.replace(/\s*[\-\|\—\–]\s*[A-Za-z0-9\.\s]{2,30}$/, '')
  // Clean up any remaining trailing punctuation/dots
  t = t.replace(/[\s\.\-–—\:\,]+$/, '').trim()
  return t
}

const isJunkText = (t: string): boolean => {
  if (!t) return true
  const l = t.toLowerCase().trim()
  if (l.length < 5) return true
  return (
    l.includes('email address will not be published') ||
    l.includes('required fields are marked') ||
    l.includes('save my name') ||
    l.includes('leave a comment') ||
    l.includes('leave a reply') ||
    l.includes('comment section') ||
    l.includes('post a comment') ||
    l.includes('cookie policy') ||
    l.includes('cookies consent') ||
    l.includes('all rights reserved') ||
    l.includes('privacy policy') ||
    l.includes('terms of service') ||
    l.includes('terms and conditions') ||
    l.includes('copyright') ||
    l.includes('subscribe to our') ||
    l.includes('sign up for') ||
    l.includes('newsletter') ||
    l.includes('read more:') ||
    l.includes('also read:') ||
    l.includes('related article') ||
    l.includes('follow us on') ||
    l.includes('share this:') ||
    l.includes('like this:') ||
    l.includes('advertisement') ||
    /^(\*|\-|\•|\–|\—|\s)+$/.test(l)
  )
}

function cleanParagraphText(rawText: string): string {
  if (!rawText) return ''
  let t = rawText.replace(/\s+/g, ' ').trim()
  t = t.replace(/(?:[\s\.\-–—\:\,\…\«\»\(\)\[\]]*)(?:see\s+more|read\s+more|continue\s+reading|click\s+here)[\s\.\!]*$/i, '')
  return t.trim()
}

async function scrapeUrlDirectly(url: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(12000),
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch URL: ${res.statusText} (${res.status})`)
  }
  const html = await res.text()
  const $ = cheerio.load(html)

  // 1. First extract cover image before stripping elements
  let scrapedImageUrl = ''

  // A. Check standard & vendor OpenGraph / Twitter / Schema meta tags
  const metaSelectors = [
    'meta[property="og:image"]',
    'meta[property="og:image:url"]',
    'meta[property="og:image:secure_url"]',
    'meta[name="og:image"]',
    'meta[name="twitter:image"]',
    'meta[name="twitter:image:src"]',
    'meta[property="twitter:image"]',
    'meta[property="twitter:image:src"]',
    'meta[itemprop="image"]',
    'meta[property="article:image"]',
    'meta[name="thumbnail"]',
    'meta[name="image"]',
    'link[rel="image_src"]',
  ]

  for (const sel of metaSelectors) {
    const val = $(sel).attr('content') || $(sel).attr('href')
    if (val && val.trim() && !val.startsWith('data:')) {
      scrapedImageUrl = val.trim()
      break
    }
  }

  // B. Check JSON-LD scripts for news article schema
  if (!scrapedImageUrl) {
    $('script[type="application/ld+json"]').each((_, script) => {
      if (scrapedImageUrl) return false
      try {
        const json = JSON.parse($(script).html() || '{}')
        const findImg = (obj: any): string | null => {
          if (!obj || typeof obj !== 'object') return null
          if (typeof obj.image === 'string') return obj.image
          if (Array.isArray(obj.image) && obj.image.length > 0) {
            return typeof obj.image[0] === 'string' ? obj.image[0] : obj.image[0]?.url
          }
          if (obj.image && typeof obj.image === 'object' && obj.image.url) return obj.image.url
          if (typeof obj.thumbnailUrl === 'string') return obj.thumbnailUrl
          if (obj.primaryImageOfPage && typeof obj.primaryImageOfPage === 'object' && obj.primaryImageOfPage.url) {
            return obj.primaryImageOfPage.url
          }
          if (Array.isArray(obj['@graph'])) {
            for (const item of obj['@graph']) {
              const found = findImg(item)
              if (found) return found
            }
          }
          return null
        }
        const found = findImg(json)
        if (found) {
          scrapedImageUrl = found
          return false
        }
      } catch {}
    })
  }

  // C. Check HTML article/figure/featured image tags
  if (!scrapedImageUrl) {
    const featuredSelectors = [
      '.featured-image img',
      '.wp-post-image',
      '.post-thumbnail img',
      '.entry-thumbnail img',
      'figure.wp-block-image img',
      'article figure img',
      'article header img',
      'main figure img',
      'picture source[srcset]',
      'picture img',
      'article img',
      'main img',
      '.entry-content img',
      '.post-content img',
      'img',
    ]

    for (const sel of featuredSelectors) {
      if (scrapedImageUrl) break
      $(sel).each((_, el) => {
        if (scrapedImageUrl) return false
        const srcsetVal = $(el).attr('srcset') || $(el).attr('data-srcset')
        let src = extractBestSrcset(srcsetVal || '') ||
                  $(el).attr('data-orig-file') ||
                  $(el).attr('data-high-res-src') ||
                  $(el).attr('data-full-url') ||
                  $(el).attr('data-original') ||
                  $(el).attr('data-lazy-src') ||
                  $(el).attr('data-src') ||
                  $(el).attr('src')

        if (src && !src.startsWith('data:') && !src.endsWith('.svg')) {
          const lower = src.toLowerCase()
          if (
            !lower.includes('avatar') &&
            !lower.includes('gravatar') &&
            !lower.includes('logo') &&
            !lower.includes('icon') &&
            !lower.includes('spinner') &&
            !lower.includes('loader') &&
            !lower.includes('pixel') &&
            !lower.includes('tracking') &&
            !lower.includes('badge') &&
            !lower.includes('emoji')
          ) {
            scrapedImageUrl = src
            return false
          }
        }
      })
    }
  }

  if (scrapedImageUrl) {
    if (scrapedImageUrl.includes('/_next/image?url=')) {
      try {
        const nextUrl = new URL(resolveUrl(url, scrapedImageUrl))
        const innerUrl = nextUrl.searchParams.get('url')
        if (innerUrl) scrapedImageUrl = innerUrl
      } catch {}
    }
    scrapedImageUrl = resolveUrl(url, scrapedImageUrl)
  }

  // 2. Extract Title
  let rawTitle = $('meta[property="og:title"]').attr('content') ||
                 $('meta[name="twitter:title"]').attr('content') ||
                 $('h1').first().text() ||
                 $('title').text()
  const title = cleanTitle(rawTitle || '')

  // 3. Extract Meta Excerpt / Description
  let rawExcerpt = $('meta[property="og:description"]').attr('content') ||
                   $('meta[name="twitter:description"]').attr('content') ||
                   $('meta[name="description"]').attr('content') ||
                   ''
  let excerpt = cleanParagraphText(rawExcerpt)
  if (isJunkText(excerpt)) {
    excerpt = ''
  }

  // 4. Clean DOM of all non-content junk before extracting article body
  $(
    'script, style, noscript, svg, nav, footer, header, aside, form, button, input, textarea, select, ' +
    '#comments, .comments, #respond, .comment-respond, .comments-area, .comment-form, .comment-list, ' +
    '.sidebar, #sidebar, .widget-area, .widget, .related-posts, .jp-relatedposts, .sharedaddy, .share-buttons, ' +
    '.social-share, .social-sharing, .post-meta, .entry-meta, .author-box, .post-author, .advertisement, ' +
    '.ads, .ad-box, .ad-container, .wp-block-comments, .navigation, .pagination, .cookie-banner, .cookie-notice, ' +
    '.cookie-law-info-bar, [role="complementary"], [role="navigation"], [aria-hidden="true"]'
  ).remove()

  // 5. Find article container
  let container = $('[itemprop="articleBody"]')
  if (container.length === 0) container = $('.entry-content')
  if (container.length === 0) container = $('.post-content')
  if (container.length === 0) container = $('article')
  if (container.length === 0) container = $('main')
  if (container.length === 0) {
    let maxP = 0
    let bestEl: any = null
    $('div, section').each((_, el) => {
      const pCount = $(el).find('> p').length
      if (pCount > maxP) {
        maxP = pCount
        bestEl = el
      }
    })
    if (bestEl) {
      container = $(bestEl)
    }
  }
  if (container.length === 0) {
    container = $('body')
  }

  const rawBlocks: any[] = []

  function traverse(element: any) {
    const tag = element.tagName?.toLowerCase()
    if (!tag) return

    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
      const headingText = cleanParagraphText($(element).text())
      if (headingText.length > 3 && !isJunkText(headingText)) {
        rawBlocks.push({
          type: 'heading',
          tag: tag === 'h1' ? 'h2' : tag,
          text: headingText
        })
      }
      return
    }

    if (tag === 'blockquote') {
      const hasTwitterLink = $(element).find('a[href*="twitter.com"], a[href*="x.com"]').length > 0
      const isTwitter = $(element).hasClass('twitter-tweet') || hasTwitterLink
      if (isTwitter) {
        const tweetLink = $(element).find('a[href*="twitter.com"], a[href*="x.com"]').attr('href') || ''
        const text = cleanParagraphText($(element).text())
        if (tweetLink) {
          rawBlocks.push({
            type: 'twitter',
            url: resolveUrl(url, tweetLink),
            text
          })
          return
        }
      }

      const quoteText = cleanParagraphText($(element).text())
      if (quoteText.length > 5 && !isJunkText(quoteText)) {
        rawBlocks.push({
          type: 'quote',
          text: quoteText
        })
      }
      return
    }

    if (['ul', 'ol'].includes(tag)) {
      const items: string[] = []
      $(element).find('li').each((_, li) => {
        const liText = cleanParagraphText($(li).text())
        if (liText && !isJunkText(liText)) items.push(liText)
      })
      if (items.length > 0) {
        rawBlocks.push({
          type: 'list',
          tag,
          items
        })
      }
      return
    }

    if (tag === 'img') {
      const srcsetVal = $(element).attr('srcset') || $(element).attr('data-srcset')
      let src = extractBestSrcset(srcsetVal || '') ||
                $(element).attr('data-orig-file') ||
                $(element).attr('data-high-res-src') ||
                $(element).attr('data-full-url') ||
                $(element).attr('data-original') ||
                $(element).attr('data-lazy-src') ||
                $(element).attr('data-src') ||
                $(element).attr('src')
      const alt = $(element).attr('alt')?.trim() || ''
      if (src && !src.startsWith('data:') && !src.endsWith('.svg')) {
        const resolved = resolveUrl(url, src)
        const lowerSrc = resolved.toLowerCase()
        if (
          resolved.startsWith('http') && 
          !lowerSrc.includes('avatar') && 
          !lowerSrc.includes('gravatar') && 
          !lowerSrc.includes('logo') && 
          !lowerSrc.includes('icon') && 
          !lowerSrc.includes('spinner') &&
          !lowerSrc.includes('loader') &&
          !lowerSrc.includes('pixel') &&
          !lowerSrc.includes('badge') &&
          !lowerSrc.includes('tracking')
        ) {
          rawBlocks.push({
            type: 'image',
            src: resolved,
            alt: alt || 'Inline Image'
          })
        }
      }
      return
    }

    if (tag === 'iframe') {
      const src = $(element).attr('src')
      if (src) {
        const resolvedSrc = resolveUrl(url, src)
        let videoSource: 'youtube' | 'facebook' | 'other' = 'other'
        if (resolvedSrc.includes('youtube.com') || resolvedSrc.includes('youtu.be')) {
          videoSource = 'youtube'
        } else if (resolvedSrc.includes('facebook.com')) {
          videoSource = 'facebook'
        }
        
        if (videoSource !== 'other' || resolvedSrc.includes('embed') || resolvedSrc.includes('player')) {
          rawBlocks.push({
            type: 'video',
            url: resolvedSrc,
            source: videoSource
          })
        }
      }
      return
    }

    if (tag === 'video') {
      const src = $(element).attr('src') || $(element).find('source').attr('src')
      if (src) {
        rawBlocks.push({
          type: 'video',
          url: resolveUrl(url, src),
          source: 'other'
        })
      }
      return
    }

    if (tag === 'p') {
      const text = cleanParagraphText($(element).text())
      if (text.length > 20 && !isJunkText(text)) {
        const links = $(element).find('a')
        if (links.length === 1 && text.length < 150) {
          const href = links.attr('href') || ''
          if (href.includes('twitter.com') || href.includes('x.com')) {
            if (href.includes('/status/')) {
              rawBlocks.push({
                type: 'twitter',
                url: resolveUrl(url, href),
                text
              })
              return
            }
          } else if (href.includes('youtube.com/watch') || href.includes('youtu.be/')) {
            rawBlocks.push({
              type: 'video',
              url: resolveUrl(url, href),
              source: 'youtube'
            })
            return
          }
        }

        const inlineChildren: any[] = []
        $(element).contents().each((_, child) => {
          if (child.type === 'text') {
            const txt = child.data
            if (txt) {
              inlineChildren.push({ type: 'text', text: txt })
            }
          } else if (child.type === 'tag') {
            const childTag = child.tagName.toLowerCase()
            const childText = $(child).text()
            if (childText) {
              if (childTag === 'a') {
                const href = $(child).attr('href')
                inlineChildren.push({
                  type: 'link',
                  text: childText,
                  url: href ? resolveUrl(url, href) : ''
                })
              } else if (['strong', 'b'].includes(childTag)) {
                inlineChildren.push({
                  type: 'text',
                  text: childText,
                  bold: true
                })
              } else if (['em', 'i'].includes(childTag)) {
                inlineChildren.push({
                  type: 'text',
                  text: childText,
                  italic: true
                })
              } else {
                inlineChildren.push({ type: 'text', text: childText })
              }
            }
          }
        })

        rawBlocks.push({
          type: 'paragraph',
          text,
          children: inlineChildren.length > 0 ? inlineChildren : [{ type: 'text', text }]
        })
      }
      return
    }

    $(element).children().each((_, child) => {
      traverse(child)
    })
  }

  container.children().each((_, el) => {
    traverse(el)
  })

  if (rawBlocks.filter(b => b.type === 'paragraph').length === 0) {
    $('p').each((_, el) => {
      const text = cleanParagraphText($(el).text())
      if (text.length > 25 && !isJunkText(text)) {
        rawBlocks.push({
          type: 'paragraph',
          text,
          children: [{ type: 'text', text }]
        })
      }
    })
  }

  const cleanParagraphs = rawBlocks
    .filter(b => b.type === 'paragraph')
    .map(b => b.text.replace(/\s+/g, ' ').trim())
    .filter(p => !isJunkText(p))
  
  const content = cleanParagraphs.slice(0, 30).join('\n\n')

  let tags: string[] = []
  const keywords = $('meta[name="keywords"]').attr('content')
  if (keywords) {
    tags = keywords.split(',').map(k => k.trim()).filter(k => k.length > 2 && k.length < 20).slice(0, 5)
  } else {
    tags = title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 4 && !['about', 'after', 'before', 'their', 'there', 'these', 'would', 'trend7news'].includes(w))
      .slice(0, 4)
  }

  if (title && excerpt) {
    const cleanT = title.trim().toLowerCase()
    const prefix = cleanT.substring(0, Math.min(25, cleanT.length))
    if (excerpt.trim().toLowerCase().startsWith(prefix)) {
      excerpt = excerpt.trim().substring(title.length).replace(/^[\s:\-–—\.\,\!]+/, '').trim()
    }
  }

  if (title && rawBlocks.length > 0) {
    const cleanT = title.trim().toLowerCase()
    const prefix = cleanT.substring(0, Math.min(25, cleanT.length))
    const filteredBlocks = rawBlocks.filter((block: any, idx: number) => {
      if (idx >= 3) return true
      const bText = (block.text || '').trim().toLowerCase()
      if (!bText) return true
      if (
        bText === cleanT || 
        (prefix.length > 5 && bText.startsWith(prefix)) || 
        (bText.length > 5 && cleanT.startsWith(bText.substring(0, 25)))
      ) {
        return false
      }
      return true
    })
    rawBlocks.length = 0
    rawBlocks.push(...filteredBlocks)
  }

  const metaTitle = title.endsWith(' - Trend7News') ? title : `${title.substring(0, 45)} - Trend7News`
  const fallbackParagraph = cleanParagraphs.find(p => !isJunkText(p) && p.length > 40) || cleanParagraphs[0] || content
  const finalExcerpt = (excerpt && !isJunkText(excerpt)) ? excerpt : (fallbackParagraph.length > 200 ? fallbackParagraph.substring(0, 200) + '...' : fallbackParagraph)
  
  let rawMetaDesc = $('meta[property="og:description"]').attr('content') ||
                    $('meta[name="twitter:description"]').attr('content') ||
                    $('meta[name="description"]').attr('content') || ''
  rawMetaDesc = cleanParagraphText(rawMetaDesc)
  if (isJunkText(rawMetaDesc)) {
    rawMetaDesc = ''
  }
  const metaDescription = rawMetaDesc || finalExcerpt

  return {
    title,
    content,
    excerpt: finalExcerpt,
    tags,
    metaTitle,
    metaDescription,
    scrapedImageUrl,
    blocks: rawBlocks,
  }
}

async function createMediaDoc(payload: any, imageUrl: string, title: string) {
  let fileBuffer: Buffer | null = null
  let mimeType = 'image/jpeg'
  let filename = `imported-${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`

  try {
    const imgRes = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(7000),
    })
    if (imgRes.ok) {
      const arrayBuffer = await imgRes.arrayBuffer()
      fileBuffer = Buffer.from(arrayBuffer)
      const headerType = imgRes.headers.get('content-type')
      if (headerType && headerType.startsWith('image/')) {
        mimeType = headerType.split(';')[0].trim()
        const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg')?.replace('svg+xml', 'svg') || 'jpg'
        filename = `imported-${Date.now()}.${ext}`
      }
    }
  } catch (fetchErr) {
    console.warn('[Media Import] Remote image fetch warning, using transparent placeholder buffer fallback:', fetchErr)
  }

  if (!fileBuffer || fileBuffer.length === 0) {
    fileBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA6ie6hQAAAABJRU5ErkJggg==', 'base64')
    mimeType = 'image/png'
    filename = `external-${Date.now()}.png`
  }

  const mediaDoc = await payload.create({
    collection: 'media',
    data: {
      alt: title || 'Cover Image',
      source: 'external',
      externalUrl: imageUrl,
    },
    file: {
      data: fileBuffer,
      name: filename,
      mimetype: mimeType,
      size: fileBuffer.length,
    },
  })

  return mediaDoc
}

function buildLexicalJson(blocks: any[]): any {
  const children = blocks.map(block => {
    if (block.type === 'paragraph') {
      const blockChildren = Array.isArray(block.children) && block.children.length > 0
        ? block.children
        : [{ type: 'text', text: block.text || '' }]
      return {
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        children: blockChildren.map((child: any) => {
          if (child.type === 'link') {
            return {
              type: 'link',
              version: 2,
              fields: {
                url: child.url,
                newTab: true,
                linkType: 'custom'
              },
              format: '',
              indent: 0,
              children: [
                {
                  type: 'text',
                  text: child.text,
                  format: 0,
                  style: '',
                  version: 1
                }
              ],
              direction: 'ltr'
            }
          } else {
            let format = 0
            if (child.bold) format |= 1
            if (child.italic) format |= 2
            return {
              type: 'text',
              text: child.text,
              format,
              style: '',
              version: 1
            }
          }
        }),
        direction: 'ltr'
      }
    }
    
    if (block.type === 'heading') {
      return {
        type: 'heading',
        tag: block.tag,
        format: '',
        indent: 0,
        version: 1,
        children: [
          {
            type: 'text',
            text: block.text,
            format: 0,
            style: '',
            version: 1
          }
        ],
        direction: 'ltr'
      }
    }
    
    if (block.type === 'quote') {
      return {
        type: 'quote',
        format: '',
        indent: 0,
        version: 1,
        children: [
          {
            type: 'text',
            text: block.text,
            format: 0,
            style: '',
            version: 1
          }
        ],
        direction: 'ltr'
      }
    }
    
    if (block.type === 'list') {
      return {
        type: 'list',
        tag: block.tag === 'ol' ? 'ol' : 'ul',
        format: '',
        indent: 0,
        version: 1,
        children: block.items.map((itemText: string) => ({
          type: 'listitem',
          version: 1,
          format: '',
          indent: 0,
          value: -1,
          children: [
            {
              type: 'text',
              text: itemText,
              format: 0,
              style: '',
              version: 1
            }
          ],
          direction: 'ltr'
        })),
        direction: 'ltr'
      }
    }
    
    if (block.type === 'image') {
      if (!block.mediaId) return null
      return {
        type: 'upload',
        version: 1,
        relationTo: 'media',
        value: block.mediaId,
        format: '',
        indent: 0,
        children: []
      }
    }
    
    if (block.type === 'video') {
      return {
        type: 'block',
        version: 2,
        format: '',
        indent: 0,
        fields: {
          id: `block-${Math.random().toString(36).substring(2, 11)}`,
          blockType: 'videoEmbed',
          source: block.source,
          url: block.url,
          caption: block.caption || ''
        }
      }
    }
    
    if (block.type === 'twitter') {
      return {
        type: 'block',
        version: 2,
        format: '',
        indent: 0,
        fields: {
          id: `block-${Math.random().toString(36).substring(2, 11)}`,
          blockType: 'twitterEmbed',
          url: block.url,
          tweetText: block.tweetText || block.text || '',
          author: block.author || '',
          authorHandle: block.authorHandle || '',
          date: block.date || ''
        }
      }
    }
    
    return null
  }).filter(Boolean)
  
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      children: children.length > 0 ? children : [
        {
          type: 'paragraph',
          format: '',
          indent: 0,
          version: 1,
          children: [],
          direction: 'ltr'
        }
      ],
      direction: 'ltr'
    }
  }
}

function safeJsonParse(rawText: string): any {
  if (!rawText) return null
  let text = rawText.trim()

  if (text.includes('```')) {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (match && match[1]) {
      text = match[1].trim()
    } else {
      text = text.replace(/```(?:json)?/g, '').replace(/```/g, '').trim()
    }
  }

  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.substring(firstBrace, lastBrace + 1)
  }

  try {
    return JSON.parse(text)
  } catch {
    try {
      let sanitized = text
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
      
      sanitized = sanitized.replace(/(["'])(?:(?=(\\?))\2[\s\S])*?\1/g, (match) => {
        return match.replace(/\r?\n/g, '\\n').replace(/\t/g, '\\t')
      })

      return JSON.parse(sanitized)
    } catch {
      const result: Record<string, any> = {}
      const titleMatch = text.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/)
      if (titleMatch) result.title = titleMatch[1].replace(/\\"/g, '"')

      const excerptMatch = text.match(/"excerpt"\s*:\s*"((?:[^"\\]|\\.)*)"/)
      if (excerptMatch) result.excerpt = excerptMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n')

      const contentMatch = text.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)"/)
      if (contentMatch) result.content = contentMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n')

      const metaTitleMatch = text.match(/"metaTitle"\s*:\s*"((?:[^"\\]|\\.)*)"/)
      if (metaTitleMatch) result.metaTitle = metaTitleMatch[1].replace(/\\"/g, '"')

      const metaDescMatch = text.match(/"metaDescription"\s*:\s*"((?:[^"\\]|\\.)*)"/)
      if (metaDescMatch) result.metaDescription = metaDescMatch[1].replace(/\\"/g, '"')

      const tagsMatch = text.match(/"tags"\s*:\s*\[([\s\S]*?)\]/)
      if (tagsMatch) {
        result.tags = tagsMatch[1]
          .split(',')
          .map(t => t.replace(/["'\[\]\s]/g, '').trim())
          .filter(Boolean)
      }

      if (result.excerpt || result.content || result.metaTitle || result.title) {
        return result
      }
      return null
    }
  }
}

const googleAI = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

const PRIMARY_MODEL_ID = 'gemini-3.5-flash-lite'
const FALLBACK_MODEL_ID = 'gemini-3.6-flash'

const primaryModel = googleAI(PRIMARY_MODEL_ID)
const fallbackModel = googleAI(FALLBACK_MODEL_ID)

export async function GET(req: NextRequest) {
  const results: Record<string, { ok: boolean; response?: string; error?: string }> = {}

  for (const [name, model] of [
    [PRIMARY_MODEL_ID, primaryModel],
    [FALLBACK_MODEL_ID, fallbackModel],
  ] as [string, any][]) {
    try {
      const res = await generateText({
        model,
        prompt: 'Reply with exactly: OK',
        maxOutputTokens: 5,
      })
      results[name] = { ok: true, response: res.text.trim() }
    } catch (e: any) {
      results[name] = { ok: false, error: e?.message || 'Unknown error' }
    }
  }

  const allOk = Object.values(results).some(r => r.ok)
  return NextResponse.json({ allOk, models: results }, { status: allOk ? 200 : 500 })
}

const SYSTEM_PROMPT = `You are an expert news editor and content writer for Trend7News, a reputable English-language news website covering global news, trends, politics, technology, business, and culture.

For content summarization and AI formatting, follow these strict editorial rules:
1. Lead Excerpt / Summary: Create a punchy, high-engagement lead summary strictly under 160 characters. Do NOT include comment form text or website boilerplate.
2. Title Handling: Do NOT duplicate the article title inside the main body content.
3. Subheadings: Do NOT include any H2 or H3 subheadings in short summary articles—use clean, readable paragraphs.
4. Total Word Count: The entire summary body content MUST be strictly between 120 and 140 words.
5. Paragraph Constraints: Write EXACTLY 4 paragraphs (no more, no less). Each paragraph MUST be at most 35 words long.
6. Core Takeaways First (Lead-In): Put the main conclusion, event, or answer in the very first sentence (the "5 Ws": Who, What, When, Where, Why).
7. Eliminate Fluff & Redundancies: Strip away unnecessary background details, conversational filler, repetitive examples, and minor anecdotes.
8. Maintain Factual Accuracy: Preserve the original meaning and context without altering facts or adding unverified information.
9. SEO Metadata Limits:
   - Meta Title: 50–60 characters (including - Trend7News suffix).
   - Meta Description: 100–150 characters.

Always respond with valid JSON only. No markdown, no explanations outside the JSON.`

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayloadClient()
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, title, content, url, customPrompt } = await req.json()

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 })
    }

    if (action === 'scrape_direct') {
      if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 })
      }

      const result = await scrapeUrlDirectly(url) as any
      const blocks = result.blocks || []

      // Create cover image in media collection
      if (result.scrapedImageUrl) {
        try {
          const mediaDoc = await createMediaDoc(payload, result.scrapedImageUrl, result.title || 'Cover Image')
          result.coverImage = mediaDoc.id
        } catch (imgErr) {
          console.error('Failed to create external cover image:', imgErr)
        }
      }

      // Process inline images and twitter embeds
      for (const block of blocks) {
        if (block.type === 'image' && block.src) {
          try {
            const mediaDoc = await createMediaDoc(payload, block.src, block.alt || result.title || 'Inline Image')
            block.mediaId = mediaDoc.id
          } catch (imgErr) {
            console.error('Failed to create external inline image:', block.src, imgErr)
          }
        }

        if (block.type === 'twitter' && block.url) {
          try {
            const oEmbedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(block.url)}&omit_script=true`
            const embedRes = await fetch(oEmbedUrl, { signal: AbortSignal.timeout(5000) })
            if (embedRes.ok) {
              const embedData = await embedRes.json()
              block.author = embedData.author_name || ''
              block.authorHandle = embedData.author_url ? '@' + embedData.author_url.split('/').pop() : '@x'
              
              if (embedData.html) {
                const tweet$ = cheerio.load(embedData.html)
                block.tweetText = tweet$('p').text().trim() || block.text
                block.date = tweet$('a').last().text().trim()
              }
            }
          } catch (tweetErr) {
            console.error('Failed to fetch Twitter oEmbed info:', tweetErr)
          }
          if (!block.tweetText) {
            block.tweetText = block.text || 'Twitter content'
          }
        }
      }

      const coverMediaId = result.coverImage
      const coverSrc = result.scrapedImageUrl

      const dedupedBlocks = blocks.filter((block: any) => {
        if (block.type !== 'image') return true
        if (coverMediaId && block.mediaId === coverMediaId) return false
        if (coverSrc && block.src === coverSrc) return false
        return true
      })

      if (process.env.GOOGLE_GENERATIVE_AI_API_KEY && result.title) {
        try {
          const rawParagraphsText = blocks
            .filter((b: any) => b.type === 'paragraph' && !isJunkText(b.text))
            .map((b: any) => b.text)
            .slice(0, 15)
            .join('\n\n')

          const contentContext = rawParagraphsText.length > 20
            ? rawParagraphsText.substring(0, 3000)
            : (result.excerpt || result.title)

          const aiPrompt = `Given the news article title "${result.title}" and text content:\n"${contentContext}"\n\nSummarize and reformat into a complete news summary adhering strictly to these rules:
1. "excerpt": A punchy, high-engagement lead summary strictly under 160 characters. Do NOT include comment form text or website boilerplate.
2. "content": Summary body of EXACTLY 4 short paragraphs (no H2/H3 subheadings). Total word count MUST be strictly between 120 and 140 words. Each paragraph MUST be at most 35 words long. Do NOT duplicate title.
3. "tags": ["3-5 relevant lowercase tags"]
4. "metaTitle": SEO title strictly 50-60 characters ending with - Trend7News.
5. "metaDescription": SEO meta description strictly 100-150 characters.

Return valid JSON with exact keys: { "excerpt", "content", "tags", "metaTitle", "metaDescription" }`

          let rawSummary = ''
          try {
            const res = await generateText({
              model: primaryModel,
              system: SYSTEM_PROMPT,
              prompt: aiPrompt,
            })
            rawSummary = res.text
          } catch (primErr) {
            console.warn(`[Import Summary] Primary model (${PRIMARY_MODEL_ID}) failed, trying fallback (${FALLBACK_MODEL_ID}):`, primErr)
            const res = await generateText({
              model: fallbackModel,
              system: SYSTEM_PROMPT,
              prompt: aiPrompt,
            })
            rawSummary = res.text
          }

          const aiData = safeJsonParse(rawSummary)
          if (aiData) {
            if (aiData.excerpt && !isJunkText(aiData.excerpt)) result.excerpt = aiData.excerpt
            if (aiData.tags && Array.isArray(aiData.tags)) result.tags = aiData.tags
            if (aiData.metaTitle) result.metaTitle = aiData.metaTitle
            if (aiData.metaDescription && !isJunkText(aiData.metaDescription)) result.metaDescription = aiData.metaDescription

            const contentStr = typeof aiData.content === 'string'
              ? aiData.content
              : (Array.isArray(aiData.content) ? aiData.content.join('\n\n') : '')

            if (contentStr) {
              const aiParagraphs = contentStr
                .split(/\n\s*\n/)
                .map((p: string) => p.trim())
                .filter((p: string) => Boolean(p) && !isJunkText(p))

              const mediaBlocks = dedupedBlocks.filter((b: any) => b.type !== 'paragraph' && b.type !== 'heading')
              const summaryBlocks = [
                ...aiParagraphs.map((pText: string) => ({ type: 'paragraph', text: pText, children: [{ type: 'text', text: pText }] })),
                ...mediaBlocks
              ]
              result.content = buildLexicalJson(summaryBlocks)
            } else {
              result.content = buildLexicalJson(dedupedBlocks)
            }
          } else {
            result.content = buildLexicalJson(dedupedBlocks)
          }
        } catch (aiSummaryErr) {
          console.warn('[Import Summary AI Warning]', aiSummaryErr)
          result.content = buildLexicalJson(dedupedBlocks)
        }
      } else {
        result.content = buildLexicalJson(dedupedBlocks)
      }
      delete result.blocks

      const enforced = enforceSeoLimits(result)
      return NextResponse.json({ success: true, data: enforced })
    }

    if (!title && !content && !customPrompt) {
      return NextResponse.json({ error: 'Title, content, or prompt instructions are required for AI generation' }, { status: 400 })
    }

    const contextNotes = [
      content ? `Article Notes/Context: "${content}"` : '',
      customPrompt ? `Editor Instructions/Prompt: "${customPrompt}"` : ''
    ].filter(Boolean).join('\n')

    let prompt = ''
    if (action === 'full') {
      prompt = `Given the article title "${title || 'Untitled'}"${contextNotes ? ` and details:\n${contextNotes}` : ''}, generate a complete summary news article adhering to these rules:
- "title": A polished, engaging title for the article (use given title if suitable or refine it).
- "excerpt": A punchy, high-engagement lead summary strictly under 160 characters.
- "content": Summary body of EXACTLY 4 short paragraphs (no H2/H3 subheadings). Total word count MUST be between 120 and 140 words. Each paragraph MUST be at most 35 words long.
- "tags": ["3-5 relevant lowercase tags"]
- "metaTitle": SEO title strictly 50-60 characters ending with - Trend7News.
- "metaDescription": SEO meta description strictly 100-150 characters.

Return JSON with exact keys: { "title", "excerpt", "content", "tags", "metaTitle", "metaDescription" }`
    } else if (action === 'content_only') {
      prompt = `Given the article title "${title || 'Untitled'}"${contextNotes ? ` and details:\n${contextNotes}` : ''}, generate the summary article content adhering to these rules:
- "excerpt": A punchy, high-engagement lead summary strictly under 160 characters.
- "content": Summary body of EXACTLY 4 short paragraphs (no H2/H3 subheadings). Total word count MUST be between 120 and 140 words. Each paragraph MUST be at most 35 words long.

Return JSON with exact keys: { "excerpt", "content" }`
    } else if (action === 'seo_only') {
      prompt = `Given the article title "${title || 'Untitled'}"${contextNotes ? ` and details:\n${contextNotes}` : ''}, generate SEO metadata adhering to these rules:
- "excerpt": A punchy, high-engagement lead summary strictly under 160 characters.
- "tags": ["3-5 relevant lowercase tags"]
- "metaTitle": SEO title strictly 50-60 characters ending with - Trend7News.
- "metaDescription": SEO meta description strictly 100-150 characters.

Return JSON with exact keys: { "excerpt", "tags", "metaTitle", "metaDescription" }`
    }

    let rawText = ''
    try {
      const res = await generateText({
        model: primaryModel,
        system: SYSTEM_PROMPT,
        prompt,
      })
      rawText = res.text
    } catch (primaryErr: any) {
      console.warn(`Primary AI model (${PRIMARY_MODEL_ID}) failed, trying fallback (${FALLBACK_MODEL_ID}):`, primaryErr?.message)
      const res = await generateText({
        model: fallbackModel,
        system: SYSTEM_PROMPT,
        prompt,
      })
      rawText = res.text
    }

    const aiData = safeJsonParse(rawText)
    if (!aiData) {
      throw new Error('Failed to parse AI response into valid JSON')
    }
    const enforced = enforceSeoLimits(aiData)

    return NextResponse.json({ success: true, data: enforced })
  } catch (error: any) {
    console.error('[AI Assist Error]', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to process request' },
      { status: 500 }
    )
  }
}

function enforceSeoLimits(seoData: any) {
  if (!seoData) return seoData

  if (seoData.metaTitle && typeof seoData.metaTitle === 'string') {
    let title = seoData.metaTitle.trim()
    if (title.length > 60) {
      const suffix = title.endsWith(' - Trend7News') ? ' - Trend7News' : (title.endsWith(' | Trend7News') ? ' | Trend7News' : '')
      const maxPrefixLength = 60 - suffix.length
      if (suffix) {
        let prefix = title.substring(0, title.length - suffix.length).trim()
        if (prefix.length > maxPrefixLength) {
          prefix = prefix.substring(0, maxPrefixLength)
          const lastSpace = prefix.lastIndexOf(' ')
          if (lastSpace > 20) {
            prefix = prefix.substring(0, lastSpace).trim()
          }
        }
        title = prefix + suffix
      } else {
        title = title.substring(0, 60)
        const lastSpace = title.lastIndexOf(' ')
        if (lastSpace > 30) {
          title = title.substring(0, lastSpace).trim()
        }
      }
      seoData.metaTitle = title
    }
  }

  if (seoData.metaDescription && typeof seoData.metaDescription === 'string') {
    let desc = seoData.metaDescription.trim()
    if (desc.length > 150) {
      desc = desc.substring(0, 150)
      const lastPeriod = desc.lastIndexOf('.')
      if (lastPeriod > 100) {
        desc = desc.substring(0, lastPeriod + 1).trim()
      } else {
        const lastSpace = desc.lastIndexOf(' ')
        if (lastSpace > 100) {
          desc = desc.substring(0, lastSpace).trim() + '...'
        }
      }
      seoData.metaDescription = desc
    }
  }

  if (seoData.excerpt && typeof seoData.excerpt === 'string') {
    let excerpt = seoData.excerpt.trim()
    if (excerpt.length > 160) {
      excerpt = excerpt.substring(0, 160)
      const lastPeriod = excerpt.lastIndexOf('.')
      if (lastPeriod > 100) {
        excerpt = excerpt.substring(0, lastPeriod + 1).trim()
      } else {
        const lastSpace = excerpt.lastIndexOf(' ')
        if (lastSpace > 100) {
          excerpt = excerpt.substring(0, lastSpace).trim() + '...'
        }
      }
      seoData.excerpt = excerpt
    }
  }
  return seoData
}
