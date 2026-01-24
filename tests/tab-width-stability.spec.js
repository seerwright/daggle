/**
 * Playwright tests for competition detail page tab width stability.
 *
 * These tests ensure that switching between tabs does not cause
 * horizontal layout shift/reflow in the tab content container.
 */

const { test, expect } = require('@playwright/test');

// Tolerance for width comparison (accounts for sub-pixel rounding)
const WIDTH_TOLERANCE = 1;

test.describe('Competition Detail Page - Tab Width Stability', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to competition detail page
    await page.goto('/competition.html');

    // Wait for the tabs shell to be visible
    await page.waitForSelector('[data-testid="competition-tabs-shell"]');
  });

  test('tab shell width remains constant across all tabs', async ({ page }) => {
    const tabs = ['Overview', 'Task & Data', 'Evaluation', 'Getting Started', 'Rules & Timeline'];
    const widths = [];

    for (const tabName of tabs) {
      // Click the tab
      await page.getByRole('tab', { name: tabName }).click();

      // Wait for the tab panel to become active/visible
      await page.waitForSelector('.tab-panel.active', { state: 'visible' });

      // Measure the width of the stable tab content shell
      const width = await page.evaluate(() => {
        const shell = document.querySelector('[data-testid="competition-tabs-shell"]');
        return shell ? shell.getBoundingClientRect().width : null;
      });

      expect(width, `Tab shell should exist on "${tabName}" tab`).not.toBeNull();
      widths.push({ tab: tabName, width });
    }

    // Compare all widths to the first tab's width
    const referenceWidth = widths[0].width;

    for (const { tab, width } of widths) {
      const difference = Math.abs(width - referenceWidth);
      expect(
        difference,
        `Width on "${tab}" tab (${width}px) should match reference width (${referenceWidth}px) within ${WIDTH_TOLERANCE}px tolerance`
      ).toBeLessThanOrEqual(WIDTH_TOLERANCE);
    }

    // Log widths for debugging
    console.log('Tab widths:', widths);
  });

  test('tab container width remains constant across all tabs', async ({ page }) => {
    const tabs = ['Overview', 'Task & Data', 'Evaluation', 'Getting Started', 'Rules & Timeline'];
    const widths = [];

    for (const tabName of tabs) {
      // Click the tab
      await page.getByRole('tab', { name: tabName }).click();

      // Wait for the tab panel to become active/visible
      await page.waitForSelector('.tab-panel.active', { state: 'visible' });

      // Measure the width of the tab container
      const width = await page.evaluate(() => {
        const container = document.querySelector('.tab-container');
        return container ? container.getBoundingClientRect().width : null;
      });

      expect(width, `Tab container should exist on "${tabName}" tab`).not.toBeNull();
      widths.push({ tab: tabName, width });
    }

    // Compare all widths to the first tab's width
    const referenceWidth = widths[0].width;

    for (const { tab, width } of widths) {
      const difference = Math.abs(width - referenceWidth);
      expect(
        difference,
        `Container width on "${tab}" tab (${width}px) should match reference width (${referenceWidth}px) within ${WIDTH_TOLERANCE}px tolerance`
      ).toBeLessThanOrEqual(WIDTH_TOLERANCE);
    }
  });

  test('page width remains constant across all tabs', async ({ page }) => {
    const tabs = ['Overview', 'Task & Data', 'Evaluation', 'Getting Started', 'Rules & Timeline'];
    const widths = [];

    for (const tabName of tabs) {
      // Click the tab
      await page.getByRole('tab', { name: tabName }).click();

      // Wait for the tab panel to become active/visible
      await page.waitForSelector('.tab-panel.active', { state: 'visible' });

      // Measure the width of the competition page
      const width = await page.evaluate(() => {
        const pageEl = document.querySelector('.competition-page');
        return pageEl ? pageEl.getBoundingClientRect().width : null;
      });

      expect(width, `Competition page should exist on "${tabName}" tab`).not.toBeNull();
      widths.push({ tab: tabName, width });
    }

    // Compare all widths to the first tab's width
    const referenceWidth = widths[0].width;

    for (const { tab, width } of widths) {
      const difference = Math.abs(width - referenceWidth);
      expect(
        difference,
        `Page width on "${tab}" tab (${width}px) should match reference width (${referenceWidth}px) within ${WIDTH_TOLERANCE}px tolerance`
      ).toBeLessThanOrEqual(WIDTH_TOLERANCE);
    }
  });

  test('data-testid attribute exists on tabs shell', async ({ page }) => {
    // Verify the stable selector exists for future tests
    const shell = await page.locator('[data-testid="competition-tabs-shell"]');
    await expect(shell).toBeVisible();
    await expect(shell).toHaveClass(/tab-panels/);
  });

  test('tabs use proper ARIA roles', async ({ page }) => {
    // Verify tabs have proper role="tab" attribute
    const tabs = page.getByRole('tab');
    await expect(tabs).toHaveCount(5);

    // Verify tablist exists
    const tablist = page.getByRole('tablist');
    await expect(tablist).toBeVisible();

    // Verify tabpanel exists
    const tabpanel = page.getByRole('tabpanel');
    await expect(tabpanel).toBeVisible();
  });

  test('width stability at different viewport widths', async ({ page }) => {
    const viewportWidths = [1400, 1200, 1024, 900, 768];

    for (const viewportWidth of viewportWidths) {
      await page.setViewportSize({ width: viewportWidth, height: 800 });

      const tabs = ['Overview', 'Evaluation']; // Test subset for performance
      const widths = [];

      for (const tabName of tabs) {
        await page.getByRole('tab', { name: tabName }).click();
        await page.waitForSelector('.tab-panel.active', { state: 'visible' });

        const width = await page.evaluate(() => {
          const shell = document.querySelector('[data-testid="competition-tabs-shell"]');
          return shell ? shell.getBoundingClientRect().width : null;
        });

        widths.push({ tab: tabName, width });
      }

      // Verify consistency at this viewport
      const referenceWidth = widths[0].width;
      for (const { tab, width } of widths) {
        const difference = Math.abs(width - referenceWidth);
        expect(
          difference,
          `At ${viewportWidth}px viewport: "${tab}" tab width (${width}px) should match reference (${referenceWidth}px)`
        ).toBeLessThanOrEqual(WIDTH_TOLERANCE);
      }
    }
  });
});
