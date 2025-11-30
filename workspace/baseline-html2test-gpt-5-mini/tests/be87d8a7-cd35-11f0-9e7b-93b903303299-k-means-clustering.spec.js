import { test, expect } from '@playwright/test';

const APP = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be87d8a7-cd35-11f0-9e7b-93b903303299.html';

/**
 * Test suite for the K-Means Clustering Interactive Demo
 *
 * Coverage:
 * - Initial load and default UI state
 * - Data generation and canvas rendering
 * - Centroid initialization (random & kmeans++ path activated via UI)
 * - Single-step iteration updates (assignments, centroids, SSE, iteration count)
 * - Autoplay (start/pause) behavior
 * - Interactive canvas click to add points
 * - Edge cases: clear, changing K smaller than current centroids
 *
 * Notes:
 * - We capture page errors and console.error messages and assert none occurred during tests.
 * - Tests operate by interacting with DOM elements exactly as provided by the page.
 */

test.describe('K-Means Clustering Interactive Demo - be87d8a7...', () => {
  // Collect runtime page errors and console errors for assertions
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Listen to console and page errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the demo and wait for load
    await page.goto(APP, { waitUntil: 'load' });

    // Ensure required elements are present before tests continue
    await expect(page.locator('#canvas')).toBeVisible();
    await expect(page.locator('#generate')).toBeVisible();
    await expect(page.locator('#initButton')).toBeVisible();

    // small safety wait to allow initial generateData (called on load) to finish drawing
    await page.waitForTimeout(250);
  });

  test.afterEach(async () => {
    // Assert there were no uncaught page errors or console.error occurrences
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e => String(e)).join('\n')}`).toBe(0);
    expect(consoleErrors.length, `Unexpected console.error messages: ${consoleErrors.map(e => e.text).join('\n')}`).toBe(0);
  });

  test.describe('Initial Load & Defaults', () => {
    test('page loads with default controls and info panel shows initial state', async ({ page }) => {
      // Verify default control values and UI text
      await expect(page.locator('#numPoints')).toHaveValue('200'); // default in markup
      await expect(page.locator('#kValue')).toHaveValue('4'); // default K
      await expect(page.locator('#initMethod')).toHaveValue('random');
      await expect(page.locator('#pattern')).toHaveValue('blobs');

      // Info panel shows iteration 0 and no centroids yet
      await expect(page.locator('#iter')).toHaveText('0');
      await expect(page.locator('#sse')).toHaveText('—');
      await expect(page.locator('#centroidsCount')).toHaveText('0');
      await expect(page.locator('#empties')).toHaveText('0');

      // Legend should display "No centroids yet"
      await expect(page.locator('#legend')).toContainText('No centroids yet');
    });

    test('canvas initially has drawn points after demo init', async ({ page }) => {
      // Evaluate canvas pixel data to ensure non-white pixels exist (points draw colored pixels)
      const hasColoredPixel = await page.evaluate(() => {
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        // Look for any pixel not pure white (255,255,255,255)
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          // if alpha is zero it's transparent; ignore - but background should be opaque white
          if (!(r === 255 && g === 255 && b === 255 && a === 255)) return true;
        }
        return false;
      });
      expect(hasColoredPixel).toBe(true);
    });
  });

  test.describe('Data Generation & Initialization', () => {
    test('clicking Generate Data updates canvas and info resets', async ({ page }) => {
      // Change pattern and number of points for a deterministic-ish test
      await page.fill('#numPoints', '120');
      await page.selectOption('#pattern', 'uniform');

      // Click "Generate Data"
      await page.click('#generate');

      // After generating, iteration should reset to 0 and centroids count 0
      await expect(page.locator('#iter')).toHaveText('0');
      await expect(page.locator('#centroidsCount')).toHaveText('0');

      // Canvas should be non-empty (points drawn)
      const nonEmpty = await page.evaluate(() => {
        const canvas1 = document.getElementById('canvas1');
        const ctx1 = canvas.getContext('2d');
        const data1 = ctx.getImageData(0, 0, canvas.width, canvas.height).data1;
        for (let i = 0; i < data.length; i += 4) {
          if (!(data[i] === 255 && data[i+1] === 255 && data[i+2] === 255 && data[i+3] === 255)) return true;
        }
        return false;
      });
      expect(nonEmpty).toBe(true);
    });

    test('Initialize Centroids populates centroids and legend reflects counts', async ({ page }) => {
      // Ensure we know how many points we generated
      const expectedPoints = parseInt(await page.inputValue('#numPoints'), 10);

      // Set K to 4, ensure init method is random
      await page.fill('#kValue', '4');
      await page.selectOption('#initMethod', 'random');

      // Initialize centroids
      await page.click('#initButton');

      // After init, centroids should be present
      await expect(page.locator('#centroidsCount')).toHaveText('4');

      // Legend should have 4 legendItem elements
      const items = page.locator('#legend .legendItem');
      await expect(items).toHaveCount(4);

      // Each legend item has text like "#1 (N)" - sum of N across legend items should equal number of points
      const counts = await items.evaluateAll(nodes => nodes.map(n => {
        const txt = n.textContent || '';
        const m = txt.match(/\((\d+)\)/);
        return m ? parseInt(m[1], 10) : 0;
      }));
      // Sum of legend counts should equal expectedPoints
      const sum = counts.reduce((a,b)=>a+b,0);
      expect(sum).toBe(expectedPoints);
    });

    test('kmeans++ initialization path produces same centroid count and resets assignments', async ({ page }) => {
      // Set K to 3 and initialization to kmeans++
      await page.fill('#kValue', '3');
      await page.selectOption('#initMethod', 'kmeans++');

      // Click initialize
      await page.click('#initButton');

      // Check centroids count updated
      await expect(page.locator('#centroidsCount')).toHaveText('3');

      // Legend should have 3 entries
      await expect(page.locator('#legend .legendItem')).toHaveCount(3);

      // Ensure iteration is at 0 and SSE is still '—' (no iteration yet)
      await expect(page.locator('#iter')).toHaveText('0');
      await expect(page.locator('#sse')).toHaveText('—');
    });
  });

  test.describe('Iteration & Autoplay', () => {
    test('single Step updates iteration and SSE becomes numeric', async ({ page }) => {
      // Ensure centroids are initialized; if not, initialize
      const centroidCount = parseInt(await page.textContent('#centroidsCount'), 10);
      if (centroidCount === 0) {
        await page.click('#initButton');
        await expect(page.locator('#centroidsCount')).not.toHaveText('0');
      }

      // Click Step once
      await page.click('#stepButton');

      // Iteration should be >= 1
      await expect(page.locator('#iter')).not.toHaveText('0');

      // SSE should now show a numeric value (not '—')
      const sseText = await page.textContent('#sse');
      expect(sseText).not.toBe('—');
      // ensure it's parseable as a number
      const sseNum = parseFloat(sseText.replace(/[^\d.-]/g,''));
      expect(Number.isFinite(sseNum)).toBe(true);
      expect(sseNum).toBeGreaterThanOrEqual(0);
    });

    test('Start (autoplay) increments iterations and Pause halts progress', async ({ page }) => {
      // Initialize K and centroids to ensure running proceeds
      await page.fill('#kValue', '4');
      await page.click('#initButton');
      await expect(page.locator('#centroidsCount')).toHaveText('4');

      // Read iteration before starting
      const iterBefore = parseInt(await page.textContent('#iter'), 10);

      // Start autoplay
      await page.click('#startButton');

      // Wait a bit longer than two autoplay steps (speed default ~400ms). Use generous timeout to avoid flakiness
      await page.waitForTimeout(1300);

      // Pause autoplay
      await page.click('#pauseButton');

      const iterAfter = parseInt(await page.textContent('#iter'), 10);

      // Expect iterations to have advanced
      expect(iterAfter).toBeGreaterThan(iterBefore);

      // Capture iter, then wait and verify staying the same (since paused)
      const iterPaused = iterAfter;
      await page.waitForTimeout(600);
      const iterLater = parseInt(await page.textContent('#iter'), 10);
      expect(iterLater).toBe(iterPaused);
    });
  });

  test.describe('Interactive Canvas & Edge Cases', () => {
    test('clicking on canvas adds a single point and redrawing occurs', async ({ page }) => {
      // Get counts from legend if centroids exist; otherwise initialize first
      let initialPoints = parseInt(await page.inputValue('#numPoints'), 10);
      // The UI's numPoints only applies to generation; actual count of points may differ due to init. We'll detect pixel change and iteration reset.

      // Record iteration before click (should be 0 or some value)
      const iterBefore1 = parseInt(await page.textContent('#iter'), 10);

      // Click on canvas at coordinates (50,50) within canvas bounds
      const canvas2 = page.locator('#canvas2');
      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();
      const clickX = Math.max(5, box.x + 50);
      const clickY = Math.max(5, box.y + 50);
      await page.mouse.click(clickX, clickY);

      // When a point is added, iter resets to 0 per implementation
      await expect(page.locator('#iter')).toHaveText('0');

      // Also the canvas should remain non-empty; ensure at least one colored pixel exists
      const nonEmpty1 = await page.evaluate(() => {
        const canvas3 = document.getElementById('canvas3');
        const ctx2 = canvas.getContext('2d');
        const data2 = ctx.getImageData(0, 0, canvas.width, canvas.height).data2;
        for (let i = 0; i < data.length; i += 4) {
          if (!(data[i] === 255 && data[i+1] === 255 && data[i+2] === 255 && data[i+3] === 255)) return true;
        }
        return false;
      });
      expect(nonEmpty).toBe(true);
    });

    test('Clear button removes points and centroids; legend displays "No centroids yet"', async ({ page }) => {
      // Ensure there are centroids or points first
      await page.click('#initButton');
      await expect(page.locator('#centroidsCount')).not.toHaveText('0');

      // Click Clear
      await page.click('#clear');

      // After clear, iteration 0 and centroids 0, legend shows "No centroids yet"
      await expect(page.locator('#iter')).toHaveText('0');
      await expect(page.locator('#centroidsCount')).toHaveText('0');
      await expect(page.locator('#legend')).toContainText('No centroids yet');

      // Canvas should be blank white (no colored pixels)
      const hasColoredPixel1 = await page.evaluate(() => {
        const canvas4 = document.getElementById('canvas4');
        const ctx3 = canvas.getContext('2d');
        const data3 = ctx.getImageData(0, 0, canvas.width, canvas.height).data3;
        for (let i = 0; i < data.length; i += 4) {
          if (!(data[i] === 255 && data[i+1] === 255 && data[i+2] === 255 && data[i+3] === 255)) return true;
        }
        return false;
      });
      // Depending on background rendering, the canvas may remain white; expect no colored pixels
      expect(hasColoredPixel).toBe(false);
    });

    test('reducing K trims centroids and clusters beyond new K are reset', async ({ page }) => {
      // Generate data and initialize with K=5
      await page.fill('#numPoints', '80');
      await page.fill('#kValue', '5');
      await page.click('#generate');
      await page.click('#initButton');

      await expect(page.locator('#centroidsCount')).toHaveText('5');

      // Reduce K to 2 and trigger change event
      await page.fill('#kValue', '2');
      // dispatching change is handled by the 'change' listener on the input; Playwright's fill triggers change automatically
      await page.locator('#kValue').dispatchEvent('change');

      // Centroids count should update to 2
      await expect(page.locator('#centroidsCount')).toHaveText('2');

      // Legend should show 2 items (or the "No centroids yet" if points were empty)
      const legendItems = page.locator('#legend .legendItem');
      await expect(legendItems).toHaveCount(2);
    });
  });
});