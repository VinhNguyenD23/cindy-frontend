import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/*": ["node_modules/sharp/**/*"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.cloudfront.net",
        pathname: "/fs/**",
      },
    ],
  },
};

export default nextConfig;
