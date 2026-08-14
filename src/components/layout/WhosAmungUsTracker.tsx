'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function WhosAmungUsTracker() {
  const pathname = usePathname()

  useEffect(() => {
    const timer = setTimeout(() => {
      const h1Element = document.querySelector('h1')

      if (h1Element && h1Element.textContent && h1Element.textContent.trim().length > 3) {
        const headline = h1Element.textContent.trim()
        document.title = `${headline} — Trend7News`
      } else {
        const currentTitle = document.title ? document.title.trim() : ''
        const isRawId = /^\d+$/.test(currentTitle) || currentTitle.includes('1786') || currentTitle === 'Untitled Page' || currentTitle === 'Article Not Found'
        if (!currentTitle || isRawId) {
          document.title = 'Trend7News — Real-time Trends & Independent News'
        }
      }

      // Remove existing script instance if present
      const oldScript = document.getElementById('whos-amung-us-ping-script')
      if (oldScript) {
        oldScript.remove()
      }

      // Inject official whos.amung.us script after document.title is updated
      const script = document.createElement('script')
      script.id = 'whos-amung-us-ping-script'
      script.src = `https://whos.amung.us/pingjs/?k=trend7news`
      script.async = true
      document.body.appendChild(script)
    }, 300)

    return () => clearTimeout(timer)
  }, [pathname])

  return null
}
