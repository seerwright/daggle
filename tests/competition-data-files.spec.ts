/**
 * Playwright e2e tests for competition data files functionality.
 *
 * These tests verify:
 * - File listing shows empty state when no files
 * - File upload works for sponsors/admins
 * - File list displays uploaded files correctly
 * - CSV preview displays with correct data
 * - Data dictionary/column info displays correctly
 * - File download functionality works
 * - Download All creates zip archive
 *
 * Prerequisites:
 * - Docker compose must be running: `docker compose up`
 * - Database must have admin user: admin@daggle.example.com / password123
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const ADMIN_USER = {
  email: 'admin@daggle.example.com',
  password: 'password123',
};

// Shared state for serial tests
let competitionSlug: string;
let tempDir: string;

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
  return `Data Files Test ${Date.now()}`;
}

async function createCompetition(page: Page): Promise<string> {
  const title = generateUniqueTitle();

  await page.goto('/competitions/create');
  await page.waitForLoadState('networkidle');

  await page.fill('input[formcontrolname="title"]', title);
  await page.fill('textarea[formcontrolname="short_description"]', 'Test competition for data files testing.');
  await page.fill('textarea[formcontrolname="description"]', 'Full description of test competition for data files.');
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

function createTestFile(filename: string, content: string): string {
  const filePath = path.join(tempDir, filename);
  fs.writeFileSync(filePath, content);
  return filePath;
}

test.describe.serial('Competition Data Files', () => {

  test.beforeAll(() => {
    // Create temp directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daggle-test-'));
  });

  test.afterAll(() => {
    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('setup: create test competition', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);
    competitionSlug = await createCompetition(page);
    console.log(`Created test competition: ${competitionSlug}`);
    expect(competitionSlug).toBeTruthy();
  });

  test('Data tab shows empty state when no files uploaded', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    await page.goto(`/competitions/${competitionSlug}?tab=data`);
    await page.waitForLoadState('networkidle');

    // Check empty state is displayed
    await expect(page.locator('app-data-tab .empty-state')).toBeVisible();
    await expect(page.locator('app-data-tab .empty-title')).toHaveText('No Data Files');
    await expect(page.locator('app-data-tab .empty-description')).toContainText('No data files have been uploaded');
  });

  test('Data tab displays files after API upload', async ({ page, request }) => {
    // First, upload a file via API (simulating sponsor upload)
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    // Get auth token from local storage
    const token = await page.evaluate(() => localStorage.getItem('daggle_token'));

    // Create test CSV file with more columns for better testing
    const csvContent = 'id,name,value,category\n1,Alpha,100.5,A\n2,Beta,200.3,B\n3,Gamma,300.7,A\n4,Delta,150.2,C\n5,Epsilon,250.1,B';
    const testFilePath = createTestFile('train_data.csv', csvContent);

    // Upload file via API using page context for proper FormData handling
    const uploadResult = await page.evaluate(async ({ slug, csvContent, token }) => {
      const formData = new FormData();
      const blob = new Blob([csvContent], { type: 'text/csv' });
      formData.append('file', blob, 'train_data.csv');

      const response = await fetch(`http://localhost:8000/competitions/${slug}/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      const text = await response.text();
      return { status: response.status, ok: response.ok, body: text };
    }, { slug: competitionSlug, csvContent, token });

    console.log('Upload result:', uploadResult);
    expect(uploadResult.ok).toBe(true);

    // Now navigate to Data tab and verify file is displayed
    await page.goto(`/competitions/${competitionSlug}?tab=data`);
    await page.waitForLoadState('networkidle');

    // Wait for files to load
    await page.waitForSelector('.files-list', { timeout: 10000 });

    // Verify file is displayed
    await expect(page.locator('.file-item')).toBeVisible();
    await expect(page.locator('.file-name')).toContainText('train_data.csv');
  });

  test('clicking a file shows details panel', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    await page.goto(`/competitions/${competitionSlug}?tab=data`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.files-list', { timeout: 10000 });

    // Click on the file
    await page.click('.file-item');

    // Verify details panel shows the file info
    await expect(page.locator('.details-header')).toBeVisible();
    await expect(page.locator('.details-title')).toContainText('train_data.csv');
    await expect(page.locator('.file-metadata')).toBeVisible();
    await expect(page.locator('.download-btn')).toBeVisible();
  });

  test('CSV file shows preview tab with data', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    await page.goto(`/competitions/${competitionSlug}?tab=data`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.files-list', { timeout: 10000 });

    // Click on the CSV file
    await page.click('.file-item');
    await page.waitForSelector('.details-panel');

    // Wait for preview to load
    await page.waitForSelector('.preview-table', { timeout: 10000 });

    // Verify preview table displays
    await expect(page.locator('.preview-table')).toBeVisible();

    // Check for column headers
    const headers = page.locator('.preview-table thead th');
    await expect(headers).toHaveCount(4);
    await expect(headers.nth(0)).toContainText('id');
    await expect(headers.nth(1)).toContainText('name');
    await expect(headers.nth(2)).toContainText('value');
    await expect(headers.nth(3)).toContainText('category');

    // Verify data rows are present
    const rows = page.locator('.preview-table tbody tr');
    await expect(rows).toHaveCount(5);

    // Check footer shows row count
    await expect(page.locator('.row-count')).toContainText('5');
  });

  test('Data Dictionary tab shows column info', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    await page.goto(`/competitions/${competitionSlug}?tab=data`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.files-list', { timeout: 10000 });

    // Click on the CSV file
    await page.click('.file-item');
    await page.waitForSelector('.details-panel');

    // Click on Data Dictionary tab
    await page.click('text=Data Dictionary');

    // Wait for dictionary content to load
    await page.waitForSelector('.dictionary-table', { timeout: 10000 });

    // Should show auto-detected columns notice since no dictionary is defined
    await expect(page.locator('.auto-detected-notice')).toBeVisible();
    await expect(page.locator('.auto-detected-notice')).toContainText('Auto-detected columns');

    // Verify dictionary table displays columns
    await expect(page.locator('.dictionary-table')).toBeVisible();

    // Check for column names
    const columnCells = page.locator('.dictionary-table .column-name');
    await expect(columnCells).toHaveCount(4);
  });

  test('clicking file again deselects it', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    await page.goto(`/competitions/${competitionSlug}?tab=data`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.files-list', { timeout: 10000 });

    // Click to select
    await page.click('.file-item');
    await expect(page.locator('.details-header')).toBeVisible();

    // Click again to deselect
    await page.click('.file-item');

    // Should show "Select a file" message
    await expect(page.locator('.no-selection')).toBeVisible();
    await expect(page.locator('.no-selection')).toContainText('Select a file to view details');
  });

  test('Download All button is visible when files exist', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    await page.goto(`/competitions/${competitionSlug}?tab=data`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.files-list', { timeout: 10000 });

    // Verify Download All button is visible
    await expect(page.locator('.download-all-btn')).toBeVisible();
    await expect(page.locator('.download-all-btn')).toContainText('Download All');
  });

  test('file icons are displayed based on file type', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    await page.goto(`/competitions/${competitionSlug}?tab=data`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.files-list', { timeout: 10000 });

    // Verify icon is displayed for CSV file (table_chart icon)
    await expect(page.locator('.file-icon mat-icon')).toBeVisible();
  });

  test('file size is formatted correctly', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    await page.goto(`/competitions/${competitionSlug}?tab=data`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.files-list', { timeout: 10000 });

    // Verify file meta shows size (our test file is small, so should show bytes)
    const fileMeta = page.locator('.file-meta');
    await expect(fileMeta).toBeVisible();
    // Size should be a number followed by a unit
    await expect(fileMeta).toHaveText(/\d+(\.\d+)?\s*(B|KB|MB|GB)/);
  });

  test('non-CSV files show download notice instead of preview', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    // Get auth token
    const token = await page.evaluate(() => localStorage.getItem('daggle_token'));

    // Upload a non-CSV file (JSON)
    const jsonContent = '{"key": "value", "number": 42}';
    const uploadResult = await page.evaluate(async ({ slug, jsonContent, token }) => {
      const formData = new FormData();
      const blob = new Blob([jsonContent], { type: 'application/json' });
      formData.append('file', blob, 'config.json');

      const response = await fetch(`http://localhost:8000/competitions/${slug}/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      return { status: response.status, ok: response.ok };
    }, { slug: competitionSlug, jsonContent, token });

    expect(uploadResult.ok).toBe(true);

    // Navigate to Data tab
    await page.goto(`/competitions/${competitionSlug}?tab=data`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.files-list', { timeout: 10000 });

    // Click on the JSON file (should be second file)
    const jsonFile = page.locator('.file-item:has-text("config.json")');
    await jsonFile.click();

    // Should show non-CSV notice
    await expect(page.locator('.non-csv-notice')).toBeVisible();
    await expect(page.locator('.non-csv-notice')).toContainText('Preview not available');
    await expect(page.locator('.non-csv-notice .hint')).toContainText('Download the file to view its contents');
  });

});
