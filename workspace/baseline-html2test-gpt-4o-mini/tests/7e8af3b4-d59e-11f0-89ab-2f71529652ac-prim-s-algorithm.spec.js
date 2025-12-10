import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8af3b4-d59e-11f0-89ab-2f71529652ac.html';

test.describe("Prim's Algorithm Visualization - End-to-end tests", () => {
  // Arrays to capture runtime diagnostics for each test run
  let consoleMessages = [];
  let pageErrors = [];

  // Setup: navigate to the page and register listeners for console and page errors.
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages (log, error, warning, etc.)
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture unhandled exceptions on the page (Runtime errors)
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  // Teardown: if additional cleanup needed per test it can go here.
  test.afterEach(async ({ page }) => {
    // no-op for now; listeners are tied to the page fixture and will be cleaned up by Playwright automatically
  });

  test('Initial page load: page structure and default state are correct', async ({ page }) => {
    // Verify page title and header
    await expect(page).toHaveTitle(/Prim's Algorithm Visualization/);
    const header = page.locator('h1');
    await expect(header).toHaveText(/Prim's Algorithm Visualization/);

    // Verify the Start button exists and is visible
    const startButton = page.locator('#startAlgorithm');
    await expect(startButton).toBeVisible();
    await expect(startButton).toHaveText("Start Prim's Algorithm");

    // Verify the graph container exists
    const graph = page.locator('#graph');
    await expect(graph).toBeVisible();

    // Verify 10 nodes were generated with .node class and unique data-id attributes 0..9
    const nodes = page.locator('.node');
    await expect(nodes).toHaveCount(10);

    // Validate each node has a data-id attribute and left/top positions within expected bounds
    const ids = new Set();
    for (let i = 0; i < 10; i++) {
      const node = nodes.nth(i);
      const dataId = await node.getAttribute('data-id');
      expect(dataId).not.toBeNull();
      ids.add(dataId);

      // Check left/top style are set and numeric (strings like "123.45px")
      const left = await node.evaluate(el => el.style.left);
      const top = await node.evaluate(el => el.style.top);
      expect(left).toMatch(/^\d+(\.\d+)?px$/);
      expect(top).toMatch(/^\d+(\.\d+)?px$/);

      // Parse numbers and ensure they are within the 0..480 expected generation bounds
      const leftNum = parseFloat(left.replace('px', ''));
      const topNum = parseFloat(top.replace('px', ''));
      expect(leftNum).toBeGreaterThanOrEqual(0);
      expect(leftNum).toBeLessThanOrEqual(480);
      expect(topNum).toBeGreaterThanOrEqual(0);
      expect(topNum).toBeLessThanOrEqual(480);
    }
    // Ensure ids 0..9 are present (as strings)
    for (let i = 0; i < 10; i++) {
      expect(ids.has(String(i))).toBe(true);
    }

    // Assert that there were no runtime page errors during initial load
    expect(pageErrors.length).toBe(0);

    // Assert no console.error messages occurred during load
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test("Clicking 'Start Prim's Algorithm' draws MST edges and updates DOM", async ({ page }) => {
    // Purpose: ensure clicking the start button runs the algorithm and draws edges between nodes.

    const startButton1 = page.locator('#startAlgorithm');
    await expect(startButton).toBeVisible();

    // Click the button to start the algorithm
    await startButton.click();

    // Wait until the expected number of edges are drawn.
    // The algorithm attempts to produce nodeCount - 1 edges; with 10 nodes expect 9 edges.
    await page.waitForFunction(() => document.querySelectorAll('.edge').length === 9, {}, { timeout: 3000 });

    const edges = page.locator('.edge');
    await expect(edges).toHaveCount(9);

    // Verify visual and style attributes of the drawn edges
    for (let i = 0; i < 9; i++) {
      const edge = edges.nth(i);

      // The inline style sets backgroundColor to 'red' — validate that inline style or computed color indicates red.
      const inlineBg = await edge.evaluate(el => el.style.backgroundColor);
      // Inline style was set to 'red' in drawEdges
      expect(inlineBg === 'red' || inlineBg === 'rgb(255, 0, 0)' || inlineBg === '').toBeTruthy();

      // Ensure the width (length) was calculated and set (non-zero width expected)
      const widthStr = await edge.evaluate(el => el.style.width);
      // width may be set as '123.45px', ensure it's a parsable number and not zero
      expect(widthStr).toMatch(/^\d+(\.\d+)?px$/);
      const widthNum = parseFloat(widthStr.replace('px', ''));
      expect(widthNum).toBeGreaterThan(0);

      // transform rotation should be present (string includes 'rotate(')
      const transform = await edge.evaluate(el => el.style.transform);
      expect(transform).toContain('rotate(');
    }

    // Ensure no runtime errors occurred during the algorithm execution and drawing
    expect(pageErrors.length).toBe(0);

    // Ensure no console.error messages were produced during algorithm execution
    const consoleErrors1 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test("Clicking 'Start Prim's Algorithm' twice appends edges (cumulative drawing)", async ({ page }) => {
    // Purpose: verify repeat clicking appends additional edges; this checks DOM mutation behavior
    const startButton2 = page.locator('#startAlgorithm');
    await startButton.click();

    // Wait for first batch of edges
    await page.waitForFunction(() => document.querySelectorAll('.edge').length === 9, {}, { timeout: 3000 });
    await expect(page.locator('.edge')).toHaveCount(9);

    // Click again - the implementation appends another set of edges
    await startButton.click();

    // Now expect doubled number of edges (9 + 9 = 18)
    await page.waitForFunction(() => document.querySelectorAll('.edge').length === 18, {}, { timeout: 3000 });
    await expect(page.locator('.edge')).toHaveCount(18);

    // Confirm still no page errors after repeated execution
    expect(pageErrors.length).toBe(0);
  });

  test('Interacting with node elements does not cause errors and nodes remain intact', async ({ page }) => {
    // Purpose: ensure nodes are interactive (clickable) and interacting does not break the app
    const firstNode = page.locator('.node').first();
    await expect(firstNode).toBeVisible();

    // Click a node — elements are divs and not focusable by default, but clicking should not throw errors
    await firstNode.click();

    // Confirm node count unchanged
    await expect(page.locator('.node')).toHaveCount(10);

    // Confirm no page errors after user interaction
    expect(pageErrors.length).toBe(0);

    // Confirm no console error messages after the click
    const consoleErrors2 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Diagnostics: capture console messages and page errors if they naturally occur', async ({ page }) => {
    // Purpose: Observe and assert diagnostic data is captured correctly.
    // Note: We do not inject faults; we simply validate that the listeners capture messages.

    // There should be some console messages or none; assert that our capture arrays exist and are arrays
    expect(Array.isArray(consoleMessages)).toBe(true);
    expect(Array.isArray(pageErrors)).toBe(true);

    // As an actionable assertion: ensure that console messages (if any) have a type and text
    for (const msg of consoleMessages) {
      expect(typeof msg.type).toBe('string');
      expect(typeof msg.text).toBe('string');
    }

    // If any page errors occurred, assert they are Error objects (this documents natural failures)
    for (const err of pageErrors) {
      expect(err).toBeInstanceOf(Error);
    }

    // Finally, a combined assertion: normally this application should not throw on load,
    // so prefer zero page errors. This assertion will surface if something malfunctioned in the environment.
    expect(pageErrors.length).toBe(0);
  });
});