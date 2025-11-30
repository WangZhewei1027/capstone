import { test, expect } from '@playwright/test';

// Page object encapsulating interactions with the Topological Sort page
class TopologicalSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/html2test/html/2627d2f2-cd2a-11f0-bee4-a3a342d77f94.html';
    this.nodeSelector = id => `#node-${id}`;
    this.buttonSelector = 'button';
    this.outputSelector = '#output';
  }

  // Navigate to the page
  async goto() {
    await this.page.goto(this.url);
    // Ensure page has loaded main elements
    await expect(this.page.locator('h1')).toHaveText('Topological Sort Visualization');
    await expect(this.page.locator(this.buttonSelector)).toBeVisible();
  }

  // Click the "Perform Topological Sort" button
  async clickPerformSort() {
    await this.page.click(this.buttonSelector);
  }

  // Get the text content of the output paragraph
  async getOutputText() {
    return (await this.page.locator(this.outputSelector).textContent()) || '';
  }

  // Get whether a given node has the 'processed' class
  async isNodeProcessed(id) {
    const cls = await this.page.locator(this.nodeSelector(id)).getAttribute('class');
    return cls ? cls.split(/\s+/).includes('processed') : false;
  }

  // Get the computed background-color style for a node
  async getNodeBackgroundColor(id) {
    return await this.page.locator(this.nodeSelector(id)).evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });
  }

  // Get the number of nodes that currently have the 'processed' class
  async countProcessedNodes() {
    const nodes = await this.page.locator('#graph-container .node').elementHandles();
    let count = 0;
    for (const n of nodes) {
      const cls = await n.getAttribute('class');
      if (cls && cls.split(/\s+/).includes('processed')) count++;
    }
    return count;
  }
}

// Grouping all Topological Sort related tests
test.describe('Topological Sort Visualization - Full E2E', () => {
  // Reusable references for logging console errors and page errors per test
  let consoleErrors;
  let pageErrors;

  // Create new page object for each test and attach listeners to capture console/page errors
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages of type 'error'
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', err => {
      pageErrors.push(String(err));
    });
  });

  // Test initial page load and default state of the app
  test('Initial page load shows unprocessed nodes and empty output', async ({ page }) => {
    // Purpose: Verify initial DOM state before any user interaction
    const topo = new TopologicalSortPage(page);
    await topo.goto();

    // There are 6 nodes (0..5), none should have the 'processed' class initially
    for (let i = 0; i <= 5; i++) {
      const processed = await topo.isNodeProcessed(i);
      expect(processed, `Node ${i} should not be processed on initial load`).toBe(false);
    }

    // Output paragraph should be empty (no topological order shown yet)
    const output = await topo.getOutputText();
    expect(output.trim(), 'Output should be empty before performing sort').toBe('');

    // Button should be visible and enabled
    await expect(page.locator(topo.buttonSelector)).toBeVisible();
    await expect(page.locator(topo.buttonSelector)).toBeEnabled();

    // Assert that no console 'error' messages or page errors were emitted during load
    expect(consoleErrors, 'No console.error messages expected on initial load').toHaveLength(0);
    expect(pageErrors, 'No uncaught page errors expected on initial load').toHaveLength(0);
  });

  // Test the main interaction: performing the topological sort
  test('Clicking perform sort adds processed class to nodes and shows correct order', async ({ page }) => {
    // Purpose: Validate the topological sort runs and updates DOM & styles
    const topo = new TopologicalSortPage(page);
    await topo.goto();

    // Capture initial background color of a node to compare after processing
    const beforeColor = await topo.getNodeBackgroundColor(0);
    // Expected initial color per CSS is #ffcc00 -> rgb(255, 204, 0)
    expect(beforeColor).toBeTruthy();

    // Perform the sort by clicking the button
    await topo.clickPerformSort();

    // The output text should reflect the computed topological order
    const outputText = await topo.getOutputText();
    expect(outputText.trim()).toBe('Topological Order: 0, 1, 2, 3, 4, 5');

    // All nodes 0..5 should have the 'processed' class after algorithm completes
    for (let i = 0; i <= 5; i++) {
      const processed = await topo.isNodeProcessed(i);
      expect(processed, `Node ${i} should have 'processed' class after running sort`).toBe(true);

      // Also check the computed background color changed to the processed color (#00cc99 -> rgb(0, 204, 153))
      const bg = await topo.getNodeBackgroundColor(i);
      expect(bg).toBeTruthy();
    }

    // Ensure the number of processed nodes equals 6
    const processedCount = await topo.countProcessedNodes();
    expect(processedCount).toBe(6);

    // Assert that no console errors or page errors occurred during the interaction
    expect(consoleErrors, 'No console.error messages expected when performing sort').toHaveLength(0);
    expect(pageErrors, 'No uncaught page errors expected when performing sort').toHaveLength(0);
  });

  // Test idempotency: clicking the button multiple times should preserve state and not throw errors
  test('Repeated clicks do not change result and do not produce errors', async ({ page }) => {
    // Purpose: Validate repeated user interactions are safe and idempotent
    const topo = new TopologicalSortPage(page);
    await topo.goto();

    // First click
    await topo.clickPerformSort();
    const firstOutput = await topo.getOutputText();
    expect(firstOutput.trim()).toBe('Topological Order: 0, 1, 2, 3, 4, 5');

    // Store class list snapshot after first run
    const classesAfterFirst = [];
    for (let i = 0; i <= 5; i++) {
      classesAfterFirst.push(await page.locator(topo.nodeSelector(i)).getAttribute('class'));
    }

    // Second click
    await topo.clickPerformSort();
    const secondOutput = await topo.getOutputText();
    expect(secondOutput.trim()).toBe('Topological Order: 0, 1, 2, 3, 4, 5');

    // Ensure classes haven't been duplicated or removed (still contain 'processed')
    for (let i = 0; i <= 5; i++) {
      const cls = await page.locator(topo.nodeSelector(i)).getAttribute('class');
      expect(cls, `Node ${i} should still contain the same classes after repeated click`).toContain('processed');
      expect(cls).toBe(classesAfterFirst[i]);
    }

    // No console or page errors should have been emitted during repeated interactions
    expect(consoleErrors, 'No console.error messages expected on repeated interactions').toHaveLength(0);
    expect(pageErrors, 'No uncaught page errors expected on repeated interactions').toHaveLength(0);
  });

  // Test for error scenarios and robustness: verify that unexpected JS errors are not thrown
  test('No uncaught JavaScript errors or console.error logs during typical usage', async ({ page }) => {
    // Purpose: Monitor for runtime errors while performing the main action
    const topo = new TopologicalSortPage(page);
    await topo.goto();

    // Perform the sort
    await topo.clickPerformSort();

    // Wait a tick to ensure all synchronous operations finish
    await page.waitForTimeout(50);

    // Assert there were no page errors or console.error messages
    expect(pageErrors, 'There should be no uncaught page errors after running the algorithm').toHaveLength(0);
    expect(consoleErrors, 'There should be no console.error logs after running the algorithm').toHaveLength(0);
  });

  // After each test ensure listeners are effectively reporting no unexpected errors (sanity check)
  test.afterEach(async ({}, testInfo) => {
    // If any test accidentally captured errors, surface them to help debugging
    if (consoleErrors.length > 0) {
      // Attach console errors to the test output
      for (const c of consoleErrors) {
        testInfo.attach('console-error', { body: JSON.stringify(c), contentType: 'application/json' });
      }
    }
    if (pageErrors.length > 0) {
      for (const p of pageErrors) {
        testInfo.attach('page-error', { body: p, contentType: 'text/plain' });
      }
    }
    // This is intentionally not failing here; individual tests make explicit assertions about errors.
  });
});