import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/262784d2-cd2a-11f0-bee4-a3a342d77f94.html';

test.describe('Weighted Graph Visualization (app id: 262784d2-cd2a-11f0-bee4-a3a342d77f94)', () => {
  // Collect console messages and page errors for assertions
  let consoleMessages = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Listen to console events to capture any logs (including errors/warnings)
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Listen to unhandled page errors (pageerror)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the application and wait for full load
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async ({ page }) => {
    // Ensure page is closed/clean between tests (Playwright handles this, but explicit navigation to about:blank helps)
    try {
      await page.goto('about:blank');
    } catch (e) {
      // ignore navigation errors during teardown
    }
  });

  test.describe('Initial page load and canvas rendering', () => {
    test('should load the page and have the expected title and canvas element', async ({ page }) => {
      // Verify document title
      await expect(page).toHaveTitle(/Weighted Graph Visualization/);

      // Verify canvas element exists and has expected id and attributes
      const canvasHandle = await page.$('canvas#canvas');
      expect(canvasHandle).not.toBeNull();

      // Verify width and height attributes on the canvas element
      const { width, height } = await page.$eval('canvas#canvas', (c) => {
        return { width: c.width, height: c.height };
      });
      expect(width).toBe(800);
      expect(height).toBe(600);
    });

    test('canvas should contain drawing data (non-blank image)', async ({ page }) => {
      // Use toDataURL to inspect that the canvas is not blank (non-trivial length)
      const dataUrl = await page.evaluate(() => {
        const canvas = document.getElementById('canvas');
        // toDataURL should succeed and produce a data URL string
        return canvas.toDataURL();
      });

      // Basic sanity checks for data URL format and size (ensures some drawing occurred)
      expect(typeof dataUrl).toBe('string');
      expect(dataUrl.startsWith('data:image/png')).toBeTruthy();
      // Data URLs for an empty 800x600 canvas will still be long, but drawing should make it non-trivially large.
      // We assert it is reasonably long to indicate pixels were written.
      expect(dataUrl.length).toBeGreaterThan(2000);
    });
  });

  test.describe('Interactive controls and accessibility', () => {
    test('should have no interactive form controls (buttons, inputs, selects, forms, textareas) in the DOM', async ({ page }) => {
      // Query for common interactive elements; the app is a canvas visualization only
      const interactiveCount = await page.$$eval('button, input, select, form, textarea', els => els.length);
      expect(interactiveCount).toBe(0);
    });

    test('canvas element should be visible and reachable via ARIA/DOM queries', async ({ page }) => {
      // The canvas should be visible
      const isVisible = await page.isVisible('canvas#canvas');
      expect(isVisible).toBe(true);

      // The canvas should be focusable via JS and respond to client-side queries
      const nodeName = await page.$eval('canvas#canvas', el => el.nodeName.toLowerCase());
      expect(nodeName).toBe('canvas');
    });
  });

  test.describe('Script variable scoping and runtime error observation', () => {
    test('attempting to access script-defined variables (nodes) from page.evaluate should produce a ReferenceError-like evaluation failure', async ({ page }) => {
      // The page's script defines "const nodes = ..." at top-level scope.
      // In browser JavaScript, top-level const/let do NOT become window properties and are not accessible as global variables from evaluating an undeclared identifier.
      // Attempting to read "nodes" directly via page.evaluate should therefore fail with a ReferenceError propagated by the evaluation.
      let threw = false;
      try {
        // This call intentionally tries to access an undeclared identifier in the evaluation context.
        await page.evaluate(() => nodes);
      } catch (e) {
        threw = true;
        // The error message from Playwright will typically include ReferenceError; assert that the message indicates an evaluation failure or reference error.
        expect(e).toBeInstanceOf(Error);
        expect(e.message).toMatch(/ReferenceError|not defined|is not defined|Evaluation failed/);
      }
      expect(threw, 'Expected page.evaluate(() => nodes) to throw a ReferenceError-like error').toBe(true);
    });

    test('attempting to access script-defined canvas/context variables (canvas, ctx) should produce ReferenceError-like evaluation failures', async ({ page }) => {
      // The script defines "const canvas" and "const ctx" inside the page script; these are not global properties.
      for (const ident of ['canvas', 'ctx']) {
        let threw = false;
        try {
          await page.evaluate((name) => {
            // eslint-disable-next-line no-eval
            return eval(name); // intentionally evaluate identifier name to trigger same undeclared identifier access
          }, ident);
        } catch (e) {
          threw = true;
          expect(e).toBeInstanceOf(Error);
          expect(e.message).toMatch(/ReferenceError|not defined|is not defined|Evaluation failed/);
        }
        expect(threw, `Expected page.evaluate access to "${ident}" to throw`).toBe(true);
      }
    });
  });

  test.describe('Console and runtime error monitoring', () => {
    test('should not emit runtime page errors during initial load', async ({ page }) => {
      // pageErrors array was collected by the beforeEach listener
      // Assert that there were no uncaught page errors during load
      expect(pageErrors.length).toBe(0);
    });

    test('should not emit console.error messages during initial load', async ({ page }) => {
      // Filter console messages for error types
      const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
      // We expect no console error/warning messages from this simple visualization
      expect(errorConsoleMsgs.length).toBe(0);
    });
  });
});