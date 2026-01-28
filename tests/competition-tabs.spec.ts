/**
 * Playwright e2e tests for competition detail page tab navigation.
 *
 * These tests verify:
 * - All tabs are visible and can be navigated to
 * - Header remains visible when switching tabs
 * - Deep linking to specific tabs via URL works
 * - Tab state persists in URL
 *
 * Prerequisites:
 * - Docker compose must be running: `docker compose up`
 * - Database must have admin user: admin@daggle.example.com / password123
 */

import { test, expect, Page } from '@playwright/test';

const ADMIN_USER = {
  email: 'admin@daggle.example.com',
  password: 'password123',
};

// Tab names in order
const TAB_NAMES = ['Overview', 'Data', 'Leaderboard', 'Submit', 'Rules', 'Discussions'];
const TAB_SLUGS = ['overview', 'data', 'leaderboard', 'submit', 'rules', 'discussions'];

// Shared state for serial tests
let competitionSlug: string;

async function clearLocalStorage(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.clear());
}

async function loginViaUI(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.waitForSelector('input[formcontrolname="email"]');

  await page.fill('input[formcontrolname="email"]', email);
  await page.fill('input[formcontrolname="password"]', password);

  const responsePromise = page.waitForResponse(
    (response) => response.url().includes('/auth/me') && response.status() === 200,
    { timeout: 15000 }
  );

  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(competitions|dashboard)/);
  await responsePromise;
  await page.waitForTimeout(200);
}

function generateUniqueTitle(): string {
  return `Tab Navigation Test ${Date.now()}`;
}

async function createCompetition(page: Page): Promise<string> {
  const title = generateUniqueTitle();

  await page.goto('/competitions/create');
  await page.waitForLoadState('networkidle');

  await page.fill('input[formcontrolname="title"]', title);
  await page.fill('textarea[formcontrolname="short_description"]', 'Test competition for tab navigation testing.');
  await page.fill('textarea[formcontrolname="description"]', 'Full description of test competition for tab navigation.');
  await page.fill('input[formcontrolname="evaluation_metric"]', 'rmse');

  await page.click('mat-select[formcontrolname="difficulty"]');
  await page.click('mat-option:has-text("Beginner")');

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + 1);
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 30);

  await page.fill('input[formcontrolname="start_date"]', startDate.toLocaleDateString('en-US'));
  await page.fill('input[formcontrolname="end_date"]', endDate.toLocaleDateString('en-US'));

  await page.click('button[type="submit"]');

  await page.waitForURL((url) => {
    const pathname = url.pathname;
    return /^\/competitions\/[a-z0-9-]+$/.test(pathname) && pathname !== '/competitions/create';
  }, { timeout: 15000 });

  const url = page.url();
  return url.split('/').pop() || '';
}

test.describe.serial('Competition Detail Tabs', () => {

  test('setup: create test competition', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);
    competitionSlug = await createCompetition(page);
    console.log(`Created test competition: ${competitionSlug}`);
    expect(competitionSlug).toBeTruthy();
  });

  test('all tabs are visible on competition detail page', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    await page.goto(`/competitions/${competitionSlug}`);
    await page.waitForLoadState('networkidle');

    // Verify all tabs are present
    for (const tabName of TAB_NAMES) {
      await expect(page.locator(`[role="tab"]:has-text("${tabName}")`)).toBeVisible();
    }
  });

  test('header remains visible when switching tabs', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    await page.goto(`/competitions/${competitionSlug}`);
    await page.waitForLoadState('networkidle');

    // Check header is visible initially
    await expect(page.locator('app-competition-header')).toBeVisible();
    await expect(page.locator('.competition-title')).toBeVisible();

    // Click through enabled tabs and verify header stays visible
    // Skip Submit tab as it's disabled when not enrolled
    const enabledTabs = TAB_NAMES.filter(t => t !== 'Submit');
    for (const tabName of enabledTabs) {
      await page.click(`[role="tab"]:has-text("${tabName}")`);
      await page.waitForTimeout(300); // Allow tab transition
      await expect(page.locator('app-competition-header')).toBeVisible();
      await expect(page.locator('.competition-title')).toBeVisible();
    }
  });

  test('can navigate between tabs by clicking', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    await page.goto(`/competitions/${competitionSlug}`);
    await page.waitForLoadState('networkidle');

    // Start on Overview tab
    await expect(page.locator('[role="tab"][aria-selected="true"]:has-text("Overview")')).toBeVisible();

    // Navigate to Data tab
    await page.click('[role="tab"]:has-text("Data")');
    await expect(page.locator('[role="tab"][aria-selected="true"]:has-text("Data")')).toBeVisible();
    await expect(page.locator('app-data-tab')).toBeVisible();

    // Navigate to Leaderboard tab
    await page.click('[role="tab"]:has-text("Leaderboard")');
    await expect(page.locator('[role="tab"][aria-selected="true"]:has-text("Leaderboard")')).toBeVisible();
    await expect(page.locator('app-leaderboard-tab')).toBeVisible();

    // Navigate to Rules tab
    await page.click('[role="tab"]:has-text("Rules")');
    await expect(page.locator('[role="tab"][aria-selected="true"]:has-text("Rules")')).toBeVisible();
    await expect(page.locator('app-rules-tab')).toBeVisible();

    // Navigate to Discussions tab
    await page.click('[role="tab"]:has-text("Discussions")');
    await expect(page.locator('[role="tab"][aria-selected="true"]:has-text("Discussions")')).toBeVisible();
    await expect(page.locator('app-discussion-tab')).toBeVisible();
  });

  test('deep linking to Data tab via URL works', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    // Navigate directly to Data tab via URL
    await page.goto(`/competitions/${competitionSlug}?tab=data`);
    await page.waitForLoadState('networkidle');

    // Data tab should be selected
    await expect(page.locator('[role="tab"][aria-selected="true"]:has-text("Data")')).toBeVisible();
    await expect(page.locator('app-data-tab')).toBeVisible();
  });

  test('deep linking to Leaderboard tab via URL works', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    await page.goto(`/competitions/${competitionSlug}?tab=leaderboard`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[role="tab"][aria-selected="true"]:has-text("Leaderboard")')).toBeVisible();
    await expect(page.locator('app-leaderboard-tab')).toBeVisible();
  });

  test('deep linking to Rules tab via URL works', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    await page.goto(`/competitions/${competitionSlug}?tab=rules`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[role="tab"][aria-selected="true"]:has-text("Rules")')).toBeVisible();
    await expect(page.locator('app-rules-tab')).toBeVisible();
  });

  test('deep linking to Discussions tab via URL works', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    await page.goto(`/competitions/${competitionSlug}?tab=discussions`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[role="tab"][aria-selected="true"]:has-text("Discussions")')).toBeVisible();
    await expect(page.locator('app-discussion-tab')).toBeVisible();
  });

  test('URL updates when switching tabs', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    await page.goto(`/competitions/${competitionSlug}`);
    await page.waitForLoadState('networkidle');

    // Initially on Overview, URL should not have tab param
    expect(page.url()).not.toContain('tab=');

    // Click Data tab
    await page.click('[role="tab"]:has-text("Data")');
    await page.waitForTimeout(300);
    expect(page.url()).toContain('tab=data');

    // Click Leaderboard tab
    await page.click('[role="tab"]:has-text("Leaderboard")');
    await page.waitForTimeout(300);
    expect(page.url()).toContain('tab=leaderboard');

    // Click Overview tab - should remove tab param
    await page.click('[role="tab"]:has-text("Overview")');
    await page.waitForTimeout(300);
    expect(page.url()).not.toContain('tab=');
  });

  test('invalid tab param defaults to Overview', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    // Navigate with invalid tab parameter
    await page.goto(`/competitions/${competitionSlug}?tab=invalid`);
    await page.waitForLoadState('networkidle');

    // Should default to Overview tab
    await expect(page.locator('[role="tab"][aria-selected="true"]:has-text("Overview")')).toBeVisible();
    await expect(page.locator('app-overview-tab')).toBeVisible();
  });

  test('placeholder states display for Data and Rules tabs', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    await page.goto(`/competitions/${competitionSlug}`);
    await page.waitForLoadState('networkidle');

    // Check Data tab empty state
    await page.click('[role="tab"]:has-text("Data")');
    await expect(page.locator('app-data-tab .empty-title')).toHaveText('No Data Files');
    await expect(page.locator('app-data-tab .empty-description')).toContainText('No data files have been uploaded');

    // Check Rules tab placeholder
    await page.click('[role="tab"]:has-text("Rules")');
    await expect(page.locator('app-rules-tab .placeholder-title')).toHaveText('Competition Rules');
    await expect(page.locator('app-rules-tab .placeholder-description')).toContainText('Competition rules and guidelines');
  });

});
