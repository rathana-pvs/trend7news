import type { Metadata } from 'next'
import { dict } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with the Trend7News newsroom and editorial team.',
}

export default function ContactPage() {
  return (
    <div className="max-w-[840px] mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-headline font-black text-4xl mb-6 text-gray-900 uppercase">
        {dict.contactUs}
      </h1>

      <div className="bg-gray-50 border border-gray-300 p-6 rounded mb-8 font-sans">
        <h2 className="font-headline font-bold text-xl mb-4 text-gray-900">
          Newsroom & Press Inquiries
        </h2>
        <p className="text-gray-700 text-sm mb-4">
          For news tips, press releases, or editorial feedback, contact our newsroom team directly.
        </p>
        <div className="font-mono text-xs text-[#d0021b] space-y-1">
          <p>Email: newsroom@trend7news.com</p>
          <p>Press: press@trend7news.com</p>
        </div>
      </div>
    </div>
  )
}
