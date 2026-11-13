import Link from 'next/link'
import { dict } from '@/lib/i18n'
import { VisitorCounter } from './VisitorCounter'

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 text-[#111111] mt-10">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Brand Info */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="inline-block mb-3">
              <span className="font-headline font-black text-2xl tracking-tighter text-[#111111]">
                TREND<span className="text-[#d0021b]">7</span>NEWS
              </span>
            </Link>
            <p className="text-sm text-gray-700 leading-relaxed max-w-md">
              {dict.footerTagline}
            </p>
            <VisitorCounter />
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">
              {dict.organization || 'Organization'}
            </h3>
            <div className="flex flex-col gap-2.5 text-[15px]">
              <Link href="/about" className="hover:text-[#d0021b] transition-colors text-gray-800">
                {dict.aboutUs}
              </Link>
              <Link href="/contact" className="hover:text-[#d0021b] transition-colors text-gray-800">
                {dict.contactUs}
              </Link>
              <Link href="/privacy" className="hover:text-[#d0021b] transition-colors text-gray-800">
                {dict.privacyPolicy}
              </Link>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-6 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 text-[13px] text-gray-500">
          <div>
            © {new Date().getFullYear()} TREND7NEWS — {dict.copyright}
          </div>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-[#d0021b] transition-colors">
              Privacy
            </Link>
            <Link href="/contact" className="hover:text-[#d0021b] transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
