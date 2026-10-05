import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e", testMatch: "video-upload-recovery.spec.ts", workers: 1,
  reporter: "list", use: { baseURL: "http://127.0.0.1:3109", trace: "off", video: "off", actionTimeout: 15000 },
  webServer: { command: "npm.cmd run dev -- --port 3109", url: "http://127.0.0.1:3109/sign-in", reuseExistingServer: true, timeout: 120000 },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }, { name: "mobile", use: { ...devices["Pixel 7"] } }],
});
