/**
 * Static export only. No server, no runtime network.
 * basePath must match the repository name for GitHub Pages (PRD §12).
 * Set BASE_PATH in CI if the repository is renamed.
 */
const basePath = process.env.BASE_PATH ?? (process.env.NODE_ENV === 'production' ? '/tide-analysis' : '')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
}

module.exports = nextConfig
