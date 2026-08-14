import type { Metadata } from 'next'
import { dict } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn more about Trend7News, our mission, and our editorial standards.',
}

export default function AboutPage() {
  return (
    <div className="max-w-[840px] mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-headline font-black text-4xl mb-6 text-gray-900 uppercase">
        ABOUT TREND7NEWS
      </h1>

      <div className="article-body prose max-w-none">
        <p className="text-xl font-semibold text-gray-800 font-serif-body leading-relaxed mb-6">
          Trend7News is an independent global news and trend analysis platform dedicated to delivering real-time reporting, unvarnished facts, and deep analysis across global politics, technology, business, and culture.
        </p>

        <h2>{dict.ourMission}</h2>
        <p>{dict.missionText}</p>

        <h2>{dict.editorialStandards}</h2>
        <p>
          We adhere to strict journalism standards: accuracy, speed, independence, and objectivity. Our global correspondents and automated intelligence workflows ensure readers receive accurate information when events unfold.
        </p>
      </div>
    </div>
  )
}
