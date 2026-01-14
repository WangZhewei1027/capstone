import { test, expect } from '@playwright/test';

// Page Object for the Bellman-Ford (misnamed Dijkstra) app
class BellmanFordPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b7bb35-d5a1-11f0-9c7a-cdf1d7a06e11.html';
  }

  async goto() {
    await this.page.goto(this.url);
  }

  // Returns the source input locator
  source() {
    return this.page.locator('#source');
  }

  // Returns the target input locator
  target() {
    return this.page.locator('#target');
  }

  // Returns the Run button locator
  runButton() {
    return this.page.locator('#run');
  }

  // Returns the graph container locator
  graphDiv() {
    return this.page.locator('#graph');
  }

  // Helper to call the page's addEdge function (uses the page's own implementation)
  async addEdge(a, b, w) {
    await this.page.evaluate(
      ([sa, sb, sw]) => {
        // call the page-defined function; do not redefine or patch anything
        addEdge(sa, sb, sw);
      },
      [a, b, w]
    );
  }

  // Fill inputs
  async setSource(value) {
    await this.source().fill(value);
  }

  async setTarget(value) {
    await this.target().fill(value);
  }

  // Click run
  async clickRun() {
    await this.runButton().click();
  }
}

test.describe('Bellman-Ford Algorithm App (interactive tests)', () => {
  let page;
  let app;

  test.beforeEach(async ({ browser }) => {
    // Create a new page for each test to isolate state
    page = await browser.newPage();
    app = new BellmanFordPage(page);
    await app.goto();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Initial page load: UI elements are visible and have correct defaults', async () => {
    // Purpose: verify page loads, headers, inputs, button, and graph container exist and are visible.
    await expect(page.locator('h1')).toHaveText('Bellman-Ford Algorithm');
    await expect(page.locator('p')).toContainText('Given a weighted directed graph');
    await expect(app.source()).toBeVisible();
    await expect(app.target()).toBeVisible();
    await expect(app.runButton()).toBeVisible();
    await expect(app.graphDiv()).toBeVisible();
    // The inputs should be empty by default
    await expect(app.source()).toHaveValue('');
    await expect(app.target()).toHaveValue('');
  });

  test('Clicking Run with empty graph and empty inputs triggers a runtime TypeError (observable as a pageerror)', async () => {
    // Purpose: verify the app throws a runtime error when trying to run on an empty graph.
    // The implementation's dijkstra() loops over graph[source] even when graph[source] is undefined,
    // which will cause a TypeError in the browser. We listen for the pageerror event and assert it occurs.

    // Wait for the pageerror event triggered by the click
    const [error] = await Promise.all([
      page.waitForEvent('pageerror'),
      app.clickRun(), // clicking with no source filled and no edges added
    ]);

    // Assert that an Error was emitted and that it's a TypeError (as expected from for...in on undefined)
    expect(error).toBeTruthy();
    // Error name should indicate a type error in the browser environment
    expect(error.name).toBe('TypeError');
    // Provide additional helpful assertion on the message content (browser messages vary)
    expect(error.message).toMatch(/Cannot convert|Cannot read|not an object|undefined|null/i);
  });

  test('After adding edges, running with valid source/target logs "No path" due to algorithm logic', async () => {
    // Purpose: programmatically build a small graph and run the algorithm.
    // The page implements addEdge and exposes it; we call it to avoid injecting or redefining functions.
    // Because the dijkstra implementation has logical flaws (while loop won't iterate),
    // it will not populate predecessor entries, and the app will log "No path from X to Y."

    // Add edges A - B - C using the page's addEdge function
    await app.addEdge('A', 'B', 5);
    await app.addEdge('B', 'C', 3);

    // Fill inputs
    await app.setSource('A');
    await app.setTarget('C');

    // Wait for the console log message that indicates the application's behavior
    const [consoleMsg] = await Promise.all([
      // predicate filters to the specific expected text to avoid catching unrelated logs
      page.waitForEvent('console', { predicate: (msg) => msg.type() === 'log' && msg.text().includes('No path from A to C.') }),
      app.clickRun(),
    ]);

    // Assert that the console message is the "No path" message (this reflects the current implementation)
    expect(consoleMsg).toBeTruthy();
    expect(consoleMsg.type()).toBe('log');
    expect(consoleMsg.text()).toContain('No path from A to C.');
  });

  test('Edge case: source equals target logs "No path" in current implementation', async () => {
    // Purpose: verify behavior when source and target are identical. The buggy implementation
    // does not treat this as a found path; it will log "No path ...".
    await app.addEdge('X', 'Y', 1);
    await app.setSource('X');
    await app.setTarget('X');

    const [consoleMsg] = await Promise.all([
      page.waitForEvent('console', { predicate: (msg) => msg.type() === 'log' && msg.text().includes('No path from X to X.') }),
      app.clickRun(),
    ]);

    expect(consoleMsg).toBeTruthy();
    expect(consoleMsg.text()).toContain('No path from X to X.');
  });

  test('When graph has an entry for the source but no path to target, no pageerror occurs and "No path" is logged', async () => {
    // Purpose: ensure that when graph[source] exists (so no for..in over undefined),
    // the algorithm runs without throwing a TypeError and logs the "No path" notice.
    // Build a graph where source S has a neighbor T1, but target Z is disconnected.

    // Add a single edge so graph['S'] exists
    await app.addEdge('S', 'T1', 2);

    await app.setSource('S');
    await app.setTarget('Z'); // 'Z' is not connected

    // We listen both for console log and for the absence of pageerror.
    // Use Promise.race pattern: wait for either a pageerror (unexpected) or the expected console log.
    const consolePromise = page.waitForEvent('console', { predicate: (msg) => msg.type() === 'log' && msg.text().includes('No path from S to Z.') });
    const pageErrorPromise = page.waitForEvent('pageerror').then(err => ({ err }));

    const result = await Promise.race([consolePromise.then(m => ({ console: m })), pageErrorPromise]);

    // If a pageerror occurred, fail the test because the graph[source] existed and should avoid the undefined iteration error.
    if (result.err) {
      // Fail with the error message to show what happened
      throw new Error('Unexpected pageerror occurred: ' + result.err.message);
    }

    // Otherwise assert the console log occurred
    expect(result.console).toBeTruthy();
    expect(result.console.text()).toContain('No path from S to Z.');
  });
});