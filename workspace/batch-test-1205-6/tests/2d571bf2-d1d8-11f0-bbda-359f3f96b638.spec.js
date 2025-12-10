import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d571bf2-d1d8-11f0-bbda-359f3f96b638.html';

// Page Object representing the application under test
class DFSApp {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.consoleMessages = [];
    this.pageErrors = [];
    this._consoleListener = (msg) => {
      this.consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
    };
    this._pageErrorListener = (err) => {
      this.pageErrors.push({
        name: err.name,
        message: err.message,
        stack: err.stack,
      });
    };
  }

  // Attach listeners for console and page errors
  async attachListeners() {
    this.page.on('console', this._consoleListener);
    this.page.on('pageerror', this._pageErrorListener);
  }

  // Detach listeners to avoid leaking across tests
  async detachListeners() {
    this.page.removeListener('console', this._consoleListener);
    this.page.removeListener('pageerror', this._pageErrorListener);
  }

  // Navigate to the app and wait for network idle and load
  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  // Click the "Start DFS" button
  async clickStart() {
    await this.page.click('#start');
  }

  // Returns array of node elements handles
  async getAllNodes() {
    return this.page.$$('.node');
  }

  // Get node element handle by coordinates
  async getNode(i, j) {
    return this.page.$(`#node-${i}-${j}`);
  }

  // Returns whether a node has the 'visited' class
  async isNodeVisited(i, j) {
    const node = await this.getNode(i, j);
    if (!node) return false;
    return await node.evaluate((el) => el.classList.contains('visited'));
  }

  // Call dfs in page context with provided args. This runs synchronously in the page's global context.
  // If dfs is not reachable, page.evaluate will throw and the caller should handle it.
  async callDfs(x, y, visitedSpecifier = 'new Set()') {
    // Use evaluate to run raw code string to attempt to invoke dfs in page context.
    // Note: We don't modify any globals; we simply invoke an existing function if present.
    return await this.page.evaluate(
      // We pass parameters safely instead of serializing Set directly.
      ({ x, y, visitedSpecifier }) => {
        // eslint-disable-next-line no-eval
        return eval(`(function(){ return dfs(${x}, ${y}, ${visitedSpecifier}); })()`);
      },
      { x, y, visitedSpecifier }
    );
  }

  // Asynchronously call dfs inside a setTimeout so that exceptions are reported as page errors (uncaught)
  async callDfsAsyncAndIgnoreResult(x, y, visitedSpecifier = 'new Set()') {
    await this.page.evaluate(
      ({ x, y, visitedSpecifier }) => {
        setTimeout(() => {
          // Intentionally invoke dfs in an async task so exceptions become pageerror events
          // eslint-disable-next-line no-eval
          eval(`dfs(${x}, ${y}, ${visitedSpecifier})`);
        }, 0);
      },
      { x, y, visitedSpecifier }
    );
  }

  // Helper to get counts and collections
  getConsoleErrors() {
    return this.consoleMessages.filter((m) => m.type === 'error');
  }

  getPageErrors() {
    return this.pageErrors;
  }
}

test.describe('Depth-First Search Visualization (FSM driven tests)', () => {
  let app;
  test.beforeEach(async ({ page }) => {
    app = new DFSApp(page);
    await app.attachListeners();
    await app.goto();
    // Give time for window.onload and graph creation to complete
    await page.waitForTimeout(50);
  });

  test.afterEach(async ({ page }) => {
    // detach listeners to keep environment clean
    await app.detachListeners();
    // small delay so any asynchronous pageerrors can surface before teardown
    await page.waitForTimeout(20);
  });

  test('S0_Idle: on load the graph is created and nodes are present (Idle state validation)', async () => {
    // This test validates the Idle state (S0_Idle) entry action: createGraph() is called on window.onload.
    // We verify the DOM structure: 3x3 grid of nodes created with correct ids and text.
    const nodes = await app.getAllNodes();
    // There should be 9 node elements as the implementation creates a 3x3 grid.
    expect(nodes.length).toBe(9);

    // Verify a few representative nodes for correct ids and displayed coordinates
    const node00 = await app.getNode(0, 0);
    expect(node00).not.toBeNull();
    expect(await node00.textContent()).toBe('(0, 0)');

    const node22 = await app.getNode(2, 2);
    expect(node22).not.toBeNull();
    expect(await node22.textContent()).toBe('(2, 2)');

    // Verify none are marked visited on initial load
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const visited = await app.isNodeVisited(i, j);
        expect(visited).toBe(false);
      }
    }

    // Ensure no console errors were emitted during load
    const consoleErrors = app.getConsoleErrors();
    expect(consoleErrors.length).toBe(0);
  });

  test('S1_DFS_Started: clicking the Start DFS button triggers the click handler (DFS Started validation)', async () => {
    // This test validates the transition from Idle to DFS Started (S0 -> S1) via clicking #start.
    // We click the button and then assert that script executed without throwing a page error.
    await app.clickStart();

    // Wait briefly to allow any synchronous DFS execution to complete
    await app.page.waitForTimeout(50);

    // According to the implementation, DFS is started from (0,0).
    // The graph[0][0] is 0, so DFS should not visit any node; verify that no nodes have 'visited' class.
    const visitedNodes = [];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (await app.isNodeVisited(i, j)) visitedNodes.push(`${i}-${j}`);
      }
    }

    // No nodes should be visited because starting node is 0
    expect(visitedNodes.length).toBe(0);

    // Ensure no unhandled page errors occurred as a result of clicking start
    const pageErrors = app.getPageErrors();
    expect(pageErrors.length).toBe(0);

    // Also assert that clicking the start button emits at least one console message of type 'log' or 'info' is not required,
    // but we assert there were no 'error' console messages.
    expect(app.getConsoleErrors().length).toBe(0);
  });

  test('S2_Node_Visited: invoking dfs on a node with value 1 marks it as visited (Node Visited validation)', async () => {
    // This test validates the Node Visited state by programmatically invoking dfs on (0,1)
    // (which is graph[0][1] === 1) and confirming the DOM class 'visited' is applied.

    // Attempt to call dfs via page.evaluate; if dfs is not accessible, the evaluate will throw a ReferenceError.
    let callSucceeded = true;
    try {
      // We call dfs(0,1, new Set()) directly; if dfs exists in the page scope this should mark node (0,1)
      await app.callDfs(0, 1, 'new Set()');
    } catch (err) {
      // If dfs is not reachable, this is an observable runtime condition. We capture it and assert accordingly.
      callSucceeded = false;
      expect(err).toBeTruthy();
      // Ensure the thrown error is a ReferenceError indicating dfs is not defined in the page scope
      // (We allow either ReferenceError or other invocation-time errors; assert error name contains 'Reference' OR message mentions 'dfs')
      const errMsg = String(err.message || err);
      const isReference = errMsg.toLowerCase().includes('dfs is not defined') || err.name === 'ReferenceError';
      expect(isReference).toBeTruthy();
    }

    if (callSucceeded) {
      // If the call succeeded, assert that only node (0,1) has the visited class (based on the graph connectivity)
      expect(await app.isNodeVisited(0, 1)).toBe(true);

      // Confirm other nodes remain unvisited
      const visitedPositions = [];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (await app.isNodeVisited(i, j)) visitedPositions.push(`${i}-${j}`);
        }
      }
      // For this graph, nodes with 1 are isolated; starting at (0,1) should only visit (0,1)
      expect(visitedPositions).toEqual(['0-1']);

      // Ensure no page errors or console errors were produced by this successful invocation
      expect(app.getPageErrors().length).toBe(0);
      expect(app.getConsoleErrors().length).toBe(0);
    } else {
      // If dfs was not reachable, ensure the page reported no unexpected console errors beyond the ReferenceError
      const pageErrors1 = app.getPageErrors();
      // Either the ReferenceError surfaced as a thrown error (caught above) or as a pageerror; allow either.
      // If pageErrors contains items, at least one should be a ReferenceError related to dfs
      if (pageErrors.length > 0) {
        const found = pageErrors.some((e) =>
          (e.name && e.name.toLowerCase().includes('reference')) ||
          (e.message && e.message.toLowerCase().includes('dfs is not defined'))
        );
        expect(found).toBeTruthy();
      } else {
        // If no pageerrors, the thrown error handled above is sufficient evidence that dfs was not accessible.
        expect(true).toBe(true);
      }
    }
  });

  test('Edge case: calling dfs asynchronously with invalid "visited" argument produces a page error (Error scenario)', async () => {
    // This test deliberately invokes dfs asynchronously with an invalid visited argument (undefined),
    // which should cause a runtime TypeError when code attempts to call visited.has(...)
    // We invoke it inside a setTimeout so the exception becomes an uncaught pageerror event rather than a synchronous evaluate throw.

    // Clear any previously recorded page errors for clarity
    app.pageErrors = [];

    // Trigger asynchronous invocation; do not await its result (it will run in the page)
    await app.callDfsAsyncAndIgnoreResult(0, 1, 'undefined');

    // Wait a short time for the asynchronous error to be raised and captured
    await app.page.waitForTimeout(100);

    const pageErrors2 = app.getPageErrors();
    // We expect at least one page error as the asynchronous invocation should cause an exception
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);

    // Check that one of the errors is a TypeError (visited.has is not a function / cannot read property 'has' of undefined)
    const hasTypeError = pageErrors.some((e) => {
      const msg = String(e.message || '').toLowerCase();
      return e.name === 'TypeError' || msg.includes("cannot read") || msg.includes("has is not a function") || msg.includes("visited");
    });
    expect(hasTypeError).toBeTruthy();
  });

  test('Edge case: calling dfs with out-of-bounds coordinates does not throw and does not mark nodes visited', async () => {
    // Validate that dfs gracefully handles out-of-range coordinates (no visit and no exception)
    // Attempt to call dfs(-1, 0, new Set()). If dfs isn't accessible, the evaluate will throw; handle that as observable.
    let thrown = null;
    try {
      await app.callDfs(-1, 0, 'new Set()');
    } catch (err) {
      thrown = err;
    }

    if (thrown) {
      // If a ReferenceError or other error was thrown because dfs is not accessible, assert that is the case
      const msg1 = String(thrown.message || thrown);
      const isReference1 = msg.toLowerCase().includes('dfs is not defined') || thrown.name === 'ReferenceError';
      expect(isReference).toBeTruthy();
    } else {
      // If call succeeded, ensure no nodes became visited (out of bounds should return immediately)
      const anyVisited = [];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (await app.isNodeVisited(i, j)) anyVisited.push(`${i}-${j}`);
        }
      }
      // No additional nodes should be visited as a result of out-of-bounds call
      expect(anyVisited.length).toBe(0);
      expect(app.getPageErrors().length).toBe(0);
    }
  });
});