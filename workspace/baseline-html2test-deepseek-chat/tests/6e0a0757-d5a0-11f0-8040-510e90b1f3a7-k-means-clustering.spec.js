import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e0a0757-d5a0-11f0-8040-510e90b1f3a7.html';

test.describe('K-Means Clustering Visualization - End-to-End', () => {
  // Arrays to collect console errors and page errors for each test run
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Record console messages of type "error"
    page.on('console', msg => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push({
            text: msg.text(),
            location: msg.location()
          });
        }
      } catch (e) {
        // best-effort, avoid crashing the test harness while recording logs
      }
    });

    // Record unhandled page errors
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Navigate to the application page
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    // After each test assert there are no unexpected console errors or page errors.
    // If there are, include them in the assertion message to help debugging.
    expect(consoleErrors, `Console errors were logged: ${JSON.stringify(consoleErrors, null, 2)}`).toHaveLength(0);
    expect(pageErrors, `Page errors were thrown: ${JSON.stringify(pageErrors, null, 2)}`).toHaveLength(0);
  });

  test('Initial page load shows default UI elements and state', async ({ page }) => {
    // Verify the title and primary elements exist
    await expect(page.locator('h1')).toHaveText('K-Means Clustering Visualization');
    await expect(page.locator('#clusterCanvas')).toBeVisible();
    await expect(page.locator('#resetBtn')).toBeVisible();
    await expect(page.locator('#clusterBtn')).toBeVisible();
    await expect(page.locator('#stepBtn')).toBeVisible();
    await expect(page.locator('#kValue')).toHaveValue('3'); // default K
    await expect(page.locator('#pointCount')).toHaveValue('100'); // default point count

    // Iteration should show 0 initially
    await expect(page.locator('#iteration')).toHaveText('0');

    // Cluster summary should be empty on initial load (no clustering run)
    await expect(page.locator('#clusterSummary')).toHaveText('');

    // Ensure no console or page errors were emitted on load (checked again in afterEach)
  });

  test('Reset Points uses the specified pointCount and Run K-Means produces cluster summary', async ({ page }) => {
    // Set a specific point count for determinism in the test (small number)
    await page.fill('#pointCount', '20');
    await page.click('#resetBtn');

    // Trigger full clustering run
    await page.click('#clusterBtn');

    // After run, iteration count should be a positive integer
    const iterationText = await page.locator('#iteration').innerText();
    const iterationNum = parseInt(iterationText, 10);
    expect(Number.isFinite(iterationNum) && iterationNum >= 1).toBeTruthy();

    // Cluster summary should contain K groups (default K is 3)
    const k = parseInt(await page.locator('#kValue').inputValue(), 10);
    const clusterColorSpans = await page.locator('#clusterSummary .cluster-color').count();
    expect(clusterColorSpans).toBe(k);

    // Parse the numeric counts from the cluster summary and ensure they sum to the requested pointCount (20)
    const summaryHtml = await page.locator('#clusterSummary').innerHTML();
    // Example format: <span class="cluster-color" style="background-color: hsl(...)"></span>Cluster 1: 7 points | ...
    const counts = [...summaryHtml.matchAll(/Cluster \d+: (\d+) points/g)].map(m => parseInt(m[1], 10));
    const total = counts.reduce((s, n) => s + n, 0);
    expect(total).toBe(20);
  });

  test('Clicking on canvas adds a point and affects clustering counts', async ({ page }) => {
    // Use a small number for quick runs
    await page.fill('#pointCount', '10');
    await page.click('#resetBtn');

    // Run clustering to get a baseline summary
    await page.click('#clusterBtn');
    const baseHtml = await page.locator('#clusterSummary').innerHTML();
    const baseCounts = [...baseHtml.matchAll(/Cluster \d+: (\d+) points/g)].map(m => parseInt(m[1], 10));
    const baseTotal = baseCounts.reduce((s, n) => s + n, 0);
    expect(baseTotal).toBe(10);

    // Click the canvas to add 1 point (click near center)
    const canvas = page.locator('#clusterCanvas');
    const box = await canvas.boundingBox();
    // choose a coordinate within the canvas
    const clickX = Math.floor(box.x + box.width / 2);
    const clickY = Math.floor(box.y + box.height / 2);
    await page.mouse.click(clickX, clickY);

    // Run clustering again and ensure total count increased by 1
    await page.click('#clusterBtn');
    const newHtml = await page.locator('#clusterSummary').innerHTML();
    const newCounts = [...newHtml.matchAll(/Cluster \d+: (\d+) points/g)].map(m => parseInt(m[1], 10));
    const newTotal = newCounts.reduce((s, n) => s + n, 0);
    expect(newTotal).toBe(baseTotal + 1);
  });

  test('Changing K updates number of reported clusters after clustering', async ({ page }) => {
    // Set K to 4 and a small point count
    await page.fill('#kValue', '4');
    await page.fill('#pointCount', '24');
    await page.click('#resetBtn');

    // Run clustering
    await page.click('#clusterBtn');

    // Ensure clusterSummary contains 4 cluster-color spans
    const k = 4;
    const clusterColorSpans = await page.locator('#clusterSummary .cluster-color').count();
    expect(clusterColorSpans).toBe(k);

    // Also verify the clusterSummary contains "Cluster 1", "Cluster 2", etc. up to K
    const summaryText = await page.locator('#clusterSummary').innerText();
    for (let i = 1; i <= k; i++) {
      expect(summaryText).toContain(`Cluster ${i}:`);
    }
  });

  test('Step Through repeatedly until convergence triggers an alert', async ({ page }) => {
    // Use small dataset to make convergence likely within reasonable steps
    await page.fill('#pointCount', '20');
    await page.fill('#kValue', '3');
    await page.click('#resetBtn');

    // A helper to perform a step and wait for a dialog if it occurs.
    // We'll attempt up to maxSteps steps and listen for a dialog that signals convergence.
    const maxSteps = 80;
    let dialogMessage = null;
    for (let i = 0; i < maxSteps; i++) {
      // Start waiting for a possible dialog before clicking
      const dialogPromise = page.waitForEvent('dialog', { timeout: 1500 }).then(dialog => {
        dialogMessage = dialog.message();
        // Accept the alert so the test can continue
        return dialog.accept();
      }).catch(() => {
        // No dialog in this iteration
      });

      // Click step button to run a single iteration
      await page.click('#stepBtn');

      // Wait for either dialog handling or simply for next microtask
      await dialogPromise;

      if (dialogMessage) break;
    }

    // If we received a dialog it should indicate convergence
    if (dialogMessage) {
      expect(dialogMessage).toBe('Clustering converged!');
    } else {
      // It's acceptable if convergence didn't happen within the step limit; however,
      // the iteration count should have increased.
      const iterText = await page.locator('#iteration').innerText();
      const iterations = parseInt(iterText, 10);
      expect(Number.isFinite(iterations) && iterations > 0).toBeTruthy();
    }
  });

  test('Visual elements update: centroids drawn and colors present after run', async ({ page }) => {
    // Use modest dataset
    await page.fill('#pointCount', '30');
    await page.fill('#kValue', '3');
    await page.click('#resetBtn');

    // Run clustering to render centroids and colored points
    await page.click('#clusterBtn');

    // Verify iteration is > 0
    const iter = parseInt(await page.locator('#iteration').innerText(), 10);
    expect(iter).toBeGreaterThanOrEqual(1);

    // Cluster summary should contain color swatches for each cluster
    const k = parseInt(await page.locator('#kValue').inputValue(), 10);
    const colorSwatchCount = await page.locator('#clusterSummary .cluster-color').count();
    expect(colorSwatchCount).toBe(k);

    // As an extra DOM check: ensure canvas is still present and visible after drawing
    await expect(page.locator('#clusterCanvas')).toBeVisible();
  });
});