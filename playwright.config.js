// playwright.config.js — browser tests in Chromium. By default starts the Vite dev server (5173).
// Set BASE_URL (e.g. http://localhost:4173 from `npm run preview`) to test the built site instead.
import { defineConfig } from '@playwright/test';
const base = process.env.BASE_URL || 'http://localhost:5173';
export default defineConfig({
  testDir: 'tests',
  testMatch: /.*\.spec\.js/,
  timeout: 180000,
  workers: 1,
  use: { baseURL: base, launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } },
  webServer: process.env.BASE_URL ? undefined : { command: 'npx vite --port 5173 --strictPort', url: 'http://localhost:5173', reuseExistingServer: true, timeout: 60000 },
});
