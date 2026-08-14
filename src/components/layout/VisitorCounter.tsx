'use client'

import { useEffect, useRef } from 'react'

export function VisitorCounter() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const container = containerRef.current
    if (!container) return

    // Append d.js and pingjs tracker scripts once mounted
    const existingDScript = document.getElementById('_wau_d_script')
    if (!existingDScript) {
      const dScript = document.createElement('script')
      dScript.id = '_wau_d_script'
      dScript.async = true
      dScript.src = 'https://waust.at/d.js'
      document.body.appendChild(dScript)
    }

    const existingPingScript = document.getElementById('_wau_ping_script')
    if (!existingPingScript) {
      const pingScript = document.createElement('script')
      pingScript.id = '_wau_ping_script'
      pingScript.async = true
      pingScript.src = 'https://whos.amung.us/pingjs/?k=ztww1qct06'
      document.body.appendChild(pingScript)
    }
  }, [])

  return (
    <div 
      ref={containerRef} 
      className="mt-4 flex items-center justify-start opacity-80 hover:opacity-100 transition-opacity duration-300 min-h-[30px]"
    >
      <script
        id="_wauyh7"
        dangerouslySetInnerHTML={{
          __html: 'var _wau = _wau || []; _wau.push(["dynamic", "ztww1qct06", "yh7", "c4302bffffff", "small"]);',
        }}
      />
    </div>
  )
}
