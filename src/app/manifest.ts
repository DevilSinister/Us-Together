import type { MetadataRoute } from "next";

/**
 * Installability depends on details that are easy to get subtly wrong:
 *
 *   * Chrome ignores an icon set that offers only `maskable`, so the same art is
 *     declared twice with distinct purposes rather than one combined entry.
 *   * `start_url` opens the shared space, not the marketing page, because an
 *     installed icon is a returning signed-in user by definition.
 *   * `id` keeps the installed identity stable if `start_url` ever moves.
 *
 * iOS reads none of this for the Home Screen icon; see the apple-touch-icon and
 * appleWebApp metadata in the root layout.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/?source=pwa",
    name: "Us Together",
    short_name: "Us Together",
    description: "A private space to remember, plan, and grow together.",
    start_url: "/home?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbf7f3",
    theme_color: "#6f1730",
    categories: ["lifestyle", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    shortcuts: [
      { name: "Write a note", short_name: "Note", url: "/notes/new?source=pwa" },
      { name: "Make a plan", short_name: "Plan", url: "/plans/new?source=pwa" },
      { name: "Add a memory", short_name: "Memory", url: "/memories/new?source=pwa" },
    ],
  };
}
