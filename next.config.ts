import type { NextConfig } from "next";

const isVercel = process.env.VERCEL === "1" || process.env.DREAMLIST_DEPLOY_TARGET === "vercel";

const nextConfig: NextConfig = isVercel ? {
  distDir: ".next-vercel",
  serverExternalPackages: ["@libsql/client"],
  // Next's path resolver runs before webpack aliases. Select both server
  // bindings through this config; Vite/Sites retains the default tsconfig.
  typescript: { tsconfigPath: "tsconfig.vercel.json" },
  env: {
    DREAMLIST_BUILD_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.DREAMLIST_BUILD_SHA ?? "workspace",
    NEXT_PUBLIC_DREAMLIST_MODE: process.env.DREAMLIST_MODE === "cloud" ? "cloud" : "browser",
  },
} : {};

export default nextConfig;
