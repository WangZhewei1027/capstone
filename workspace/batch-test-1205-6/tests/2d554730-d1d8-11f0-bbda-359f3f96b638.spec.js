import { test, expect } from '@playwright/test';

class LinkedListPage {
  /**
   * Simple page object for the Linked List Visualization app
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#inputValue');
    this.addButton = page.locator('button', { hasText: 'Add Node' });
    this.removeButton = page.locator('button', { hasText: 'Remove Node' });
    this.list = page.locator('#list');
    this.nodeSelector = this.list.locator('.node');
    this.arrowSelector = this.list.locator('.arrow');
  }

  async goto() {
    await this.page.goto('http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d554730-d1d8-11f0-bbda-359f3f96b638.html', { waitUntil: 'domcontentloaded' });
  }

  async fillInput(value) {
    await this.input.fill(String(value));
  }

  async clickAdd() {
    await this.addButton.click();
  }

  async clickRemove() {
    await this.removeButton.click();
  }

  async addNode(value) {
    await this.fillInput(value);
    await this.clickAdd();
  }

  async getNodesText() {
    const count = await this.nodeSelector.count();
    const results = [];
    for (let i = 0; i < count; i++) {
      results.push(await this.nodeSelector.nth(i).textContent());
    }
    return results;
  }

  async getNodeCount() {
    return this.nodeSelector.count();
  }

  async getArrowCount() {
    return this.arrowSelector.count();
  }

  async getListInnerHTML() {
    return this.page.locator('#list').innerHTML();
  }
}

test.describe('Linked List Visualization - FSM tests', () => {
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // capture console and page errors to assert against unexpected runtime errors
    consoleMessages = [];
    pageErrors = [];

    page.on('console', msg => {
      // store console messages for later assertions
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    page.on('pageerror', error => {
      // capture uncaught exceptions in the page context
      pageErrors.push(error);
    });
  });

  test.afterEach(async () => {
    // After each test, assert that there were no uncaught page errors
    // and that no console errors indicating ReferenceError/SyntaxError/TypeError occurred.
    // This helps catch runtime issues in the application while allowing the tests to
    // inspect DOM behavior separately.
    const severeConsole = consoleMessages.filter(m =>
      m.type === 'error' &&
      /ReferenceError|SyntaxError|TypeError/i.test(m.text)
    );

    // Assert: no uncaught page errors
    expect(pageErrors.length, 'Unexpected page errors (uncaught exceptions) should be 0').toBe(0);

    // Assert: no console errors that include JS error types
    expect(severeConsole.length, 'No console errors of types ReferenceError/SyntaxError/TypeError expected').toBe(0);
  });

  test('Initial Idle state: page loads and initial render produces empty list', async ({ page }) => {
    // Validate initial state S0_Idle: render() should have produced an empty #list
    const app = new LinkedListPage(page);
    await app.goto();

    // #list should be empty (no .node children)
    const nodeCount = await app.getNodeCount();
    expect(nodeCount).toBe(0);

    // innerHTML should be empty string
    const inner = await app.getListInnerHTML();
    expect(inner.trim()).toBe('');
  });

  test('Add Node transition S0_Idle -> S1_NodeAdded: adding first node updates DOM', async ({ page }) => {
    // Validate transition AddNode from S0 to S1:
    // - input a value, click Add Node
    // - a .node appears with that text
    const app1 = new LinkedListPage(page);
    await app.goto();

    // Add a node value 10
    await app.addNode(10);

    // Expect one node containing '10'
    const nodes = await app.getNodesText();
    expect(nodes.length).toBe(1);
    expect(nodes[0].trim()).toBe('10');

    // No arrows because only one node
    const arrows = await app.getArrowCount();
    expect(arrows).toBe(0);

    // Input should have been cleared after adding
    const inputValue = await page.locator('#inputValue').inputValue();
    expect(inputValue).toBe('');
  });

  test('Add Node transition S1_NodeAdded -> S1_NodeAdded: adding additional nodes appends to list', async ({ page }) => {
    // Validate repeated AddNode events while in S1_NodeAdded:
    // - add multiple nodes and verify order & arrows between nodes
    const app2 = new LinkedListPage(page);
    await app.goto();

    // Add three nodes: 1, 2, 3
    await app.addNode(1);
    await app.addNode(2);
    await app.addNode(3);

    // Expect three node elements with correct values in order
    const nodes1 = await app.getNodesText();
    expect(nodes.length).toBe(3);
    expect(nodes.map(s => s.trim())).toEqual(['1', '2', '3']);

    // Expect 2 arrows between the 3 nodes
    const arrows1 = await app.getArrowCount();
    expect(arrows).toBe(2);
  });

  test('Remove Node transition S1_NodeAdded -> S2_NodeRemoved: removing node removes last element', async ({ page }) => {
    // Validate RemoveNode transitions from S1_NodeAdded to S2_NodeRemoved:
    // - After adding nodes, clicking Remove Node removes the last node
    const app3 = new LinkedListPage(page);
    await app.goto();

    // Setup: add nodes 5 and 6
    await app.addNode(5);
    await app.addNode(6);

    let nodes2 = await app.getNodesText();
    expect(nodes.map(s => s.trim())).toEqual(['5', '6']);

    // Remove once: last node '6' should be removed
    await app.clickRemove();

    nodes = await app.getNodesText();
    expect(nodes.map(s => s.trim())).toEqual(['5']);

    // Arrow count should be 0 now
    const arrows2 = await app.getArrowCount();
    expect(arrows).toBe(0);
  });

  test('Remove Node transition S2_NodeRemoved -> S2_NodeRemoved: repeated removes eventually empty list', async ({ page }) => {
    // Validate repeated RemoveNode events while in S2_NodeRemoved:
    // - Remove multiple times until list is empty; ensure behavior is idempotent when empty
    const app4 = new LinkedListPage(page);
    await app.goto();

    // Add nodes 7,8,9
    await app.addNode(7);
    await app.addNode(8);
    await app.addNode(9);

    // Remove three times to empty
    await app.clickRemove(); // removes 9
    await app.clickRemove(); // removes 8
    await app.clickRemove(); // removes 7

    // List should now be empty
    let nodeCount1 = await app.getNodeCount();
    expect(nodeCount).toBe(0);

    // Removing when empty should be a no-op and not throw
    await app.clickRemove();
    nodeCount = await app.getNodeCount();
    expect(nodeCount).toBe(0);
  });

  test('Edge cases: adding empty value should not add node; input type enforcement', async ({ page }) => {
    // Validate behavior when attempting to add an empty value (should not add node)
    const app5 = new LinkedListPage(page);
    await app.goto();

    // Ensure empty input: clear field
    await app.fillInput('');
    // Click add with empty input
    await app.clickAdd();

    // No nodes should be present
    let nodeCount2 = await app.getNodeCount();
    expect(nodeCount).toBe(0);

    // Try adding non-numeric input via page.fill (HTML type=number will accept string but value is string)
    // Playwright can fill arbitrary text; the form's JS checks truthiness so non-empty string will add.
    await app.fillInput('abc'); // although input type=number, browsers may coerce; test behavior
    await app.clickAdd();

    // If a node was added, its textContent should match the string filled; otherwise no node
    const nodes3 = await app.getNodesText();
    if (nodes.length === 1) {
      // If platform accepted 'abc', ensure the DOM reflects that value (application uses valueInput.value without parse)
      expect(nodes[0].trim()).toBe('abc');
    } else {
      // Otherwise, ensure still zero nodes
      expect(nodes.length).toBe(0);
    }
  });

  test('Observability: console and runtime errors are monitored during interactions', async ({ page }) => {
    // This test intentionally exercises multiple user flows while observing console/page errors.
    // It does not force errors; it asserts that common JS errors (ReferenceError/SyntaxError/TypeError)
    // were not emitted to the page console or as uncaught exceptions.
    const app6 = new LinkedListPage(page);
    await app.goto();

    // Perform a sequence of actions
    await app.addNode(100);
    await app.addNode(200);
    await app.clickRemove();
    await app.addNode(300);
    await app.clickRemove();
    await app.clickRemove();
    await app.clickRemove(); // extra remove, should be no-op

    // At this point the afterEach hook will assert there were no uncaught page errors and no
    // console errors containing ReferenceError/SyntaxError/TypeError. For this test, we also
    // assert that the DOM is in a consistent state: either empty or with remaining nodes from above.
    const remainingNodes = await app.getNodesText();
    // remainingNodes length should be 0 or 1 depending on how adds/removes applied
    expect(remainingNodes.length).toBeGreaterThanOrEqual(0);
    expect(remainingNodes.length).toBeLessThanOrEqual(1);
  });
});