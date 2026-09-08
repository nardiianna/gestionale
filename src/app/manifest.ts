import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gestionale",
    short_name: "Gestionale",
    description: "Gestionale appuntamenti — Nardi Creates",
    start_url: "/",
    display: "standalone",
    background_color: "#fdfdfc",
    theme_color: "#e2778b",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
