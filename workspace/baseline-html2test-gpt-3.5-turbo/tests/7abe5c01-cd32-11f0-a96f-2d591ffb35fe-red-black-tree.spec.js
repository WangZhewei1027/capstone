import { test, expect } from '@playwright/test';

// Test file: 7abe5c01-cd32-11f0-a96f-2d591ffb35fe-red-black-tree.spec.js
// Application URL (served externally per instructions)
const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abe5c01-cd32-11f0-a96f-2d591ffb35fe.html';

// Page Object Model for the Red-Black Tree page
class TreePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#inputValue');
    this.insertBtn = page.locator('#insertBtn');
    this.deleteBtn = page.locator('#deleteBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.messages = page.locator('#messages');
    this.svg = page.locator('svg#tree');
    this.nodes = () => page.locator('svg#tree g.node');
    this.links = () => page.locator('svg#tree line.link');
    this.header = page.locator('header');
  }

  // Navigate to the app
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Enter a value into the numeric input
  async enterValue(val) {
    await this.input.fill(String(val));
  }

  // Click insert button (assumes value already entered)
  async clickInsert() {
    await this.insertBtn.click();
  }

  // Click delete button (assumes value already entered)
  async clickDelete() {
    await this.deleteBtn.click();
  }

  // Click clear button
  async clickClear() {
    await this.clearBtn.click();
  }

  // Convenience: insert a value via UI
  async insertValue(val) {
    await this.enterValue(val);
    await this.clickInsert();
  }

  // Convenience: delete a value via UI
  async deleteValue(val) {
    await this.enterValue(val);
    await this.clickDelete();
  }

  // Gets the visible message text
  async getMessageText() {
    return (await this.messages.textContent())?.trim() ?? '';
  }

  // Gets the inline style color of the message element (as set by the app)
  async getMessageColor() {
    return await this.page.$eval('#messages', (el) => el.style.color || '');
  }

  // Number of node groups in the SVG
  async nodeCount() {
    return await this.nodes().count();
  }

  // Return an array of node text contents (numbers rendered inside nodes)
  async nodeTexts() {
    const count = await this.nodeCount();
    const texts = [];
    for (let i = 0; i < count; i++) {
      const locator = this.nodes().nth(i).locator('text');
      texts.push((await locator.textContent())?.trim() ?? '');
    }
    return texts;
  }

  // Count of link (edge) elements
  async linkCount() {
    return await this.links().count();
  }

  // Whether a button is disabled
  async isButtonDisabled(buttonName) {
    switch (buttonName) {
      case 'insert': return await this.insertBtn.isDisabled();
      case 'delete': return await this.deleteBtn.isDisabled();
      case 'clear': return await this.clearBtn.isDisabled();
      default: throw new Error('Unknown button');
    }
  }

  // Header text
  async headerText() {
    return (await this.header.textContent())?.trim() ?? '';
  }
}

test.describe('Red-Black Tree Interactive Visualization', () => {
  // Collect console error messages and page errors on each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Listen to console messages and collect errors
    page.on('console', (msg) => {
      // capture only error-level console messages
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture uncaught exceptions on the page
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  // After each test, assert that no unexpected runtime errors occurred.
  // This verifies that the page did not produce unhandled exceptions during interaction.
  test.afterEach(async () => {
    expect(pageErrors.length).toBe(0, `Expected no page errors, but got: ${pageErrors.map(e => String(e)).join('\n')}`);
    expect(consoleErrors.length).toBe(0, `Expected no console.error messages, but got: ${consoleErrors.join('\n')}`);
  });

  test('Initial page load shows expected UI elements and an empty tree', async ({ page }) => {
    // Purpose: Verify the page loads, header and controls exist, and tree is initially empty
    const treePage = new TreePage(page);
    await treePage.goto();

    // Header should present correct title text
    await expect(treePage.header).toBeVisible();
    expect(await treePage.headerText()).toContain('Red-Black Tree');

    // Buttons and input should be visible and enabled
    await expect(treePage.input).toBeVisible();
    await expect(treePage.insertBtn).toBeVisible();
    await expect(treePage.deleteBtn).toBeVisible();
    await expect(treePage.clearBtn).toBeVisible();

    expect(await treePage.isButtonDisabled('insert')).toBe(false);
    expect(await treePage.isButtonDisabled('delete')).toBe(false);
    expect(await treePage.isButtonDisabled('clear')).toBe(false);

    // Messages area should be empty at start
    expect(await treePage.getMessageText()).toBe('');

    // SVG should initially have no node groups (empty tree)
    expect(await treePage.nodeCount()).toBe(0);
    expect(await treePage.linkCount()).toBe(0);
  });

  test('Inserting a single node renders one black root node with correct text', async ({ page }) => {
    // Purpose: Validate that inserting a number results in a node being rendered and that root becomes black
    const treePage1 = new TreePage(page);
    await treePage.goto();

    // Insert value 10
    await treePage.insertValue(10);

    // One node should be present
    await expect(treePage.nodes()).toHaveCount(1);

    const texts1 = await treePage.nodeTexts();
    expect(texts).toContain('10');

    // The node group should have class "node black" because root color set to black
    const nodeClass = await page.locator('svg#tree g.node').getAttribute('class');
    expect(nodeClass).toMatch(/node/);
    expect(nodeClass).toMatch(/black/);

    // Messages should be cleared after successful insert
    expect(await treePage.getMessageText()).toBe('');
  });

  test('Inserting duplicate values shows an error message and does not create new nodes', async ({ page }) => {
    // Purpose: Ensure duplicates are rejected and error message is displayed
    const treePage2 = new TreePage(page);
    await treePage.goto();

    // Insert value 20 successfully first
    await treePage.insertValue(20);
    await expect(treePage.nodes()).toHaveCount(1);

    // Attempt to insert duplicate 20
    await treePage.insertValue(20);

    // Message should indicate duplicate and be styled as error
    expect(await treePage.getMessageText()).toBe('Value 20 already exists in the tree.');
    expect(await treePage.getMessageColor()).toBe('#d9534f');

    // Node count must remain 1
    expect(await treePage.nodeCount()).toBe(1);
  });

  test('Invalid non-integer input for insert displays validation error', async ({ page }) => {
    // Purpose: Validate client-side input validation for insertion
    const treePage3 = new TreePage(page);
    await treePage.goto();

    // Enter a non-integer input (letters)
    await treePage.enterValue('abc');
    await treePage.clickInsert();

    // Should show specific validation message for insert
    expect(await treePage.getMessageText()).toBe('Please enter a valid integer.');
    expect(await treePage.getMessageColor()).toBe('#d9534f');

    // No nodes should be created
    expect(await treePage.nodeCount()).toBe(0);
  });

  test('Deleting an existing node removes it from the visualization', async ({ page }) => {
    // Purpose: Insert and then delete a value, ensuring the node is removed from SVG
    const treePage4 = new TreePage(page);
    await treePage.goto();

    // Insert value 30 and ensure it's present
    await treePage.insertValue(30);
    await expect(treePage.nodes()).toHaveCount(1);
    expect((await treePage.nodeTexts()).includes('30')).toBe(true);

    // Delete value 30
    await treePage.deleteValue(30);

    // After deletion, node count should be zero again
    expect(await treePage.nodeCount()).toBe(0);

    // Messages cleared after successful deletion
    expect(await treePage.getMessageText()).toBe('');
  });

  test('Deleting a non-existent value shows not-found error', async ({ page }) => {
    // Purpose: Verify proper error message when deleting a value not in the tree
    const treePage5 = new TreePage(page);
    await treePage.goto();

    // Try to delete 999 which was never inserted
    await treePage.deleteValue(999);

    // Should show not-found message and error color
    expect(await treePage.getMessageText()).toBe('Value 999 not found in the tree.');
    expect(await treePage.getMessageColor()).toBe('#d9534f');
  });

  test('Invalid non-integer input for delete displays validation error', async ({ page }) => {
    // Purpose: Validate client-side input validation for deletion
    const treePage6 = new TreePage(page);
    await treePage.goto();

    // Enter a non-integer input and click delete
    await treePage.enterValue('3.14');
    await treePage.clickDelete();

    // Should show specific validation message for delete
    expect(await treePage.getMessageText()).toBe('Please enter a valid integer to delete.');
    expect(await treePage.getMessageColor()).toBe('#d9534f');
  });

  test('Clear button removes all nodes and resets messages', async ({ page }) => {
    // Purpose: Insert multiple nodes, clear, and verify the tree is emptied and messages cleared
    const treePage7 = new TreePage(page);
    await treePage.goto();

    // Insert several values
    await treePage.insertValue(5);
    await treePage.insertValue(3);
    await treePage.insertValue(7);

    // There should be 3 nodes (structure may vary but count should be 3)
    await expect(treePage.nodes()).toHaveCount(3);

    // Click clear
    await treePage.clickClear();

    // SVG should have no nodes and no links
    expect(await treePage.nodeCount()).toBe(0);
    expect(await treePage.linkCount()).toBe(0);

    // Messages cleared
    expect(await treePage.getMessageText()).toBe('');
  });

  test('Visual structure: inserting three nodes renders correct number of links and nodes', async ({ page }) => {
    // Purpose: Check that when multiple nodes exist, edges are drawn (link counts align with node count)
    const treePage8 = new TreePage(page);
    await treePage.goto();

    // Insert three distinct values
    await treePage.insertValue(50);
    await treePage.insertValue(30);
    await treePage.insertValue(70);

    // There should be three nodes
    await expect(treePage.nodes()).toHaveCount(3);

    // For a tree with N nodes, there should be N-1 links (edges)
    const nodeCount = await treePage.nodeCount();
    const linkCount = await treePage.linkCount();
    expect(linkCount).toBeGreaterThan(0);
    expect(linkCount).toBe(nodeCount - 1);
  });

  test('Buttons remain enabled and interactive throughout usage', async ({ page }) => {
    // Purpose: Ensure controls remain enabled after multiple operations (no accidental disabling)
    const treePage9 = new TreePage(page);
    await treePage.goto();

    // Perform a sequence of operations
    await treePage.insertValue(11);
    await treePage.insertValue(6);
    await treePage.deleteValue(11);

    // Buttons should still be enabled
    expect(await treePage.isButtonDisabled('insert')).toBe(false);
    expect(await treePage.isButtonDisabled('delete')).toBe(false);
    expect(await treePage.isButtonDisabled('clear')).toBe(false);
  });
});