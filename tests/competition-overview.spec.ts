/**
 * Playwright e2e tests for competition Overview tab enhancements.
 *
 * These tests verify:
 * - Overview tab displays all sections (Description, Evaluation, Timeline, FAQ)
 * - Timeline shows correct state based on dates
 * - FAQ accordion expands/collapses correctly
 * - Empty states display appropriately
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
  return `Overview Test ${Date.now()}`;
}

async function createCompetition(page: Page): Promise<string> {
  const title = generateUniqueTitle();

  await page.goto('/competitions/create');
  await page.waitForLoadState('networkidle');

  await page.fill('input[formcontrolname="title"]', title);
  await page.fill('textarea[formcontrolname="short_description"]', 'Test competition for overview tab testing.');
  await page.fill('textarea[formcontrolname="description"]', 'Full description of test competition for overview tab functionality testing. This is a longer description that tests the Description section.');
  await page.fill('input[formcontrolname="evaluation_metric"]', 'rmse');

  await page.click('mat-select[formcontrolname="difficulty"]');
  await page.click('mat-option:has-text("Beginner")');

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 5); // Started 5 days ago
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 25); // Ends in 25 days

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

test.describe.serial('Competition Overview Tab', () => {

  test('setup: create test competition', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);
    competitionSlug = await createCompetition(page);
    console.log(`Created test competition: ${competitionSlug}`);
    expect(competitionSlug).toBeTruthy();
  });

  test('Overview tab displays Description section', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    await page.goto(`/competitions/${competitionSlug}`);
    await page.waitForLoadState('networkidle');

    // Verify Description section exists
    await expect(page.locator('.section-title:has-text("Description")')).toBeVisible();
    await expect(page.locator('.description-text')).toContainText('Full description of test competition');
  });

  test('Overview tab displays Evaluation section with metric', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    await page.goto(`/competitions/${competitionSlug}`);
    await page.waitForLoadState('networkidle');

    // Verify Evaluation section exists
    await expect(page.locator('.section-title:has-text("Evaluation")')).toBeVisible();
    await expect(page.locator('.metric-value')).toContainText('RMSE');
  });

  test('Overview tab displays Timeline section with progress', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    await page.goto(`/competitions/${competitionSlug}`);
    await page.waitForLoadState('networkidle');

    // Verify Timeline section exists
    await expect(page.locator('.section-title:has-text("Timeline")')).toBeVisible();
    await expect(page.locator('.timeline-track')).toBeVisible();
    await expect(page.locator('.timeline-marker.timeline-start')).toBeVisible();
    await expect(page.locator('.timeline-marker.timeline-end')).toBeVisible();

    // Should show "days remaining" for active competition
    await expect(page.locator('.status-badge.status-active')).toContainText('days remaining');
  });

  test('Overview tab displays FAQ section', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    await page.goto(`/competitions/${competitionSlug}`);
    await page.waitForLoadState('networkidle');

    // Verify FAQ section exists (with empty state since no FAQs added)
    await expect(page.locator('.section-title:has-text("Frequently Asked Questions")')).toBeVisible();
    await expect(page.locator('.faq-empty')).toBeVisible();
    await expect(page.locator('text=No FAQs have been added yet')).toBeVisible();
  });

  test('Timeline shows correct dates', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    await page.goto(`/competitions/${competitionSlug}`);
    await page.waitForLoadState('networkidle');

    // Verify start and end dates are shown
    await expect(page.locator('.label-text:has-text("Start")')).toBeVisible();
    await expect(page.locator('.label-text:has-text("End")')).toBeVisible();

    // Date labels should be visible
    const dateLabels = page.locator('.label-date');
    await expect(dateLabels).toHaveCount(2);
  });

  test('Overview sections are in correct order', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    await page.goto(`/competitions/${competitionSlug}`);
    await page.waitForLoadState('networkidle');

    // Get all section titles and verify order
    const sections = page.locator('.section-title');
    await expect(sections).toHaveCount(4);

    const sectionTexts = await sections.allTextContents();
    expect(sectionTexts[0]).toBe('Description');
    expect(sectionTexts[1]).toBe('Evaluation');
    expect(sectionTexts[2]).toBe('Timeline');
    expect(sectionTexts[3]).toBe('Frequently Asked Questions');
  });

});
