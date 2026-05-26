import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // App Router is the default in Next.js 15
  // Strict mode for catching issues early
  reactStrictMode: true,

  // Output standalone for potential Docker deploys
  // output: 'standalone',

  // Turbopack is opt-in for dev (faster HMR)
  // Run with: npm run dev --turbopack
}

export default nextConfig
