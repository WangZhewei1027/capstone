import { test, expect } from '@playwright/test';

// Test file for Application ID: 26275dc3-cd2a-11f0-bee4-a3a342d77f94
// Binary Search Tree (BST) visualization tests
// URL served at: http://127.0.0.1:5500/workspace/html2test/html/26275dc3-cd2a-11f0-bee4-a3a342d77f94.html

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/26275dc3-cd2a-11f0-bee4-a3a342d77f94.html';

// Page Object for the BST page to encapsulate selectors and actions
class BSTPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#bstInput');
    this.createButton = page.locator('button', { hasText: 'Create BST' });
    this.clearButton = page.locator('button', { hasText: 'Clear' });
    this.treeContainer = page.locator('#treeContainer');
    // level containers are direct child divs that are not .line separators
    this.levelContainers = () => this.page.locator('#treeContainer > div:not(.line)');
  }

  // Navigate to the app page
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Enter values into the input
  async enterValues(valueString) {
    await this.input.fill(valueString);
  }

  // Click the Create BST button
  async clickCreate() {
    await this.createButton.click();
  }

  // Click the Clear button
  async clickClear() {
    await this.clearButton.click();
  }

  // Returns nested arrays of node texts per level, e.g. [['8'], ['3','10'], ...]
  async getLevelsText() {
    const containers = this.levelContainers();
    const count = await containers.count();
    const levels = [];
    for (let i = 0; i < count; i++) {
      const container = containers.nth(i);
      // gather texts of .node children within this level container
      const nodeLocators = container.locator('.node');
      const nodesCount = await nodeLocators.count();
      const texts = [];
      for (let j = 0; j < nodesCount; j++) {
        texts.push((await nodeLocators.nth(j).innerText()).trim());
      }
      levels.push(texts);
    }
    return levels;
  }

  // Returns the raw innerHTML of the tree container (for asserting cleared state)
  async treeInnerHTML() {
    return await this.treeContainer.evaluate((el) => el.innerHTML);
  }
}

// Group tests by functionality
test.describe('Binary Search Tree Visualization - UI and behavior', () => {
  // Test initial page load and default state
  test('loads the page and shows default UI elements', async ({ page }) => {
    // Track console messages and page errors for this test
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', (err) => pageErrors.push(err));

    const bst = new BSTPage(page);
    await bst.goto();

    // Verify the page title and heading are present
    await expect(page).toHaveTitle(/Binary Search Tree/i);
    const heading = page.locator('h1');
    await expect(heading).toHaveText(/Binary Search Tree Visualization/i);

    // Input and buttons should be visible and enabled
    await expect(bst.input).toBeVisible();
    await expect(bst.createButton).toBeVisible();
    await expect(bst.clearButton).toBeVisible();

    // On initial load the input should be empty and the tree container should be empty
    await expect(bst.input).toHaveValue('');
    const innerHTML = await bst.treeInnerHTML();
    expect(innerHTML.trim()).toBe('');

    // Ensure no uncaught page errors were emitted during load
    expect(pageErrors.length).toBe(0);

    // Ensure no console errors referencing ReferenceError/TypeError/SyntaxError occurred
    const errorConsoleMessages = consoleMessages.filter(m =>
      m.type === 'error' &&
      /ReferenceError|TypeError|SyntaxError/i.test(m.text)
    );
    expect(errorConsoleMessages.length).toBe(0);
  });

  // Test creating a BST with a typical set of numeric values and validate DOM changes
  test('creates and visualizes BST for a typical numeric input', async ({ page }) => {
    // Capture console errors and page errors for this interaction
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', (err) => pageErrors.push(err));

    const bst = new BSTPage(page);
    await bst.goto();

    // Insert a commonly used BST example sequence
    const input = '8,3,10,1,6,14,4,7,13';
    await bst.enterValues(input);
    await bst.clickCreate();

    // The visualize() implementation groups nodes by depth. For this input the expected levels are:
    // Depth 0: [8]
    // Depth 1: [3,10]
    // Depth 2: [1,6,14]
    // Depth 3: [4,7,13]
    const expectedLevels = [['8'], ['3', '10'], ['1', '6', '14'], ['4', '7', '13']];

    // Wait for nodes to be rendered by ensuring at least one .node appears
    await expect(page.locator('.node')).toBeVisible();

    const levelsText = await bst.getLevelsText();
    // Ensure the levels count and contents match expectation
    expect(levelsText.length).toBe(expectedLevels.length);
    expect(levelsText).toEqual(expectedLevels);

    // Verify that .line separators exist between levels (should be levels - 1 separators)
    const lineCount = await page.locator('#treeContainer > .line').count();
    expect(lineCount).toBe(expectedLevels.length - 1);

    // No uncaught errors should have been emitted for normal operation
    expect(pageErrors.length).toBe(0);
    const errorConsoleMessages = consoleMessages.filter(m =>
      m.type === 'error' &&
      /ReferenceError|TypeError|SyntaxError/i.test(m.text)
    );
    expect(errorConsoleMessages.length).toBe(0);
  });

  // Test clearing the BST resets UI state
  test('clear button empties tree container and input', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', (err) => pageErrors.push(err));

    const bst = new BSTPage(page);
    await bst.goto();

    // Create a small BST
    await bst.enterValues('5,3,7');
    await bst.clickCreate();

    // Ensure nodes rendered
    await expect(page.locator('.node')).toBeVisible();

    // Click clear and verify tree container is emptied and input cleared
    await bst.clickClear();
    await expect(bst.input).toHaveValue('');
    const inner = await bst.treeInnerHTML();
    expect(inner.trim()).toBe('');

    // No page errors during clearing
    expect(pageErrors.length).toBe(0);
    const errorConsoleMessages = consoleMessages.filter(m =>
      m.type === 'error' &&
      /ReferenceError|TypeError|SyntaxError/i.test(m.text)
    );
    expect(errorConsoleMessages.length).toBe(0);
  });

  // Edge case: empty input - verify behavior (empty string -> Number('') === 0)
  test('empty input creates a node with value "0" (Number of empty string)', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', (err) => pageErrors.push(err));

    const bst = new BSTPage(page);
    await bst.goto();

    // Ensure input is blank, then click create
    await expect(bst.input).toHaveValue('');
    await bst.clickCreate();

    // The implementation will split('') -> [''] and map(Number) -> [0]
    const levelsText = await bst.getLevelsText();
    expect(levelsText).toEqual([['0']]);

    // No uncaught errors
    expect(pageErrors.length).toBe(0);
    const errorConsoleMessages = consoleMessages.filter(m =>
      m.type === 'error' &&
      /ReferenceError|TypeError|SyntaxError/i.test(m.text)
    );
    expect(errorConsoleMessages.length).toBe(0);
  });

  // Edge case: non-numeric strings mixed with numbers result in NaN entries where appropriate
  test('non-numeric input values produce NaN nodes and maintain insertion order', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', (err) => pageErrors.push(err));

    const bst = new BSTPage(page);
    await bst.goto();

    // Provide inputs that become [NaN, NaN, 5] after mapping to Number
    await bst.enterValues('a,b,5');
    await bst.clickCreate();

    // With the code's insert logic and NaN comparisons, expected levels are:
    // depth0: [NaN] (root)
    // depth1: [NaN]
    // depth2: [5]
    const expected = [['NaN'], ['NaN'], ['5']];
    const levelsText = await bst.getLevelsText();
    expect(levelsText).toEqual(expected);

    // No uncaught errors (even though NaN values exist, code should not throw)
    expect(pageErrors.length).toBe(0);
    const errorConsoleMessages = consoleMessages.filter(m =>
      m.type === 'error' &&
      /ReferenceError|TypeError|SyntaxError/i.test(m.text)
    );
    expect(errorConsoleMessages.length).toBe(0);
  });

  // Edge case: duplicate numeric values should be inserted to the right subtree per implementation
  test('duplicate values are placed in the right subtree producing a linear right chain', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', (err) => pageErrors.push(err));

    const bst = new BSTPage(page);
    await bst.goto();

    // Insert three identical values; implementation places equal values to the right
    await bst.enterValues('5,5,5');
    await bst.clickCreate();

    // Expect a chain: depth0 [5], depth1 [5], depth2 [5]
    const expected = [['5'], ['5'], ['5']];
    const levelsText = await bst.getLevelsText();
    expect(levelsText).toEqual(expected);

    // No uncaught errors
    expect(pageErrors.length).toBe(0);
    const errorConsoleMessages = consoleMessages.filter(m =>
      m.type === 'error' &&
      /ReferenceError|TypeError|SyntaxError/i.test(m.text)
    );
    expect(errorConsoleMessages.length).toBe(0);
  });

  // Accessibility and interactive controls test: ensure buttons are reachable and clickable
  test('interactive controls are reachable and clickable', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', (err) => pageErrors.push(err));

    const bst = new BSTPage(page);
    await bst.goto();

    // Tab to the input and type values (verifies keyboard focusability)
    await page.keyboard.press('Tab'); // should focus the input
    await page.keyboard.type('2,1,3');

    // Press Enter while create button is not focused should not submit automatically.
    // So explicitly click the Create button (verifies clickable)
    await bst.clickCreate();

    const levelsText = await bst.getLevelsText();
    // For 2,1,3 expected [[2],[1,3]]
    expect(levelsText).toEqual([['2'], ['1', '3']]);

    // Click clear via keyboard navigation to test accessibility: focus clear button and press Enter
    // Move focus: input -> create button (Tab) -> clear button (Tab)
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    // Press Enter to activate the clear button
    await page.keyboard.press('Enter');

    // Tree should be cleared
    const inner = await bst.treeInnerHTML();
    expect(inner.trim()).toBe('');
    // Input should be cleared (Clear button handler sets it to '')
    await expect(bst.input).toHaveValue('');

    // No uncaught errors
    expect(pageErrors.length).toBe(0);
    const errorConsoleMessages = consoleMessages.filter(m =>
      m.type === 'error' &&
      /ReferenceError|TypeError|SyntaxError/i.test(m.text)
    );
    expect(errorConsoleMessages.length).toBe(0);
  });
});