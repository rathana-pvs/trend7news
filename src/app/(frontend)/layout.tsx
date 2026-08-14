import type { Metadata } from 'next'
import Script from 'next/script'
import '@/app/globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { GoogleAnalytics } from '@next/third-parties/google'
import { NavigationProgress } from '@/components/layout/NavigationProgress'

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
    <html lang="en">
      <body>
        <NavigationProgress />
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Header />
          <main style={{ flex: 1 }}>
            {children}
          </main>
          <Footer />
        </div>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
        <Script
          src="https://whos.amung.us/pingjs/?k=trend7news"
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
