import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d563190-d1d8-11f0-bbda-359f3f96b638.html';

class TreePage {
  /**
   * Page object encapsulating interactions with the Red-Black Tree demo
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#value');
    this.insertButton = page.locator("button[onclick='insertNode()']");
    this.tree = page.locator('#tree');
    this.nodeLocator = page.locator('#tree .node');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async insertValue(value) {
    // fill the numeric input and click Insert Node
    await this.input.fill(String(value));
    await this.insertButton.click();
  }

  async clickInsertWithoutValue() {
    await this.insertButton.click();
  }

  async getNodeCount() {
    return await this.nodeLocator.count();
  }

  async getRootNodeLocator() {
    // root node is the first .node child of #tree per the render implementation
    return this.page.locator('#tree > .node').first();
  }

  async getAllNodesText() {
    const count = await this.getNodeCount();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push(await this.nodeLocator.nth(i).innerText());
    }
    return texts;
  }
}

test.describe('Red-Black Tree Visualization (FSM) - 2d563190-d1d8-11f0-bbda-359f3f96b638', () => {
  // Arrays to capture console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages for inspection
    page.on('console', (msg) => {
      // push text and type for debugging assertions
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', (error) => {
      // Playwright gives Error objects, capture name and message
      pageErrors.push({ name: error.name, message: error.message, stack: error.stack });
    });

    // Navigate to the app (do NOT alter page content)
    await page.goto(APP_URL);
  });

  test.afterEach(async ({ page }) => {
    // detach listeners by removing all listeners to avoid cross-test leakage
    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
  });

  test('S0_Idle: Initial Idle state renders controls and an empty tree', async ({ page }) => {
    // This validates the FSM initial state S0_Idle:
    // - renderPage() is expected to have been called per the FSM entry action.
    // - The page must show the input, button, and an initially empty tree.
    const p = new TreePage(page);

    // Ensure input exists and has correct placeholder
    await expect(p.input).toBeVisible();
    await expect(p.input).toHaveAttribute('placeholder', 'Enter a number');

    // Ensure Insert Node button exists and is visible
    await expect(p.insertButton).toBeVisible();
    await expect(p.insertButton).toHaveText('Insert Node');

    // Tree container exists
    await expect(p.tree).toBeVisible();

    // Initially there should be no .node elements
    const nodeCount = await p.getNodeCount();
    expect(nodeCount).toBe(0);

    // No uncaught page errors of critical types should have occurred during initial load
    const criticalErrors = pageErrors.filter(e => ['ReferenceError', 'SyntaxError', 'TypeError'].includes(e.name));
    expect(criticalErrors.length).toBe(0);

    // Console messages captured (we don't require any specific console output),
    // but record count for diagnostics (assert it's a finite array).
    expect(Array.isArray(consoleMessages)).toBe(true);
  });

  test('InsertNode event transitions from S0_Idle to S1_NodeInserted and renders the root node', async ({ page }) => {
    // This validates the FSM transition triggered by the InsertNode event.
    // We assert DOM changes (render() and insert(data) effects), input clearing, and node color.
    const p1 = new TreePage(page);

    // Insert a root value
    await p.insertValue(10);

    // Wait for a node to appear
    await expect(p.nodeLocator).toHaveCount(1);

    // The root node should be the first .node inside #tree and display the inserted value
    const root = await p.getRootNodeLocator();
    await expect(root).toBeVisible();
    await expect(root).toHaveText('10');

    // The root must be black per implementation (root color forced to 'black')
    const classAttr = await root.getAttribute('class');
    expect(classAttr).toContain('black');

    // Input should be cleared after successful insert
    await expect(p.input).toHaveValue('');

    // Ensure no ReferenceError/SyntaxError/TypeError happened during insertion
    const criticalErrors1 = pageErrors.filter(e => ['ReferenceError', 'SyntaxError', 'TypeError'].includes(e.name));
    expect(criticalErrors.length).toBe(0);
  });

  test('Multiple inserts: structure grows and root remains black; node count increments accordingly', async ({ page }) => {
    // Validate repeated transitions (S0 -> S1 multiple times) and DOM reflects all inserts.
    const p2 = new TreePage(page);

    // Insert sequence of values
    const values = [50, 25, 75, 10, 30];
    for (const v of values) {
      await p.insertValue(v);
      // small wait for rendering - use locator to ensure nodes are present
      await page.waitForTimeout(50);
    }

    // Node count must equal number of inserted values
    const count1 = await p.getNodeCount();
    expect(count).toBe(values.length);

    // Root must still be black per final enforcement in fixViolation()
    const root1 = await p.getRootNodeLocator();
    const rootClass = await root.getAttribute('class');
    expect(rootClass).toContain('black');

    // The set of node texts should include all inserted values (order in DOM may vary due to layout)
    const texts1 = await p.getAllNodesText();
    for (const v of values) {
      expect(texts).toContain(String(v));
    }

    // No critical uncaught errors occurred during multiple inserts
    const criticalErrors2 = pageErrors.filter(e => ['ReferenceError', 'SyntaxError', 'TypeError'].includes(e.name));
    expect(criticalErrors.length).toBe(0);
  });

  test('Edge case: clicking Insert Node with empty input does not modify the tree (no transition)', async ({ page }) => {
    // Validate that clicking the button without entering a number should not cause an insertion.
    const p3 = new TreePage(page);

    // Ensure tree is empty initially
    expect(await p.getNodeCount()).toBe(0);

    // Click insert without value
    await p.clickInsertWithoutValue();

    // Wait a short duration to allow any unintended behavior to manifest
    await page.waitForTimeout(100);

    // Still no nodes should be present
    expect(await p.getNodeCount()).toBe(0);

    // No critical uncaught errors happened as a result of this edge interaction
    const criticalErrors3 = pageErrors.filter(e => ['ReferenceError', 'SyntaxError', 'TypeError'].includes(e.name));
    expect(criticalErrors.length).toBe(0);
  });

  test('Error monitoring: observe console and page errors during lifecycle and assert none are critical', async ({ page }) => {
    // This test's sole responsibility is to assert that loading the demo and performing basic interactions
    // does not produce ReferenceError, SyntaxError, or TypeError. We intentionally do not modify the page.
    const p4 = new TreePage(page);

    // Do a basic interaction to generate any potential runtime errors
    await p.insertValue(1);
    await p.insertValue(2);
    await page.waitForTimeout(50);

    // Inspect captured page errors for critical types
    const criticalErrors4 = pageErrors.filter(e => ['ReferenceError', 'SyntaxError', 'TypeError'].includes(e.name));

    // Assert that none occurred. If any of these errors occur naturally from the implementation,
    // this assertion will fail, surfacing the runtime issue as required by the test contract.
    expect(criticalErrors.length).toBe(0);

    // Additionally, ensure that console messages are captured and are strings
    for (const msg of consoleMessages) {
      expect(typeof msg.text).toBe('string');
      expect(typeof msg.type).toBe('string');
    }
  });
});