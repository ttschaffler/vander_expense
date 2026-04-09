/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/vander_expense',
  assetPrefix: '/vander_expense/',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
