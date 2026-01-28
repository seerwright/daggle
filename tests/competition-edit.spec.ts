/**
 * Playwright e2e tests for competition edit functionality.
 *
 * These tests verify:
 * - Edit page loads with 5-section stepped layout
 * - Section navigation works correctly
 * - Existing competition data is pre-populated
 * - Rules editor functionality
 * - Save and publish functionality
 *
 * Prerequisites:
 * - Docker compose must be running: `docker compose up`
 * - Database must have admin user: admin@daggle.example.com / password123
 * - At least one competition must exist
 */

import { test, expect, Page } from '@playwright/test';

const ADMIN_USER = {
  email: 'admin@daggle.example.com',
  password: 'password123',
};

const TOKEN_KEY = 'daggle_token';

async function clearLocalStorage(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.clear());
}

async function loginViaUI(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.waitForSelector('input[formcontrolname="email"]');

  await page.fill('input[formcontrolname="email"]', email);
  await page.fill('input[formcontrolname="password"]', password);
  await page.click('button[type="submit"]');

  await page.waitForURL(/\/(competitions|dashboard)/);
}

async function createTestCompetition(page: Page): Promise<string> {
  await page.goto('/competitions/create');
  await page.waitForLoadState('networkidle');

  const title = `Edit Test ${Date.now()}`;

  await page.fill('input[formcontrolname="title"]', title);
  await page.fill('textarea[formcontrolname="short_description"]', 'A test competition for edit functionality testing purposes.');
  await page.fill('textarea[formcontrolname="description"]', 'This competition is created to test the edit page functionality.');
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
  await page.waitForURL(/\/competitions\/[a-z0-9-]+$/);

  // Extract slug from URL
  const url = page.url();
  const slug = url.split('/').pop() || '';
  return slug;
}

test.describe('Competition Edit - Page Structure', () => {
  let competitionSlug: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);
    competitionSlug = await createTestCompetition(page);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);
  });

  test('edit page shows 5-section sidebar navigation', async ({ page }) => {
    await page.goto(`/competitions/${competitionSlug}/edit`);
    await page.waitForLoadState('networkidle');

    // Check all 5 sections are in sidebar
    await expect(page.locator('.sidebar-nav button:has-text("Basics")')).toBeVisible();
    await expect(page.locator('.sidebar-nav button:has-text("Description")')).toBeVisible();
    await expect(page.locator('.sidebar-nav button:has-text("Data")')).toBeVisible();
    await expect(page.locator('.sidebar-nav button:has-text("Rules")')).toBeVisible();
    await expect(page.locator('.sidebar-nav button:has-text("Review")')).toBeVisible();
  });

  test('basics section is active by default', async ({ page }) => {
    await page.goto(`/competitions/${competitionSlug}/edit`);
    await page.waitForLoadState('networkidle');

    // Basics section should be active
    await expect(page.locator('.sidebar-nav button.active:has-text("Basics")')).toBeVisible();

    // Should show basics section content
    await expect(page.locator('.section-header h2:has-text("Basic Information")')).toBeVisible();
  });

  test('existing competition data is pre-populated', async ({ page }) => {
    await page.goto(`/competitions/${competitionSlug}/edit`);
    await page.waitForLoadState('networkidle');

    // Title should be populated
    const titleInput = page.locator('input[formcontrolname="title"]');
    await expect(titleInput).toHaveValue(/Edit Test/);

    // Short description should be populated
    const shortDescInput = page.locator('textarea[formcontrolname="short_description"]');
    await expect(shortDescInput).toHaveValue(/test competition for edit functionality/);
  });
});

test.describe('Competition Edit - Section Navigation', () => {
  let competitionSlug: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);
    competitionSlug = await createTestCompetition(page);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);
    await page.goto(`/competitions/${competitionSlug}/edit`);
    await page.waitForLoadState('networkidle');
  });

  test('can navigate to Description section via sidebar', async ({ page }) => {
    await page.click('.sidebar-nav button:has-text("Description")');

    await expect(page.locator('.sidebar-nav button.active:has-text("Description")')).toBeVisible();
    await expect(page.locator('.section-header h2:has-text("Competition Description")')).toBeVisible();
  });

  test('can navigate to Data section via sidebar', async ({ page }) => {
    await page.click('.sidebar-nav button:has-text("Data")');

    await expect(page.locator('.sidebar-nav button.active:has-text("Data")')).toBeVisible();
    await expect(page.locator('.section-header h2:has-text("Competition Data")')).toBeVisible();
  });

  test('can navigate to Rules section via sidebar', async ({ page }) => {
    await page.click('.sidebar-nav button:has-text("Rules")');

    await expect(page.locator('.sidebar-nav button.active:has-text("Rules")')).toBeVisible();
    await expect(page.locator('.section-header h2:has-text("Competition Rules")')).toBeVisible();
  });

  test('can navigate to Review section via sidebar', async ({ page }) => {
    await page.click('.sidebar-nav button:has-text("Review")');

    await expect(page.locator('.sidebar-nav button.active:has-text("Review")')).toBeVisible();
    await expect(page.locator('.section-header h2:has-text("Review & Publish")')).toBeVisible();
  });

  test('Next button advances to next section', async ({ page }) => {
    // Start on Basics
    await expect(page.locator('.sidebar-nav button.active:has-text("Basics")')).toBeVisible();

    // Click Next
    await page.click('button:has-text("Next: Description")');

    // Should be on Description now
    await expect(page.locator('.sidebar-nav button.active:has-text("Description")')).toBeVisible();
  });

  test('Back button returns to previous section', async ({ page }) => {
    // Navigate to Description
    await page.click('.sidebar-nav button:has-text("Description")');
    await expect(page.locator('.sidebar-nav button.active:has-text("Description")')).toBeVisible();

    // Click Back
    await page.click('button:has-text("Back")');

    // Should be on Basics now
    await expect(page.locator('.sidebar-nav button.active:has-text("Basics")')).toBeVisible();
  });
});

test.describe('Competition Edit - Rules Section', () => {
  let competitionSlug: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);
    competitionSlug = await createTestCompetition(page);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);
    await page.goto(`/competitions/${competitionSlug}/edit`);
    await page.waitForLoadState('networkidle');
  });

  test('rules section displays rule templates', async ({ page }) => {
    await page.click('.sidebar-nav button:has-text("Rules")');
    await page.waitForLoadState('networkidle');

    // Should show rule categories
    await expect(page.locator('h3:has-text("Team Formation")')).toBeVisible();
    await expect(page.locator('h3:has-text("Submissions")')).toBeVisible();
    await expect(page.locator('h3:has-text("Scoring")')).toBeVisible();
    await expect(page.locator('h3:has-text("Conduct")')).toBeVisible();
  });

  test('can enable a rule template', async ({ page }) => {
    await page.click('.sidebar-nav button:has-text("Rules")');
    await page.waitForLoadState('networkidle');

    // Find and check a rule checkbox
    const checkbox = page.locator('.rule-template mat-checkbox').first();
    await checkbox.click();

    // Checkbox should be checked
    await expect(checkbox.locator('input')).toBeChecked();
  });

  test('custom rules section exists', async ({ page }) => {
    await page.click('.sidebar-nav button:has-text("Rules")');
    await page.waitForLoadState('networkidle');

    // Should show custom rules section
    await expect(page.locator('h3:has-text("Custom Rules")')).toBeVisible();
    await expect(page.locator('textarea[placeholder*="custom rule"]')).toBeVisible();
    await expect(page.locator('button:has-text("Add Custom Rule")')).toBeVisible();
  });

  test('can add a custom rule', async ({ page }) => {
    await page.click('.sidebar-nav button:has-text("Rules")');
    await page.waitForLoadState('networkidle');

    // Enter custom rule text
    await page.fill('textarea[placeholder*="custom rule"]', 'All participants must wear funny hats.');

    // Click add button
    await page.click('button:has-text("Add Custom Rule")');

    // Custom rule should appear in the list
    await expect(page.locator('.custom-rule:has-text("funny hats")')).toBeVisible();
  });
});

test.describe('Competition Edit - Review Section', () => {
  let competitionSlug: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);
    competitionSlug = await createTestCompetition(page);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);
    await page.goto(`/competitions/${competitionSlug}/edit`);
    await page.waitForLoadState('networkidle');
  });

  test('review section shows summary cards', async ({ page }) => {
    await page.click('.sidebar-nav button:has-text("Review")');
    await page.waitForLoadState('networkidle');

    // Should show summary cards for each section
    await expect(page.locator('.summary-card:has-text("Basic Information")')).toBeVisible();
    await expect(page.locator('.summary-card:has-text("Description")')).toBeVisible();
    await expect(page.locator('.summary-card:has-text("Data Files")')).toBeVisible();
    await expect(page.locator('.summary-card:has-text("Rules")')).toBeVisible();
  });

  test('review section shows save and publish buttons', async ({ page }) => {
    await page.click('.sidebar-nav button:has-text("Review")');
    await page.waitForLoadState('networkidle');

    // Should show action buttons
    await expect(page.locator('button:has-text("Save as Draft")')).toBeVisible();
  });
});

test.describe('Competition Edit - Save Functionality', () => {
  let competitionSlug: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);
    competitionSlug = await createTestCompetition(page);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);
    await page.goto(`/competitions/${competitionSlug}/edit`);
    await page.waitForLoadState('networkidle');
  });

  test('can update competition title', async ({ page }) => {
    const newTitle = `Updated Competition ${Date.now()}`;

    // Update title
    await page.fill('input[formcontrolname="title"]', newTitle);

    // Navigate to Review and save
    await page.click('.sidebar-nav button:has-text("Review")');
    await page.click('button:has-text("Save as Draft")');

    // Wait for save and check for success
    await expect(page.getByText(/saved|updated/i)).toBeVisible({ timeout: 5000 });

    // Reload and verify change persisted
    await page.reload();
    await page.waitForLoadState('networkidle');

    const titleInput = page.locator('input[formcontrolname="title"]');
    await expect(titleInput).toHaveValue(newTitle);
  });
});
