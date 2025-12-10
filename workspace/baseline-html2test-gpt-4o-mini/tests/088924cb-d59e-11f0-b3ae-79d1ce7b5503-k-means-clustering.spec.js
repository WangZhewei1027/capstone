import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/088924cb-d59e-11f0-b3ae-79d1ce7b5503.html';

test.describe('K-Means Clustering Visualization - 088924cb-d59e-11f0-b3ae-79d1ce7b5503', () => {
  // Arrays to capture console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  // Attach listeners and navigate to the page before each test.
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages and classify them
    page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    // Capture uncaught page errors (ReferenceError, TypeError, etc.)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the app page
    await page.goto(APP_URL);
  });

  // Cleanup not strictly necessary as Playwright handles pages, but kept for clarity
  test.afterEach(async ({ page }) => {
    // Optionally close the page - Playwright will manage this automatically in fixtures
    try {
      await page.close();
    } catch (e) {
      // ignore errors closing page
    }
  });

  // Test initial page load state and basic DOM structure
  test('Initial load: page elements are present and initial state is empty', async ({ page }) => {
    // Verify header text
    const header = page.locator('h1');
    await expect(header).toHaveText('K-Means Clustering Visualization');

    // Verify Run K-Means button exists and is visible / enabled
    const runButton = page.locator('button', { hasText: 'Run K-Means' });
    await expect(runButton).toBeVisible();
    await expect(runButton).toBeEnabled();

    // Verify canvas exists and has correct dimensions attributes
    const canvas = page.locator('#canvas');
    await expect(canvas).toBeVisible();
    // Check width/height attributes via evaluate
    const dims = await canvas.evaluate((c) => ({ width: c.width, height: c.height }));
    expect(dims.width).toBe(600);
    expect(dims.height).toBe(400);

    // Verify that the global dataPoints array exists and is initially empty
    const initialDataPointsLength = await page.evaluate(() => {
      // Return -1 if dataPoints is not defined
      return typeof dataPoints !== 'undefined' ? dataPoints.length : -1;
    });
    expect(initialDataPointsLength).toBe(0);

    // Verify canvas 2D context exists
    const has2d = await page.evaluate(() => {
      const c = document.getElementById('canvas');
      return !!(c && c.getContext && c.getContext('2d'));
    });
    expect(has2d).toBeTruthy();

    // Check that no page errors occurred during initial load
    expect(pageErrors.length).toBe(0);
    // Ensure no console messages of type 'error' were emitted
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test clicking the Run K-Means button produces data points and draws them on the canvas
  test('Click "Run K-Means" generates 100 data points, assigns clusters and draws on canvas', async ({ page }) => {
    // Click the Run K-Means button
    const runButton1 = page.locator('button', { hasText: 'Run K-Means' });
    await runButton.click();

    // The algorithm runs synchronously on click in the page script.
    // Verify that 100 data points were generated
    const dataPointsLength = await page.evaluate(() => dataPoints.length);
    expect(dataPointsLength).toBe(100);

    // Verify that at least one point has a cluster assigned (cluster !== null)
    const assignedCount = await page.evaluate(() => dataPoints.filter(p => p.cluster !== null).length);
    // All points should be assigned after kMeans completes, but we assert at least one to be robust
    expect(assignedCount).toBeGreaterThan(0);

    // Verify cluster indices are within expected range (0..k-1). k is 3 in the page script.
    const invalidCluster = await page.evaluate(() => {
      const k = 3;
      return dataPoints.some(p => p.cluster === null || p.cluster < 0 || p.cluster >= k);
    });
    // invalidCluster should be false meaning all clusters are valid
    expect(invalidCluster).toBeFalsy();

    // Verify that the canvas now contains some drawn pixels (non-transparent)
    const nonTransparentPixels = await page.evaluate(() => {
      const canvas1 = document.getElementById('canvas1');
      const ctx = canvas.getContext('2d');
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let count = 0;
      // Count pixels with alpha channel > 0
      for (let i = 0; i < img.length; i += 4) {
        if (img[i + 3] > 0) count++;
      }
      return count;
    });
    expect(nonTransparentPixels).toBeGreaterThan(0);

    // Verify that canvas drawing used cluster colors by sampling some pixel colors
    // We only check that at least one pixel is not pure black (default when cluster is null) to indicate colored dots
    const coloredPixelFound = await page.evaluate(() => {
      const canvas2 = document.getElementById('canvas2');
      const ctx1 = canvas.getContext('2d');
      const img1 = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 0; i < img.length; i += 4) {
        const r = img[i], g = img[i+1], b = img[i+2], a = img[i+3];
        if (a > 0) {
          // If it's not black (0,0,0) treat as colored
          if (!(r === 0 && g === 0 && b === 0)) return true;
        }
      }
      return false;
    });
    expect(coloredPixelFound).toBeTruthy();

    // Ensure no page errors were emitted during execution
    expect(pageErrors.length).toBe(0);

    // Ensure no console.error messages were emitted
    const consoleErrs = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrs.length).toBe(0);
  });

  // Test multiple runs append additional data points and keep assigning clusters
  test('Running "Run K-Means" multiple times appends data points and assigns clusters to all points', async ({ page }) => {
    const runButton2 = page.locator('button', { hasText: 'Run K-Means' });

    // First run
    await runButton.click();
    let lengthAfterFirst = await page.evaluate(() => dataPoints.length);
    expect(lengthAfterFirst).toBe(100);

    // Second run - this implementation appends more points to the global dataPoints array
    await runButton.click();
    let lengthAfterSecond = await page.evaluate(() => dataPoints.length);
    expect(lengthAfterSecond).toBe(200);

    // Verify all 200 points have cluster assigned and cluster indices are valid (0..2)
    const invalidExists = await page.evaluate(() => {
      const k1 = 3;
      return dataPoints.some(p => p.cluster === null || typeof p.cluster !== 'number' || p.cluster < 0 || p.cluster >= k);
    });
    expect(invalidExists).toBeFalsy();

    // Sample that canvas still has drawn pixels after multiple runs
    const nonTransparentPixelsAfter = await page.evaluate(() => {
      const canvas3 = document.getElementById('canvas3');
      const ctx2 = canvas.getContext('2d');
      const img2 = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let count1 = 0;
      for (let i = 0; i < img.length; i += 4) {
        if (img[i + 3] > 0) count++;
      }
      return count;
    });
    expect(nonTransparentPixelsAfter).toBeGreaterThan(0);

    // Check for no runtime errors in this process
    expect(pageErrors.length).toBe(0);
    const consoleErrs1 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrs.length).toBe(0);
  });

  // Accessibility and basic control checks
  test('Accessibility and controls: Run button is accessible with name and keyboard operable', async ({ page }) => {
    const runButton3 = page.locator('button', { hasText: 'Run K-Means' });
    // Check accessible name
    await expect(runButton).toHaveAccessibleName('Run K-Means');

    // Use keyboard to focus and press Enter to trigger
    await runButton.focus();
    await page.keyboard.press('Enter');

    // Confirm dataPoints generated by keyboard interaction as well
    const dataPointsLength1 = await page.evaluate(() => dataPoints.length);
    expect(dataPointsLength).toBeGreaterThan(0);

    // No page errors or console.error messages should have occurred
    expect(pageErrors.length).toBe(0);
    const consoleErrs2 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrs.length).toBe(0);
  });

  // Edge case: verify the app exposes important functions but do not modify them
  test('Page exposes expected functions (generateDataPoints, kMeans, runKMeans) without modifying them', async ({ page }) => {
    // Ensure functions exist on the window and are callable (we won't call internal ones beyond runKMeans in earlier tests)
    const functionsExist = await page.evaluate(() => {
      return {
        generateDataPoints: typeof generateDataPoints === 'function',
        kMeans: typeof kMeans === 'function',
        runKMeans: typeof runKMeans === 'function'
      };
    });
    expect(functionsExist.generateDataPoints).toBeTruthy();
    expect(functionsExist.kMeans).toBeTruthy();
    expect(functionsExist.runKMeans).toBeTruthy();

    // Confirm no page errors observed when just checking existence
    expect(pageErrors.length).toBe(0);
    const consoleErrs3 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrs.length).toBe(0);
  });
});