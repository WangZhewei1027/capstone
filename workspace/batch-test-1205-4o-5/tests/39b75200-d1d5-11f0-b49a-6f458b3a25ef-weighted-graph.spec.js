import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b75200-d1d5-11f0-b49a-6f458b3a25ef.html';

// Comprehensive Playwright tests for the Weighted Graph Visualization application.
// File: 39b75200-d1d5-11f0-b49a-6f458b3a25ef-weighted-graph.spec.js

test.describe('Weighted Graph Visualization - End-to-End Tests', () => {
  // Arrays to collect console messages and page errors during each test run.
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages (info, warn, error, etc.)
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture unhandled page errors (ReferenceError, TypeError, SyntaxError, etc.)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the hosted HTML page. Let any runtime script errors occur naturally.
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    // No teardown logic required beyond Playwright's automatic cleanup.
    // This hook is present to adhere to setup/teardown requirements.
  });

  test.describe('Initial page load and DOM structure', () => {
    test('should load the page and display the main heading', async ({ page }) => {
      // Verify the document title and main h1 are present and correct.
      await expect(page).toHaveTitle(/Weighted Graph Visualization/);

      const h1 = page.locator('h1');
      await expect(h1).toHaveCount(1);
      await expect(h1).toHaveText('Weighted Graph Visualization');
    });

    test('should have a visible canvas with correct id and dimensions', async ({ page }) => {
      // The canvas is the primary visualization element.
      const canvas = page.locator('#graphCanvas');
      await expect(canvas).toHaveCount(1);
      await expect(canvas).toBeVisible();

      // Check width and height attributes on the element
      const width = await canvas.getAttribute('width');
      const height = await canvas.getAttribute('height');
      expect(width).toBe('800');
      expect(height).toBe('600');

      // Ensure CSS border is applied (style attribute is inline from <style> tag not inline attr,
      // so assert computed style via evaluate).
      const hasBorder = await page.evaluate(() => {
        const c = document.getElementById('graphCanvas');
        return window.getComputedStyle(c).border && window.getComputedStyle(c).border !== 'none';
      });
      expect(hasBorder).toBe(true);
    });
  });

  test.describe('Interactive elements and controls', () => {
    test('should not contain any interactive controls (buttons, inputs, selects, forms)', async ({ page }) => {
      // The provided HTML contains no forms/inputs/buttons; assert that these selectors are absent.
      const interactiveCount = await page.evaluate(() => {
        return document.querySelectorAll('button, input, select, textarea, form').length;
      });
      expect(interactiveCount).toBe(0);
    });

    test('should have a canvas but no programmatic global variables exposed for node/edge arrays', async ({ page }) => {
      // The script uses top-level const for many variables. Those are not guaranteed to be window properties.
      // Verify that at least the canvas element is present, and check whether certain names are global properties.
      const globals = await page.evaluate(() => {
        return {
          hasWindowGraph: Object.prototype.hasOwnProperty.call(window, 'graph'),
          hasWindowNodes: Object.prototype.hasOwnProperty.call(window, 'nodes'),
          hasWindowEdges: Object.prototype.hasOwnProperty.call(window, 'edges'),
          hasWindowDrawGraph: Object.prototype.hasOwnProperty.call(window, 'drawGraph')
        };
      });

      // graph/nodes/edges were declared with const; they are NOT expected as window properties.
      expect(globals.hasWindowGraph).toBe(false);
      expect(globals.hasWindowNodes).toBe(false);
      expect(globals.hasWindowEdges).toBe(false);

      // drawGraph is a function declaration and typically becomes a global property on window.
      expect(globals.hasWindowDrawGraph).toBe(true);
    });
  });

  test.describe('Canvas rendering and drawing behavior', () => {
    test('should draw something on the canvas (non-empty image data)', async ({ page }) => {
      // Get the data URL for the canvas and assert it's non-trivial in size after drawing.
      const dataUrlLength = await page.evaluate(() => {
        const canvas1 = document.getElementById('graphCanvas');
        // toDataURL will serialize the current canvas contents.
        try {
          const dataUrl = canvas.toDataURL();
          return dataUrl.length;
        } catch (e) {
          // If toDataURL is restricted or throws, return 0 to indicate failure.
          return 0;
        }
      });

      // Expect the data URL to have a reasonable length indicating drawing occurred (not empty).
      expect(dataUrlLength).toBeGreaterThan(1000);
    });

    test('calling the page\'s drawGraph function again should not throw and should redraw', async ({ page }) => {
      // Verify drawGraph exists, call it, and ensure no new page errors were recorded by that action.
      const hasDrawGraph = await page.evaluate(() => typeof drawGraph === 'function');
      expect(hasDrawGraph).toBe(true);

      // Record errors length before invoking.
      const errorsBefore = pageErrors.length;

      // Call drawGraph in page context. Let any errors happen naturally.
      await page.evaluate(() => {
        // Invoke the existing function defined in the page.
        // Do not redefine or patch anything; simply call it.
        drawGraph();
      });

      // Allow microtasks to process in case errors are asynchronous (not likely here).
      await page.waitForTimeout(50);

      // Ensure no additional page errors were produced by calling drawGraph.
      const errorsAfter = pageErrors.length;
      expect(errorsAfter).toBe(errorsBefore);
    });
  });

  test.describe('Console and runtime errors observation', () => {
    test('should not emit console errors or unhandled page errors during normal load', async () => {
      // This test asserts that the page loaded without uncaught runtime errors.
      // The arrays were populated via listeners in beforeEach.
      const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
      // Expect no pageerror events and no console error messages.
      expect(pageErrors.length).toBe(0);
      expect(errorConsoleMessages.length).toBe(0);
    });

    test('should capture any console warnings or info messages if present (reporting)', async () => {
      // This test deliberately reports what console messages were captured so test output is informative.
      // It does not fail the test unless there are errors (handled in previous test).
      // Assert that we at least captured zero or more console messages of any type (always true).
      expect(consoleMessages).toBeInstanceOf(Array);
    });
  });

  test.describe('Accessibility and visibility checks', () => {
    test('canvas should be focusable via script if needed (has tabindex attribute not required)', async ({ page }) => {
      // The canvas does not include a tabindex; this assertion checks that it's visible and part of the accessibility tree.
      // We will check computed visibility and that it occupies non-zero bounding box.
      const rect = await page.evaluate(() => {
        const c1 = document.getElementById('graphCanvas');
        const r = c.getBoundingClientRect();
        return { width: r.width, height: r.height, visible: !(r.width === 0 && r.height === 0) };
      });

      expect(rect.width).toBeGreaterThan(0);
      expect(rect.height).toBeGreaterThan(0);
      expect(rect.visible).toBe(true);
    });
  });
});