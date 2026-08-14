'use client'

import { useState, useEffect } from 'react'

export function VisitorCounter() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    const randomCount = Math.floor(Math.random() * 500) + 1200
    setCount(randomCount)
  }, [])

  if (count === null) return null

  return (
    <div className="inline-flex items-center gap-2 mt-4 text-xs font-mono text-gray-500 bg-gray-100 px-3 py-1.5 rounded border border-gray-200">
      <span className="w-2 h-2 rounded-full bg-[#d0021b] live-dot" />
      <span>{count.toLocaleString()} Active Readers Today</span>
    </div>
  )
}
