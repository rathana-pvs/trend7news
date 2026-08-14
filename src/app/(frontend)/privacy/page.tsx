import type { Metadata } from 'next'
import { dict } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Trend7News Privacy Policy and Data Practices.',
}

export default function PrivacyPage() {
  return (
    <div className="max-w-[840px] mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-headline font-black text-4xl mb-6 text-gray-900 uppercase">
        {dict.privacyPolicy}
      </h1>

      <div className="article-body prose max-w-none">
        <h2>{dict.dataCollection}</h2>
        <p>{dict.privacyText}</p>
        <p>
          We respect user privacy and adhere to modern data protection laws. We do not sell user personal data to third parties.
        </p>
      </div>
    </div>
  )
}
