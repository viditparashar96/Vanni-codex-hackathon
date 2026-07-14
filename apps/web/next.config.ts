import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Monorepo root (pnpm workspace) — stops Next inferring it from lockfiles.
    root: path.join(__dirname, "..", ".."),
  },
};

export default nextConfig;
