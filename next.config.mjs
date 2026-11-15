import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // `next start` only serves files that were in public/ at build time, so media
  // uploaded afterwards (e.g. Studio covers) 404 at /media/*. Static files still
  // win; anything missing falls back to Payload's file handler, which reads
  // public/media from disk at request time.
  async rewrites() {
    return {
      afterFiles: [{ source: '/media/:path*', destination: '/api/media/file/:path*' }],
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '3000',
      },
    ],
  },
}

export default withPayload(nextConfig)
