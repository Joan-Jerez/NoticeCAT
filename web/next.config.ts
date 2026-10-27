import type { NextConfig } from "next";

// fotos subidas al bucket público "media" de Supabase
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;

const nextConfig: NextConfig = {
  // fotos y logos subidos desde los formularios: el bucket admite hasta 5 MB
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  images: {
    // las ilustraciones de prueba son SVG propios; se sirven sin scripts
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: supabaseHost
      ? [{ protocol: supabaseHost.protocol.replace(":", "") as "http" | "https", hostname: supabaseHost.hostname, port: supabaseHost.port, pathname: "/storage/v1/object/public/media/**" }]
      : [],
  },
};

export default nextConfig;
