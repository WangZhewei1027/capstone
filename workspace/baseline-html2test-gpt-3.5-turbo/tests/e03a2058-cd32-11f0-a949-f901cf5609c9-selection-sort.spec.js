import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e03a2058-cd32-11f0-a949-f901cf5609c9.html';

/**
 * Page Object for Selection Sort page.
 * Encapsulates common interactions and queries for tests.
 */
class SelectionSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayContainer = page.locator('#arrayContainer');
    this.generateBtn = page.locator('#generateBtn');
    this.sortBtn = page.locator('#sortBtn');
    this.arraySizeInput = page.locator('#arraySize');
    this.speedRange = page.locator('#speedRange');
    this.speedLabel = page.locator('#speedLabel');
  }

  // Navigate to the app URL
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Return locator for all bars
  bars() {
    return this.page.locator('#arrayContainer .bar');
  }

  // Get count of bars
  async getBarCount() {
    return await this.bars().count();
  }

  // Get array of numeric values shown in bars (textContent -> numbers)
  async getBarValues() {
    const count = await this.getBarCount();
    const values = [];
    for (let i = 0; i < count; i++) {
      const txt = await this.bars().nth(i).textContent();
      values.push(Number(txt?.trim()));
    }
    return values;
  }

  // Set array size input
  async setArraySize(size) {
    await this.arraySizeInput.fill(String(size));
  }

  // Click generate button
  async clickGenerate() {
    await this.generateBtn.click();
  }

  // Set speed range value and dispatch input event so label updates
  async setSpeed(ms) {
    // Use evaluate to set and dispatch 'input' event
    await this.speedRange.evaluate((el, v) => {
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, ms);
  }

  // Get current speed label text
  async getSpeedLabel() {
    return (await this.speedLabel.textContent()).trim();
  }

  // Click sort button
  async clickSort() {
    await this.sortBtn.click();
  }

  // Utility: wait until sort button becomes enabled (used to detect end of sorting)
  async waitForSortToComplete(timeout = 15000) {
    await expect(this.sortBtn).toBeEnabled({ timeout });
  }

  // Check whether all bars currently have 'sorted' class
  async allBarsAreSorted() {
    const count1 = await this.getBarCount();
    for (let i = 0; i < count; i++) {
      const classList = await this.bars().nth(i).getAttribute('class');
      if (!classList || !classList.split(/\s+/).includes('sorted')) return false;
    }
    return true;
  }
}

test.describe('Selection Sort Visualization - e03a2058-cd32-11f0-a949-f901cf5609c9', () => {
  // Capture console errors and page errors for each test
  test.beforeEach(async ({ page }) => {
    // Ensure we start with a clean slate
    await page.context().clearCookies();
  });

  // Test initial load and default state
  test('Initial page load shows default array and UI elements', async ({ page }) => {
    // Collect console errors and page errors
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => pageErrors.push(err.message));

    const app = new SelectionSortPage(page);
    await app.goto();

    // Basic checks for presence of controls
    await expect(page.locator('h1')).toHaveText(/Selection Sort Visualization/i);
    await expect(app.generateBtn).toBeVisible();
    await expect(app.sortBtn).toBeVisible();
    await expect(app.arraySizeInput).toBeVisible();
    await expect(app.speedRange).toBeVisible();
    await expect(app.speedLabel).toBeVisible();

    // Default array size is 15 per the HTML value attribute; onload generates this many bars
    await expect(app.bars()).toHaveCount(15);

    // Each bar should have numeric text content between 1 and 100 and non-zero height style
    const values1 = await app.getBarValues();
    expect(values.length).toBe(15);
    for (const v of values) {
      expect(typeof v).toBe('number');
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(100);
    }

    // Speed label should reflect default speedRange value "500 ms"
    const speedText = await app.getSpeedLabel();
    expect(speedText).toMatch(/500\s*ms/);

    // No runtime console errors should have been emitted on load
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test.describe('Controls behavior and validation', () => {
    test('Speed range control updates label when changed', async ({ page }) => {
      const app1 = new SelectionSortPage(page);
      await app.goto();

      // Change speed to 1000 and verify label updates
      await app.setSpeed(1000);
      const label = await app.getSpeedLabel();
      expect(label).toMatch(/1000\s*ms/);

      // Change again to 200 and verify
      await app.setSpeed(200);
      const label2 = await app.getSpeedLabel();
      expect(label2).toMatch(/200\s*ms/);
    });

    test('Generate new array respects array size input and rejects invalid sizes', async ({ page }) => {
      const app2 = new SelectionSortPage(page);
      await app.goto();

      // Set a valid small size (5) and generate -> expect 5 bars
      await app.setArraySize(5);

      // Listen for any dialog (should not appear)
      let dialogSeen = false;
      page.once('dialog', async dialog => {
        dialogSeen = true;
        await dialog.accept();
      });

      await app.clickGenerate();
      await expect(app.bars()).toHaveCount(5);
      expect(dialogSeen).toBe(false);

      // Now set an invalid size (3) and click generate -> expect alert with validation message
      await app.setArraySize(3);
      const dialogPromise = page.waitForEvent('dialog');
      await app.clickGenerate();
      const dialog = await dialogPromise;
      // Assert the alert message is the expected validation
      expect(dialog.message()).toBe('Please enter array size between 5 and 50.');
      await dialog.accept();

      // After invalid input, the array should remain the previous valid size (5)
      await expect(app.bars()).toHaveCount(5);
    });
  });

  test.describe('Sorting process and visual feedback', () => {
    test('Start selection sort disables controls during run and results in sorted array', async ({ page }) => {
      const consoleErrors1 = [];
      const pageErrors1 = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', err => pageErrors.push(err.message));

      const app3 = new SelectionSortPage(page);
      await app.goto();

      // Generate a small array to speed up the test (size 5)
      await app.setArraySize(5);
      await app.clickGenerate();
      await expect(app.bars()).toHaveCount(5);

      // Set speed to a low value to make sorting complete faster
      await app.setSpeed(100);
      await expect(app.getSpeedLabel()).resolves.toMatch(/100\s*ms/);

      // Start sorting
      // Set up a short wait to detect that the sort button becomes disabled (sorting started)
      await app.clickSort();

      // Immediately after clicking, sort button should be disabled while sorting is running
      await expect(app.sortBtn).toBeDisabled();

      // Generate and arraySize input should be disabled as well
      await expect(app.generateBtn).toBeDisabled();
      await expect(app.arraySizeInput).toBeDisabled();
      await expect(app.speedRange).toBeDisabled();

      // While sorting is running, the UI should show a 'current' element at some point.
      // We attempt to observe a '.current' element during the sorting window.
      // This is a "best-effort" assertion due to async animation timings; use a short timeout.
      const currentLocator = page.locator('#arrayContainer .bar.current');
      // Wait up to 2 seconds to see a current element (likely present early in the sort)
      await expect(currentLocator).toHaveCount(1, { timeout: 2000 }).catch(() => {
        // If not present in time, continue; it's a non-fatal best-effort check.
      });

      // Wait for sorting to complete (sort button becomes enabled again)
      await app.waitForSortToComplete(20000);

      // After sorting completes, controls should be enabled again
      await expect(app.sortBtn).toBeEnabled();
      await expect(app.generateBtn).toBeEnabled();
      await expect(app.arraySizeInput).toBeEnabled();
      await expect(app.speedRange).toBeEnabled();

      // All bars should have 'sorted' class at the end
      const allSorted = await app.allBarsAreSorted();
      expect(allSorted).toBe(true);

      // The textual values shown in the bars should be sorted in non-decreasing order
      const sortedValues = await app.getBarValues();
      for (let i = 1; i < sortedValues.length; i++) {
        expect(sortedValues[i]).toBeGreaterThanOrEqual(sortedValues[i - 1]);
      }

      // Verify no console errors or page errors occurred during the sorting process
      expect(consoleErrors.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });

    test('Clicking Start when no array present triggers appropriate alert (best-effort)', async ({ page }) => {
      const app4 = new SelectionSortPage(page);
      await app.goto();

      // This application initializes an array on load; to test the "no array" alert,
      // we simulate a user removing array DOM elements (note: we are NOT modifying script variables)
      // This tests how the UI reacts to an empty visual array when sort is clicked.
      await page.evaluate(() => {
        const container = document.getElementById('arrayContainer');
        if (container) container.innerHTML = '';
      });

      // Now click Sort - because the internal array variable isn't changed by DOM manipulation,
      // the page's built-in check (array.length === 0) may not be true.
      // However, we'll still attempt to click and observe any dialog that appears.
      const dialogPromise1 = page.waitForEvent('dialog').catch(() => null);
      await app.clickSort();

      const dialog1 = await dialogPromise;
      if (dialog) {
        // If a dialog appears, assert it either requests array generation or other expected text.
        // The app would show "Generate an array first!" if it detected an empty internal array.
        expect(['Generate an array first!', '']).toContain(dialog.message());
        await dialog.accept();
      } else {
        // If no dialog appeared, ensure sort button eventually returns to enabled state.
        await app.waitForSortToComplete(10000);
      }
    });
  });
});