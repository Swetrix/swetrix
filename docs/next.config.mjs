import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  basePath: "/docs",
  skipTrailingSlashRedirect: true,
  reactStrictMode: true,
  turbopack: {
    root: import.meta.dirname,
  },
};

export default withMDX(config);
