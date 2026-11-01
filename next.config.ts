import type { NextConfig } from "next";
import fs from "node:fs";

const hasCustomDomain = fs.existsSync("public/CNAME");
const repositoryName = process.env.GITHUB_REPOSITORY?.split("/").pop();
const basePath =
  process.env.NEXT_PUBLIC_BASE_PATH ??
  (process.env.GITHUB_ACTIONS && !hasCustomDomain && repositoryName
    ? `/${repositoryName}`
    : "");

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
