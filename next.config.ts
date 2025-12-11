import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*', // Apply to all routes
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin', // Ensures that your document and its workers can interact
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp', // Required for SharedArrayBuffer to function correctly
          },
        ],
      },
    ]
  },
};

export default nextConfig;
