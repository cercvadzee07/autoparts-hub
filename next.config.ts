import type { NextConfig } from "next";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * Lists photos in public/images at build/dev start, so the site can use
 * public/images/hero.jpg and public/images/categories/<slug>.jpg when present
 * (see src/lib/site-images.ts). Restart `npm run dev` after adding photos.
 */
function listSiteImages(dir = join(process.cwd(), "public", "images"), prefix = "/images"): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? listSiteImages(join(dir, entry.name), `${prefix}/${entry.name}`)
      : /\.(jpe?g|png|webp|avif)$/i.test(entry.name)
        ? [`${prefix}/${entry.name}`]
        : [],
  );
}

const nextConfig: NextConfig = {
  env: { SITE_IMAGES: JSON.stringify(listSiteImages()) },
  // Cache Components is intentionally off: almost every page depends on
  // request data (locale, auth session, live inventory). See README → "Caching".
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: supabaseUrl
      ? [new URL(`${new URL(supabaseUrl).origin}/storage/v1/object/public/**`)]
      : [],
  },
  experimental: {
    serverActions: {
      // Product photos are resized in the browser before upload, but leave room
      // for several images per request.
      bodySizeLimit: "25mb",
    },
    proxyClientMaxBodySize: "25mb",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
