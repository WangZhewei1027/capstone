import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b703e1-d1d5-11f0-b49a-6f458b3a25ef.html';

// Page Object for the Red-Black Tree page
class TreePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#value');
    this.insertButton = page.locator('#insertButton');
    this.treeContainer = page.locator('#treeContainer');
    this.nodeLocator = () => this.page.locator('#treeContainer .node');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async insertValue(value) {
    // Fill the numeric input and click the insert button
    await this.input.fill(String(value));
    await this.insertButton.click();
  }

  async clickInsertWithEmptyInput() {
    await this.input.fill('');
    await this.insertButton.click();
  }

  async getAllNodes() {
    return this.nodeLocator();
  }

  async getNodeCount() {
    return await this.nodeLocator().count();
  }

  async getNodesText() {
    const nodes = this.nodeLocator();
    const count = await nodes.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push((await nodes.nth(i).innerText()).trim());
    }
    return texts;
  }

  async getNodeClassesByIndex(index) {
    return await this.nodeLocator().nth(index).getAttribute('class');
  }

  async getNodesWithText(text) {
    return this.page.locator('.node', { hasText: String(text) });
  }

  async inputValue() {
    return await this.input.inputValue();
  }
}

test.describe('Red-Black Tree Visualization - UI and Behavior', () => {
  // Arrays to collect console errors and page errors for each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console messages and page errors for assertions later.
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', error => {
      pageErrors.push(error);
    });
  });

  test('Initial page load shows controls and empty tree container', async ({ page }) => {
    // Purpose: Verify the page loads with expected controls and that the tree is initially empty
    const tree = new TreePage(page);
    await tree.goto();

    // Check header and controls exist
    await expect(page.locator('h1')).toHaveText(/Red-Black Tree Visualization/);
    await expect(tree.input).toBeVisible();
    await expect(tree.insertButton).toBeVisible();

    // Input should be of type number
    const inputType = await page.locator('#value').getAttribute('type');
    expect(inputType).toBe('number');

    // Tree container should be present and initially empty (no .node elements)
    await expect(tree.treeContainer).toBeVisible();
    const initialNodeCount = await tree.getNodeCount();
    expect(initialNodeCount).toBe(0);

    // Ensure no runtime errors were emitted during load
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Inserting a single node displays it and makes it the black root; input clears', async ({ page }) => {
    // Purpose: Insert one value and verify DOM update, classes, and input clearing
    const tree1 = new TreePage(page);
    await tree.goto();

    await tree.insertValue(10);

    // One node should appear with text '10'
    const nodeCount = await tree.getNodeCount();
    expect(nodeCount).toBe(1);

    // Node should show the value and have classes indicating color; root must be black per algorithm
    const nodeText = (await tree.nodeLocator().nth(0).innerText()).trim();
    expect(nodeText).toBe('10');

    const nodeClass = await tree.getNodeClassesByIndex(0);
    // className should include both 'node' and 'black' for root
    expect(nodeClass).toContain('node');
    expect(nodeClass).toContain('black');

    // Input should be cleared after insertion
    const currentInputValue = await tree.inputValue();
    expect(currentInputValue).toBe('');

    // No runtime errors during this operation
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Inserting multiple values shows multiple nodes and child nodes retain red color when parent is black', async ({ page }) => {
    // Purpose: Insert several values to form a simple tree and verify colors and counts
    const tree2 = new TreePage(page);
    await tree.goto();

    // Sequence: 20 (root), 10 (left), 30 (right)
    await tree.insertValue(20);
    await tree.insertValue(10);
    await tree.insertValue(30);

    // Expect 3 nodes in DOM
    const nodeCount1 = await tree.getNodeCount();
    expect(nodeCount).toBe(3);

    // Expect root at index 0 to be black, and children (indices 1 and 2) to be present and likely red
    const rootClass = await tree.getNodeClassesByIndex(0);
    expect(rootClass).toContain('black');

    // The ordering of nodes from the display function is root then left then right for simple insertions
    const leftClass = await tree.getNodeClassesByIndex(1);
    const rightClass = await tree.getNodeClassesByIndex(2);

    // Children should at least include 'node', and commonly will be 'red' (new nodes start as red)
    expect(leftClass).toContain('node');
    expect(rightClass).toContain('node');

    // It's expected (per algorithm) that child nodes remain red if parent is black (typical for this sequence)
    expect(leftClass).toContain('red');
    expect(rightClass).toContain('red');

    // Verify text values are present among nodes
    const texts1 = await tree.getNodesText();
    expect(texts).toContain('20');
    expect(texts).toContain('10');
    expect(texts).toContain('30');

    // No runtime errors observed during inserts
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Inserting duplicate values results in multiple node elements with same displayed value', async ({ page }) => {
    // Purpose: Confirm duplicates are added (the implementation places equal values to the right)
    const tree3 = new TreePage(page);
    await tree.goto();

    // Insert duplicate value 5 three times
    await tree.insertValue(5);
    await tree.insertValue(5);
    await tree.insertValue(5);

    // Count nodes with text '5'
    const nodesWithFive = await tree.getNodesWithText('5');
    const countFives = await nodesWithFive.count();

    // Expect three nodes showing '5'
    expect(countFives).toBe(3);

    // Total node count should be 3
    expect(await tree.getNodeCount()).toBe(3);

    // Ensure root is black
    const rootClass1 = await tree.getNodeClassesByIndex(0);
    expect(rootClass).toContain('black');

    // No runtime exceptions during duplicate insertion
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Clicking insert with empty or non-numeric input does not modify the tree', async ({ page }) => {
    // Purpose: Ensure invalid or empty input is ignored (parseInt yields NaN)
    const tree4 = new TreePage(page);
    await tree.goto();

    // Ensure starting state is empty
    expect(await tree.getNodeCount()).toBe(0);

    // Try clicking with empty input
    await tree.clickInsertWithEmptyInput();
    expect(await tree.getNodeCount()).toBe(0);

    // Try filling with a non-numeric string (input type=number but fill will set the value)
    await tree.input.fill('abc');
    await tree.insertButton.click();
    // Still should be no nodes added
    expect(await tree.getNodeCount()).toBe(0);

    // Try whitespace-only
    await tree.input.fill('   ');
    await tree.insertButton.click();
    expect(await tree.getNodeCount()).toBe(0);

    // No runtime errors should have occurred during these invalid actions
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Structure generation uses nested .tree containers and display appends subcontainers', async ({ page }) => {
    // Purpose: Verify that the display logic creates nested .tree subcontainers in the DOM
    const tree5 = new TreePage(page);
    await tree.goto();

    // Build a small tree to force nested subcontainers
    await tree.insertValue(50);
    await tree.insertValue(30);
    await tree.insertValue(70);
    await tree.insertValue(20);
    await tree.insertValue(40);

    // The main container should have child elements including .node and nested .tree elements
    const container = page.locator('#treeContainer');
    await expect(container).toBeVisible();

    // Confirm there are .tree elements inside the container (subContainer created by display)
    const nestedTrees = container.locator('.tree');
    const nestedTreeCount = await nestedTrees.count();

    // There should be at least one nested .tree (for children)
    expect(nestedTreeCount).toBeGreaterThanOrEqual(1);

    // Confirm nodes exist and count equals number of inserts
    expect(await tree.getNodeCount()).toBe(5);

    // No runtime errors observed during structure generation
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});