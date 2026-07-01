import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.1.93", "192.168.56.1", "b8c2-118-99-91-82.ngrok-free.app",],
  // Set turbopack root to prevent workspace detection warning from parent package.json
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
