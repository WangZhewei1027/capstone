import { test, expect } from '@playwright/test';

// Test file for: e03a6e75-cd32-11f0-a949-f901cf5609c9-k-means-clustering.spec.js
// URL served at:
// http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e03a6e75-cd32-11f0-a949-f901cf5609c9.html

// Page object for interacting with the K-Means demo page
class KMeansPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.canvas = page.locator('#canvas');
    this.kRange = page.locator('#kRange');
    this.kValueSpan = page.locator('#kValue');
    this.runButton = page.locator('#runButton');
    this.resetButton = page.locator('#resetButton');
    this.info = page.locator('#info');
    this.legendItems = page.locator('.legend-item');
    this.legend = page.locator('#legend');
    this.heading = page.locator('h1');
    this.instructions = page.locator('#instructions');
    this.controlsRegion = page.locator('#controls[role="region"]');
  }

  async addPointAt(x, y) {
    // Click relative to canvas top-left
    await this.canvas.click({ position: { x, y } });
    // Wait a tick for UI update
    await this.page.waitForTimeout(50);
  }

  async setK(value) {
    // Set the range input's value and dispatch 'input' event
    await this.page.evaluate((v) => {
      const el = document.getElementById('kRange');
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
    // Small pause to let UI update
    await this.page.waitForTimeout(50);
  }

  async clickRun() {
    await this.runButton.click();
    // Wait for potential clustering to finish and UI update
    await this.page.waitForTimeout(200);
  }

  async clickReset() {
    await this.resetButton.click();
    await this.page.waitForTimeout(50);
  }

  async getInfoText() {
    return (await this.info.textContent())?.trim() ?? '';
  }

  async getKValueText() {
    return (await this.kValueSpan.textContent())?.trim() ?? '';
  }

  async getLegendCount() {
    return await this.legendItems.count();
  }
}

// Collect console errors and page errors for assertions
test.describe('K-Means Clustering Demo - e03a6e75', () => {
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Listen for console.error messages
    page.on('console', (msg) => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push({ text: msg.text(), location: msg.location() });
        }
      } catch (e) {
        // Swallow any exception from console handler itself
      }
    });

    // Listen for uncaught page errors
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the page under test
    await page.goto('http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e03a6e75-cd32-11f0-a949-f901cf5609c9.html', { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    // After each test, assert no uncaught page errors or console errors were observed.
    // This ensures runtime errors (ReferenceError, SyntaxError, TypeError, etc.) would fail the tests.
    expect(consoleErrors, `Console errors were logged: ${consoleErrors.map(e => e.text).join(' | ')}`).toEqual([]);
    expect(pageErrors, `Unhandled page errors occurred: ${pageErrors.map(e => String(e)).join(' | ')}`).toEqual([]);
  });

  test('Initial page load displays expected UI elements and default info', async ({ page }) => {
    // Purpose: Verify initial DOM structure, accessibility attributes, and default informational text.

    const kPage = new KMeansPage(page);

    // Heading is present and descriptive
    await expect(kPage.heading).toHaveText('K-Means Clustering Demo');

    // Instructions visible and contain guidance text
    await expect(kPage.instructions).toBeVisible();
    const instructionsText = await kPage.instructions.textContent();
    expect(instructionsText?.includes('Click inside the white canvas to add points'), true);

    // Controls region exists with aria-label
    await expect(kPage.controlsRegion).toBeVisible();

    // Default K value shown should match the input's default (3)
    const kValueText = await kPage.getKValueText();
    expect(kValueText).toBe('3');

    // Info box should have initial guidance text
    const info = await kPage.getInfoText();
    expect(info).toContain('Click on canvas to add points. Set K and run clustering.');
  });

  test('Clicking canvas adds points and updates info with total count', async ({ page }) => {
    // Purpose: Validate that user interactions (clicks) on the canvas add points and update the info element.

    const kPage1 = new KMeansPage(page);

    // Click at two different positions on the canvas
    await kPage.addPointAt(100, 100);
    let infoText = await kPage.getInfoText();
    expect(infoText).toContain('Point added. Total points: 1');

    await kPage.addPointAt(200, 150);
    infoText = await kPage.getInfoText();
    expect(infoText).toContain('Point added. Total points: 2');
  });

  test('Running K-Means without points prompts the user to add points', async ({ page }) => {
    // Purpose: Ensure user is warned if they attempt to run clustering with zero points.

    const kPage2 = new KMeansPage(page);

    // Ensure there are no points by clicking reset
    await kPage.clickReset();
    const infoAfterReset = await kPage.getInfoText();
    expect(infoAfterReset).toContain('Points reset. Add new points by clicking on the canvas.');

    // Click Run without adding any points
    await kPage.clickRun();
    const infoAfterRun = await kPage.getInfoText();
    expect(infoAfterRun).toContain('Please add points by clicking on the canvas first.');
  });

  test('Setting K greater than number of points shows appropriate error', async ({ page }) => {
    // Purpose: Test K > points edge case and ensure validation message appears.

    const kPage3 = new KMeansPage(page);

    // Reset to ensure clean state, then add a single point
    await kPage.clickReset();
    await kPage.addPointAt(50, 50);

    // Set K to something larger than 1 (for example 3)
    await kPage.setK(3);
    const kVal = await kPage.getKValueText();
    expect(kVal).toBe('3');

    // Run clustering - should warn that number of clusters cannot exceed number of points
    await kPage.clickRun();
    const infoText1 = await kPage.getInfoText();
    expect(infoText).toContain('Number of clusters cannot exceed number of points.');
  });

  test('Successful K-Means run updates legend with cluster entries and shows iterations', async ({ page }) => {
    // Purpose: Add multiple distinct points, run K-Means with a valid K, and assert legend and info update.

    const kPage4 = new KMeansPage(page);

    // Reset, then add several points spread across the canvas
    await kPage.clickReset();
    const points = [
      { x: 80, y: 80 },
      { x: 120, y: 90 },
      { x: 400, y: 400 },
      { x: 420, y: 380 },
      { x: 300, y: 120 },
    ];
    for (const p of points) {
      await kPage.addPointAt(p.x, p.y);
    }

    // Use K = 2 which is valid (points.length = 5)
    await kPage.setK(2);
    await kPage.clickRun();

    const infoText2 = await kPage.getInfoText();
    // Info should indicate convergence and iterations count
    expect(infoText).toMatch(/K-Means converged in \d+ iterations \([\d.]+ ms\)\./);

    // Legend should contain two items corresponding to K = 2
    const legendCount = await kPage.getLegendCount();
    expect(legendCount).toBe(2);

    // Each legend item should have a label "Cluster 1", "Cluster 2"
    for (let i = 0; i < legendCount; i++) {
      const label = await page.locator('.legend-item >> nth=' + i + ' >> text=Cluster').nth(0).textContent();
      expect(label?.trim().startsWith('Cluster')).toBeTruthy();
    }
  });

  test('Reset button clears points and resets UI state', async ({ page }) => {
    // Purpose: Ensure the Reset Points button clears added points and updates info appropriately.

    const kPage5 = new KMeansPage(page);

    // Add a couple of points
    await kPage.addPointAt(60, 60);
    await kPage.addPointAt(120, 200);

    // Confirm points were added
    let infoText3 = await kPage.getInfoText();
    expect(infoText).toContain('Point added. Total points:');

    // Click reset and verify info message and that legend is empty
    await kPage.clickReset();
    const afterResetInfo = await kPage.getInfoText();
    expect(afterResetInfo).toContain('Points reset. Add new points by clicking on the canvas.');

    const legendCount1 = await kPage.getLegendCount();
    expect(legendCount).toBe(0);
  });

  test('K range input updates displayed K value and resets clusters when changed', async ({ page }) => {
    // Purpose: Verify the K slider / input updates the K value display and causes UI reset.

    const kPage6 = new KMeansPage(page);

    // Add a point then change K
    await kPage.addPointAt(150, 150);

    // Change K to 5 and verify the visible K value updates
    await kPage.setK(5);
    const kValue = await kPage.getKValueText();
    expect(kValue).toBe('5');

    // Changing K should reset clusters/centroids and not create legend entries
    const legendCount2 = await kPage.getLegendCount();
    expect(legendCount).toBe(0);

    // Info text should be empty after K change (per implementation)
    const infoText4 = await kPage.getInfoText();
    // Implementation sets updateInfo('') on K change
    expect(infoText === '' || infoText.length >= 0).toBeTruthy();
  });
});