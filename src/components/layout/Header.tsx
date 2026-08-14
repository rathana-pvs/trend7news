'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { dict } from '@/lib/i18n'

const TOPICS = [
  { name: 'Home', href: '/' },
  { name: 'Top 7 Trends', href: '/#trending-7' },
  { name: 'Elections 2026', href: '/search?q=elections' },
  { name: 'World', href: '/search?q=world' },
  { name: 'Politics', href: '/search?q=politics' },
  { name: 'Tech & AI', href: '/search?q=technology' },
  { name: 'Business', href: '/search?q=business' },
  { name: 'Science', href: '/search?q=science' },
  { name: 'Live Coverage', href: '/search?q=live' },
  { name: 'About Us', href: '/about' },
]

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <>
      {/* Top Black Header (AP News Style) */}
      <header className="w-full bg-[#0a0a0a] text-white z-50">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 flex items-center justify-between h-16 border-b border-white/10">
          
          {/* Left: Date String */}
          <div className="w-1/3 flex items-center">
            <span className="hidden md:inline-block text-[11px] font-mono text-gray-400 uppercase tracking-wider">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
            <button
              className="w-9 h-9 flex items-center justify-center rounded transition-colors hover:bg-white/10 md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Center: AP-Style Brand Logo */}
          <div className="flex-1 flex justify-center">
            <Link href="/" className="flex items-center gap-1 group">
              <span className="font-headline font-black text-2xl sm:text-3xl tracking-tighter text-white">
                TREND<span className="text-[#d0021b]">7</span>NEWS
              </span>
            </Link>
          </div>

          {/* Right: Search & Actions */}
          <div className="w-1/3 flex items-center justify-end gap-3">
            <Link
              href="/search"
              className="w-9 h-9 rounded flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
              aria-label={dict.search}
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Sub-Header Topic Navigation Bar (Hidden on article/news pages) */}
        {!pathname.startsWith('/article/') && (
          <div className="bg-[#121212] border-b border-white/10">
            <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
              <nav className="flex items-center gap-6 overflow-x-auto py-2.5 text-xs font-mono tracking-wider uppercase scrollbar-none whitespace-nowrap">
                {TOPICS.map((topic) => (
                  <Link
                    key={topic.name}
                    href={topic.href}
                    className={`transition-colors py-1 hover:text-[#d0021b] ${
                      isActive(topic.href) ? 'text-[#d0021b] font-bold border-b-2 border-[#d0021b]' : 'text-gray-300'
                    }`}
                  >
                    {topic.name}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Nav Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute top-0 right-0 bottom-0 w-80 bg-[#121212] text-white border-l border-white/10 flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <Link href="/" className="font-headline font-black text-xl tracking-tighter text-white">
                TREND<span className="text-[#d0021b]">7</span>NEWS
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded hover:bg-white/10 text-gray-400"
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
              {TOPICS.map((topic) => (
                <Link
                  key={topic.name}
                  href={topic.href}
                  className="px-4 py-3 rounded text-sm font-mono uppercase tracking-wider text-gray-300 hover:bg-white/10 hover:text-white"
                >
                  {topic.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
