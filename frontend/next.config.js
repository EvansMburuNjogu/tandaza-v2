const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  outputFileTracingRoot: path.join(__dirname),
  async headers() {
    return [
      {
        source: '/((?!_next/static|_next/image|favicon.ico|tandaza-logo.svg).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig
