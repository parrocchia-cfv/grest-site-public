/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /** Build statica per GitHub Pages (`out/`). */
  output: 'export',
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
