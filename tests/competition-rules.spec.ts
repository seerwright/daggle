/**
 * Playwright e2e tests for competition rules functionality.
 *
 * These tests verify:
 * - Rules tab displays empty state when no rules defined
 * - Rules API returns templates
 * - Rules can be created for a competition
 * - Rules tab displays rules grouped by category
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
  return `Rules Test ${Date.now()}`;
}

async function createCompetition(page: Page): Promise<string> {
  const title = generateUniqueTitle();

  await page.goto('/competitions/create');
  await page.waitForLoadState('networkidle');

  await page.fill('input[formcontrolname="title"]', title);
  await page.fill('textarea[formcontrolname="short_description"]', 'Test competition for rules testing.');
  await page.fill('textarea[formcontrolname="description"]', 'Full description of test competition for rules.');
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

test.describe.serial('Competition Rules', () => {

  test('setup: create test competition', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);
    competitionSlug = await createCompetition(page);
    console.log(`Created test competition: ${competitionSlug}`);
    expect(competitionSlug).toBeTruthy();
  });

  test('Rules tab shows empty state when no rules defined', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    await page.goto(`/competitions/${competitionSlug}?tab=rules`);
    await page.waitForLoadState('networkidle');

    // Check empty state is displayed
    await expect(page.locator('app-rules-tab .empty-state')).toBeVisible();
    await expect(page.locator('app-rules-tab .empty-title')).toHaveText('No Rules Defined');
  });

  test('Rule templates API returns templates', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    const token = await page.evaluate(() => localStorage.getItem('daggle_token'));

    // Fetch rule templates
    const result = await page.evaluate(async ({ token }) => {
      const response = await fetch('http://localhost:8000/competitions/rule-templates', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      return { status: response.status, ok: response.ok, data };
    }, { token });

    expect(result.ok).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);

    // Check template structure
    const template = result.data[0];
    expect(template).toHaveProperty('id');
    expect(template).toHaveProperty('category');
    expect(template).toHaveProperty('template_text');
    expect(template).toHaveProperty('has_parameter');
  });

  test('Rules can be created via API', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    const token = await page.evaluate(() => localStorage.getItem('daggle_token'));

    // First get templates to get a valid template ID
    const templatesResult = await page.evaluate(async ({ token }) => {
      const response = await fetch('http://localhost:8000/competitions/rule-templates', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      return await response.json();
    }, { token });

    expect(templatesResult.length).toBeGreaterThan(0);

    // Find a template with a parameter (like max team size)
    const teamSizeTemplate = templatesResult.find(
      (t: any) => t.template_text.includes('maximum of {n} members')
    );
    expect(teamSizeTemplate).toBeTruthy();

    // Create rule with parameter
    const createResult = await page.evaluate(async ({ slug, templateId, token }) => {
      const response = await fetch(`http://localhost:8000/competitions/${slug}/rules`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rule_template_id: templateId,
          parameter_value: '5',
          display_order: 0,
        }),
      });
      const data = await response.json();
      return { status: response.status, ok: response.ok, data };
    }, { slug: competitionSlug, templateId: teamSizeTemplate.id, token });

    expect(createResult.ok).toBe(true);
    expect(createResult.data.rendered_text).toContain('5 members');

    // Find a simple template (no parameter)
    const simpleTemplate = templatesResult.find(
      (t: any) => t.template_text.includes('only belong to one team')
    );
    expect(simpleTemplate).toBeTruthy();

    // Create rule without parameter
    const createResult2 = await page.evaluate(async ({ slug, templateId, token }) => {
      const response = await fetch(`http://localhost:8000/competitions/${slug}/rules`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rule_template_id: templateId,
          display_order: 1,
        }),
      });
      return { status: response.status, ok: response.ok };
    }, { slug: competitionSlug, templateId: simpleTemplate.id, token });

    expect(createResult2.ok).toBe(true);

    // Create a custom rule
    const customResult = await page.evaluate(async ({ slug, token }) => {
      const response = await fetch(`http://localhost:8000/competitions/${slug}/rules`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          custom_text: 'All submissions must be reproducible',
          display_order: 2,
        }),
      });
      return { status: response.status, ok: response.ok };
    }, { slug: competitionSlug, token });

    expect(customResult.ok).toBe(true);
  });

  test('Rules tab displays rules grouped by category', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    await page.goto(`/competitions/${competitionSlug}?tab=rules`);
    await page.waitForLoadState('networkidle');

    // Wait for rules to load
    await page.waitForSelector('.rules-content', { timeout: 10000 });

    // Check that rules content is displayed
    await expect(page.locator('.rules-content')).toBeVisible();
    await expect(page.locator('.section-title')).toContainText('Competition Rules');

    // Check for category sections
    await expect(page.locator('.rule-category')).toBeVisible();
    await expect(page.locator('.category-title')).toBeVisible();

    // Check for rule items
    await expect(page.locator('.rule-item')).toHaveCount(3); // We created 3 rules

    // Verify the parameterized rule shows the value
    await expect(page.locator('.rule-text')).toContainText('5 members');
  });

  test('Rules display endpoint returns grouped rules', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    const token = await page.evaluate(() => localStorage.getItem('daggle_token'));

    const result = await page.evaluate(async ({ slug, token }) => {
      const response = await fetch(`http://localhost:8000/competitions/${slug}/rules/display`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      return { status: response.status, ok: response.ok, data };
    }, { slug: competitionSlug, token });

    expect(result.ok).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);

    // Should have categories
    const categories = result.data.map((c: any) => c.category);
    expect(categories).toContain('Team Formation');
    expect(categories).toContain('Custom Rules');

    // Each category should have rules array
    for (const category of result.data) {
      expect(Array.isArray(category.rules)).toBe(true);
      expect(category.rules.length).toBeGreaterThan(0);
    }
  });

  test('Rules footer message is displayed', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await loginViaUI(page, ADMIN_USER.email, ADMIN_USER.password);

    await page.goto(`/competitions/${competitionSlug}?tab=rules`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.rules-content', { timeout: 10000 });

    // Check footer is displayed
    await expect(page.locator('.rules-footer')).toBeVisible();
    await expect(page.locator('.rules-footer')).toContainText('agree to abide by these rules');
  });

});
