import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config) {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "next/dist/server/node-environment-extensions/console-dev": require.resolve("./patches/console-dev.js"),
    };
    return config;
  },
};

export default nextConfig;
