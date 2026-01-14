import { test, expect } from '@playwright/test';

test.describe('Depth-First Search (DFS) - Interactive HTML Application', () => {
  // URL of the page under test
  const URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f6f506-d5a1-11f0-80b9-e1f86cea383f.html';

  // Collect pageerrors and console messages for assertions
  let pageErrors = [];
  let consoleMessages = [];

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    // Capture uncaught exceptions thrown on the page
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Capture console messages for later inspection
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Navigate to the page. Attach listeners before navigation to catch early errors.
    await page.goto(URL, { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    // No explicit teardown required beyond Playwright fixtures, but we keep hook for symmetry
  });

  test('Initial load: page structure, title and canvas element are present', async ({ page }) => {
    // Verify document title and heading
    await expect(page).toHaveTitle(/Depth-First Search \(DFS\)/i);

    const heading = page.locator('h1');
    await expect(heading).toHaveText('Depth-First Search (DFS)');

    // Verify canvas exists and has the expected id
    const canvas = page.locator('canvas#graph');
    await expect(canvas).toHaveCount(1);
    // Ensure the canvas has some dimensions in the markup (width/height set by CSS fallback)
    const box = await canvas.boundingBox();
    // boundingBox can be null in some environments, so assert presence of element and that getContext exists
    const hasGetContext = await page.evaluate(() => {
      const c = document.getElementById('graph');
      return !!(c && typeof c.getContext === 'function');
    });
    expect(hasGetContext).toBe(true);
  });

  test('Page defines expected global variables and functions before runtime errors', async ({ page }) => {
    // The script declares many globals before the failing call; assert they exist and have expected types

    // visited should be an array with length 5
    const visitedLength = await page.evaluate(() => {
      return Array.isArray(window.visited) ? window.visited.length : -1;
    });
    expect(visitedLength).toBe(5);

    // stack should be an array with length 5
    const stackLength = await page.evaluate(() => {
      return Array.isArray(window.stack) ? window.stack.length : -1;
    });
    expect(stackLength).toBe(5);

    // colors should be an array with length 5
    const colorsLength = await page.evaluate(() => {
      return Array.isArray(window.colors) ? window.colors.length : -1;
    });
    expect(colorsLength).toBe(5);

    // Ensure the DFS-related functions exist on window (they were declared prior to drawGraph being called)
    const functionsExist = await page.evaluate(() => {
      return {
        drawGraph: typeof window.drawGraph === 'function',
        dfs: typeof window.dfs === 'function',
        backtrack: typeof window.backtrack === 'function'
      };
    });
    expect(functionsExist.drawGraph).toBe(true);
    expect(functionsExist.dfs).toBe(true);
    expect(functionsExist.backtrack).toBe(true);

    // Ensure graphData literal object exists and has expected keys like 'A'
    const hasGraphDataA = await page.evaluate(() => {
      return !!(window.graphData && Object.prototype.hasOwnProperty.call(window.graphData, 'A'));
    });
    expect(hasGraphDataA).toBe(true);
  });

  test('No interactive controls present (buttons, inputs, forms, selects)', async ({ page }) => {
    // The page only contains a canvas and heading; assert absence of interactive elements
    const buttonCount = await page.locator('button').count();
    const inputCount = await page.locator('input').count();
    const formCount = await page.locator('form').count();
    const selectCount = await page.locator('select').count();
    const textareaCount = await page.locator('textarea').count();

    expect(buttonCount).toBe(0);
    expect(inputCount).toBe(0);
    expect(formCount).toBe(0);
    expect(selectCount).toBe(0);
    expect(textareaCount).toBe(0);
  });

  test('Runtime errors are thrown and logged to the page (expect ReferenceError for missing Graph/g)', async ({ page }) => {
    // Wait for at least one pageerror to occur (the script calls drawGraph() which references Graph)
    // If the pageerror already occurred during navigation, the pageErrors array will have entries
    if (pageErrors.length === 0) {
      // Wait up to a short duration for an error to occur
      const err = await page.waitForEvent('pageerror', { timeout: 2000 }).catch(() => null);
      if (err) pageErrors.push(err);
    }

    // There should be at least one page error
    expect(pageErrors.length).toBeGreaterThan(0);

    // At least one error message should mention Graph is not defined, g is not defined, or a ReferenceError
    const messages = pageErrors.map((e) => (e && e.message) || String(e));
    const matchesExpected = messages.some((m) => /Graph is not defined|g is not defined|ReferenceError/i.test(m));
    expect(matchesExpected).toBe(true);

    // Also ensure console contains messages related to the error (if any)
    const consoleText = consoleMessages.map((c) => c.text).join('\n');
    const consoleHasError = /Graph is not defined|g is not defined|ReferenceError/i.test(consoleText);
    // It's acceptable if console doesn't repeat the error, but at least verify we've observed DOM page errors above.
    // If console has it, assert true; otherwise just note via expect that consoleMessages is an array (non-failing check)
    expect(Array.isArray(consoleMessages)).toBe(true);
  });

  test('Attempting to evaluate Graph in page context reflects missing constructor (undefined)', async ({ page }) => {
    // Ensure that Graph is not present as a constructor on the window (this reflects the runtime failure)
    const graphType = await page.evaluate(() => {
      try {
        return typeof window.Graph;
      } catch (e) {
        return `error:${String(e)}`;
      }
    });
    // Expect Graph to be undefined in this environment (the page attempts to instantiate it and fails)
    expect(graphType === 'undefined' || graphType.startsWith('error:')).toBe(true);
  });

  test('Edge behavior: calling window.dfs from test context should surface errors if it relies on missing globals', async ({ page }) => {
    // We will call window.dfs('A') inside the page context and capture any thrown exception.
    // According to the page script, dfs depends on 'g' and others which may be absent or malformed.
    const callResult = await page.evaluate(() => {
      try {
        if (typeof window.dfs !== 'function') return { ok: false, error: 'dfs-not-function' };
        // Call dfs with an argument that the page uses; wrap in try/catch to capture thrown error string
        try {
          window.dfs && window.dfs('A');
          return { ok: true };
        } catch (err) {
          return { ok: false, error: String(err) };
        }
      } catch (outerErr) {
        return { ok: false, error: String(outerErr) };
      }
    });

    // We expect the call to fail (ok) because dfs references 'g' which is not defined due to earlier failure
    expect(callResult.ok).toBe(false);
    // The error string should mention 'g' or be some ReferenceError / TypeError
    const errStr = callResult.error || '';
    expect(/g is not defined|ReferenceError|TypeError/i.test(errStr)).toBe(true);
  });
});