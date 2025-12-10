import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f6a6e5-d5a1-11f0-80b9-e1f86cea383f.html';

test.describe('Adjacency List App (90f6a6e5-d5a1-11f0-80b9-e1f86cea383f)', () => {
  // Keep collected console messages and page errors per test to analyze runtime behavior
  test.beforeEach(async ({ page }) => {
    // Navigate to the application before each test
    await page.goto(APP_URL);
  });

  // Test initial page load and default state
  test('Initial page load shows expected elements and no spontaneous runtime errors', async ({ page }) => {
    // Collect console messages and page errors during the initial load
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push(msg));
    page.on('pageerror', err => pageErrors.push(err));

    // Verify main heading
    await expect(page.locator('h1')).toHaveText('Adjacency List');

    // Verify input exists and has correct placeholder
    const nodeInput = page.locator('#node');
    await expect(nodeInput).toBeVisible();
    await expect(nodeInput).toHaveAttribute('placeholder', 'Enter a node name');

    // Verify buttons exist and are visible
    await expect(page.locator('#add-node-btn')).toBeVisible();
    await expect(page.locator('#add-edges-btn')).toBeVisible();
    await expect(page.locator('#display-adjacency-list-btn')).toBeVisible();
    await expect(page.locator('#clear-adjacency-list-btn')).toBeVisible();

    // Verify table header row exists (only header on initial load)
    const rows = page.locator('#adjacency-list-table tr');
    await expect(rows).toHaveCount(1); // header only

    // Assert that no page errors happened just by loading the page
    expect(pageErrors.length, 'No pageerror should occur on fresh load').toBe(0);

    // There should also be no console errors on load (console might have other types)
    const consoleErrorMessages = consoleMessages.filter(m => m.type() === 'error');
    expect(consoleErrorMessages.length, 'No console error messages on fresh load').toBe(0);
  });

  test.describe('Node management interactions', () => {
    // Test adding nodes and DOM updates
    test('Clicking "Add Node" appends a new row for the node and shows neighbors (empty initially)', async ({ page }) => {
      // Ensure no page errors are produced during this valid interaction
      const pageErrors1 = [];
      page.on('pageerror', err => pageErrors.push(err));

      // Enter node name and click Add Node
      await page.fill('#node', 'A');
      await page.click('#add-node-btn');

      // After adding, expect table to have header + 1 row
      const rows1 = page.locator('#adjacency-list-table tr');
      await expect(rows).toHaveCount(2);

      // Verify the newly added row contains the node name and empty neighbors string
      const firstDataRow = page.locator('#adjacency-list-table tr').nth(1);
      await expect(firstDataRow.locator('td').nth(0)).toHaveText('A');
      // neighbors cell should be empty (adjacency list is empty array => join -> "")
      await expect(firstDataRow.locator('td').nth(1)).toHaveText('');

      // Clicking Add Node again with same name: due to implementation, a duplicate row will be appended
      await page.click('#add-node-btn');
      await expect(rows).toHaveCount(3);
      const secondDataRow = page.locator('#adjacency-list-table tr').nth(2);
      await expect(secondDataRow.locator('td').nth(0)).toHaveText('A');

      // Confirm no runtime errors occurred while adding nodes
      expect(pageErrors.length, 'No page errors should occur when adding nodes').toBe(0);
    });

    // Edge case: attempt to add an edge when required inputs do not exist in the DOM
    test('Clicking "Add Edges" triggers a runtime error due to missing input elements', async ({ page }) => {
      // Prepare: ensure we have one node, but the addEdge implementation expects #source-node and #destination-node
      await page.fill('#node', 'X');
      await page.click('#add-node-btn');

      // Wait for the pageerror that should be thrown when addEdge accesses non-existent elements
      const [err] = await Promise.all([
        page.waitForEvent('pageerror'),
        page.click('#add-edges-btn')
      ]);

      // Assert that an error object was emitted and the message indicates a null/undefined access
      expect(err).toBeTruthy();
      // The message may vary across engines; check for common patterns
      expect(err.message.toLowerCase()).toMatch(/cannot|cannot read|reading|null|undefined|property/);

      // Ensure that the DOM did not silently change rows due to the failed edge addition
      const rows2 = page.locator('#adjacency-list-table tr');
      // header + previously added node row(s) - should be at least 2
      await expect(rows).toHaveCountGreaterThan(1);
    });
  });

  test.describe('Display and Clear operations (error-prone functions)', () => {
    test('Clicking "Display Adjacency List" triggers a runtime error due to incorrect tbody access', async ({ page }) => {
      // Add a node first to exercise display logic more realistically
      await page.fill('#node', 'Node1');
      await page.click('#add-node-btn');

      // The displayAdjacencyList function tries to access .tbody on the table element which is incorrect,
      // so clicking the button should throw a runtime error (TypeError)
      const [err] = await Promise.all([
        page.waitForEvent('pageerror'),
        page.click('#display-adjacency-list-btn')
      ]);

      expect(err).toBeTruthy();
      // The message typically mentions innerHTML or cannot set/read properties of undefined/null
      expect(err.message.toLowerCase()).toMatch(/innerhtml|tbody|cannot|undefined|null|property|reading/);
    });

    test('Clicking "Clear Adjacency List" triggers the same display-related runtime error', async ({ page }) => {
      // Add a couple of nodes first
      await page.fill('#node', 'N1');
      await page.click('#add-node-btn');
      await page.fill('#node', 'N2');
      await page.click('#add-node-btn');

      // clearAdjacencyList calls displayAdjacencyList internally, which should produce a runtime error
      const [err] = await Promise.all([
        page.waitForEvent('pageerror'),
        page.click('#clear-adjacency-list-btn')
      ]);

      expect(err).toBeTruthy();
      expect(err.message.toLowerCase()).toMatch(/innerhtml|tbody|cannot|undefined|null|property|reading/);
    });
  });

  test.describe('Accessibility and basic DOM assertions', () => {
    test('All interactive controls are discoverable and have expected roles/labels', async ({ page }) => {
      // Buttons should be accessible via their ids and visible
      await expect(page.locator('#add-node-btn')).toBeVisible();
      await expect(page.locator('#add-edges-btn')).toBeVisible();
      await expect(page.locator('#display-adjacency-list-btn')).toBeVisible();
      await expect(page.locator('#clear-adjacency-list-btn')).toBeVisible();

      // Input field has a label-like placeholder which assists accessibility for this simple UI
      await expect(page.locator('#node')).toHaveAttribute('placeholder', 'Enter a node name');
    });
  });
});