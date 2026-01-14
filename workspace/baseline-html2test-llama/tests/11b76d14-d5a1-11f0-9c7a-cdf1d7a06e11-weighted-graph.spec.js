import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b76d14-d5a1-11f0-9c7a-cdf1d7a06e11.html';

test.describe('Weighted Graph - overall app checks', () => {
  // Verify the page loads, the main static elements are present,
  // and script runtime errors (if any) are observed and asserted.
  test('Initial load: page title, header and canvas exist; script errors are captured', async ({ page }) => {
    // Collect runtime page errors and console messages for assertions
    const pageErrors = [];
    const consoleMessages = [];
    page.on('pageerror', (err) => {
      // pageerror provides an Error object from the page context
      pageErrors.push(err);
    });
    page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
    });

    // Navigate to the page; let the page's own scripts run naturally (may throw)
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Basic DOM checks
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText('Weighted Graph');

    const canvas = page.locator('canvas#graph');
    await expect(canvas).toHaveCount(1);
    await expect(canvas).toBeVisible();
    // Check canvas attributes (visual size)
    const canvasWidth = await canvas.getAttribute('width');
    const canvasHeight = await canvas.getAttribute('height');
    expect(canvasWidth).toBe('400');
    expect(canvasHeight).toBe('400');

    // There are no interactive controls in the provided HTML (buttons/inputs/forms)
    await expect(page.locator('button')).toHaveCount(0);
    await expect(page.locator('input')).toHaveCount(0);
    await expect(page.locator('form')).toHaveCount(0);
    await expect(page.locator('select')).toHaveCount(0);
    await expect(page.locator('textarea')).toHaveCount(0);

    // The application's inline script has known runtime issues.
    // Assert that at least one page error occurred during load and that it is a TypeError.
    // This verifies that we observed runtime exceptions as-is (we do not patch or modify the page).
    expect(pageErrors.length).toBeGreaterThan(0);
    // Check the first error's name/message to ensure it's a TypeError arising from the broken implementation.
    const firstError = pageErrors[0];
    expect(firstError).toBeTruthy();
    // Error name should indicate a TypeError in most JS engines for this kind of issue
    expect(firstError.name).toMatch(/TypeError/i);
    // The message should reference undefined/push/reading or similar; be flexible with regex
    expect(firstError.message).toMatch(/push|reading|undefined|Cannot read/i);

    // Console messages: the page does not intentionally log many messages.
    // At minimum, ensure console did not contain unexpected info-level logs.
    // We allow zero or more console messages (script errors are captured via pageerror).
    // Just assert the captured messages structure is as expected (type/text).
    for (const msg of consoleMessages) {
      expect(typeof msg.type).toBe('string');
      expect(typeof msg.text).toBe('string');
    }
  });
});

test.describe('Weighted Graph - internal state inspection after failed script execution', () => {
  // These tests inspect in-page global variables that the script created before it failed.
  // They intentionally do not call or patch any functions; they only read state as-is.
  test('Nodes, edges, and weights arrays exist and have expected lengths/types', async ({ page }) => {
    // Capture page errors to ensure they happened (do not prevent assertions)
    const errors = [];
    page.on('pageerror', (e) => errors.push(e));

    await page.goto(APP_URL, { waitUntil: 'load' });

    // Read the global variables created by the page script.
    // We only read existing globals; we do not inject or modify them.
    const state = await page.evaluate(() => {
      // Safely capture the existence and basic structure of the global arrays
      return {
        nodesExists: typeof nodes !== 'undefined',
        edgesExists: typeof edges !== 'undefined',
        weightsExists: typeof weights !== 'undefined',
        nodes: typeof nodes !== 'undefined' ? nodes : null,
        edges: typeof edges !== 'undefined' ? edges : null,
        weights: typeof weights !== 'undefined' ? weights : null,
      };
    });

    // The script's addNode calls run before the error, so we expect arrays to exist and have length 4
    expect(state.nodesExists).toBe(true);
    expect(state.edgesExists).toBe(true);
    expect(state.weightsExists).toBe(true);

    // Validate the lengths of the arrays
    expect(Array.isArray(state.nodes)).toBe(true);
    expect(state.nodes.length).toBe(4);
    expect(Array.isArray(state.edges)).toBe(true);
    expect(state.edges.length).toBe(4);
    expect(Array.isArray(state.weights)).toBe(true);
    expect(state.weights.length).toBe(4);

    // The implementation calls addNode('A'), addNode('B'), addNode('C'), addNode('D')
    // but those calls use strings (incorrectly) — assert that the nodes are those strings.
    expect(state.nodes).toEqual(['A', 'B', 'C', 'D']);

    // Edges were set up as empty arrays for each node by addNode calls
    // Since addEdge likely failed on the first call, the inner arrays should still be empty arrays.
    for (let i = 0; i < state.edges.length; i++) {
      expect(Array.isArray(state.edges[i])).toBe(true);
      expect(state.edges[i].length).toBe(0);
    }

    // Weights were initialized with 0 for each node; because addEdge failed, they should remain 0.
    for (let i = 0; i < state.weights.length; i++) {
      expect(state.weights[i]).toBe(0);
    }

    // Confirm that a runtime error was captured during the page load as expected
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].name).toMatch(/TypeError/i);
  });

  test('Canvas remains present and has expected attributes even when script errors occur', async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Query the canvas via DOM; ensure it still exists and has correct CSS border as defined in the page
    const canvas1 = page.locator('#graph');
    await expect(canvas).toBeVisible();

    // Verify computed style border is present (style declared in head)
    const border = await page.evaluate(() => {
      const c = document.getElementById('graph');
      if (!c) return null;
      const style = window.getComputedStyle(c);
      return {
        width: c.getAttribute('width'),
        height: c.getAttribute('height'),
        border: style.border,
      };
    });

    expect(border).not.toBeNull();
    expect(border.width).toBe('400');
    expect(border.height).toBe('400');
    // The CSS in the page sets a border; ensure the computed border contains 'px' or 'solid'
    expect(border.border).toMatch(/solid|px|black/);
  });
});

test.describe('Weighted Graph - negative / edge conditions', () => {
  // Test to ensure there are no interactive elements to manipulate and that attempting to
  // query non-existent controls yields appropriate empty results (edge case checks).
  test('No user-interactive controls exist on the page; querying them returns empties', async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Query for common interactive elements
    const buttons = await page.locator('button').count();
    const inputs = await page.locator('input').count();
    const forms = await page.locator('form').count();

    // All should be zero per the provided HTML
    expect(buttons).toBe(0);
    expect(inputs).toBe(0);
    expect(forms).toBe(0);
  });
});