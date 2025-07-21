import type { NextConfig } from "next";
const { i18n } = require('./next-i18next.config');

const withPWA = require('next-pwa')({
  dest: 'public'
});


const nextConfig: NextConfig = withPWA({
  /* config options here */
  reactStrictMode: true,
  devIndicators: false,
  i18n,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
});

export default nextConfig;
