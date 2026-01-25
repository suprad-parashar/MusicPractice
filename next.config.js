/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Set basePath to match your GitHub repository name
  // If your repo is 'username.github.io', remove or comment out basePath
  basePath: '/MusicPractice',
  trailingSlash: true,
}

module.exports = nextConfig
