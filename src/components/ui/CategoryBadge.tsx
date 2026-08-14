'use client'

interface CategoryBadgeProps {
  name: string
  size?: 'sm' | 'md'
  className?: string
}

export function CategoryBadge({ name, size = 'sm', className }: CategoryBadgeProps) {
  return (
    <span
      className={`inline-block font-mono font-bold uppercase tracking-widest bg-[#d0021b] text-white px-2 py-0.5 rounded-xs ${
        size === 'sm' ? 'text-[10px]' : 'text-xs'
      } ${className || ''}`}
    >
      {name}
    </span>
  )
}
