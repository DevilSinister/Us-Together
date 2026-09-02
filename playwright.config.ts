import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 2,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: process.platform === "win32" ? "cmd /c npm run dev" : "npm run dev",
    url: "http://127.0.0.1:3000/sign-in",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { ...process.env, DEV_LOGIN_ENABLED: "true" },
  },

  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
});
