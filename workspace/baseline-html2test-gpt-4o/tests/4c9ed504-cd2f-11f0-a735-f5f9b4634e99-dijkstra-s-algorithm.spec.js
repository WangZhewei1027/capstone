import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9ed504-cd2f-11f0-a735-f5f9b4634e99.html';

test.describe('Dijkstra\'s Algorithm Visualization - end-to-end tests', () => {
  // Arrays to collect runtime diagnostics for each test
  let consoleMessages;
  let pageErrors;
  let dialogs;

  // Set up listeners before each test and navigate to the page.
  // We attach listeners early so that the alert/dialog raised during DOMContentLoaded is captured.
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];
    dialogs = [];

    // Capture console messages from the page
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture unhandled page errors (ReferenceError, TypeError, etc.)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Capture dialogs (alerts) and automatically accept them so navigation isn't blocked.
    page.on('dialog', async dialog => {
      dialogs.push({ type: dialog.type(), message: dialog.message() });
      await dialog.accept();
    });

    // Navigate to the application under test
    const response = await page.goto(APP_URL, { waitUntil: 'load' });
    // Ensure the page responded successfully (200-299). If not, tests will fail here with a clear message.
    expect(response && response.ok()).toBeTruthy();
  });

  // Teardown: no special teardown needed, but keep for clarity
  test.afterEach(async () => {
    // Intentionally left blank - listeners are tied to the page fixture and cleared by Playwright
  });

  test.describe('Initial load and DOM structure', () => {
    test('renders the page title and graph container', async ({ page }) => {
      // Verify the H1 title is present and correct
      const title = await page.locator('h1').innerText();
      expect(title).toBe("Dijkstra's Algorithm Visualization");

      // Verify the graph container exists
      const graphExists = await page.locator('#graphContainer').count();
      expect(graphExists).toBeGreaterThan(0);
    });

    test('draws 4 nodes with correct ids and inline styles for positions', async ({ page }) => {
      // There should be exactly 4 node elements
      const nodes = page.locator('.node');
      await expect(nodes).toHaveCount(4);

      // Check textual labels and inline style.left and style.top for each node
      const expectedNodes = [
        { id: 'A', left: '0px', top: '0px' },     // index 0
        { id: 'B', left: '100px', top: '120px' }, // index 1
        { id: 'C', left: '200px', top: '0px' },   // index 2
        { id: 'D', left: '300px', top: '120px' }  // index 3
      ];

      for (let i = 0; i < expectedNodes.length; i++) {
        const locator = nodes.nth(i);
        // Check label
        const text = await locator.innerText();
        expect(text).toBe(expectedNodes[i].id);

        // Check inline style.left and style.top values set by the script
        const styleLeft = await locator.evaluate(el => el.style.left);
        const styleTop = await locator.evaluate(el => el.style.top);
        expect(styleLeft).toBe(expectedNodes[i].left);
        expect(styleTop).toBe(expectedNodes[i].top);
      }
    });

    test('draws 5 edges with non-zero widths and inline transform rotations', async ({ page }) => {
      // There should be exactly 5 edge elements per the implementation logic
      const edges = page.locator('.edge');
      await expect(edges).toHaveCount(5);

      // Ensure each edge has a width > 0px and has transform set (rotation)
      const edgeCount = await edges.count();
      for (let i = 0; i < edgeCount; i++) {
        const edge = edges.nth(i);
        const width = await edge.evaluate(el => el.style.width);
        const transform = await edge.evaluate(el => el.style.transform);
        // width is like "123.456px" - ensure it's not empty and not "0px"
        expect(width).toBeTruthy();
        expect(parseFloat(width)).toBeGreaterThan(0);
        // transform should contain "rotate("
        expect(transform).toContain('rotate(');
      }
    });
  });

  test.describe('Algorithm behavior and runtime diagnostics', () => {
    test('displays an alert with the expected shortest path message from A to D', async ({ page }) => {
      // The page shows an alert during load that we captured in beforeEach via page.on('dialog')
      // Ensure at least one dialog was shown and that it contains the expected shortest path information.
      expect(dialogs.length).toBeGreaterThan(0);

      // Find the alert that starts with "Shortest path from A to D"
      const shortestPathDialog = dialogs.find(d => d.message.startsWith('Shortest path from A to D:'));
      expect(shortestPathDialog).toBeTruthy();

      // Validate the exact alert message content (as produced by the page's displayShortestPath call)
      // Expected: "Shortest path from A to D: A -> B -> C -> D with distance 4"
      const expectedMessage = 'Shortest path from A to D: A -> B -> C -> D with distance 4';
      expect(shortestPathDialog.message).toBe(expectedMessage);
      expect(shortestPathDialog.type).toBe('alert');
    });

    test('has no unhandled page errors (no ReferenceError/TypeError thrown during load)', async () => {
      // Verify that the page did not emit any pageerror events during load
      expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e => e.message).join(' | ')}`).toBe(0);
    });

    test('does not log console errors during initialization', async () => {
      // Ensure there are no console messages with type 'error'
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      const errorTexts = consoleErrors.map(e => e.text).join(' | ');
      expect(consoleErrors.length, `Console errors found: ${errorTexts}`).toBe(0);
    });
  });

  test.describe('Content and accessibility checks', () => {
    test('node elements are focusable via accessibility tree and contain meaningful text', async ({ page }) => {
      // Ensure each node has accessible name (innerText) and is present in the accessibility tree
      const nodes = page.locator('.node');
      await expect(nodes).toHaveCount(4);

      for (let i = 0; i < 4; i++) {
        const node = nodes.nth(i);
        const name = await node.evaluate(el => el.textContent && el.textContent.trim());
        // Node should have a label like 'A', 'B', 'C', or 'D'
        expect(name).toMatch(/^[A-D]$/);
      }
    });
  });
});