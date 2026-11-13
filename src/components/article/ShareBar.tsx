'use client'

import { useState } from 'react'

/** Lightweight share row: no SDKs, just share URLs + the native share sheet. */
export function ShareBar({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false)

  const shareUrl = () => (typeof window !== 'undefined' ? window.location.href : url)

  const nativeShare = async () => {
    const link = shareUrl()
    if (navigator.share) {
      try {
        await navigator.share({ title, url: link })
        return
      } catch {
        return // user cancelled
      }
    }
    copy()
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable (some in-app browsers) */
    }
  }

  const encoded = encodeURIComponent(url)
  const btn =
    'h-10 flex-1 sm:flex-none sm:px-4 inline-flex items-center justify-center gap-2 rounded-full text-[13px] font-bold transition-colors'

  return (
    <div className="flex items-center gap-2">
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`${btn} bg-[#1877f2] text-white`}
        aria-label="Share on Facebook"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
        </svg>
        Share
      </a>
      <button type="button" onClick={copy} className={`${btn} bg-gray-100 text-gray-900`}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1 1M14 10a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1-1" />
        </svg>
        {copied ? 'Copied!' : 'Copy link'}
      </button>
      <button
        type="button"
        onClick={nativeShare}
        className={`${btn} !flex-none w-10 sm:!px-0 bg-gray-100 text-gray-900`}
        aria-label="More share options"
      >
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13" />
        </svg>
      </button>
    </div>
  )
}
