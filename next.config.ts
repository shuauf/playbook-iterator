import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "libsql"],
  outputFileTracingIncludes: {
    "/*": ["node_modules/@libsql/**/*", "node_modules/libsql/**/*"],
  },
  allowedDevOrigins: ["127.0.0.1"],
}

export default nextConfig
