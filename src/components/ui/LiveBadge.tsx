'use client'

export function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono font-bold text-[10px] uppercase tracking-widest bg-[#d0021b] text-white px-2 py-0.5 rounded-xs">
      <span className="w-1.5 h-1.5 rounded-full bg-white live-dot" />
      LIVE
    </span>
  )
}
