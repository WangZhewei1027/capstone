import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da11ba0-cd2f-11f0-a440-159d7b77af86.html';

test.describe('Dijkstra Visualization - Static DOM checks', () => {
  // Verify the static structure of the page is present before script execution effects.
  test('page loads and six node elements (A-F) are present and visible', async ({ page }) => {
    // Navigate to the page
    await page.goto(APP_URL);

    // There should be six elements with class "node"
    const nodes = page.locator('.node');
    await expect(nodes).toHaveCount(6);

    // Verify each node's primary text content corresponds to its ID (A-F)
    const expectedIds = ['A', 'B', 'C', 'D', 'E', 'F'];
    for (let i = 0; i < expectedIds.length; i++) {
      const node = nodes.nth(i);
      // Ensure element is visible
      await expect(node).toBeVisible();
      // The visible text content should include the letter (and not distances, if script errored)
      const text = await node.textContent();
      expect(text).toContain(expectedIds[i]);
    }
  });

  // Ensure the core functions are defined on the window object (they're declared in the script)
  test('dijkstraAlgorithm and visualizePath functions are defined on window', async ({ page }) => {
    await page.goto(APP_URL);

    // Check existence of functions
    const isDijkstraFn = await page.evaluate(() => typeof window.dijkstraAlgorithm === 'function');
    const isVisualizeFn = await page.evaluate(() => typeof window.visualizePath === 'function');

    expect(isDijkstraFn).toBe(true);
    expect(isVisualizeFn).toBe(true);
  });
});

test.describe('Dijkstra Visualization - Script execution and error handling', () => {
  // The app script contains an incorrect use of Object.fromEntries which should produce a runtime TypeError.
  // These tests intentionally do not modify the page; they simply observe the runtime behavior and assert that errors occur.

  test('script execution produces a runtime pageerror (TypeError) and distances are NOT appended', async ({ page }) => {
    // Collect pageerror events
    const pageErrors = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Collect console messages for additional inspection
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Navigate to the page (attach listeners before navigation to capture errors)
    await page.goto(APP_URL);

    // Allow a short time for scripts to run and errors to be emitted
    await page.waitForTimeout(200);

    // Assert that at least one pageerror was captured
    expect(pageErrors.length).toBeGreaterThan(0);

    // The error should be a TypeError related to the incorrect Object.fromEntries usage.
    // Be permissive in matching, as exact wording can vary across engines.
    const messages = pageErrors.map(e => e.message || '').join(' | ');
    expect(messages).toMatch(/TypeError|fromEntries|iterable/i);

    // Also assert that the browser console contains an error-level message mentioning TypeError or fromEntries
    const foundConsoleError = consoleMessages.some(m =>
      m.type === 'error' || /TypeError|fromEntries|iterable/i.test(m.text)
    );
    expect(foundConsoleError).toBeTruthy();

    // Because the algorithm errored during execution, the visualization step should not have appended any <span> distance nodes.
    const distanceSpans = page.locator('.node span');
    await expect(distanceSpans).toHaveCount(0);
  });

  test('no distance annotations present for any node after error', async ({ page }) => {
    // This test reinforces that none of the node elements received appended span children due to the runtime error.

    // Navigate to the page
    await page.goto(APP_URL);

    // Small wait for any attempted DOM updates (if they had happened)
    await page.waitForTimeout(150);

    const nodes = page.locator('.node');
    await expect(nodes).toHaveCount(6);

    // Ensure each node does not contain a span element (which would hold distance text)
    for (let i = 0; i < 6; i++) {
      const spansInside = nodes.nth(i).locator('span');
      await expect(spansInside).toHaveCount(0);
    }
  });
});

test.describe('Edge cases and accessibility-oriented checks', () => {
  // Since the app contains no interactive controls (buttons, inputs, forms), we test edge scenarios:
  // the app's resilience to script errors and basic accessibility/visibility of nodes.

  test('graph nodes are reachable by role/visibility checks (basic accessibility smoke)', async ({ page }) => {
    await page.goto(APP_URL);

    // Visually all nodes should be visible
    const nodes = page.locator('.node');
    await expect(nodes).toBeVisible();

    // Each node should have a sufficiently descriptive text (the letter)
    for (let i = 0; i < 6; i++) {
      const nodeText = (await nodes.nth(i).textContent()) || '';
      // Should at least contain a single uppercase letter A-F
      expect(nodeText).toMatch(/[A-F]/);
    }
  });

  test('verify that no unexpected interactive controls exist on page', async ({ page }) => {
    await page.goto(APP_URL);

    // The page as provided contains no form controls. Assert that no input/select/button/textarea elements exist.
    const inputs = await page.locator('input, select, textarea, button, form').count();
    expect(inputs).toBe(0);
  });
});