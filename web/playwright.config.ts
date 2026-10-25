import { defineConfig, devices } from "@playwright/test";

// Usa el Edge instalado en Windows (channel msedge): no hace falta descargar navegadores.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Edge"], channel: "msedge", viewport: { width: 1440, height: 900 } } },
    { name: "movil", use: { ...devices["Desktop Edge"], channel: "msedge", viewport: { width: 390, height: 844 }, isMobile: false } },
  ],
  webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
});
