/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produce a self-contained server bundle (.next/standalone) for cheap VPS deploys.
  output: "standalone",
};

export default nextConfig;
