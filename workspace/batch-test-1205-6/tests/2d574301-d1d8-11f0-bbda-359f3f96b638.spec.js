import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d574301-d1d8-11f0-bbda-359f3f96b638.html';

// Page Object Model for the Dijkstra visualization page
class DijkstraPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.graph = page.locator('#graph');
    this.runButton = page.locator('#run');
    this.nodeLocator = page.locator('#graph .node');
    this.pathLocator = page.locator('#graph .node.path');
    this.startLocator = page.locator('#graph .node.start');
    this.endLocator = page.locator('#graph .node.end');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async getNodeCount() {
    return await this.nodeLocator.count();
  }

  async getNodeTexts() {
    const count = await this.getNodeCount();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push(await this.nodeLocator.nth(i).textContent());
    }
    return texts;
  }

  async clickRun() {
    await this.runButton.click();
  }

  async waitForAnyHighlight(timeout = 10000) {
    // Wait for any node to be highlighted (style.backgroundColor === 'lightblue')
    await this.page.waitForFunction(() => {
      const nodes = Array.from(document.querySelectorAll('#graph .node'));
      return nodes.some(n => n.style.backgroundColor === 'lightblue');
    }, null, { timeout });
  }

  async waitForPathNodes(minCount = 1, timeout = 15000) {
    await this.page.waitForFunction((min) => {
      return document.querySelectorAll('#graph .node.path').length >= min;
    }, minCount, { timeout });
  }

  async getPathCount() {
    return await this.pathLocator.count();
  }

  async hasStartAndEnd() {
    const startCount = await this.startLocator.count();
    const endCount = await this.endLocator.count();
    return { startCount, endCount };
  }

  async waitForNoPath(timeout = 5000) {
    await this.page.waitForFunction(() => {
      return document.querySelectorAll('#graph .node.path').length === 0;
    }, null, { timeout });
  }
}

test.describe('Dijkstra Algorithm Visualization - FSM validation', () => {
  // Collect console errors and page errors for assertions
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture uncaught page errors
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });

    // Navigate to application under test
    await page.goto(APP_URL);
  });

  test('State S0_Idle: createGraph() executed on load - nodes, start and end exist', async ({ page }) => {
    // This test validates the initial Idle state (S0_Idle).
    // It checks that createGraph() ran by asserting that nodes were created,
    // and that start/end classes were applied.
    const app = new DijkstraPage(page);

    // Graph should contain the expected number of nodes (5)
    const nodeCount = await app.getNodeCount();
    expect(nodeCount).toBeGreaterThanOrEqual(5);

    // Nodes should have the expected labels A-E (basic sanity)
    const texts1 = await app.getNodeTexts();
    // Ensure at least first and last nodes correspond to A and E
    expect(texts[0]).toBe('A');
    expect(texts[texts.length - 1]).toBe('E');

    // Start and end classes should be present on their respective nodes
    const { startCount, endCount } = await app.hasStartAndEnd();
    expect(startCount).toBe(1);
    expect(endCount).toBe(1);

    // Ensure no console or page errors occurred during initial load
    expect(consoleErrors, `Console errors on load: ${consoleErrors.join(' | ')}`).toHaveLength(0);
    expect(pageErrors, `Page errors on load: ${pageErrors.join(' | ')}`).toHaveLength(0);
  });

  test('Transition S0 -> S1: RunAlgorithm triggers execution and node highlighting', async ({ page }) => {
    // This test validates that clicking the Run button starts the algorithm (S1_AlgorithmRunning).
    // We verify that during execution nodes are highlighted (background turns lightblue).
    const app1 = new DijkstraPage(page);

    // Click run to start algorithm
    await app.clickRun();

    // Wait for any node to be highlighted during the algorithm run
    await app.waitForAnyHighlight(10000);

    // Confirm at least one node has inline style backgroundColor set to lightblue
    const highlightedExists = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('#graph .node')).some(n => n.style.backgroundColor === 'lightblue');
    });
    expect(highlightedExists).toBeTruthy();

    // Ensure no console or page errors occurred during run start
    expect(consoleErrors, `Console errors during run start: ${consoleErrors.join(' | ')}`).toHaveLength(0);
    expect(pageErrors, `Page errors during run start: ${pageErrors.join(' | ')}`).toHaveLength(0);
  });

  test('Transition S1 -> S2: AlgorithmCompleted results in path classes on nodes', async ({ page }) => {
    // This test validates that after the algorithm completes, the computed path nodes get the "path" class,
    // representing the Algorithm Completed state (S2_AlgorithmCompleted).
    const app2 = new DijkstraPage(page);

    // Start algorithm
    await app.clickRun();

    // Wait for the path nodes to appear (we expect full path; allow ample timeout)
    await app.waitForPathNodes(1, 20000);

    // Verify that path nodes exist and count is reasonable (in this graph the shortest path will include multiple nodes)
    const pathCount = await app.getPathCount();
    expect(pathCount).toBeGreaterThanOrEqual(2); // at least start/end
    // For the given graph it's expected to traverse A-B-C-D-E => 5 nodes
    // We'll assert it's equal to 5 to be strict about expected behavior
    expect(pathCount).toBe(5);

    // Ensure the start and end nodes still exist (should remain marked after completion)
    const { startCount, endCount } = await app.hasStartAndEnd();
    expect(startCount).toBe(1);
    expect(endCount).toBe(1);

    // Ensure no console or page errors occurred during algorithm execution/completion
    expect(consoleErrors, `Console errors during algorithm execution: ${consoleErrors.join(' | ')}`).toHaveLength(0);
    expect(pageErrors, `Page errors during algorithm execution: ${pageErrors.join(' | ')}`).toHaveLength(0);
  });

  test('Transition S1 -> S0: resetGraph() is invoked when Run is clicked again (resets path)', async ({ page }) => {
    // This test validates the ResetGraph transition: after a completed run, clicking Run again should
    // call resetGraph() immediately (removing path classes) before starting a new run.
    const app3 = new DijkstraPage(page);

    // Run once to completion
    await app.clickRun();
    await app.waitForPathNodes(1, 20000);
    const initialPathCount = await app.getPathCount();
    expect(initialPathCount).toBeGreaterThanOrEqual(1);

    // Click run again which, per implementation, calls resetGraph() synchronously then starts dijkstra()
    await app.clickRun();

    // Immediately after clicking, the path classes should be removed by resetGraph()
    // Wait for no path nodes to be present
    await app.waitForNoPath(5000);
    const afterResetPathCount = await app.getPathCount();
    expect(afterResetPathCount).toBe(0);

    // Start and end classes should be present after reset
    const { startCount, endCount } = await app.hasStartAndEnd();
    expect(startCount).toBe(1);
    expect(endCount).toBe(1);

    // Ensure no console or page errors occurred during reset action
    expect(consoleErrors, `Console errors during reset: ${consoleErrors.join(' | ')}`).toHaveLength(0);
    expect(pageErrors, `Page errors during reset: ${pageErrors.join(' | ')}`).toHaveLength(0);
  });

  test('Edge case: Rapid double-click of Run should not produce uncaught errors and results in a valid path', async ({ page }) => {
    // This test checks robustness: clicking Run quickly twice should not produce uncaught exceptions
    // and should eventually result in a valid computed path. It validates error-handling and concurrency behavior.
    const app4 = new DijkstraPage(page);

    // Rapidly click run twice
    await Promise.all([
      app.runButton.click(),
      app.runButton.click()
    ]);

    // Wait for algorithm to produce path nodes eventually (allow generous timeout)
    await app.waitForPathNodes(1, 20000);

    // Final path count should be present and reasonable
    const pathCount1 = await app.getPathCount();
    expect(pathCount).toBeGreaterThanOrEqual(2);

    // Assert there were no console or page errors recorded during this stress interaction
    expect(consoleErrors, `Console errors during rapid double-click: ${consoleErrors.join(' | ')}`).toHaveLength(0);
    expect(pageErrors, `Page errors during rapid double-click: ${pageErrors.join(' | ')}`).toHaveLength(0);
  });

  test('Observability: verify no unexpected console/page errors across multiple interactions', async ({ page }) => {
    // This test groups multiple interactions to ensure the application remains error-free across a typical usage flow.
    const app5 = new DijkstraPage(page);

    // 1) Initial state check
    expect(await app.getNodeCount()).toBeGreaterThanOrEqual(5);

    // 2) Start algorithm
    await app.clickRun();
    await app.waitForAnyHighlight(10000);

    // 3) Wait for completion
    await app.waitForPathNodes(1, 20000);
    expect(await app.getPathCount()).toBeGreaterThanOrEqual(1);

    // 4) Reset via clicking run and ensure reset occurs
    await app.clickRun();
    await app.waitForNoPath(5000);
    expect(await app.getPathCount()).toBe(0);

    // Final assert: no console or page errors have been captured through the scenario
    expect(consoleErrors, `Console errors after full scenario: ${consoleErrors.join(' | ')}`).toHaveLength(0);
    expect(pageErrors, `Page errors after full scenario: ${pageErrors.join(' | ')}`).toHaveLength(0);
  });
});