import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@payloadcms/db-postgres'
import { getPayloadClient } from '@/lib/payload'

const BOT_UA = /bot|googlebot|crawler|spider|robot|crawling|facebookexternalhit|preview|headless/i

/**
 * Increments article views / share-link clicks with an atomic SQL update.
 * Goes straight to the database (not payload.update) so it doesn't fire the
 * Articles afterChange hook, which would purge the whole site cache on every view.
 */
export async function POST(req: NextRequest) {
  const ua = req.headers.get('user-agent') || ''
  if (!ua || BOT_UA.test(ua)) return new NextResponse(null, { status: 204 })

  let id: number
  let key: string | undefined
  try {
    const body = await req.json()
    id = Number(body?.id)
    key = typeof body?.key === 'string' ? body.key.slice(0, 32) : undefined
  } catch {
    return new NextResponse(null, { status: 400 })
  }
  if (!Number.isInteger(id) || id <= 0) return new NextResponse(null, { status: 400 })

  try {
    const payload = await getPayloadClient()
    const db = (payload.db as any).drizzle
    await db.execute(sql`UPDATE articles SET views = COALESCE(views, 0) + 1 WHERE id = ${id}`)
    if (key) {
      await db.execute(
        sql`UPDATE share_links SET clicks = COALESCE(clicks, 0) + 1 WHERE key = ${key} AND article_id = ${id}`,
      )
    }
  } catch (e) {
    console.error('track: failed to record view', e)
  }

  return new NextResponse(null, { status: 204 })
}
