'use client'

import { useEffect } from 'react'

/**
 * Records a page view (and a share-link click when `shareKey` is set) after the
 * page has loaded, so tracking never delays rendering and pages can be cached.
 */
export function ViewTracker({ articleId, shareKey }: { articleId: string | number; shareKey?: string }) {
  useEffect(() => {
    const body = JSON.stringify({ id: articleId, key: shareKey })
    try {
      if (navigator.sendBeacon?.('/api/track', new Blob([body], { type: 'text/plain' }))) return
    } catch {
      /* fall through */
    }
    fetch('/api/track', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {})
  }, [articleId, shareKey])

  return null
}
