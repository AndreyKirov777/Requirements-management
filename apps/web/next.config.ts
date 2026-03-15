import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@repo/contracts",
    "@repo/db",
    "@repo/domain",
    "@repo/observability",
    "@repo/ui"
  ]
};

export default nextConfig;
