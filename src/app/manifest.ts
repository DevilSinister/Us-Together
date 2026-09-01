import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Us Together",
    short_name: "Us Together",
    description: "A private space to remember, plan, and grow together.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf7f3",
    theme_color: "#6f1730",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }],
  };
}
