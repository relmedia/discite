/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  // Transpile workspace packages
  transpilePackages: ["@repo/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.amazonaws.com", // Allow all AWS S3 domains
      },
      {
        protocol: "https",
        hostname: "s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "**", // Allow any external image (for course thumbnails)
      },
    ],
  },
  // Add empty turbopack config to silence the warning
  turbopack: {},
  webpack: (config, { isServer }) => {
    // Don't try to bundle canvas-confetti on the server
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push("canvas-confetti");
    }
    return config;
  },
}

export default nextConfig
