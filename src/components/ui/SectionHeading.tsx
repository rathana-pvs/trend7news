import Link from 'next/link'

/** Red-bar section title used across the homepage and article page. */
export function SectionHeading({
  id,
  children,
  href,
  linkLabel = 'See all',
  className = '',
}: {
  id?: string
  children: React.ReactNode
  href?: string
  linkLabel?: string
  className?: string
}) {
  return (
    <div className={`flex items-center justify-between gap-3 mb-3 ${className}`}>
      <h2 id={id} className="flex items-center gap-2 font-headline text-lg sm:text-xl text-gray-900">
        <span className="w-1 h-5 bg-[#d0021b] rounded-full" aria-hidden />
        {children}
      </h2>
      {href && (
        <Link href={href} className="text-[13px] font-semibold text-[#d0021b] hover:underline shrink-0">
          {linkLabel} →
        </Link>
      )}
    </div>
  )
}
