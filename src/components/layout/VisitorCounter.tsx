'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export function VisitorCounter() {
  const pathname = usePathname()
  const isFirstRender = useRef(true)

  // 1. Mount whos.amung.us dynamic widget on initial load
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any
    win._wau = win._wau || []

    if (!document.getElementById('_wau_widget_script')) {
      win._wau.push(['dynamic', 'ztww1qct06', 'yh7', 'c4302bffffff', 'small'])

      const script = document.createElement('script')
      script.id = '_wau_widget_script'
      script.src = 'https://waust.at/d.js'
      script.async = true
      document.head.appendChild(script)
    }
  }, [])

  // 2. Send ping on SPA route transitions
  useEffect(() => {
    // Skip initial mount because d.js already pings on initial page load
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    const timer = setTimeout(() => {
      // Set document.title from <h1> headline if present
      const h1Element = document.querySelector('h1')
      if (h1Element && h1Element.textContent && h1Element.textContent.trim().length > 3) {
        document.title = `${h1Element.textContent.trim()} — Trend7News`
      }

      // Remove old ping script if existing
      const oldPing = document.getElementById('_wau_ping_script')
      if (oldPing) {
        oldPing.remove()
      }

      // Inject whos.amung.us ping script with title parameter for live dashboard
      const pingScript = document.createElement('script')
      pingScript.id = '_wau_ping_script'
      pingScript.async = true
      const pageTitle = encodeURIComponent(document.title.substring(0, 80).replace(/(\?=)|(\/)/g, ''))
      const pageUrl = encodeURIComponent(window.location.href)
      const pageReferrer = encodeURIComponent(document.referrer)
      pingScript.src = `https://whos.amung.us/pingjs/?k=ztww1qct06&t=${pageTitle}&c=d&x=${pageUrl}&y=${pageReferrer}&r=${Math.ceil(Math.random() * 9999)}`
      document.body.appendChild(pingScript)
    }, 300)

    return () => clearTimeout(timer)
  }, [pathname])

  return (
    <div className="mt-4 flex items-center justify-start opacity-80 hover:opacity-100 transition-opacity duration-300 min-h-[30px]">
      <span id="_wauyh7" />
    </div>
  )
}

