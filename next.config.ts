import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.1.93"],
  // Set turbopack root to prevent workspace detection warning from parent package.json
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
