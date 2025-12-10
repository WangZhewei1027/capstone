import { test, expect } from '@playwright/test';

// URL of the served HTML file
const PAGE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b86372-d1d5-11f0-b49a-6f458b3a25ef.html';

// Page Object Model for the Prim's Algorithm page
class PrimPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.canvas = page.locator('#graphCanvas');
    this.startButton = page.locator('#startButton');
  }

  // Return the canvas element handle as a locator
  getCanvasLocator() {
    return this.canvas;
  }

  // Click the Start button
  async clickStart() {
    await this.startButton.click();
  }

  // Get the canvas content as a data URL (PNG)
  async getCanvasDataURL() {
    return await this.page.evaluate(() => {
      const c = document.getElementById('graphCanvas');
      // toDataURL will throw if no canvas or if tainted, but we let it happen naturally
      return c ? c.toDataURL() : null;
    });
  }

  // Check that the 2D rendering context exists on the canvas
  async has2DContext() {
    return await this.page.evaluate(() => {
      const c1 = document.getElementById('graphCanvas');
      if (!c) return false;
      try {
        const ctx = c.getContext('2d');
        return !!ctx;
      } catch (e) {
        // Let exceptions happen naturally; return false to let the test assert appropriately.
        return false;
      }
    });
  }
}

test.describe("Prim's Algorithm Visualization - UI and behavior", () => {
  let primPage;
  // Arrays to collect console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  // Navigate to the page and setup listeners before each test
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect page errors (uncaught exceptions)
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Go to the application page exactly as-is
    await page.goto(PAGE_URL, { waitUntil: 'load' });

    primPage = new PrimPage(page);
  });

  // Teardown: assert no unexpected page errors or console errors by default
  test.afterEach(async () => {
    // Assert that there are no uncaught page errors
    expect(pageErrors.length).toBe(0);

    // Assert that console does not contain error messages
    const consoleErrors = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    expect(consoleErrors.length).toBe(0);
  });

  test('Initial load: canvas and Start button are present and visible', async ({ page }) => {
    // Purpose: Verify initial DOM elements are present and have expected attributes and accessibility labels.

    // Check button exists and is visible with expected label
    await expect(primPage.startButton).toBeVisible();
    await expect(primPage.startButton).toHaveText("Start Prim's Algorithm");

    // Check canvas exists and has expected dimensions
    await expect(primPage.getCanvasLocator()).toBeVisible();
    await expect(primPage.getCanvasLocator()).toHaveAttribute('width', '600');
    await expect(primPage.getCanvasLocator()).toHaveAttribute('height', '400');

    // Verify the canvas 2D context is available
    const hasCtx = await primPage.has2DContext();
    expect(hasCtx).toBe(true);
  });

  test('Initial canvas drawing exists (non-empty data URL) before interactions', async () => {
    // Purpose: Ensure that the initial drawGraph() call produced visible content on the canvas.

    const dataURL = await primPage.getCanvasDataURL();
    // toDataURL must return a long string like 'data:image/png;base64,...'
    expect(typeof dataURL).toBe('string');
    expect(dataURL.length).toBeGreaterThan(100); // crude check that the canvas is not empty
    expect(dataURL.startsWith('data:image/png')).toBe(true);
  });

  test('Clicking Start button runs Prim\'s algorithm and updates canvas', async () => {
    // Purpose: Validate that clicking the start button triggers the algorithm and results in visual changes.
    // Capture the canvas content before clicking
    const before = await primPage.getCanvasDataURL();
    expect(before).toBeTruthy();

    // Click the Start button to run primsAlgorithm()
    await primPage.clickStart();

    // Wait briefly for drawing updates; the script draws synchronously inside primsAlgorithm,
    // but allow a short timeout to ensure browser painting finishes.
    await primPage.page.waitForTimeout(200);

    // Capture the canvas after clicking
    const after = await primPage.getCanvasDataURL();
    expect(after).toBeTruthy();

    // The canvas should change after running the algorithm (red highlighted edges drawn)
    expect(after).not.toBe(before);
  });

  test('Clicking Start multiple times does not produce errors and canvas remains renderable', async () => {
    // Purpose: Ensure repeated user interactions do not cause runtime errors and that the canvas remains valid.

    // Click Start multiple times
    await primPage.clickStart();
    await primPage.page.waitForTimeout(100);
    await primPage.clickStart();
    await primPage.page.waitForTimeout(100);
    await primPage.clickStart();
    await primPage.page.waitForTimeout(100);

    // Ensure canvas still returns a valid data URL
    const final = await primPage.getCanvasDataURL();
    expect(typeof final).toBe('string');
    expect(final.length).toBeGreaterThan(100);
  });

  test('Accessibility and content checks: button role and label', async () => {
    // Purpose: Check basic accessibility attributes are present and meaningful.

    // The start button should be reachable by role 'button' and have the expected accessible name
    const buttonByRole = primPage.page.getByRole('button', { name: "Start Prim's Algorithm" });
    await expect(buttonByRole).toBeVisible();
    await expect(buttonByRole).toHaveText("Start Prim's Algorithm");
  });

  test('Canvas drawing changes reflect algorithm steps (data URL changes after each run)', async () => {
    // Purpose: Ensure that running the algorithm produces consistent visual changes across runs.
    // Run once and record
    const first = await primPage.getCanvasDataURL();
    await primPage.clickStart();
    await primPage.page.waitForTimeout(150);
    const second = await primPage.getCanvasDataURL();
    expect(second).not.toBe(first);

    // Run again and ensure the canvas still produces a PNG data URL (stability)
    await primPage.clickStart();
    await primPage.page.waitForTimeout(150);
    const third = await primPage.getCanvasDataURL();
    expect(typeof third).toBe('string');
    expect(third.length).toBeGreaterThan(100);
  });

  test('No unexpected ReferenceError, SyntaxError, or TypeError occurred during load and interactions', async () => {
    // Purpose: Explicitly observe console and page errors while performing interactions.
    // This test performs one interaction and verifies that no runtime errors were emitted.

    // Perform a typical user action
    await primPage.clickStart();
    await primPage.page.waitForTimeout(100);

    // At this point the afterEach hook will assert no page errors or console errors.
    // Here we explicitly assert the arrays to provide a clearer failure message if needed:
    expect(pageErrors.length).toBe(0);
    const consoleErrs = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    expect(consoleErrs.length).toBe(0);
  });
});