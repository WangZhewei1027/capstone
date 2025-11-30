import { test, expect } from '@playwright/test';

test.describe('Prim\'s Algorithm Visualization - E2E', () => {
  const url = 'http://127.0.0.1:5500/workspace/html2test/html/1da11ba4-cd2f-11f0-a440-159d7b77af86.html';

  // Will hold console messages and page errors observed during navigation
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages for later assertions
    page.on('console', msg => {
      // store the ConsoleMessage object so tests can inspect text and args
      consoleMessages.push(msg);
    });

    // Collect runtime errors (uncaught exceptions) emitted by the page
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Navigate to the application page
    await page.goto(url);
  });

  test.afterEach(async () => {
    // cleanup arrays (not strictly necessary but keeps state clear between tests)
    consoleMessages = [];
    pageErrors = [];
  });

  test('Initial load: page title and canvas are present and visible', async ({ page }) => {
    // Purpose: Verify basic page structure and that the canvas is present and has expected attributes.

    // Check page title visible in DOM
    const titleText = await page.locator('h1').innerText();
    expect(titleText).toContain("Prim's Algorithm Visualization");

    // Ensure canvas element exists and has expected width/height attributes
    const canvas = page.locator('#canvas');
    await expect(canvas).toHaveCount(1);
    const width = await canvas.getAttribute('width');
    const height = await canvas.getAttribute('height');
    expect(width).toBe('800');
    expect(height).toBe('600');

    // The canvas should be visible on the page
    await expect(canvas).toBeVisible();
  });

  test('No interactive HTML controls exist (buttons/inputs/forms) for this visualization', async ({ page }) => {
    // Purpose: Confirm that there are no interactive controls like buttons, inputs, selects, textareas, forms.
    // The application is Canvas-based and should not expose traditional form controls.

    const interactiveSelectors = await page.$$eval('button, input, select, textarea, form', els => els.map(e => e.tagName));
    expect(interactiveSelectors.length).toBe(0);
  });

  test('Graph data (nodes and edges) are present in page JS and have expected sizes', async ({ page }) => {
    // Purpose: Inspect the page's in-memory data structures for nodes and edges defined by the script.
    // We attempt to access identifiers defined by the page script. If they are available, validate lengths and labels.

    const dataSummary = await page.evaluate(() => {
      // Attempt to safely probe for nodes and edges and return summary info without modifying globals.
      const safe = { nodesType: typeof nodes, edgesType: typeof edges };
      try {
        safe.nodesLength = Array.isArray(nodes) ? nodes.length : null;
        safe.edgesLength = Array.isArray(edges) ? edges.length : null;
        safe.firstNodeLabel = Array.isArray(nodes) && nodes[0] && nodes[0].label ? nodes[0].label : null;
      } catch (e) {
        // If identifiers are not available in the scope, note that
        safe.error = String(e);
      }
      return safe;
    });

    // Expect nodes and edges to be present and of expected length
    expect(dataSummary.nodesType).toBe('object'); // arrays are of type 'object'
    expect(dataSummary.edgesType).toBe('object');
    expect(dataSummary.nodesLength).toBe(5); // there are 5 nodes defined in the HTML
    expect(dataSummary.edgesLength).toBe(6); // 6 edges defined
    expect(dataSummary.firstNodeLabel).toBe('A');
    expect(dataSummary.error).toBeUndefined();
  });

  test('Prim\'s algorithm runs and logs Minimum Spanning Tree edges to the console', async ({ page }) => {
    // Purpose: Ensure the script executed primsAlgorithm() on initialization and logged the resulting MST.
    // We look for a console message that contains the prefix printed by the script.

    // Find the console message that starts with the expected prefix
    const found = consoleMessages.find(m => {
      try {
        return m.text().startsWith('Minimum Spanning Tree Edges:');
      } catch {
        return false;
      }
    });

    // The script calls console.log('Minimum Spanning Tree Edges:', mst);
    // Expect such a message to exist
    expect(found).toBeTruthy();

    // If present, inspect the second argument that should be the MST array
    // Playwright ConsoleMessage.args() returns JSHandles we can extract to JSON.
    if (found) {
      const args = found.args();
      // The second argument (index 1) should be the mst array
      expect(args.length).toBeGreaterThanOrEqual(2);
      const mstHandle = args[1];
      // Convert the JSHandle to a JSON-serializable value
      const mstValue = await mstHandle.jsonValue();
      // MST should be an array with nodes.length - 1 edges (5 nodes -> 4 edges)
      expect(Array.isArray(mstValue)).toBe(true);
      expect(mstValue.length).toBe(4);
      // Validate structure of an edge object
      mstValue.forEach(edge => {
        expect(edge).toHaveProperty('start');
        expect(edge).toHaveProperty('end');
        expect(edge).toHaveProperty('weight');
      });
    }
  });

  test('Canvas contains drawing output (data URL non-empty) indicating rendering occurred', async ({ page }) => {
    // Purpose: Validate that the canvas has pixel data rendered by the script.
    // We read the data URL and assert it contains encoded image data and is of appreciable size.

    const dataUrl = await page.evaluate(() => {
      const canvas = document.getElementById('canvas');
      // toDataURL should produce a long base64 string if drawing occurred
      try {
        return canvas.toDataURL();
      } catch (e) {
        return null;
      }
    });

    expect(typeof dataUrl).toBe('string');
    // data URLs start with "data:image/png;base64," by default
    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    // Ensure the encoded payload is non-trivial (not just header); choose a conservative threshold
    expect(dataUrl.length).toBeGreaterThan(1000);
  });

  test('No uncaught page errors occurred during initialization', async ({ page }) => {
    // Purpose: Ensure the page did not emit runtime errors (ReferenceError, TypeError, etc.) during load.
    // The test collects pageerror events and asserts the collection is empty.

    // The pageErrors array was populated in beforeEach by listening to 'pageerror'
    expect(pageErrors.length).toBe(0);
  });

  test('Console contains useful debugging output and expected number of console entries', async ({ page }) => {
    // Purpose: Sanity-check console messages: ensure at least one message was emitted and our MST message is present.
    // Also capture the textual representation of console entries for human-readable assertions.

    const texts = consoleMessages.map(m => {
      try {
        return m.text();
      } catch {
        return '';
      }
    });

    // There should be at least one console message (the MST log)
    expect(texts.length).toBeGreaterThanOrEqual(1);
    const hasMstLog = texts.some(t => t.includes('Minimum Spanning Tree Edges:'));
    expect(hasMstLog).toBe(true);
  });
});