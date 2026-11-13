'use client'

import { useEffect, useRef } from 'react'

/** Scroll progress bar. Updates via transform in rAF, no React re-renders. */
export function ReadingBar() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const total = document.documentElement.scrollHeight - window.innerHeight
      const progress = total > 0 ? Math.min(1, window.scrollY / total) : 0
      if (ref.current) ref.current.style.transform = `scaleX(${progress})`
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden
      className="fixed top-0 left-0 right-0 h-[3px] bg-[#d0021b] z-[9999] origin-left pointer-events-none"
      style={{ transform: 'scaleX(0)' }}
    />
  )
}
