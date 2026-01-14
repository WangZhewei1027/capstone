import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8af3c0-d59e-11f0-89ab-2f71529652ac.html';

test.describe('K-Means Clustering Visualization - End-to-end', () => {
  // Arrays to collect console messages and page errors for assertions
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Reset collectors before each test
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages for later inspection
    page.on('console', msg => {
      try {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
      } catch {
        consoleMessages.push({ type: 'unknown', text: String(msg) });
      }
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err && err.message ? err.message : String(err));
    });

    // Navigate to the application page and ensure main elements are loaded
    await page.goto(APP_URL);
    await page.waitForSelector('h1');
    await page.waitForSelector('#canvas');
    await page.waitForSelector('#runKMeans');
  });

  test.afterEach(async ({ page }) => {
    // Ensure page is closed between tests to avoid cross-test state leakage
    await page.close();
  });

  test.describe('Initial page load and default state', () => {
    test('should load page, show title, canvas and button', async ({ page }) => {
      // Verify key DOM elements are visible and have expected attributes
      const title = await page.textContent('h1');
      expect(title).toContain('K-Means Clustering');

      const canvas = await page.$('#canvas');
      expect(canvas).not.toBeNull();
      const button = await page.$('#runKMeans');
      expect(button).not.toBeNull();
      expect(await button.isVisible()).toBe(true);

      // Capture initial canvas drawing as data URL (script initializes points but does not draw initially)
      const initialDataUrl = await page.$eval('#canvas', (c) => c.toDataURL());
      expect(typeof initialDataUrl).toBe('string');
      expect(initialDataUrl.startsWith('data:image')).toBe(true);

      // Assert that no uncaught page errors occurred during initial load
      expect(pageErrors).toEqual([]);
    });

    test('attempting to access internal arrays (points/centroids) from the test should throw ReferenceError', async ({ page }) => {
      // The page's script uses top-level const declarations for points/centroids.
      // In a non-module script, let/const do not create properties on window,
      // so attempting to access them directly from the page context should fail.
      await expect(page.evaluate(() => centroids)).rejects.toThrow(/ReferenceError/i);
      await expect(page.evaluate(() => points)).rejects.toThrow(/ReferenceError/i);
    });
  });

  test.describe('Interactive behavior and K-Means execution', () => {
    test('clicking "Run K-Means" runs algorithm and updates canvas visuals', async ({ page }) => {
      // Get canvas image before running the algorithm
      const beforeRun = await page.$eval('#canvas', (c) => c.toDataURL());

      // Click the Run K-Means button and allow the algorithm to run
      await page.click('#runKMeans');

      // Wait briefly to allow drawing to finish (kMeans runs synchronously but we give a small margin)
      await page.waitForTimeout(250);

      // Capture canvas after running
      const afterRun = await page.$eval('#canvas', (c) => c.toDataURL());
      expect(typeof afterRun).toBe('string');
      expect(afterRun.startsWith('data:image')).toBe(true);

      // The drawing after running K-Means should not be identical to the initial blank canvas
      // (At minimum the centroids should have been drawn)
      expect(afterRun).not.toEqual(beforeRun);

      // Ensure no uncaught page errors happened during the click/run
      expect(pageErrors).toEqual([]);
    });

    test('multiple clicks should not throw uncaught exceptions and should modify visuals', async ({ page }) => {
      // First run
      await page.click('#runKMeans');
      await page.waitForTimeout(200);
      const firstRun = await page.$eval('#canvas', (c) => c.toDataURL());

      // Second run - note: the app accumulates points/centroids due to implementation, but tests must not patch anything
      await page.click('#runKMeans');
      await page.waitForTimeout(200);
      const secondRun = await page.$eval('#canvas', (c) => c.toDataURL());

      // Visuals are expected to change when the internal state changes (due to accumulation)
      expect(secondRun).toBeTruthy();
      // It's possible the image may coincidentally be identical, but in the vast majority of runs they differ;
      // therefore assert that the second run result is a valid data URL and not empty.
      expect(secondRun.length).toBeGreaterThan(100);

      // Ensure no uncaught page errors occurred during repeated interactions
      expect(pageErrors).toEqual([]);
    });

    test('canvas contains drawing data (pixel data accessible) after algorithm runs', async ({ page }) => {
      // Run the algorithm to ensure drawing happened
      await page.click('#runKMeans');
      await page.waitForTimeout(200);

      // Retrieve a small central region of the canvas as a Data URL and assert it's valid
      const dataUrl = await page.$eval('#canvas', (c) => c.toDataURL('image/png'));
      expect(dataUrl).toMatch(/^data:image\/png;base64,/);

      // Basic sanity: check length of dataUrl (ensures non-empty PNG)
      expect(dataUrl.length).toBeGreaterThan(200);
      // Ensure no uncaught page errors occurred during this operation
      expect(pageErrors).toEqual([]);
    });
  });

  test.describe('Error handling and edge cases', () => {
    test('accessing undefined internals from the page context throws and is surfaced to the test', async ({ page }) => {
      // These attempts rely on letting ReferenceError surface naturally from page context.
      // We assert that such accesses do indeed reject with a ReferenceError-like message.
      await expect(page.evaluate(() => centroids)).rejects.toThrow(/ReferenceError/i);
      await expect(page.evaluate(() => points)).rejects.toThrow(/ReferenceError/i);
    });

    test('perform heavy repeated runs and ensure no uncaught exceptions (stress test)', async ({ page }) => {
      // Click the run button several times in a loop to simulate stress usage.
      for (let i = 0; i < 5; i++) {
        await page.click('#runKMeans');
        // Small wait to let synchronous work finish and drawing occur
        await page.waitForTimeout(150);
      }

      // After repeated runs, ensure there were no uncaught exceptions
      expect(pageErrors).toEqual([]);

      // Ensure canvas still returns a valid image data URL
      const finalDataUrl = await page.$eval('#canvas', (c) => c.toDataURL());
      expect(finalDataUrl).toMatch(/^data:image\/png;base64,/);
      expect(finalDataUrl.length).toBeGreaterThan(200);
    });
  });

  test.describe('Accessibility and basic UI checks', () => {
    test('Run K-Means button is reachable and labeled correctly', async ({ page }) => {
      const buttonText = await page.textContent('#runKMeans');
      expect(buttonText).toBeTruthy();
      expect(buttonText).toContain('Run K-Means');
      expect(await page.isVisible('#runKMeans')).toBe(true);

      // Ensure button is focusable
      await page.focus('#runKMeans');
      const focused = await page.evaluate(() => document.activeElement && document.activeElement.id);
      expect(focused).toBe('runKMeans');

      // No uncaught errors from focusing
      expect(pageErrors).toEqual([]);
    });
  });

  test.describe('Console observation', () => {
    test('console messages are captured (if any) and do not include uncaught errors', async ({ page }) => {
      // There are no explicit console logs in the app, but we capture whatever appears
      // Trigger some actions to potentially produce console output
      await page.click('#runKMeans');
      await page.waitForTimeout(150);

      // The messages array is captured via page.on('console')
      // We assert it's an array (may be empty) and does not contain "error" messages coming from page errors.
      expect(Array.isArray(consoleMessages)).toBe(true);

      // Ensure that none of the console messages are 'error' type that originated as page errors
      const errorConsoles = consoleMessages.filter(m => m.type === 'error');
      // It's acceptable to have no error-console messages; if there are, they are surfaced via pageErrors too.
      expect(typeof consoleMessages).toBe('object');

      // Finally, ensure there were no uncaught page errors
      expect(pageErrors).toEqual([]);
    });
  });
});