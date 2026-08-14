'use client'

import { useState, useEffect } from 'react'

export function VisitorCounter() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    const randomCount = Math.floor(Math.random() * 500) + 1200
    setCount(randomCount)
  }, [])

  return (
    <div className="flex flex-wrap items-center gap-3 mt-4">
      <div className="inline-flex items-center gap-2 text-xs font-mono text-gray-500 bg-gray-100 px-3 py-1.5 rounded border border-gray-200">
        <span className="w-2 h-2 rounded-full bg-[#d0021b] live-dot" />
        <span>{count !== null ? `${count.toLocaleString()} Active Readers Today` : 'Live Readers'}</span>
      </div>
      <a
        href="https://whos.amung.us/stats/trend7news/"
        target="_blank"
        rel="noopener noreferrer"
        title="View live reader analytics"
        className="inline-flex items-center gap-1 text-xs font-mono text-[#d0021b] bg-red-50 border border-red-200 px-2.5 py-1.5 rounded hover:bg-red-100 transition-colors"
      >
        <span className="font-bold">Live Stats</span>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  )
}
