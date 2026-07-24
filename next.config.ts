import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel's Image Optimization-backend bestaat niet op Cloudflare; met één
  // klein logo als enige next/image-gebruik in de app is geoptimaliseerd
  // serveren toch geen gemis, dus gewoon op beide platforms uit.
  images: { unoptimized: true },
};

export default nextConfig;
