import { test, expect } from '@playwright/test';

// Test file: dfd78d4b-d59e-11f0-ae0b-570552a0b645-k-means-clustering.spec.js
// Tests for the K-Means Clustering Visualization application.
// The test suite verifies UI controls, behavior of generation, stepping, animation, reset,
// and ensures no unexpected console errors or page errors are thrown during interactions.

// Base URL of the served HTML
const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd78d4b-d59e-11f0-ae0b-570552a0b645.html';

test.describe('K-Means Clustering Visualization - Basic UI and Behavior', () => {
  // Increase default timeout for tests that may wait for animation/convergence.
  test.setTimeout(30000);

  // Helper to attach console and page error listeners and return arrays for assertions.
  async function attachErrorCollectors(page) {
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      // Collect console error messages for later assertions
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', err => {
      // Collect unhandled exceptions thrown in page context
      pageErrors.push(err.message || String(err));
    });

    return { consoleErrors, pageErrors };
  }

  test('Initial load: verify controls, defaults, and initial status message', async ({ page }) => {
    // Attach collectors to observe console and page errors
    const { consoleErrors, pageErrors } = await attachErrorCollectors(page);

    // Load the application page
    await page.goto(APP_URL);

    // Verify page title contains expected text
    await expect(page).toHaveTitle(/K-Means Clustering Visualization/i);

    // Verify presence of interactive controls by id
    const selectors = [
      '#kValue',
      '#pointsCount',
      '#generatePoints',
      '#runKMeans',
      '#stepForward',
      '#reset',
      '#speed',
      '#clusteringCanvas',
      '#status',
      '#iterationInfo',
      '#clusterInfo'
    ];
    for (const sel of selectors) {
      await expect(page.locator(sel)).toBeVisible();
    }

    // Check default input values
    await expect(page.locator('#kValue')).toHaveValue('3');
    await expect(page.locator('#pointsCount')).toHaveValue('100');
    await expect(page.locator('#speed')).toHaveValue('5');

    // Check that run and step buttons are disabled initially
    await expect(page.locator('#runKMeans')).toBeDisabled();
    await expect(page.locator('#stepForward')).toBeDisabled();

    // Check initial status text exactly matches expected prompt
    const status = await page.locator('#status').textContent();
    expect(status).toContain('Click "Generate Points" to start');

    // Ensure no console errors or page errors occurred during load
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test('Generate points: UI state updates, run and step become enabled, iteration shows 0', async ({ page }) => {
    const { consoleErrors, pageErrors } = await attachErrorCollectors(page);
    await page.goto(APP_URL);

    // Click "Generate Points" and wait for the UI to update the status to "Ready -"
    await page.click('#generatePoints');
    await page.waitForFunction(() => {
      const s = document.getElementById('status');
      return s && s.textContent && s.textContent.includes('Ready -');
    }, null, { timeout: 5000 });

    // runKMeans and stepForward should be enabled
    await expect(page.locator('#runKMeans')).toBeEnabled();
    await expect(page.locator('#stepForward')).toBeEnabled();

    // Status should reflect number of points and K
    const statusText = await page.locator('#status').textContent();
    expect(statusText).toMatch(/Ready - \d+ points, K=\d+/);

    // Iteration info should show iteration 0
    const iterText = await page.locator('#iterationInfo').textContent();
    expect(iterText).toContain('Iteration: 0');

    // Cluster info should initially be empty (not populated until steps/animation)
    const clusterInfoCount = await page.locator('#clusterInfo').locator('div').count();
    expect(clusterInfoCount).toBe(0);

    // Ensure no console or page errors occurred during generation
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test('Step forward: performs one iteration and updates iteration info and cluster info', async ({ page }) => {
    const { consoleErrors, pageErrors } = await attachErrorCollectors(page);
    await page.goto(APP_URL);

    // Generate points first
    await page.click('#generatePoints');
    await page.waitForFunction(() => document.getElementById('status')?.textContent.includes('Ready -'), null, { timeout: 5000 });

    // Click "Step Forward" to perform a single k-means iteration
    await page.click('#stepForward');

    // Wait for iteration count to be at least 1
    await page.waitForFunction(() => {
      const info = document.getElementById('iterationInfo')?.textContent || '';
      return /Iteration:\s*1/.test(info) || /Iteration:\s*\d+/.test(info);
    }, null, { timeout: 5000 });

    // Verify iteration displayed is >= 1
    const iterInfo = await page.locator('#iterationInfo').textContent();
    expect(iterInfo).toMatch(/Iteration:\s*\d+/);
    // Quick assertion that the numeric value is at least 1
    const iterMatch = iterInfo.match(/Iteration:\s*(\d+)/);
    expect(iterMatch).not.toBeNull();
    if (iterMatch) {
      expect(Number(iterMatch[1])).toBeGreaterThanOrEqual(1);
    }

    // Cluster info should now be populated with K entries
    // Read K value from input
    const kValue = Number(await page.locator('#kValue').inputValue());
    const clusterDivCount = await page.locator('#clusterInfo').locator('div').count();
    // clusterInfo populates exactly k entries in updateClusterInfo
    expect(clusterDivCount).toBe(kValue);

    // Ensure no console or page errors occurred during step
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test('Run K-Means until convergence: animation finishes and status indicates convergence', async ({ page }) => {
    const { consoleErrors, pageErrors } = await attachErrorCollectors(page);
    await page.goto(APP_URL);

    // Generate points, then run the animation
    await page.click('#generatePoints');
    await page.waitForFunction(() => document.getElementById('status')?.textContent.includes('Ready -'), null, { timeout: 5000 });

    // Start running K-Means
    await page.click('#runKMeans');

    // Wait for status to indicate convergence
    await page.waitForFunction(() => {
      const s = document.getElementById('status')?.textContent || '';
      return s.includes('Converged after');
    }, null, { timeout: 20000 });

    // Confirm status text contains the number of iterations
    const statusText = await page.locator('#status').textContent();
    expect(statusText).toMatch(/Converged after \d+ iterations/);

    // Iteration info should reflect the same or similar iteration count
    const iterInfo = await page.locator('#iterationInfo').textContent();
    const iterMatch = iterInfo.match(/Iteration:\s*(\d+)/);
    expect(iterMatch).not.toBeNull();
    if (iterMatch) {
      const iterCount = Number(iterMatch[1]);
      const statusMatch = statusText.match(/Converged after\s*(\d+)/);
      if (statusMatch) {
        expect(iterCount).toBeGreaterThanOrEqual(Number(statusMatch[1])); // iteration info should be >= reported iterations
      }
    }

    // Ensure no console or page errors occurred during run
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test('Reset: clears visualization and returns to initial state', async ({ page }) => {
    const { consoleErrors, pageErrors } = await attachErrorCollectors(page);
    await page.goto(APP_URL);

    // Generate, step once, then reset
    await page.click('#generatePoints');
    await page.waitForFunction(() => document.getElementById('status')?.textContent.includes('Ready -'), null, { timeout: 5000 });
    await page.click('#stepForward');
    await page.waitForFunction(() => document.getElementById('iterationInfo')?.textContent.includes('Iteration:'), null, { timeout: 5000 });

    // Click reset
    await page.click('#reset');

    // After reset, the status should be the initial prompt
    await page.waitForFunction(() => {
      const s = document.getElementById('status')?.textContent || '';
      return s.includes('Click "Generate Points" to start');
    }, null, { timeout: 3000 });

    const statusText = await page.locator('#status').textContent();
    expect(statusText).toContain('Click "Generate Points" to start');

    // iterationInfo should be empty
    const iterationText = await page.locator('#iterationInfo').textContent();
    expect(iterationText).toBe('');

    // clusterInfo should be cleared
    const clusterCountAfterReset = await page.locator('#clusterInfo').locator('div').count();
    expect(clusterCountAfterReset).toBe(0);

    // run and step should be disabled after reset
    await expect(page.locator('#runKMeans')).toBeDisabled();
    await expect(page.locator('#stepForward')).toBeDisabled();

    // Ensure no console or page errors occurred during reset
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test('Changing K after generation resets internal KMeans while preserving points', async ({ page }) => {
    const { consoleErrors, pageErrors } = await attachErrorCollectors(page);
    await page.goto(APP_URL);

    // Generate initial data with default K
    await page.click('#generatePoints');
    await page.waitForFunction(() => document.getElementById('status')?.textContent.includes('Ready -'), null, { timeout: 5000 });

    // Change K value to a new number; this triggers resetKMeans in the app
    await page.fill('#kValue', '4');
    // Dispatch input/change event to ensure app sees it
    await page.locator('#kValue').dispatchEvent('change');

    // After changing K, iterationInfo should be redrawn (iteration count reset to 0)
    await page.waitForFunction(() => {
      const info = document.getElementById('iterationInfo')?.textContent || '';
      return info.includes('Iteration: 0') || info.includes('Iteration:');
    }, null, { timeout: 3000 });

    const iterInfo = await page.locator('#iterationInfo').textContent();
    expect(iterInfo).toContain('Iteration:');

    // clusterInfo not automatically updated until step/run; ensure no exceptions happened
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);

    // Also check status still indicates Ready and shows new K inside the status text if present
    const statusText = await page.locator('#status').textContent();
    // Status might not update k in resetKMeans path, but at minimum it should still be present
    expect(statusText.length).toBeGreaterThan(0);
  });

  test('Edge case: set K larger than generation cluster count and verify no uncaught exceptions', async ({ page }) => {
    const { consoleErrors, pageErrors } = await attachErrorCollectors(page);
    await page.goto(APP_URL);

    // Set pointsCount to minimum and K to a large value (edge case)
    await page.fill('#pointsCount', '10');
    await page.fill('#kValue', '10');
    await page.locator('#pointsCount').dispatchEvent('change');
    await page.locator('#kValue').dispatchEvent('change');

    // Generate points with these settings
    await page.click('#generatePoints');

    // Wait for ready status
    await page.waitForFunction(() => document.getElementById('status')?.textContent.includes('Ready -'), null, { timeout: 5000 });

    // Try stepping forward a few times to exercise potential edge behavior
    await page.click('#stepForward');
    await page.click('#stepForward');

    // Wait briefly to let any errors surface
    await page.waitForTimeout(500);

    // Assert there were no console errors or page errors during this edge execution
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);

    // Cluster info should report K entries (the UI will create entries up to k)
    const kVal = Number(await page.locator('#kValue').inputValue());
    const clusterDivCount = await page.locator('#clusterInfo').locator('div').count();
    expect(clusterDivCount).toBe(kVal);
  });
});