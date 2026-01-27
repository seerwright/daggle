// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright configuration for Daggle UI tests
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use */
  reporter: 'html',

  /* Shared settings for all the projects below */
  use: {
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
  },

  /* Configure projects for different test scenarios */
  projects: [
    // Static prototype tests (port 3000)
    {
      name: 'prototype',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3000',
      },
      testMatch: /tab-width-stability\.spec\.js/,
    },
    // Angular app e2e tests (port 4200 via Docker)
    {
      name: 'angular',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:4200',
      },
      testMatch: /auth\.spec\.ts|e2e\.spec\.ts|profile-edit\.spec\.ts|competition-create\.spec\.ts|thumbnail-upload\.spec\.ts/,
    },
  ],

  /* Web server configs - uncomment the one you need or run manually */
  // webServer: {
  //   command: 'npx serve -l 3000',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
