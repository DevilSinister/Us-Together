import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
];

const nextConfig: NextConfig = {
  // The commit being deployed, inlined into client and server bundles so an open tab
  // can tell it has fallen behind /api/version. Vercel sets it on every Git deploy;
  // anywhere else it stays empty and the update prompt stays off.
  env: { NEXT_PUBLIC_APP_VERSION: process.env.VERCEL_GIT_COMMIT_SHA ?? "" },
  allowedDevOrigins: ["127.0.0.1"],
  // A local verification build can write elsewhere (NEXT_BUILD_DIR=.next-build)
  // so it never overwrites the manifests a running `next dev` is serving from.
  // Unset, this is the default, so Vercel and CI are unchanged.
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  poweredByHeader: false,
  serverExternalPackages: ["imagescript"],
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
  reactStrictMode: true,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
