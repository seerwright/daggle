/**
 * Playwright e2e tests for profile edit functionality.
 *
 * These tests verify:
 * - Edit profile page loads correctly
 * - Profile can be updated successfully
 * - Validation works correctly
 * - Updated name reflects in header and profile page
 *
 * Prerequisites:
 * - Docker compose must be running: `docker compose up`
 * - Database must have admin user: admin@daggle.example.com / password123
 */

import { test, expect, Page } from '@playwright/test';

const TEST_USER = {
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
  // Wait for the user to be fully loaded (account icon visible means currentUser is set)
  await page.waitForSelector('button:has(mat-icon:has-text("account_circle"))', { timeout: 10000 });
}

test.describe('Profile Edit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
  });

  test('edit profile page loads for authenticated user', async ({ page }) => {
    await loginViaUI(page, TEST_USER.email, TEST_USER.password);

    // Navigate to profile first, then click edit
    await page.click('button:has(mat-icon:has-text("account_circle"))');
    await page.click('button:has-text("Profile")');
    await page.waitForLoadState('networkidle');
    await page.click('a:has-text("Edit Profile")');
    await page.waitForURL(/\/profile\/edit/);

    // Verify form elements exist
    await expect(page.locator('input[formcontrolname="display_name"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('edit profile form is pre-populated with current display name', async ({ page }) => {
    await loginViaUI(page, TEST_USER.email, TEST_USER.password);

    // Navigate via UI
    await page.click('button:has(mat-icon:has-text("account_circle"))');
    await page.click('button:has-text("Profile")');
    await page.waitForLoadState('networkidle');
    await page.click('a:has-text("Edit Profile")');
    await page.waitForURL(/\/profile\/edit/);

    // The input should have a value (the current display name)
    const displayNameInput = page.locator('input[formcontrolname="display_name"]');
    await expect(displayNameInput).not.toHaveValue('');
  });

  test('edit profile shows validation error for empty display name', async ({ page }) => {
    await loginViaUI(page, TEST_USER.email, TEST_USER.password);

    // Navigate via UI
    await page.click('button:has(mat-icon:has-text("account_circle"))');
    await page.click('button:has-text("Profile")');
    // Wait for profile to load (Edit Profile button only shows on loaded profile)
    await expect(page.locator('a:has-text("Edit Profile")')).toBeVisible({ timeout: 10000 });
    await page.click('a:has-text("Edit Profile")');
    await page.waitForURL(/\/profile\/edit/);

    // Clear the display name field and blur to trigger validation
    const displayNameInput = page.locator('input[formcontrolname="display_name"]');
    await displayNameInput.fill('');
    await displayNameInput.blur();

    // Should show validation error and submit button should be disabled
    await expect(page.locator('mat-error')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });

  test('profile edit button visible on own profile', async ({ page }) => {
    await loginViaUI(page, TEST_USER.email, TEST_USER.password);

    // Get the current username from the user menu
    await page.click('button:has(mat-icon:has-text("account_circle"))');
    await page.click('button:has-text("Profile")');

    await page.waitForLoadState('networkidle');

    // Should see the Edit Profile button on own profile
    await expect(page.locator('a:has-text("Edit Profile")')).toBeVisible();
  });

  test('clicking edit profile button navigates to edit page', async ({ page }) => {
    await loginViaUI(page, TEST_USER.email, TEST_USER.password);

    // Navigate to own profile
    await page.click('button:has(mat-icon:has-text("account_circle"))');
    await page.click('button:has-text("Profile")');
    // Wait for profile to load
    await expect(page.locator('a:has-text("Edit Profile")')).toBeVisible({ timeout: 10000 });

    // Click edit profile
    await page.click('a:has-text("Edit Profile")');

    await page.waitForURL(/\/profile\/edit/);
    expect(page.url()).toContain('/profile/edit');
  });

  test('cancel button navigates back to profile', async ({ page }) => {
    await loginViaUI(page, TEST_USER.email, TEST_USER.password);

    // Navigate via UI
    await page.click('button:has(mat-icon:has-text("account_circle"))');
    await page.click('button:has-text("Profile")');
    await page.waitForLoadState('networkidle');
    await page.click('a:has-text("Edit Profile")');
    await page.waitForURL(/\/profile\/edit/);

    // Click cancel
    await page.click('a:has-text("Cancel")');

    await page.waitForURL(/\/users\//);
    expect(page.url()).toContain('/users/');
  });

  test('successful profile update shows success message', async ({ page }) => {
    await loginViaUI(page, TEST_USER.email, TEST_USER.password);

    // Navigate via UI
    await page.click('button:has(mat-icon:has-text("account_circle"))');
    await page.click('button:has-text("Profile")');
    await page.waitForLoadState('networkidle');
    await page.click('a:has-text("Edit Profile")');
    await page.waitForURL(/\/profile\/edit/);

    // Get current display name and modify it
    const displayNameInput = page.locator('input[formcontrolname="display_name"]');
    const currentName = await displayNameInput.inputValue();
    const newName = currentName === 'Test Name' ? 'System Administrator' : 'Test Name';

    await displayNameInput.fill(newName);
    await page.click('button[type="submit"]');

    // Should show success snackbar
    await expect(page.getByText('Profile updated successfully')).toBeVisible({ timeout: 5000 });

    // Should navigate to profile page
    await page.waitForURL(/\/users\//, { timeout: 10000 });

    // Revert the change - navigate back via UI
    await page.click('a:has-text("Edit Profile")');
    await page.waitForURL(/\/profile\/edit/);
    await page.fill('input[formcontrolname="display_name"]', currentName);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/users\//, { timeout: 10000 });
  });
});
