/**
 * Playwright e2e tests for competition creation functionality.
 *
 * These tests verify:
 * - Create competition page loads for sponsors/admins
 * - Form validation works correctly
 * - Competition can be created successfully
 * - Header link visible only for sponsors/admins
 *
 * Prerequisites:
 * - Docker compose must be running: `docker compose up`
 * - Database must have admin user: admin@daggle.example.com / password123
 */

import { test, expect, Page } from '@playwright/test';

// Admin user (has sponsor/admin role)
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

function generateUniqueTitle(): string {
  return `Test Competition ${Date.now()}`;
}

test.describe('Competition Create - Page Access', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
  });

  test('create competition page loads for admin user', async ({ page }) => {
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    await page.goto('/competitions/create');
    await page.waitForLoadState('networkidle');

    // Verify form elements exist
    await expect(page.locator('input[formcontrolname="title"]')).toBeVisible();
    await expect(page.locator('textarea[formcontrolname="short_description"]')).toBeVisible();
    await expect(page.locator('textarea[formcontrolname="description"]')).toBeVisible();
    await expect(page.locator('mat-select[formcontrolname="difficulty"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('header shows Create Competition link for admin', async ({ page }) => {
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);
    await page.waitForLoadState('networkidle');

    // Should see Create Competition link
    await expect(page.locator('a:has-text("Create Competition")')).toBeVisible();
  });

  test('clicking Create Competition in header navigates to create page', async ({ page }) => {
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);
    await page.waitForLoadState('networkidle');

    await page.click('a:has-text("Create Competition")');

    await page.waitForURL(/\/competitions\/create/);
    expect(page.url()).toContain('/competitions/create');
  });
});

test.describe('Competition Create - Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);
    await page.goto('/competitions/create');
    await page.waitForLoadState('networkidle');
  });

  test('shows validation error for empty title', async ({ page }) => {
    // Try to submit without filling required fields
    await page.click('input[formcontrolname="title"]');
    await page.click('textarea[formcontrolname="description"]'); // blur title

    // Should show validation error
    await expect(page.locator('mat-error:has-text("Title is required")')).toBeVisible();
  });

  test('shows validation error for short title', async ({ page }) => {
    await page.fill('input[formcontrolname="title"]', 'AB');
    await page.click('textarea[formcontrolname="description"]'); // blur

    await expect(page.locator('mat-error:has-text("Title must be at least 3 characters")')).toBeVisible();
  });

  test('shows validation error for short description being too short', async ({ page }) => {
    await page.fill('textarea[formcontrolname="short_description"]', 'Too short');
    await page.click('textarea[formcontrolname="description"]'); // blur

    await expect(page.locator('mat-error:has-text("Short description must be at least 10 characters")')).toBeVisible();
  });

  test('shows character count hint for short description', async ({ page }) => {
    await page.fill('textarea[formcontrolname="short_description"]', 'Testing character count');

    // Should show character count
    await expect(page.locator('mat-hint')).toContainText('/500');
  });

  test('submit button is disabled when form is invalid', async ({ page }) => {
    // Form should be invalid by default (empty required fields)
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();
  });
});

test.describe('Competition Create - Form Submission', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);
    await page.goto('/competitions/create');
    await page.waitForLoadState('networkidle');
  });

  test('can fill out all form fields', async ({ page }) => {
    const title = generateUniqueTitle();

    // Fill in all fields
    await page.fill('input[formcontrolname="title"]', title);
    await page.fill('textarea[formcontrolname="short_description"]', 'This is a short description for the test competition that meets the minimum length.');
    await page.fill('textarea[formcontrolname="description"]', 'This is the full description of the test competition. It contains detailed information about the competition goals and rules.');
    await page.fill('input[formcontrolname="evaluation_metric"]', 'rmse');

    // Select difficulty
    await page.click('mat-select[formcontrolname="difficulty"]');
    await page.click('mat-option:has-text("Beginner")');

    // Set dates (use JavaScript to set date values)
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + 1);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 30);

    await page.fill('input[formcontrolname="start_date"]', startDate.toLocaleDateString('en-US'));
    await page.fill('input[formcontrolname="end_date"]', endDate.toLocaleDateString('en-US'));

    // Verify submit button is enabled after filling required fields
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).not.toBeDisabled();
  });

  test('successful creation navigates to competition detail page', async ({ page }) => {
    const title = generateUniqueTitle();

    // Fill in required fields
    await page.fill('input[formcontrolname="title"]', title);
    await page.fill('textarea[formcontrolname="short_description"]', 'This is a short description for the test competition that meets the minimum length requirement.');
    await page.fill('textarea[formcontrolname="description"]', 'This is the full description of the test competition. It contains detailed information about the competition.');
    await page.fill('input[formcontrolname="evaluation_metric"]', 'accuracy');

    // Select difficulty
    await page.click('mat-select[formcontrolname="difficulty"]');
    await page.click('mat-option:has-text("Intermediate")');

    // Set dates
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + 1);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 30);

    await page.fill('input[formcontrolname="start_date"]', startDate.toLocaleDateString('en-US'));
    await page.fill('input[formcontrolname="end_date"]', endDate.toLocaleDateString('en-US'));

    // Submit
    await page.click('button[type="submit"]');

    // Should navigate to the new competition's detail page
    await page.waitForURL(/\/competitions\/[a-z0-9-]+$/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/competitions\/[a-z0-9-]+$/);

    // Should see the competition title on the detail page
    await expect(page.locator('h1')).toContainText(title);
  });

  test('shows success snackbar after creation', async ({ page }) => {
    const title = generateUniqueTitle();

    // Fill in required fields
    await page.fill('input[formcontrolname="title"]', title);
    await page.fill('textarea[formcontrolname="short_description"]', 'This is a short description for the test competition that meets minimum length.');
    await page.fill('textarea[formcontrolname="description"]', 'This is the full description of the test competition. Contains detailed information.');
    await page.fill('input[formcontrolname="evaluation_metric"]', 'f1');

    await page.click('mat-select[formcontrolname="difficulty"]');
    await page.click('mat-option:has-text("Advanced")');

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + 1);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 14);

    await page.fill('input[formcontrolname="start_date"]', startDate.toLocaleDateString('en-US'));
    await page.fill('input[formcontrolname="end_date"]', endDate.toLocaleDateString('en-US'));

    await page.click('button[type="submit"]');

    // Should show success snackbar
    await expect(page.getByText('Competition created successfully!')).toBeVisible({ timeout: 5000 });
  });

  test('cancel button navigates to competitions list', async ({ page }) => {
    await page.click('a:has-text("Cancel")');

    await page.waitForURL(/\/competitions$/);
    expect(page.url()).toMatch(/\/competitions$/);
  });
});

test.describe('Competition Create - Date Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);
    await page.goto('/competitions/create');
    await page.waitForLoadState('networkidle');
  });

  test('shows error when end date is before start date', async ({ page }) => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + 10);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 5); // End date before start date

    await page.fill('input[formcontrolname="start_date"]', startDate.toLocaleDateString('en-US'));
    await page.fill('input[formcontrolname="end_date"]', endDate.toLocaleDateString('en-US'));

    // Blur to trigger validation
    await page.click('input[formcontrolname="title"]');

    // Should show date validation error
    await expect(page.locator('.error:has-text("End date must be after start date")')).toBeVisible();
  });
});
