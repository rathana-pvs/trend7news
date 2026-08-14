'use client'

import React, { useEffect, useState } from 'react'

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

interface AdsKeeperProps {
  slot: AdsKeeperSlot
  widgetId?: string
  className?: string
}

export const AdsKeeper: React.FC<AdsKeeperProps> = ({
  slot,
  widgetId,
  className = '',
}) => {
  const activeWidgetId = widgetId || DEFAULT_WIDGET_IDS[slot]
  const [isLocal, setIsLocal] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      const isDev = process.env.NODE_ENV === 'development' || hostname === 'localhost' || hostname === '127.0.0.1'
      setIsLocal(isDev)

      try {
        const w = window as any
        w._mgq = w._mgq || []
        w._mgq.push(['_mgc.load'])
      } catch (err) {
        console.error('AdsKeeper load error:', err)
      }
    }
  }, [slot, activeWidgetId])

  const isSidebar = slot === 'sidebar_left' || slot === 'sidebar_right'

  return (
    <div 
      className={`adskeeper-ad-unit my-6 w-full flex flex-col items-center justify-center overflow-hidden ${className}`}
      data-slot={slot}
    >
      {/* Real AdsKeeper Container */}
      <div 
        data-type="_mgwidget" 
        data-widget-id={activeWidgetId} 
        className="w-full"
      />

      {/* Local Mockup Display (renders when on localhost / dev mode) */}
      {isLocal && (
        <div 
          className={`w-full border-2 border-dashed border-red-300 bg-red-50/60 rounded-lg p-4 flex flex-col items-center justify-center text-center transition-all ${
            isSidebar ? 'min-h-[300px]' : 'min-h-[140px]'
          }`}
        >
          <span className="font-mono text-[10px] font-bold tracking-widest text-red-600 uppercase mb-1">
            ADVERTISEMENT • ADSKEEPER (LOCAL MOCKUP)
          </span>
          <div className="flex items-center gap-2 my-1">
            <span className="font-mono text-xs font-bold bg-red-600 text-white px-2 py-0.5 rounded">
              {slot}
            </span>
            <span className="font-mono text-xs text-gray-700 bg-white border border-gray-300 px-2 py-0.5 rounded">
              Widget ID: {activeWidgetId}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-xs italic">
            This placeholder shows ad positioning during local development. Live ads load automatically on trend7news.com.
          </p>
        </div>
      )}
    </div>
  )
}
