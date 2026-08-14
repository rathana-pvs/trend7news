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
        title="whos.amung.us live stats"
        className="inline-flex items-center hover:opacity-80 transition-opacity"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://whos.amung.us/swidget/trend7news.png"
          alt="whos.amung.us live counter"
          width="80"
          height="15"
          className="border-0"
        />
      </a>
    </div>
  )
}
