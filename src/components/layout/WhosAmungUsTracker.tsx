'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function WhosAmungUsTracker() {
  const pathname = usePathname()

  useEffect(() => {
    const timer = setTimeout(() => {
      let currentTitle = document.title ? document.title.trim() : ''

      // If document.title is empty, numeric, or fallback string, extract real title from H1 tag
      const isNumericOrId = /^\d+$/.test(currentTitle) || currentTitle.startsWith('1786')
      if (!currentTitle || currentTitle === 'Untitled Page' || currentTitle === 'Article Not Found' || isNumericOrId) {
        const h1Element = document.querySelector('h1')
        if (h1Element && h1Element.textContent && h1Element.textContent.trim().length > 3) {
          currentTitle = `${h1Element.textContent.trim()} — Trend7News`
        } else {
          currentTitle = 'Trend7News — Real-time Trends & Independent News'
        }
        document.title = currentTitle
      }

      // Remove previous script instance if exists
      const oldScript = document.getElementById('whos-amung-us-ping-script')
      if (oldScript) {
        oldScript.remove()
      }

      // Dynamically load whos.amung.us ping script so it captures the actual article title
      const script = document.createElement('script')
      script.id = 'whos-amung-us-ping-script'
      script.src = `https://whos.amung.us/pingjs/?k=trend7news&t=${Date.now()}`
      script.async = true
      document.body.appendChild(script)
    }, 400)

    return () => clearTimeout(timer)
  }, [pathname])

  return null
}
