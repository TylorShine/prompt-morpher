import type { NextConfig } from "next";

const isGithubActions = process.env.GITHUB_ACTIONS || false;

let repo = 'prompt-morpher';
let assetPrefix = '';
let basePath = '';

if (isGithubActions) {
  const repository = process.env.GITHUB_REPOSITORY?.replace(/.*?\//, '') || repo;
  assetPrefix = `/${repository}/`;
  basePath = `/${repository}`;
}

const nextConfig: NextConfig = {
  output: "export",
  basePath: basePath,
  assetPrefix: assetPrefix,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
