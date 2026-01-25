/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // IMPORTANT: If your repository name is NOT 'username.github.io', 
  // uncomment the lines below and replace 'CarnaticPractice' with your actual repository name:
  // basePath: '/CarnaticPractice',
  // trailingSlash: true,
}

module.exports = nextConfig
