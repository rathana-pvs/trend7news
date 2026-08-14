'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function WhosAmungUsTracker() {
  const pathname = usePathname()

  useEffect(() => {
    const timer = setTimeout(() => {
      const h1Element = document.querySelector('h1')
      let pageTitle = ''

      if (h1Element && h1Element.textContent && h1Element.textContent.trim().length > 3) {
        pageTitle = h1Element.textContent.trim()
        document.title = `${pageTitle} — Trend7News`
      } else {
        let currentTitle = document.title ? document.title.trim() : ''
        const isRawId = /^\d+$/.test(currentTitle) || currentTitle.includes('1786') || currentTitle === 'Untitled Page' || currentTitle === 'Article Not Found'
        if (!currentTitle || isRawId) {
          pageTitle = 'Trend7News — Real-time Trends & Independent News'
          document.title = pageTitle
        } else {
          pageTitle = currentTitle
        }
      }

      const cleanTitle = pageTitle.replace(/— Trend7News$/, '').trim()

      // 1. Direct image ping to whos.amung.us with explicit title parameter
      try {
        const pingImg = new Image()
        pingImg.src = `https://whos.amung.us/ping/?k=trend7news&t=${encodeURIComponent(cleanTitle)}&url=${encodeURIComponent(window.location.href)}&ref=${encodeURIComponent(document.referrer)}&r=${Math.random()}`
      } catch (e) {
        // Ignore
      }

      // 2. Remove old script if exists
      const oldScript = document.getElementById('whos-amung-us-ping-script')
      if (oldScript) {
        oldScript.remove()
      }

      // 3. Inject whos.amung.us pingjs script with title param
      const script = document.createElement('script')
      script.id = 'whos-amung-us-ping-script'
      script.src = `https://whos.amung.us/pingjs/?k=trend7news&title=${encodeURIComponent(cleanTitle)}&t=${Date.now()}`
      script.async = true
      document.body.appendChild(script)
    }, 400)

    return () => clearTimeout(timer)
  }, [pathname])

  return null
}
