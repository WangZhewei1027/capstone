import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e09e031-d5a0-11f0-8040-510e90b1f3a7.html';

test.describe('Adjacency List Visualization - 6e09e031-d5a0-11f0-8040-510e90b1f3a7', () => {
  // Navigate to the application before each test
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    // Basic sanity: page title contains "Adjacency List"
    await expect(page).toHaveTitle(/Adjacency List/);
  });

  // Test initial page load and default state
  test('Initial load shows placeholder adjacency text, textarea with sample JSON and canvas present', async ({ page }) => {
    // Ensure the adjacency list placeholder text is present (set initially by script)
    const adjacency = page.locator('#adjacencyListText');
    await expect(adjacency).toBeVisible();
    // The script initially sets this placeholder text before parsing sample JSON,
    // so we assert the placeholder message is present.
    await expect(adjacency).toHaveText(/Enter graph data and click "Visualize Graph"/);

    // The graph input textarea should contain the sample JSON by default
    const textarea = page.locator('#graphData');
    await expect(textarea).toBeVisible();
    const value = await textarea.inputValue();
    // The prefilled JSON should contain at least vertex "A" and "B"
    expect(value).toContain('"A"');
    expect(value).toContain('"B"');

    // Canvas should be visible for drawing the graph
    const canvas = page.locator('#graphCanvas');
    await expect(canvas).toBeVisible();
    // Confirm that the legend and operation buttons are visible
    await expect(page.locator('#dfsBtn')).toBeVisible();
    await expect(page.locator('#bfsBtn')).toBeVisible();
    await expect(page.locator('#resetBtn')).toBeVisible();
  });

  // Group interactions related to visualization and adjacency text
  test.describe('Visualization and adjacency list updates', () => {
    test('Clicking Visualize Graph with valid JSON updates adjacency list and produces no page errors', async ({ page }) => {
      const consoleErrors = [];
      const pageErrors = [];

      // Capture console.error messages
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      // Capture uncaught page errors
      page.on('pageerror', err => pageErrors.push(String(err)));

      // Click visualize button to parse the textarea JSON and update adjacency list
      await page.click('#visualizeBtn');

      // After clicking visualize, adjacency list text should now reflect the parsed graph
      const adj = page.locator('#adjacencyListText');
      await expect(adj).toBeVisible();

      // The displayed adjacency list textContent should contain entries for vertices A..F
      const text = await adj.textContent();
      expect(text).toContain('A:');
      expect(text).toContain('B:');
      expect(text).toContain('C:');
      expect(text).toContain('D:');
      expect(text).toContain('E:');
      expect(text).toContain('F:');
      // Check a sample adjacency entry formatting
      expect(text).toMatch(/A:\s*\[B,\s*C\]/);

      // No uncaught page errors should have been emitted during a normal visualize
      expect(pageErrors.length).toBe(0);
      // No console.error messages expected for a valid graph
      expect(consoleErrors.length).toBe(0);
    });

    // Test invalid JSON handling: should show an alert and log the parsing error
    test('Clicking Visualize Graph with invalid JSON shows alert and logs a console.error', async ({ page }) => {
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      // Replace textarea content with invalid JSON
      const textarea = page.locator('#graphData');
      await textarea.fill('this is not json');

      // Listen for the alert dialog triggered by the catch block
      let dialogMessage = null;
      page.once('dialog', async dialog => {
        dialogMessage = dialog.message();
        // Accept the alert so it doesn't block the test
        await dialog.accept();
      });

      await page.click('#visualizeBtn');

      // The application uses a generic alert message on parse/validation errors
      expect(dialogMessage).toContain('Invalid JSON format');

      // Ensure at least one console.error was emitted with parsing details
      // The error text should include 'SyntaxError' or 'Unexpected token' depending on environment
      expect(consoleErrors.length).toBeGreaterThanOrEqual(1);
      const joined = consoleErrors.join(' ').toLowerCase();
      expect(
        joined.includes('unexpected token') ||
        joined.includes('syntaxerror') ||
        joined.includes('error')
      ).toBeTruthy();
    });

    // Test validation errors (neighbor undefined) lead to alert and specific console.error message
    test('Visualize Graph with undefined neighbor throws validation error and logs specific console.error', async ({ page }) => {
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      // Provide JSON where neighbor "B" is referenced but not defined
      const badJson = '{"A": ["B"]}';
      await page.locator('#graphData').fill(badJson);

      // Expect generic alert to be shown due to catch block
      let dialogMessage = null;
      page.once('dialog', async dialog => {
        dialogMessage = dialog.message();
        await dialog.accept();
      });

      await page.click('#visualizeBtn');

      expect(dialogMessage).toContain('Invalid JSON format');

      // The console.error should include the specific validation error message
      // Wait briefly to ensure console events are collected
      await page.waitForTimeout(50);
      const matched = consoleErrors.some(text => text.includes('Vertex B is not defined in the graph'));
      expect(matched).toBe(true);
    });

    // Test validation errors when a vertex value is not an array
    test('Visualize Graph with non-array neighbor value logs validation console.error', async ({ page }) => {
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      // Provide JSON where "A" has a string instead of an array
      const badJson = '{"A": "B"}';
      await page.locator('#graphData').fill(badJson);

      let dialogMessage = null;
      page.once('dialog', async dialog => {
        dialogMessage = dialog.message();
        await dialog.accept();
      });

      await page.click('#visualizeBtn');

      expect(dialogMessage).toContain('Invalid JSON format');

      // Ensure console.error includes the "must be an array" message
      await page.waitForTimeout(50);
      const matched = consoleErrors.some(text => text.includes('Value for vertex A must be an array'));
      expect(matched).toBe(true);
    });
  });

  // Group tests for traversal controls and reset behavior
  test.describe('Traversal operations (DFS/BFS) and Reset control', () => {
    test('DFS and BFS buttons do nothing harmful when graph is empty', async ({ page }) => {
      const pageErrors = [];
      page.on('pageerror', err => pageErrors.push(String(err)));
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      // Make graph empty by setting textarea to empty object and visualizing
      await page.locator('#graphData').fill('{}');
      await page.click('#visualizeBtn');

      // Ensure adjacency area shows placeholder again (graph is empty)
      await expect(page.locator('#adjacencyListText')).toHaveText(/Enter graph data and click "Visualize Graph"/);

      // Click DFS and BFS; since graph is empty, functions should return early without errors
      await page.click('#dfsBtn');
      await page.click('#bfsBtn');

      // No uncaught page errors should have occurred
      expect(pageErrors.length).toBe(0);
      // No console.error messages expected in this flow
      expect(consoleErrors.length).toBe(0);
    });

    test('Reset button can be clicked after visualization and does not throw', async ({ page }) => {
      const pageErrors = [];
      page.on('pageerror', err => pageErrors.push(String(err)));
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      // Visualize the default graph
      await page.click('#visualizeBtn');

      // Click DFS to start some animation (animations run via requestAnimationFrame/setTimeout)
      await page.click('#dfsBtn');

      // Wait briefly to allow the DFS routine to start (not waiting for full traversal)
      await page.waitForTimeout(200);

      // Now click reset to stop/cancel animation and clear states
      await page.click('#resetBtn');

      // Wait briefly for reset to complete
      await page.waitForTimeout(50);

      // Assert no uncaught page errors during this sequence
      expect(pageErrors.length).toBe(0);
      // No console.error messages expected for a normal reset
      expect(consoleErrors.length).toBe(0);

      // The adjacency list text content should still be present and show the vertices (visualize didn't remove them)
      const adjText = await page.locator('#adjacencyListText').textContent();
      expect(adjText).toContain('A:');
      expect(adjText).toContain('B:');
    });
  });
});