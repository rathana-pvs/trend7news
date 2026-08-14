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

async function scrapeUrlDirectly(url: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    }
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch URL: ${res.statusText} (${res.status})`)
  }
  const html = await res.text()
  const $ = cheerio.load(html)
  
  let title = $('meta[property="og:title"]').attr('content') ||
              $('meta[name="twitter:title"]').attr('content') ||
              $('h1').first().text() ||
              $('title').text()
  title = title?.trim() || ''

  let excerpt = $('meta[property="og:description"]').attr('content') ||
                $('meta[name="twitter:description"]').attr('content') ||
                $('meta[name="description"]').attr('content') ||
                ''
  excerpt = excerpt.trim()

  let container = $('article')
  if (container.length === 0) container = $('main')
  if (container.length === 0) container = $('[itemprop="articleBody"]')
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
      const text = $(element).text().trim()
      if (text.length > 3) {
        rawBlocks.push({
          type: 'heading',
          tag: tag === 'h1' ? 'h2' : tag,
          text
        })
      }
      return
    }

    if (tag === 'blockquote') {
      const hasTwitterLink = $(element).find('a[href*="twitter.com"], a[href*="x.com"]').length > 0
      const isTwitter = $(element).hasClass('twitter-tweet') || hasTwitterLink
      if (isTwitter) {
        const tweetLink = $(element).find('a[href*="twitter.com"], a[href*="x.com"]').attr('href') || ''
        const text = $(element).text().trim()
        if (tweetLink) {
          rawBlocks.push({
            type: 'twitter',
            url: resolveUrl(url, tweetLink),
            text
          })
          return
        }
      }

      const text = $(element).text().trim()
      if (text.length > 5) {
        rawBlocks.push({
          type: 'quote',
          text
        })
      }
      return
    }

    if (['ul', 'ol'].includes(tag)) {
      const items: string[] = []
      $(element).find('li').each((_, li) => {
        const liText = $(li).text().trim()
        if (liText) items.push(liText)
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
      const src = $(element).attr('src')
      const alt = $(element).attr('alt')?.trim() || ''
      if (src) {
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
          !lowerSrc.includes('addec')
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
      const text = $(element).text().trim()
      const lower = text.toLowerCase()
      if (
        text.length > 15 && 
        !lower.includes('cookie') && 
        !lower.includes('subscribe') && 
        !lower.includes('sign up') && 
        !lower.includes('newsletter') &&
        !lower.includes('privacy policy') &&
        !lower.includes('terms of service') &&
        !lower.includes('all rights reserved')
      ) {
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
      const text = $(el).text().trim()
      if (text.length > 20) {
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

  let scrapedImageUrl = $('meta[property="og:image"]').attr('content') ||
                        $('meta[name="twitter:image"]').attr('content') ||
                        $('link[rel="image_src"]').attr('href') ||
                        ''
  
  if (scrapedImageUrl) {
    scrapedImageUrl = resolveUrl(url, scrapedImageUrl)
  } else {
    const articleImages = $('article img, main img, .content img, .post img, #content img')
    let foundImg = ''
    articleImages.each((_, el) => {
      const src = $(el).attr('src')
      if (src) {
        const resolved = resolveUrl(url, src)
        if (
          resolved.startsWith('http') && 
          !resolved.includes('avatar') && 
          !resolved.includes('gravatar') && 
          !resolved.includes('logo') && 
          !resolved.includes('icon') && 
          !resolved.includes('spinner') &&
          !resolved.includes('loader')
        ) {
          foundImg = resolved
          return false
        }
      }
    })
    
    if (!foundImg) {
      $('img').each((_, el) => {
        const src = $(el).attr('src')
        if (src) {
          const resolved = resolveUrl(url, src)
          if (
            resolved.startsWith('http') && 
            !resolved.includes('avatar') && 
            !resolved.includes('gravatar') && 
            !resolved.includes('logo') && 
            !resolved.includes('icon') && 
            !resolved.includes('spinner') &&
            !resolved.includes('loader')
          ) {
            foundImg = resolved
            return false
          }
        }
      })
    }
    scrapedImageUrl = foundImg
  }

  const isJunkText = (t: string) => {
    if (!t) return true
    const l = t.toLowerCase()
    return (
      l.includes('email address will not be published') ||
      l.includes('required fields are marked') ||
      l.includes('save my name') ||
      l.includes('leave a comment') ||
      l.includes('leave a reply') ||
      l.includes('comment section') ||
      l.includes('cookie policy') ||
      l.includes('all rights reserved')
    )
  }

  if (isJunkText(excerpt)) {
    excerpt = ''
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
  const fallbackParagraph = cleanParagraphs.find(p => !isJunkText(p) && p.length > 40) || content
  const finalExcerpt = (excerpt && !isJunkText(excerpt)) ? excerpt : (fallbackParagraph.length > 200 ? fallbackParagraph.substring(0, 200) + '...' : fallbackParagraph)
  
  let rawMetaDesc = $('meta[property="og:description"]').attr('content') ||
                    $('meta[name="twitter:description"]').attr('content') ||
                    $('meta[name="description"]').attr('content') || ''
  rawMetaDesc = rawMetaDesc.trim()
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

const googleAI = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

const PRIMARY_MODEL_ID = 'gemini-3.5-flash-lite'
const FALLBACK_MODEL_ID = 'gemini-2.5-flash'

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

  const allOk = Object.values(results).every(r => r.ok)
  return NextResponse.json({ allOk, models: results }, { status: allOk ? 200 : 500 })
}

const SYSTEM_PROMPT = `You are an expert news editor and content writer for Trend7News, a reputable English-language news website covering global news, trends, politics, technology, business, and culture.

For content summarization and AI formatting, follow these strict editorial rules:
1. Lead Excerpt / Summary: Create a punchy, high-engagement lead summary strictly under 160 characters.
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

    const { action, title, content, url } = await req.json()

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 })
    }

    if (action === 'scrape_direct') {
      if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 })
      }

      const result = await scrapeUrlDirectly(url) as any
      const blocks = result.blocks || []

      if (result.scrapedImageUrl) {
        try {
          const imageRes = await fetch(result.scrapedImageUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
          })
          if (imageRes.ok) {
            const arrayBuffer = await imageRes.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)
            const contentType = imageRes.headers.get('content-type') || 'image/jpeg'
            let ext = contentType.split('/')[1] || 'jpg'
            ext = ext.split(';')[0].trim()
            const filename = `scraped-${Date.now()}.${ext}`
            
            const mediaDoc = await payload.create({
              collection: 'media',
              data: {
                alt: result.title || 'Scraped Image',
              },
              file: {
                data: buffer,
                name: filename,
                mimetype: contentType,
                size: buffer.length,
              }
            })
            result.coverImage = mediaDoc.id
          } else {
            throw new Error(`Failed to fetch cover image: Status ${imageRes.status}`)
          }
        } catch (imgErr) {
          console.error('Failed to download scraped cover image, trying external fallback:', imgErr)
          try {
            const mediaDoc = await payload.create({
              collection: 'media',
              data: {
                alt: result.title || 'Scraped Image',
                source: 'external',
                externalUrl: result.scrapedImageUrl
              }
            })
            result.coverImage = mediaDoc.id
          } catch (extErr) {
            console.error('Failed to create external cover image fallback:', extErr)
          }
        }
      }

      for (const block of blocks) {
        if (block.type === 'image' && block.src) {
          try {
            const imageRes = await fetch(block.src, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
            })
            if (imageRes.ok) {
              const arrayBuffer = await imageRes.arrayBuffer()
              const buffer = Buffer.from(arrayBuffer)
              const contentType = imageRes.headers.get('content-type') || 'image/jpeg'
              let ext = contentType.split('/')[1] || 'jpg'
              ext = ext.split(';')[0].trim()
              const filename = `scraped-inline-${Date.now()}-${Math.floor(Math.random() * 1000)}.${ext}`
              
              const mediaDoc = await payload.create({
                collection: 'media',
                data: {
                  alt: block.alt || result.title || 'Scraped Inline Image',
                },
                file: {
                  data: buffer,
                  name: filename,
                  mimetype: contentType,
                  size: buffer.length,
                }
              })
              block.mediaId = mediaDoc.id
            } else {
              throw new Error(`Failed to fetch inline image: Status ${imageRes.status}`)
            }
          } catch (imgErr) {
            console.error('Failed to download inline image, trying external fallback:', block.src, imgErr)
            try {
              const mediaDoc = await payload.create({
                collection: 'media',
                data: {
                  alt: block.alt || result.title || 'Scraped Inline Image',
                  source: 'external',
                  externalUrl: block.src
                }
              })
              block.mediaId = mediaDoc.id
            } catch (extErr) {
              console.error('Failed to create external inline image fallback:', extErr)
            }
          }
        }

        if (block.type === 'twitter' && block.url) {
          try {
            const oEmbedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(block.url)}&omit_script=true`
            const embedRes = await fetch(oEmbedUrl)
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
            .filter((b: any) => b.type === 'paragraph')
            .map((b: any) => b.text)
            .slice(0, 10)
            .join('\n\n')

          if (rawParagraphsText.length > 50) {
            const aiPrompt = `Given the news article title "${result.title}" and text content:\n"${rawParagraphsText.substring(0, 2000)}"\n\nSummarize and reformat into a complete news summary adhering strictly to these rules:
1. "excerpt": A punchy, high-engagement lead summary strictly under 160 characters.
2. "content": Summary body of EXACTLY 4 short paragraphs (no H2/H3 subheadings). Total word count MUST be strictly between 120 and 140 words. Each paragraph MUST be at most 35 words long. Do NOT duplicate title.
3. "tags": ["3-5 relevant lowercase tags"]
4. "metaTitle": SEO title strictly 50-60 characters ending with - Trend7News.
5. "metaDescription": SEO meta description strictly 100-150 characters.

Return valid JSON with exact keys: { "excerpt", "content", "tags", "metaTitle", "metaDescription" }`

            const res = await generateText({
              model: primaryModel,
              system: SYSTEM_PROMPT,
              prompt: aiPrompt,
            })

            let cleanJson = res.text.trim()
            if (cleanJson.startsWith('```json')) {
              cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '')
            } else if (cleanJson.startsWith('```')) {
              cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '')
            }

            const aiData = JSON.parse(cleanJson)
            if (aiData.excerpt) result.excerpt = aiData.excerpt
            if (aiData.tags) result.tags = aiData.tags
            if (aiData.metaTitle) result.metaTitle = aiData.metaTitle
            if (aiData.metaDescription) result.metaDescription = aiData.metaDescription

            if (aiData.content && typeof aiData.content === 'string') {
              const aiParagraphs = aiData.content
                .split(/\n\s*\n/)
                .map((p: string) => p.trim())
                .filter(Boolean)

              const mediaBlocks = dedupedBlocks.filter((b: any) => b.type !== 'paragraph' && b.type !== 'heading')
              const summaryBlocks = [
                ...aiParagraphs.map((pText: string) => ({ type: 'paragraph', text: pText, children: [{ type: 'text', text: pText }] })),
                ...mediaBlocks
              ]
              result.content = buildLexicalJson(summaryBlocks)
            }
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

    if (!title && !content) {
      return NextResponse.json({ error: 'Title or content is required for AI generation' }, { status: 400 })
    }

    let prompt = ''
    if (action === 'full') {
      prompt = `Given the article title "${title}"${content ? ` and notes: "${content}"` : ''}, generate a complete summary news article adhering to these rules:
- "excerpt": A punchy, high-engagement lead summary strictly under 160 characters.
- "content": Summary body of EXACTLY 4 short paragraphs (no H2/H3 subheadings). Total word count MUST be between 120 and 140 words. Each paragraph MUST be at most 35 words long.
- "tags": ["3-5 relevant lowercase tags"]
- "metaTitle": SEO title strictly 50-60 characters ending with - Trend7News.
- "metaDescription": SEO meta description strictly 100-150 characters.

Return JSON with exact keys: { "excerpt", "content", "tags", "metaTitle", "metaDescription" }`
    } else if (action === 'content_only') {
      prompt = `Given the article title "${title}"${content ? ` and notes: "${content}"` : ''}, generate the summary article content adhering to these rules:
- "excerpt": A punchy, high-engagement lead summary strictly under 160 characters.
- "content": Summary body of EXACTLY 4 short paragraphs (no H2/H3 subheadings). Total word count MUST be between 120 and 140 words. Each paragraph MUST be at most 35 words long.

Return JSON with exact keys: { "excerpt", "content" }`
    } else if (action === 'seo_only') {
      prompt = `Given the article title "${title}"${content ? ` and excerpt/content: "${content}"` : ''}, generate SEO metadata adhering to these rules:
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

    let cleanJson = rawText.trim()
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    const aiData = JSON.parse(cleanJson)
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
