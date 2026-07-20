import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @resvg/resvg-js laadt een native binary (.node) om SVG's server-side naar
  // PNG te rasterizen voor de PDF-export — Turbopack kan dat niet in een
  // ESM-chunk bundelen, dus dit pakket moet ongebundeld vanuit node_modules
  // blijven draaien.
  serverExternalPackages: ["@resvg/resvg-js"],
};

export default nextConfig;
