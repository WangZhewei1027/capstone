import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad37880-d59a-11f0-891d-f361d22ca68a.html';

// Page object to encapsulate interactions and captures
class UnionFindPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.consoleMessages = [];
    this.pageErrors = [];
    // capture console and page errors
    this.page.on('console', msg => {
      // store text for easier assertions
      this.consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    this.page.on('pageerror', err => {
      this.pageErrors.push(err);
    });
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  // Returns all console texts (strings)
  getConsoleTexts() {
    return this.consoleMessages.map(m => m.text);
  }

  // Returns console messages of a specific type (eg 'log', 'error')
  getConsoleByType(type) {
    return this.consoleMessages.filter(m => m.type === type).map(m => m.text);
  }

  // Wait for nodes to be rendered into the DOM
  async waitForInitialNodes(expectedCount = 6) {
    // Wait for at least node-0 to appear and then verify count of node-* children
    await this.page.waitForSelector('#node-0');
    // Ensure all expected nodes exist
    for (let i = 0; i < expectedCount; i++) {
      await this.page.waitForSelector(`#node-${i}`);
    }
  }

  // Helper to check if an edge element exists
  async hasEdge(root1, root2) {
    const id = `#edge-${root1}-${root2}`;
    const el = await this.page.$(id);
    return !!el;
  }

  // Call existing page function `find` and return its result
  async callFind(node) {
    return await this.page.evaluate(n => {
      // call the page's find function as-is
      return window.find(n);
    }, node);
  }

  // Call existing page function `union` (no return)
  async callUnion(node1, node2) {
    return await this.page.evaluate(([a, b]) => {
      return window.union(a, b);
    }, [node1, node2]);
  }

  // Check if global renderPage exists on the page
  async hasRenderPage() {
    return await this.page.evaluate(() => typeof renderPage !== 'undefined');
  }

  // Get captured page errors
  getPageErrors() {
    return this.pageErrors.slice();
  }
}

// Group tests logically
test.describe('Union-Find (Disjoint Set) Interactive App - FSM Validation', () => {
  let uf;

  // Setup before each test: navigate and prepare the page object
  test.beforeEach(async ({ page }) => {
    uf = new UnionFindPage(page);
    await uf.goto();
    // Wait for initial nodes to be present (these are created by the inline script)
    await uf.waitForInitialNodes(6);
    // give a short moment for console logs to be emitted
    await page.waitForTimeout(50);
  });

  test('Initial State (S0_Initial) - page renders nodes and logs initial state', async () => {
    // Validate DOM: six nodes rendered (node-0 ... node-5)
    for (let i = 0; i < 6; i++) {
      const selector = `#node-${i}`;
      const el = await uf.page.$(selector);
      expect(el, `Expected element ${selector} to be present`).not.toBeNull();
    }

    // Validate console output includes the FSM evidence string for initial state
    const consoleText = uf.getConsoleTexts().join('\n');
    expect(consoleText).toContain('Initial Union-Find state:');

    // Validate at least one of the initial "Node X is connected to: X" messages appears
    expect(consoleText).toMatch(/Node 0 is connected to: 0/);
    expect(consoleText).toMatch(/Node 5 is connected to: 5/);

    // Verify that renderPage (an onEnter action mentioned in the FSM) is NOT present
    // The FSM mentions renderPage() as an entry_action, but the page does not define it.
    const hasRender = await uf.hasRenderPage();
    expect(hasRender).toBe(false);
  });

  test('Transition: UnionNodes -> After union(0, 1) (S0_Initial -> S1_After_Union)', async () => {
    // The page script already calls union(0, 1) on load. Validate effects observed:
    const consoleText = uf.getConsoleTexts().join('\n');

    // Evidence string logged after union
    expect(consoleText).toContain('After union(0, 1):');

    // Validate the console shows that node 0 is now connected to 1
    expect(consoleText).toMatch(/Node 0 is connected to: 1/);

    // Validate visual feedback: an edge element should exist for the union between roots 0 and 1
    // The script creates an element with id="edge-0-1" when union(0,1) was performed.
    const edgeExists = await uf.hasEdge(0, 1);
    expect(edgeExists).toBe(true);

    // Validate find(0) now returns 1 (root after union)
    const root0 = await uf.callFind(0);
    expect(root0).toBe(1);
  });

  test('Transition: FindNode -> After finding node 0 (S1_After_Union -> S2_After_Find)', async () => {
    // The page script logs the "After finding node 0:" block and then logs the numeric result
    const consoleText = uf.getConsoleTexts().join('\n');

    expect(consoleText).toContain('After finding node 0:');

    // The find(0) return value was logged; validate that "1" exists on its own in console outputs after the find
    // We look for a console log that is exactly "1" or contains '\n1' - be flexible with formatting
    const consoleTexts = uf.getConsoleTexts();
    const hasOne = consoleTexts.some(t => t.trim() === '1' || t.includes('\n1'));
    expect(hasOne).toBe(true);

    // Double-check via direct call to the page's find function
    const found = await uf.callFind(0);
    expect(found).toBe(1);
  });

  test('Edge cases: additional unions and invalid unions/finds should behave predictably', async () => {
    // Perform an additional valid union using exposed page function
    await uf.callUnion(2, 3);

    // union(2,3) should create an edge #edge-2-3
    // Wait briefly for DOM mutation
    await uf.page.waitForTimeout(20);
    const edge23 = await uf.hasEdge(2, 3);
    expect(edge23).toBe(true);

    // Call find on a valid node and ensure it returns a number
    const root2 = await uf.callFind(2);
    expect(typeof root2).toBe('number');

    // Edge case: call find on an out-of-range node index - should not throw (we observe natural behavior)
    // This documents the application's behavior when given unexpected input.
    const findOutOfRange = await uf.callFind(999);
    // Based on the implementation, this should likely return undefined (no crash)
    expect(findOutOfRange === undefined || typeof findOutOfRange === 'number').toBe(true);

    // Attempt an invalid union with out-of-range indices; ensure it does not create a malformed DOM edge
    await uf.callUnion(999, 1000);
    // Wait shortly for any DOM changes
    await uf.page.waitForTimeout(20);

    // If an edge for undefined roots were created, its id would be edge-undefined-undefined. Assert it does NOT exist.
    const malformedEdge = await uf.page.$('#edge-undefined-undefined');
    expect(malformedEdge).toBeNull();
  });

  test('Runtime errors and console diagnostics', async () => {
    // Collect errors captured during page load
    const errors = uf.getPageErrors();

    // The inline script is expected to run without throwing runtime exceptions in typical circumstances.
    // Assert there are no unhandled pageerrors. If errors exist, we surface them for debugging by failing the test.
    expect(errors.length).toBe(0);

    // Additionally assert that console contains the three major evidence markers used in FSM:
    const text = uf.getConsoleTexts().join('\n');
    expect(text).toContain('Initial Union-Find state:');
    expect(text).toContain('After union(0, 1):');
    expect(text).toContain('After finding node 0:');
  });
});