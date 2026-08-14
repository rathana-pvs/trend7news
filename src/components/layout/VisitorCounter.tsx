'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function VisitorCounter() {
  const pathname = usePathname()

  useEffect(() => {
    const timer = setTimeout(() => {
      // 1. Set document.title from <h1> headline if present
      const h1Element = document.querySelector('h1')
      if (h1Element && h1Element.textContent && h1Element.textContent.trim().length > 3) {
        document.title = `${h1Element.textContent.trim()} — Trend7News`
      }

      // 2. Remove old ping script
      const oldPing = document.getElementById('_wau_ping_script')
      if (oldPing) {
        oldPing.remove()
      }

      // 3. Inject whos.amung.us ping script after title is ready
      const pingScript = document.createElement('script')
      pingScript.id = '_wau_ping_script'
      pingScript.async = true
      pingScript.src = `https://whos.amung.us/pingjs/?k=ztww1qct06&t=${Date.now()}`
      document.body.appendChild(pingScript)
    }, 200)

    return () => clearTimeout(timer)
  }, [pathname])

  return (
    <div className="mt-4 flex items-center justify-start opacity-80 hover:opacity-100 transition-opacity duration-300 min-h-[30px]">
      <script
        id="_wauyh7"
        dangerouslySetInnerHTML={{
          __html: 'var _wau = _wau || []; _wau.push(["dynamic", "ztww1qct06", "yh7", "c4302bffffff", "small"]);',
        }}
      />
      <script async src="https://waust.at/d.js" />
    </div>
  )
}
