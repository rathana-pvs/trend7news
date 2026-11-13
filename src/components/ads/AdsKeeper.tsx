'use client'

import React, { useEffect, useRef, useState } from 'react'

export type AdsKeeperSlot =
  | 'in_article_1'
  | 'in_article_2'
  | 'feed_bottom'
  | 'sidebar_left'
  | 'sidebar_right'

const DEFAULT_WIDGET_IDS: Record<AdsKeeperSlot, string> = {
  in_article_1: '2068595',
  in_article_2: '2068596',
  feed_bottom: '2068594',
  sidebar_left: '2068597',
  sidebar_right: '2068598',
}

/** Space reserved before the widget fills, so text doesn't jump (CLS). */
const RESERVED_HEIGHT: Record<AdsKeeperSlot, number> = {
  in_article_1: 280,
  in_article_2: 280,
  feed_bottom: 420,
  sidebar_left: 600,
  sidebar_right: 600,
}

const SITE_SCRIPT = 'https://jsc.adskeeper.com/site/1108243.js'

/** Inject the AdsKeeper site script once, the first time any slot nears the viewport. */
function ensureScript() {
  if (document.getElementById('adskeeper-site-js')) return
  const s = document.createElement('script')
  s.id = 'adskeeper-site-js'
  s.src = SITE_SCRIPT
  s.async = true
  document.head.appendChild(s)
}

function requestFill() {
  const w = window as any
  w._mgq = w._mgq || []
  w._mgq.push(['_mgc.load'])
}

interface AdsKeeperProps {
  slot: AdsKeeperSlot
  widgetId?: string
  className?: string
}

export const AdsKeeper: React.FC<AdsKeeperProps> = ({ slot, widgetId, className = '' }) => {
  const activeWidgetId = widgetId || DEFAULT_WIDGET_IDS[slot]
  const wrapperRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [isLocal, setIsLocal] = useState(false)

  // Activate when the slot is within ~1 screen of the viewport
  useEffect(() => {
    const host = window.location.hostname
    setIsLocal(process.env.NODE_ENV === 'development' || host === 'localhost' || host === '127.0.0.1')

    const el = wrapperRef.current
    if (!el) return
    if (!('IntersectionObserver' in window)) {
      setActive(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setActive(true)
          io.disconnect()
        }
      },
      { rootMargin: '800px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Load the network script + fill once active; collapse the reserved space if nothing renders
  useEffect(() => {
    if (!active || isLocal) return
    try {
      ensureScript()
      requestFill()
    } catch (err) {
      console.error('AdsKeeper load error:', err)
    }
    const t = setTimeout(() => {
      const h = widgetRef.current?.offsetHeight || 0
      if (h < 20) setCollapsed(true)
    }, 8000)
    return () => clearTimeout(t)
  }, [active, isLocal])

  const isSidebar = slot === 'sidebar_left' || slot === 'sidebar_right'
  const minHeight = collapsed ? 0 : RESERVED_HEIGHT[slot]

  return (
    <aside
      ref={wrapperRef}
      aria-label="Advertisement"
      data-slot={slot}
      className={`adskeeper-ad-unit not-prose w-full font-sans ${collapsed ? 'my-0' : 'my-7'} ${className}`}
    >
      {!collapsed && (
        <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400 text-center mb-1.5">Advertisement</p>
      )}
      <div style={{ minHeight }} className="w-full flex flex-col items-center justify-center">
        {active && !isLocal && (
          <div ref={widgetRef} data-type="_mgwidget" data-widget-id={activeWidgetId} className="w-full" />
        )}

        {/* Local mockup so positions are visible during development */}
        {isLocal && (
          <div
            className="w-full h-full flex flex-col items-center justify-center text-center rounded-lg border-2 border-dashed border-red-300 bg-red-50/60 p-3"
            style={{ minHeight }}
          >
            <span className="text-[11px] font-bold text-red-600">
              {slot} · widget {activeWidgetId}
            </span>
            <span className="text-[11px] text-gray-500 mt-1">
              {isSidebar ? 'Sticky sidebar' : 'In-content'} · reserved {RESERVED_HEIGHT[slot]}px ·{' '}
              {active ? 'loaded (near viewport)' : 'waiting (lazy)'}
            </span>
          </div>
        )}
      </div>
    </aside>
  )
}
