import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // Data loaders import "server-only", which only exists inside Next's compiled tree.
      "server-only": path.resolve(import.meta.dirname, "node_modules/next/dist/compiled/server-only/empty.js"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: { reporter: ["text", "json", "html"] },
  },
});
