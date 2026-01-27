/**
 * Playwright e2e tests for competition thumbnail upload functionality.
 *
 * These tests verify:
 * - Thumbnail upload section appears on edit page
 * - Thumbnail preview shows when file is selected
 * - Thumbnail uploads successfully
 * - Thumbnail displays on competitions list page
 *
 * Prerequisites:
 * - Docker compose must be running: `docker compose up`
 * - Database must have admin user: admin@daggle.example.com / password123
 * - Test image in: tests/fixtures/glass-box-observatory.jpg
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import * as path from 'path';

const ADMIN_USER = {
  email: 'admin@daggle.example.com',
  password: 'password123',
};

const TEST_IMAGE_PATH = path.join(__dirname, 'fixtures', 'glass-box-observatory.jpg');

// Shared state for serial tests - the slug of the test competition
let competitionSlug: string;

async function clearLocalStorage(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.clear());
}

async function loginViaUI(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.waitForSelector('input[formcontrolname="email"]');

  await page.fill('input[formcontrolname="email"]', email);
  await page.fill('input[formcontrolname="password"]', password);

  // Wait for both the login response and the /auth/me call to complete
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes('/auth/me') && response.status() === 200,
    { timeout: 15000 }
  );

  await page.click('button[type="submit"]');

  // Wait for navigation
  await page.waitForURL(/\/(competitions|dashboard)/);

  // Wait for the /auth/me API call to complete (this populates currentUser)
  await responsePromise;

  // Additional small delay for signal propagation
  await page.waitForTimeout(200);
}

function generateUniqueTitle(): string {
  return `Thumbnail Test ${Date.now()}`;
}

async function createCompetition(page: Page): Promise<string> {
  const title = generateUniqueTitle();

  await page.goto('/competitions/create');
  await page.waitForLoadState('networkidle');

  // Fill in required fields
  await page.fill('input[formcontrolname="title"]', title);
  await page.fill('textarea[formcontrolname="short_description"]', 'This is a test competition for thumbnail upload testing with sufficient length.');
  await page.fill('textarea[formcontrolname="description"]', 'This is the full description of the test competition for thumbnail upload functionality testing.');
  await page.fill('input[formcontrolname="evaluation_metric"]', 'rmse');

  // Select difficulty
  await page.click('mat-select[formcontrolname="difficulty"]');
  await page.click('mat-option:has-text("Beginner")');

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

  // Wait for navigation to detail page (not the create page)
  await page.waitForURL((url) => {
    const pathname = url.pathname;
    return /^\/competitions\/[a-z0-9-]+$/.test(pathname) && pathname !== '/competitions/create';
  }, { timeout: 15000 });

  // Extract slug from URL
  const url = page.url();
  const slug = url.split('/').pop() || '';

  return slug;
}

// Use serial mode to ensure tests run in sequence and share state
test.describe.serial('Thumbnail Upload', () => {

  test('setup: create test competition', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);
    competitionSlug = await createCompetition(page);
    console.log(`Created test competition: ${competitionSlug}`);
    expect(competitionSlug).toBeTruthy();
    expect(competitionSlug).not.toBe('create');
  });

  test('thumbnail section appears on edit page', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    await page.goto(`/competitions/${competitionSlug}/edit`);
    await page.waitForLoadState('networkidle');

    // Verify thumbnail section exists
    await expect(page.locator('.section-title:has-text("Thumbnail")')).toBeVisible();
    await expect(page.locator('text=Upload an image to represent your competition')).toBeVisible();
    await expect(page.locator('button:has-text("Select Image")')).toBeVisible();
  });

  test('shows no thumbnail placeholder when none uploaded', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    await page.goto(`/competitions/${competitionSlug}/edit`);
    await page.waitForLoadState('networkidle');

    // Should show the "No thumbnail uploaded" message
    await expect(page.locator('.no-thumbnail')).toBeVisible();
    await expect(page.locator('text=No thumbnail uploaded')).toBeVisible();
  });

  test('selecting a file shows preview', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    await page.goto(`/competitions/${competitionSlug}/edit`);
    await page.waitForLoadState('networkidle');

    // Upload the test image
    const fileInput = page.locator('input[type="file"][accept=".png,.jpg,.jpeg,.webp"]');
    await fileInput.setInputFiles(TEST_IMAGE_PATH);

    // Should show preview image
    await expect(page.locator('img.current-thumbnail')).toBeVisible();

    // Should show selected file info
    await expect(page.locator('.selected-file')).toBeVisible();
    await expect(page.locator('.file-name')).toContainText('glass-box-observatory.jpg');

    // Should show Upload Thumbnail button
    await expect(page.locator('button:has-text("Upload Thumbnail")')).toBeVisible();
  });

  test('can clear selected file', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    await page.goto(`/competitions/${competitionSlug}/edit`);
    await page.waitForLoadState('networkidle');

    const fileInput = page.locator('input[type="file"][accept=".png,.jpg,.jpeg,.webp"]');
    await fileInput.setInputFiles(TEST_IMAGE_PATH);

    // Verify file is selected
    await expect(page.locator('.selected-file')).toBeVisible();

    // Click the remove button
    await page.locator('.file-remove').click();

    // File should be cleared
    await expect(page.locator('.selected-file')).not.toBeVisible();
    await expect(page.locator('button:has-text("Upload Thumbnail")')).not.toBeVisible();
  });

  test('can upload thumbnail successfully', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    await page.goto(`/competitions/${competitionSlug}/edit`);
    await page.waitForLoadState('networkidle');

    // Select file
    const fileInput = page.locator('input[type="file"][accept=".png,.jpg,.jpeg,.webp"]');
    await fileInput.setInputFiles(TEST_IMAGE_PATH);

    // Click upload button
    await page.click('button:has-text("Upload Thumbnail")');

    // Wait for success snackbar
    await expect(page.getByText('Thumbnail uploaded successfully!')).toBeVisible({ timeout: 10000 });

    // Selected file should be cleared after successful upload
    await expect(page.locator('.selected-file')).not.toBeVisible();

    // The current thumbnail image should now be visible (from server)
    await expect(page.locator('img.current-thumbnail')).toBeVisible();
  });

  test('thumbnail appears on competitions list page after upload', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    // Navigate to competitions list
    await page.goto('/competitions');
    await page.waitForLoadState('networkidle');

    // Find the competition card with our thumbnail
    // The card should have an img element with the thumbnail, not the fallback div
    const competitionCard = page.locator('article.competition-card:has(img.card-thumbnail-img)');
    await expect(competitionCard.first()).toBeVisible({ timeout: 10000 });
  });

  test('thumbnail image loads correctly (not broken)', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    // Navigate to competitions list
    await page.goto('/competitions');
    await page.waitForLoadState('networkidle');

    // Find the thumbnail image
    const thumbnailImg = page.locator('img.card-thumbnail-img').first();
    await expect(thumbnailImg).toBeVisible();

    // Check that the image loaded successfully (naturalWidth > 0 indicates loaded)
    const naturalWidth = await thumbnailImg.evaluate((img: HTMLImageElement) => img.naturalWidth);
    expect(naturalWidth).toBeGreaterThan(0);
  });

  test('file input only accepts image files', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    await page.goto(`/competitions/${competitionSlug}/edit`);
    await page.waitForLoadState('networkidle');

    const fileInput = page.locator('input[type="file"][accept=".png,.jpg,.jpeg,.webp"]');

    // Check that accept attribute is set correctly
    const accept = await fileInput.getAttribute('accept');
    expect(accept).toBe('.png,.jpg,.jpeg,.webp');
  });
});
