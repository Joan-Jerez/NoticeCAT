import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // las ilustraciones de prueba son SVG propios; se sirven sin scripts
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
