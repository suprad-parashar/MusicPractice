/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Set basePath for GitHub Pages; use '' in dev so localhost:3000 works
  basePath: process.env.NODE_ENV === 'production' ? '/MusicPractice' : '',
  trailingSlash: true,
}

module.exports = nextConfig
