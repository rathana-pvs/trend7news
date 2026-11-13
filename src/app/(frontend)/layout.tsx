import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Public_Sans, Source_Serif_4, IBM_Plex_Mono } from 'next/font/google'
import '@/app/globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { GoogleAnalytics } from '@next/third-parties/google'
import { NavigationProgress } from '@/components/layout/NavigationProgress'

// Self-hosted by next/font: no render-blocking Google Fonts request, preloaded, size-adjusted fallbacks.
const sans = Public_Sans({ subsets: ['latin'], display: 'swap', variable: '--font-sans' })
const serif = Source_Serif_4({ subsets: ['latin'], display: 'swap', variable: '--font-serif' })
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '700'], display: 'swap', variable: '--font-mono', preload: false })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0a',
}

const envUrl = process.env.NEXT_PUBLIC_SITE_URL
const siteUrl = envUrl && !envUrl.includes('placeholder.com') ? envUrl : 'https://trend7news.com'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Trend7News — Real-time Trends & Independent News',
    template: '%s — Trend7News',
  },
  description: 'Trend7News delivers real-time trends, world coverage, political reporting, and in-depth investigations.',
  keywords: ['news', 'trending', 'politics', 'world', 'technology', 'trend7news'],
  openGraph: {
    siteName: 'Trend7News',
    type: 'website',
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
  },
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
  },
}

export default async function FrontendLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body>
        <NavigationProgress />
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
        <Script
          src="https://jsc.adskeeper.com/site/1108243.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
