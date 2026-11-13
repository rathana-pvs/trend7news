import { createHash } from 'node:crypto'
import { getPayloadClient } from '@/lib/payload'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
const siteURL = () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

function text(value: unknown, max: number, required = false): string {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error('Invalid article field')
  return value.trim()
}
function richText(body: string) {
  return { root: { type: 'root', format: '', indent: 0, version: 1, direction: null,
    children: body.split(/\n\s*\n/).filter(Boolean).map(paragraph => ({
      type: 'paragraph', format: '', indent: 0, version: 1, direction: null,
      children: [{ type: 'text', text: paragraph, format: 0, detail: 0, mode: 'normal', style: '', version: 1 }],
    })) } }
}
function plainText(node: any): string {
  if (!node) return ''
  if (typeof node.text === 'string') return node.text
  return (node.children || []).map(plainText).join(node.type === 'root' ? '\n\n' : '')
}
async function auth(request: Request) {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: request.headers })
  return { payload, user }
}
function articleSummary(doc: any) {
  const id = (value: any) => String(value?.id ?? value ?? '')
  return { id: String(doc.id), title: doc.title, excerpt: doc.excerpt, content: plainText(doc.content?.root),
    cover_id: id(doc.coverImage), cover_file: '', alt: doc.coverImage?.alt || '',
    category: '', author: id(doc.author), tags: (doc.tags || []).map((tag: any) => tag.tag).join(', '),
    credit: doc.credit || '', slug: doc.slug, seo_title: doc.og?.metaTitle || doc.meta?.title || '',
    seo_description: doc.og?.metaDescription || doc.meta?.description || '', status: doc.status }
}

export async function GET(request: Request) {
  const { payload, user } = await auth(request)
  if (!user) return Response.json({ error: 'Login required' }, { status: 401 })
  if (user.role !== 'admin' && user.role !== 'editor') return Response.json({ error: 'Editor or admin access required' }, { status: 403 })
  const articleId = new URL(request.url).searchParams.get('published')
  if (articleId) {
    const result = await payload.find({ collection: 'articles', where: { and: [
      { id: { equals: articleId } }, { status: { equals: 'published' } },
    ] }, limit: 1, depth: 0, overrideAccess: false })
    return Response.json({ published: result.docs.length === 1 })
  }
  const [articles, authors] = await Promise.all([
    payload.find({ collection: 'articles', limit: 100, sort: '-updatedAt', depth: 1, user, overrideAccess: false }),
    payload.find({ collection: 'authors', limit: 100, depth: 0, user, overrideAccess: false }),
  ])
  return Response.json({ adapter: 'payload-news-v1', articles: articles.docs.map(articleSummary),
    categories: [],
    authors: authors.docs.map((doc: any) => ({ id: String(doc.id), name: doc.name })) })
}

export async function POST(request: Request) {
  const { payload, user } = await auth(request)
  if (!user) return Response.json({ error: 'Login required' }, { status: 401 })
  if (user.role !== 'admin' && user.role !== 'editor') return Response.json({ error: 'Editor or admin access required' }, { status: 403 })
  try {
    let input: any, file: File | null = null
    const reader = request.body?.getReader()
    if (!reader) throw new Error('Request body required')
    const chunks: Uint8Array[] = []
    let received = 0
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        received += value.length
        if (received > 22 * 1024 * 1024) { await reader.cancel(); throw new Error('Request too large') }
        chunks.push(value)
      }
    } finally { reader.releaseLock() }
    const body = new Response(Buffer.concat(chunks), { headers: { 'Content-Type': request.headers.get('content-type') || '' } })
    if (request.headers.get('content-type')?.includes('application/json')) input = await body.json()
    else {
      const form = await body.formData()
      input = JSON.parse(String(form.get('payload')))
      const item = form.get('file')
      if (item instanceof File) file = item
    }
    if (!/^[a-f0-9]{32,64}$/.test(input.requestId || '')) throw new Error('Invalid request ID')
    const studioKey = hash(`${user.id}:${input.action}:${input.requestId}`)
    const find = async (collection: string) => (await payload.find({ collection,
      where: { studioKey: { equals: studioKey } }, limit: 1, depth: 0, user, overrideAccess: false })).docs[0]
    const createOnce = async (collection: string, data: any, upload?: any) => {
      const existing = await find(collection)
      if (existing) return existing
      try { return await payload.create({ collection, data: { ...data, studioKey }, file: upload, user, overrideAccess: false }) }
      catch (error) { const concurrent = await find(collection); if (concurrent) return concurrent; throw error }
    }
    if (input.action === 'link') {
      const article = await payload.findByID({ collection: 'articles', id: input.articleId, depth: 0, user, overrideAccess: false })
      if (article.status !== 'published') throw new Error('Article must be published')
      const link = await createOnce('share-links', { article: article.id, label: text(input.label || '', 100) })
      if (String(typeof link.article === 'object' ? link.article.id : link.article) !== String(article.id)) throw new Error('Request ID belongs to a different article')
      return Response.json({ id: String(link.id), url: `${siteURL()}/article/${link.key}/${article.slug}` })
    }
    if (input.action !== 'publish') throw new Error('Unsupported action')
    const a = input.article || {}
    if (a.category) throw new Error('Trend7News does not use categories')
    const title = text(a.title, 300, true), excerpt = text(a.excerpt, 160, true), content = text(a.content, 120000, true)
    if (file && (file.size > 20 * 1024 * 1024 || !/\.(jpe?g|png|webp|avif)$/i.test(file.name))) throw new Error('Choose a cover image up to 20 MB')
    const fileBytes = file ? Buffer.from(await file.arrayBuffer()) : undefined
    const digest = hash(JSON.stringify(a) + (fileBytes ? hash(fileBytes) : ''))
    const receipt = await find('studio-publications')
    if (receipt && receipt.fingerprint !== digest) return Response.json({ error: 'Request ID already used for different content' }, { status: 409 })
    let article = receipt
      ? await payload.findByID({ collection: 'articles', id: receipt.article, depth: 0, user, overrideAccess: false })
      : await find('articles')
    if (!receipt && article && article.studioFingerprint !== digest) return Response.json({ error: 'Request ID already used for different content' }, { status: 409 })
    if (!article) {
      let cover = a.cover_id
      if (file && fileBytes) {
        const mime: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' }
        const media = await createOnce('media', { alt: text(a.alt || title, 300) }, {
          data: fileBytes, name: file.name, size: file.size, mimetype: mime[file.name.split('.').pop()!.toLowerCase()],
        })
        cover = media.id
      }
      if (!cover) throw new Error('Cover image required')
      const seoTitle = text(a.seo_title || title, 300), seoDescription = text(a.seo_description || excerpt, 160)
      const existingArticle = a.id ? await payload.findByID({ collection: 'articles', id: a.id, depth: 0, user, overrideAccess: false }) : null
      const bodyContent = existingArticle && plainText(existingArticle.content?.root) === content ? existingArticle.content : richText(content)
      const data: any = { title, excerpt, content: bodyContent, coverImage: cover, status: 'published',
        credit: text(a.credit || '', 300), tags: text(a.tags || '', 1000).split(',').map(tag => tag.trim()).filter(Boolean).map(tag => ({ tag })),
        og: { metaTitle: seoTitle, metaDescription: seoDescription, ogImage: cover },
        meta: { title: seoTitle, description: seoDescription, image: cover }, studioKey, studioFingerprint: digest }
      if (a.slug) data.slug = text(a.slug, 300)
      if (a.author) data.author = a.author
      if (a.id) {
        // Updates still enforce the CMS collection permissions.
        article = await payload.update({ collection: 'articles', id: a.id, data, depth: 0, user, overrideAccess: false })
      } else {
        data.isBreaking = false
        data.isFeatured = false
        article = await createOnce('articles', data)
      }
    }
    if (!receipt && article.studioFingerprint !== digest) return Response.json({ error: 'Request ID already used for different content' }, { status: 409 })
    if (article.status !== 'published') throw new Error('Article is no longer published; review it before creating another request')
    if (!receipt) await createOnce('studio-publications', { fingerprint: digest, article: article.id, owner: user.id })
    return Response.json({ id: String(article.id), status: article.status, slug: article.slug, url: `${siteURL()}/article/${article.slug}` })
  } catch {
    // Do not expose database internals, uploaded content, or authentication details.
    return Response.json({ error: 'Studio request failed. Check article fields, cover image, permissions, and database migration.' }, { status: 400 })
  }
}
