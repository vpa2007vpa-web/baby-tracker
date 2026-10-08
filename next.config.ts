import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  logging: {
    // `next dev` prints every Server Action call with its arguments: emails,
    // OTP codes and, later, health records. Keep them out of the terminal.
    serverFunctions: false,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
