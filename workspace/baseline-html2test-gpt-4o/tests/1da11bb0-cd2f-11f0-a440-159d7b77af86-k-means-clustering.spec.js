import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da11bb0-cd2f-11f0-a440-159d7b77af86.html';

test.describe('K-Means Clustering Demonstration - End-to-End', () => {
  // Arrays to collect console messages and page errors for assertions
  let consoleMessages = [];
  let pageErrors = [];

  // A small page object for interacting with the K-Means app
  class KMeansPage {
    constructor(page) {
      this.page = page;
    }

    // Sample N pixels from the canvas at semi-random deterministic positions
    // Returns an array of [r,g,b,a] values for each sampled coordinate
    async sampleCanvasPixels(sampleCount = 20) {
      return await this.page.evaluate((count) => {
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        // Use deterministic pseudo-random sampling based on simple LCG so tests are stable
        let seed = 123456789;
        function rand() {
          seed = (1103515245 * seed + 12345) % 0x7fffffff;
          return seed / 0x7fffffff;
        }
        const samples = [];
        for (let i = 0; i < count; i++) {
          const x = Math.floor(rand() * w);
          const y = Math.floor(rand() * h);
          const data = ctx.getImageData(x, y, 1, 1).data;
          samples.push([data[0], data[1], data[2], data[3]]);
        }
        return samples;
      }, sampleCount);
    }

    // Click the Run K-Means button
    async clickRunKMeans() {
      await this.page.click('#runKMeans');
      // runKMeans performs synchronous iterations and draws; allow a tick
      await this.page.waitForTimeout(50);
    }

    // Trigger keyboard "Enter" on the button
    async pressEnterOnButton() {
      await this.page.focus('#runKMeans');
      await this.page.keyboard.press('Enter');
      await this.page.waitForTimeout(50);
    }
  }

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages for inspection
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the application page
    await page.goto(APP_URL, { waitUntil: 'load' });
    // Ensure DOM is ready
    await page.waitForSelector('#canvas');
    await page.waitForSelector('#runKMeans');
  });

  test.afterEach(async () => {
    // No-op here; Playwright test runner will close pages automatically
  });

  test('Initial page load shows heading, canvas and Run K-Means button', async ({ page }) => {
    // Verify title and heading
    await expect(page).toHaveTitle(/K-Means Clustering Demonstration/);
    const heading = await page.locator('h1').innerText();
    expect(heading.trim()).toBe('K-Means Clustering Demonstration');

    // Verify canvas exists and has expected dimensions
    const canvas = page.locator('#canvas');
    await expect(canvas).toBeVisible();
    const width = await canvas.getAttribute('width');
    const height = await canvas.getAttribute('height');
    expect(Number(width)).toBe(500);
    expect(Number(height)).toBe(500);

    // Verify Run K-Means button exists and is enabled
    const button = page.locator('#runKMeans');
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
    await expect(button).toHaveText('Run K-Means');

    // Ensure no uncaught page errors occurred during initial load
    expect(pageErrors.length).toBe(0);
    // Ensure no console errors were logged on load
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('K-Means related functions are exposed; points/centroids are not global properties', async ({ page }) => {
    // Some functions are declared as function declarations and should be available on window.
    // variables declared with const (points, centroids) should NOT be available as window properties.
    const result = await page.evaluate(() => {
      return {
        hasRunKMeans: typeof window.runKMeans === 'function',
        hasDrawPoints: typeof window.drawPoints === 'function',
        hasAssignClusters: typeof window.assignClusters === 'function',
        hasUpdateCentroids: typeof window.updateCentroids === 'function',
        // points and centroids were declared with const in the inline script; in classic scripts const does not create window properties
        pointsOnWindow: Object.prototype.hasOwnProperty.call(window, 'points'),
        centroidsOnWindow: Object.prototype.hasOwnProperty.call(window, 'centroids'),
        // Also verify that runKMeans is callable (we won't call it here)
        typeofRunKMeans: typeof window.runKMeans
      };
    });

    // Assert the function declarations are present as functions on window
    expect(result.hasRunKMeans).toBe(true);
    expect(result.hasDrawPoints).toBe(true);
    expect(result.hasAssignClusters).toBe(true);
    expect(result.hasUpdateCentroids).toBe(true);
    expect(result.typeofRunKMeans).toBe('function');

    // Assert points and centroids are not present as window properties (they were declared with const)
    expect(result.pointsOnWindow).toBe(false);
    expect(result.centroidsOnWindow).toBe(false);

    // No runtime errors observed
    expect(pageErrors.length).toBe(0);
  });

  test('Clicking Run K-Means updates the canvas drawing (pixel sample differs)', async ({ page }) => {
    const app = new KMeansPage(page);

    // Sample a set of pixels before running K-Means
    const beforeSamples = await app.sampleCanvasPixels(30);

    // Click the button to run K-Means algorithm
    await app.clickRunKMeans();

    // Sample same set of pixels after running
    const afterSamples = await app.sampleCanvasPixels(30);

    // At least one sampled pixel should differ after the algorithm runs (centroids moved and redrawn)
    let anyDifferent = false;
    for (let i = 0; i < beforeSamples.length; i++) {
      const a = beforeSamples[i];
      const b = afterSamples[i];
      if (a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2] || a[3] !== b[3]) {
        anyDifferent = true;
        break;
      }
    }
    expect(anyDifferent).toBe(true);

    // Ensure no uncaught errors occurred when running the algorithm
    expect(pageErrors.length).toBe(0);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Multiple clicks of Run K-Means remain stable and produce no runtime exceptions', async ({ page }) => {
    const app = new KMeansPage(page);

    // Click several times with waits in between to simulate repeated user interaction
    await app.clickRunKMeans();
    await app.clickRunKMeans();
    await app.clickRunKMeans();

    // After multiple runs there should be no page errors or console error messages
    expect(pageErrors.length).toBe(0);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Button is keyboard accessible and running via Enter key updates canvas', async ({ page }) => {
    const app = new KMeansPage(page);

    // Sample before
    const before = await app.sampleCanvasPixels(25);

    // Focus button and press Enter
    await app.pressEnterOnButton();

    // Sample after pressing Enter
    const after = await app.sampleCanvasPixels(25);

    // Verify at least one sample differs
    let changed = false;
    for (let i = 0; i < before.length; i++) {
      const a = before[i];
      const b = after[i];
      if (a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2] || a[3] !== b[3]) {
        changed = true;
        break;
      }
    }
    expect(changed).toBe(true);

    // No runtime exceptions via keyboard interaction
    expect(pageErrors.length).toBe(0);
  });

  test('Sanity check: ensure canvas has some non-empty pixels on initial draw', async ({ page }) => {
    // This verifies that the initial drawPoints rendered something (non-transparent pixel)
    const nonTransparentFound = await page.evaluate(() => {
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      // Sample a grid of points to detect any non-zero alpha pixels
      for (let y = 10; y < h; y += 50) {
        for (let x = 10; x < w; x += 50) {
          const d = ctx.getImageData(x, y, 1, 1).data;
          if (d[3] !== 0) return true; // non-transparent pixel found
        }
      }
      return false;
    });

    expect(nonTransparentFound).toBe(true);
    expect(pageErrors.length).toBe(0);
  });

  test('No accidental global variable pollution from the app (further check)', async ({ page }) => {
    // Confirm common globals were not accidentally overwritten (very basic checks)
    const globalsOk = await page.evaluate(() => {
      return {
        typeofDocument: typeof document,
        typeofWindow: typeof window,
        // Check that common DOM APIs still exist
        hasQuerySelector: typeof document.querySelector === 'function',
        hasCreateElement: typeof document.createElement === 'function'
      };
    });

    expect(globalsOk.typeofDocument).toBe('object');
    expect(globalsOk.typeofWindow).toBe('object');
    expect(globalsOk.hasQuerySelector).toBe(true);
    expect(globalsOk.hasCreateElement).toBe(true);

    // No runtime errors noticed during these checks
    expect(pageErrors.length).toBe(0);
  });
});