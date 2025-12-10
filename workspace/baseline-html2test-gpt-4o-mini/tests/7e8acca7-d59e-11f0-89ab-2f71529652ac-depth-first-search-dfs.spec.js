import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8acca7-d59e-11f0-89ab-2f71529652ac.html';

/**
 * Page object model for the DFS visualization page.
 * Encapsulates common interactions and queries used by tests.
 */
class DfsPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.container = '#graphContainer';
    this.startButton = '#startDFS';
  }

  // Click the "Start DFS" button
  async clickStart() {
    await this.page.click(this.startButton);
  }

  // Returns an array of node descriptors { id, text, classes }
  async getAllNodes() {
    return await this.page.$$eval(`${this.container} .node`, nodes =>
      nodes.map(n => ({
        id: n.id,
        text: n.textContent?.trim(),
        classes: Array.from(n.classList)
      }))
    );
  }

  // Returns the number of direct children in the graph container
  async getContainerChildCount() {
    return await this.page.$eval(this.container, c => c.children.length);
  }

  // Returns mapping from node text to array of class lists (in DOM order)
  async getNodeClassesByText() {
    return await this.page.$$eval(`${this.container} .node`, nodes => {
      const map = {};
      nodes.forEach(n => {
        const text = n.textContent?.trim() || '';
        if (!map[text]) map[text] = [];
        map[text].push(Array.from(n.classList));
      });
      return map;
    });
  }

  // Check whether a node with given text has the 'visited' class at a particular occurrence index (0-based)
  async isVisitedAt(text, occurrenceIndex = 0) {
    return await this.page.$$eval(
      `${this.container} .node`,
      (nodes, text, idx) => {
        const matches = nodes.filter(n => (n.textContent || '').trim() === text);
        if (matches.length <= idx) return null;
        return matches[idx].classList.contains('visited');
      },
      text,
      occurrenceIndex
    );
  }
}

test.describe('Depth-First Search Visualization - DFS (7e8acca7-d59e-11f0-89ab-2f71529652ac)', () => {
  let consoleMessages;
  let pageErrors;

  // Attach listeners and navigate before each test to collect console messages and page errors.
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    page.on('console', msg => {
      // Collect console messages with type and text for later assertions
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', err => {
      // Collect any uncaught exceptions
      pageErrors.push(err.message);
    });

    // Navigate to the application page
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // After each test ensure that we preserve collected messages for debugging if needed.
    // Individual tests will assert expectations about these arrays.
  });

  // Test initial page load and default state
  test('Initial load: should render heading, controls and an empty graph container', async ({ page }) => {
    const dfs = new DfsPage(page);

    // Verify the page title/heading is present
    const heading = await page.locator('h1').textContent();
    expect(heading).toContain('Depth-First Search');

    // The Start DFS button should be visible and enabled
    const startVisible = await page.isVisible(dfs.startButton);
    expect(startVisible).toBe(true);
    const startEnabled = await page.isEnabled(dfs.startButton);
    expect(startEnabled).toBe(true);

    // On initial load, the graph container should exist and be empty (no nodes present)
    const childCount = await dfs.getContainerChildCount();
    expect(childCount).toBe(0);

    // No uncaught page errors should have occurred during load
    expect(pageErrors, 'No uncaught exceptions on load').toEqual([]);

    // No console error messages should be present
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test the primary interaction: clicking Start DFS produces nodes and marks them visited
  test('Click Start DFS: should create nodes A-F and mark them visited', async ({ page }) => {
    const dfs1 = new DfsPage(page);

    // Click the start button to run DFS and build the visualization
    await dfs.clickStart();

    // After one click, there should be six nodes (A, B, C, D, E, F) created in the container
    const childCount1 = await dfs.getContainerChildCount();
    expect(childCount).toBe(6);

    // Retrieve all nodes and validate their text contents and visited class
    const nodes = await dfs.getAllNodes();
    // Collect the sequence of node texts
    const texts = nodes.map(n => n.text);
    // Expect the six nodes to correspond to the keys in the graph (order of insertion in createGraph is object property order)
    expect(texts).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);

    // Each node should have the 'visited' class after DFS completes
    for (const label of ['A', 'B', 'C', 'D', 'E', 'F']) {
      const visited = await dfs.isVisitedAt(label, 0);
      expect(visited, `Node ${label} should be visited after first DFS`).toBe(true);
    }

    // Verify that no uncaught exceptions or console errors occurred during the interaction
    expect(pageErrors, 'No uncaught exceptions after clicking Start DFS').toEqual([]);
    const consoleErrors1 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, 'No console.error calls during DFS run').toBe(0);
  });

  // Test edge case / known issue: clicking Start DFS multiple times appends duplicate DOM nodes
  test('Click Start DFS twice: should append duplicate nodes and only the first set is marked visited (due to getElementById behavior)', async ({ page }) => {
    const dfs2 = new DfsPage(page);

    // First click: create first set of nodes
    await dfs.clickStart();

    // Second click: create a duplicate set of nodes (createGraph appends without clearing)
    await dfs.clickStart();

    // Now container should contain 12 nodes (two sets of A-F)
    const childCount2 = await dfs.getContainerChildCount();
    expect(childCount).toBe(12);

    // Get the mapping of node text to arrays of class lists in DOM order
    const classesByText = await dfs.getNodeClassesByText();

    // For each label A-F, there should be two occurrences
    for (const label of ['A', 'B', 'C', 'D', 'E', 'F']) {
      const occurrences = classesByText[label] || [];
      expect(occurrences.length, `There should be 2 DOM nodes for label ${label}`).toBe(2);

      // According to the implementation, document.getElementById(node) returns the first element with that id.
      // The DFS marks the first set as visited on the second run (it will operate on the first matching element),
      // so the first occurrence should have 'visited' true and the second occurrence should not have 'visited'.
      const firstHasVisited = occurrences[0].includes('visited');
      const secondHasVisited = occurrences[1].includes('visited');

      expect(firstHasVisited, `First occurrence of ${label} should have 'visited' class`).toBe(true);
      // The second occurrence is appended later and will not be targeted by document.getElementById in dfs calls;
      // therefore it is expected not to be marked visited.
      expect(secondHasVisited, `Second occurrence of ${label} should NOT have 'visited' class`).toBe(false);
    }

    // Also assert there were no uncaught exceptions during the two runs
    expect(pageErrors, 'No uncaught exceptions after two DFS runs').toEqual([]);
    const consoleErrors2 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, 'No console.error calls after two DFS runs').toBe(0);
  });

  // Test robustness: ensure multiple interactions do not produce console errors or uncaught exceptions
  test('Repeated interactions: multiple Start DFS clicks should not throw errors (but will append nodes)', async ({ page }) => {
    const dfs3 = new DfsPage(page);

    // Click start multiple times
    for (let i = 0; i < 4; i++) {
      await dfs.clickStart();
    }

    // Expect 6 * 4 = 24 nodes in the container
    const childCount3 = await dfs.getContainerChildCount();
    expect(childCount).toBe(24);

    // Ensure that node "A" has 4 occurrences and at least the first one is visited
    const classesByText1 = await dfs.getNodeClassesByText();
    const occurrencesA = classesByText['A'] || [];
    expect(occurrencesA.length).toBe(4);
    expect(occurrencesA[0].includes('visited')).toBe(true);

    // No uncaught page errors should have appeared during these repeated interactions
    expect(pageErrors).toEqual([]);
    const consoleErrors3 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Accessibility check: controls should be keyboard-focusable and operable
  test('Accessibility: Start DFS button should be focusable and operable via keyboard', async ({ page }) => {
    const dfs4 = new DfsPage(page);

    // Focus the button and activate it via keyboard (Space)
    await page.focus(dfs.startButton);
    // Pressing Space should trigger a click on a focused button
    await page.keyboard.press('Space');

    // After activation, nodes should be created
    const childCount4 = await dfs.getContainerChildCount();
    expect(childCount).toBe(6);

    // Ensure no uncaught exceptions or console errors during keyboard activation
    expect(pageErrors).toEqual([]);
    const consoleErrors4 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Sanity-check test: ensure that there are no ReferenceError/TypeError/SyntaxError messages in console output
  test('Runtime errors: page should not emit ReferenceError, TypeError, or SyntaxError messages during tests', async ({ page }) => {
    // We have been collecting consoleMessages and pageErrors in beforeEach
    // Assert that none of the console messages mention common JS runtime errors
    const problematic = consoleMessages.filter(m =>
      /ReferenceError|TypeError|SyntaxError/i.test(m.text) || m.type === 'error'
    );
    expect(problematic.length, `No ReferenceError/TypeError/SyntaxError in console: ${JSON.stringify(problematic)}`).toBe(0);

    // And no uncaught page exceptions
    expect(pageErrors.length, 'No uncaught page exceptions').toBe(0);
  });
});