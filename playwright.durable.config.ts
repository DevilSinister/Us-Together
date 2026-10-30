import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e", testMatch: ["durable-uploads.spec.ts", "multi-photo-upload.spec.ts", "video-thumbnails.spec.ts"], workers: 1,
  reporter: "list", use: { baseURL: "http://127.0.0.1:3112", trace: "off" },
  webServer: {
    command: "npm.cmd run dev -- --port 3112", url: "http://127.0.0.1:3112/sign-in", reuseExistingServer: true,
    env: { DEV_LOGIN_ENABLED: "true" }, timeout: 120000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
