import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  basePath: "/docs",
  skipTrailingSlashRedirect: true,
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/api/stats-v2", destination: "/statistics-api-v2", permanent: true },
      { source: "/sitesettings/bot-protection", destination: "/bot-protection", permanent: true },
      { source: "/api/events", destination: "/events-api", permanent: true },
      { source: "/selfhosted", destination: "/selfhosting/how-to", permanent: true },
      { source: "/sdk-introduction", destination: "/integrations", permanent: true },
      {
        source: "/affiliate/terms",
        destination: "https://swetrix.com/blog/affiliate-program#important-information",
        permanent: true,
      },
    ];
  },
  turbopack: {
    root: import.meta.dirname,
  },
  async rewrites() {
    return [
      {
        source: "/:path*.mdx",
        destination: "/llms.mdx/:path*",
      },
    ];
  },
};

export default withMDX(config);
