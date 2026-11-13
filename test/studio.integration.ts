/** Run only against the disposable test database; never reads the project's .env. */
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { homedir, tmpdir } from 'node:os'
import path from 'node:path'

process.env.DATABASE_URI = 'postgresql://studio_test:studio-test-only@127.0.0.1:55439/studio_test'
process.env.PAYLOAD_SECRET = 'studio-integration-test-secret-never-used-in-production'
process.env.NEXT_PUBLIC_SITE_URL = 'http://127.0.0.1:55440'
;(process.env as any).NODE_ENV = 'test'
process.env.DISABLE_PAYLOAD_HMR = 'true'
process.env.ENABLE_CLOUDINARY = 'false'
const mediaDir = await mkdtemp(path.join(tmpdir(), 'studio-test-media-'))
let payload: any
try {
  const { getPayload } = await import('payload')
  const config = await (await import('../payload.config')).default
  const media: any = config.collections.find(collection => collection.slug === 'media')
  media.upload.staticDir = mediaDir
  config.typescript.autoGenerate = false
  payload = await getPayload({ config })
  const migration = await import('../src/migrations/20261113_website_studio')
  // Validate the migration against actual Payload-created table names.
  await migration.down({ db: payload.db.drizzle } as any)
  await migration.up({ db: payload.db.drizzle } as any)
  await payload.create({ collection: 'users', data: { email: 'studio-test@example.com', password: 'test-password-only', name: 'Studio test', role: 'editor' } })
  const { token } = await payload.login({ collection: 'users', data: { email: 'studio-test@example.com', password: 'test-password-only' } })
  const route = await import('../src/app/api/studio/route')
  const headers = { Authorization: `JWT ${token}` }
  await payload.create({ collection: 'users', data: { email: 'writer-test@example.com', password: 'test-password-only', name: 'Writer test', role: 'writer' } })
  const writerLogin = await payload.login({ collection: 'users', data: { email: 'writer-test@example.com', password: 'test-password-only' } })
  const writerHeaders = { Authorization: `JWT ${writerLogin.token}` }
  assert.equal((await route.GET(new Request('http://127.0.0.1:55440/api/studio', { headers: writerHeaders }))).status, 403)
  assert.equal((await route.POST(new Request('http://127.0.0.1:55440/api/studio', { method: 'POST', headers: writerHeaders, body: '{}' }))).status, 403)
  const sharp = (await import('sharp')).default
  const image = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#888888' } }).jpeg().toBuffer()
  const article = { title: 'Council outlines a park proposal', excerpt: 'Residents discuss the proposed park changes.', content: 'The council outlined a park proposal.\n\nResidents discussed the next steps.', seo_title: 'Park proposal explained', seo_description: 'What the council proposed.', alt: 'Park cover image' }
  const publication = { action: 'publish', requestId: 'a'.repeat(32), article }
  const publish = async (input = publication) => {
    const body = new FormData(); body.set('payload', JSON.stringify(input)); body.set('file', new File([new Uint8Array(image)], 'cover.jpg', { type: 'image/jpeg' }))
    return route.POST(new Request('http://127.0.0.1:55440/api/studio', { method: 'POST', headers, body }))
  }
  const response = await publish()
  assert.equal(response.status, 200, await response.clone().text())
  const saved = await response.json()
  assert.equal(saved.status, 'published')
  assert.equal((await publish()).status, 200)
  const stored = await payload.findByID({ collection: 'articles', id: saved.id })
  assert.equal(stored.og.metaTitle, article.seo_title)
  assert.equal(stored.meta.description, article.seo_description)
  assert.equal((await payload.find({ collection: 'articles' })).totalDocs, 1)
  assert.equal((await payload.find({ collection: 'media' })).totalDocs, 1)
  const link = async (key: string) => route.POST(new Request('http://127.0.0.1:55440/api/studio', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'link', articleId: saved.id, requestId: key.repeat(64), label: 'Test destination' }) }))
  const firstResponse = await link('b')
  assert.equal(firstResponse.status, 200, await firstResponse.clone().text())
  const first = await firstResponse.json(), second = await (await link('c')).json()
  assert.notEqual(first.url, second.url)
  assert.equal((await (await link('b')).json()).url, first.url)
  assert.equal((await payload.find({ collection: 'share-links' })).totalDocs, 2)
  const track = await import('../src/app/api/track/route')
  const { NextRequest } = await import('next/server')
  const key = new URL(first.url).pathname.split('/')[2]
  const recordView = async (id: number) => track.POST(new NextRequest('http://127.0.0.1:55440/api/track', {
    method: 'POST', headers: { 'User-Agent': 'StudioIntegrationTest/1.0', 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, key }),
  }))
  assert.equal((await recordView(Number(saved.id))).status, 204)
  assert.equal((await payload.findByID({ collection: 'articles', id: saved.id })).views, 1)
  assert.equal((await payload.findByID({ collection: 'share-links', id: first.id })).clicks, 1)
  await recordView(2147483647)
  assert.equal((await payload.findByID({ collection: 'share-links', id: first.id })).clicks, 1)
  const check = await route.GET(new Request(`http://127.0.0.1:55440/api/studio?published=${saved.id}`, { headers }))
  assert.equal((await check.json()).published, true)
  const catalog = await route.GET(new Request('http://127.0.0.1:55440/api/studio', { headers }))
  assert.equal((await catalog.json()).articles[0].title, article.title)
  console.log('PASS: actual Payload/PostgreSQL login, migration, image upload, published article, SEO, unique links, replay and catalog')
  // Exercise the exported JSON through the real Python HTTP connector as well.
  const probeImage = path.join(mediaDir, 'probe-cover.jpg')
  await writeFile(probeImage, image)
  const server = createServer(async (incoming, outgoing) => {
    try {
      const chunks: Buffer[] = []
      for await (const chunk of incoming) chunks.push(Buffer.from(chunk))
      const body = Buffer.concat(chunks)
      if (incoming.url === '/api/users/login') {
        const result = await payload.login({ collection: 'users', data: JSON.parse(body.toString()) })
        outgoing.setHeader('Content-Type', 'application/json')
        outgoing.end(JSON.stringify({ token: result.token }))
        return
      }
      const request = new Request(`http://127.0.0.1:55440${incoming.url}`, {
        method: incoming.method, headers: incoming.headers as HeadersInit,
        ...(incoming.method === 'GET' ? {} : { body }),
      })
      const result = incoming.method === 'GET' ? await route.GET(request) : await route.POST(request)
      outgoing.statusCode = result.status
      outgoing.setHeader('Content-Type', 'application/json')
      outgoing.end(await result.text())
    } catch {
      outgoing.statusCode = 500
      outgoing.end('{}')
    }
  })
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(55440, '127.0.0.1', resolve) })
  try {
    const worker = path.resolve(process.env.AUTOMAT_FB_DIR || path.join(homedir(), 'Projects/automat_fb'))
    const result = await promisify(execFile)(path.join(worker, 'automation/venv/bin/python'),
      [path.resolve('test/studio_connector_probe.py'), 'http://127.0.0.1:55440', probeImage],
      { cwd: worker, timeout: 60000 })
    console.log(result.stdout.trim())
  } finally {
    server.closeAllConnections()
    await new Promise<void>(resolve => server.close(() => resolve()))
  }

} finally {
  if (payload) {
    // This adapter pins a monitor client. Release it after all operations finish.
    const pool = payload.db.pool
    for (const client of [...pool._clients]) {
      if (!pool._idle.some((entry: any) => entry.client === client)) client.release(true)
    }
    await pool.end()
    await payload.destroy()
  }
  await rm(mediaDir, { recursive: true, force: true })
}
