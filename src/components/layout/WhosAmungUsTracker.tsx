'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function WhosAmungUsTracker() {
  const pathname = usePathname()

  useEffect(() => {
    // Wait for Next.js to update document.title during client hydration / routing
    const timer = setTimeout(() => {
      let currentTitle = document.title ? document.title.trim() : ''

      // Fallback if title is empty or defaulted to 'Untitled Page'
      if (!currentTitle || currentTitle === 'Untitled Page') {
        currentTitle = 'Trend7News — Real-time Trends & Independent News'
        document.title = currentTitle
      }

      // Remove previous script instance if exists
      const oldScript = document.getElementById('whos-amung-us-ping-script')
      if (oldScript) {
        oldScript.remove()
      }

      // Dynamically load whos.amung.us ping script so it captures current document.title
      const script = document.createElement('script')
      script.id = 'whos-amung-us-ping-script'
      script.src = `https://whos.amung.us/pingjs/?k=trend7news&t=${Date.now()}`
      script.async = true
      document.body.appendChild(script)
    }, 500)

    return () => clearTimeout(timer)
  }, [pathname])

  return null
}
