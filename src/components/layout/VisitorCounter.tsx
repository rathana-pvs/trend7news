'use client'

import { useEffect, useRef } from 'react'

export function VisitorCounter() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (containerRef.current) {
      containerRef.current.innerHTML = ''
    }

    // 1. Create whos.amung.us configuration script
    const configScript = document.createElement('script')
    configScript.id = '_wauyh7'
    configScript.innerHTML = 'var _wau = _wau || []; _wau.push(["dynamic", "ztww1qct06", "yh7", "c4302bffffff", "small"]);'

    // 2. Create whos.amung.us execution script (with explicit https protocol)
    const execScript = document.createElement('script')
    execScript.async = true
    execScript.src = 'https://waust.at/d.js'

    // 3. Create whos.amung.us ping tracker script
    const pingScript = document.createElement('script')
    pingScript.async = true
    pingScript.src = 'https://whos.amung.us/pingjs/?k=ztww1qct06'

    if (containerRef.current) {
      containerRef.current.appendChild(configScript)
      containerRef.current.appendChild(execScript)
      containerRef.current.appendChild(pingScript)
    }
  }, [])

  return (
    <div 
      ref={containerRef} 
      className="mt-4 flex items-center justify-start opacity-80 hover:opacity-100 transition-opacity duration-300"
      style={{ minHeight: '30px' }}
    />
  )
}
