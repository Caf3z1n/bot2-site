import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  allowedDevOrigins: ['local-origin.dev', '*.local-origin.dev', '26.114.170.202'],
};

export default nextConfig;
