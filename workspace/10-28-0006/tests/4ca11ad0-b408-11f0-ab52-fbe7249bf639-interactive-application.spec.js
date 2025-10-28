const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://127.0.0.1:5500/workspace/10-28-0006/html/4ca11ad0-b408-11f0-ab52-fbe7249bf639.html';

class BstPage {
  /**
   * Page Object for BST app interactions and queries
   */
  constructor(page) {
    this.page = page;
    this.treeContainer = this.page.locator('#treeContainer');
    this.input = this.page.locator('#nodeValue');
    this.insertButton = this.page.getByRole('button', { name: 'Insert Node' });
    this.resetButton = this.page.getByRole('button', { name: 'Reset Tree' });
    this.nodeLocator = this.page.locator('.node');
  }

  async navigate() {
    await this.page.goto(BASE_URL);
    await expect(this.treeContainer).toBeVisible();
  }

  async setInputValue(value) {
    await this.input.fill('');
    await this.input.type(String(value));
  }

  async setInputValueRaw(value) {
    // Set value via JS to bypass number input restrictions for edge cases
    await this.page.evaluate((val) => {
      const el = document.getElementById('nodeValue');
      el.value = val;
    }, String(value));
  }

  async clickInsert() {
    await this.insertButton.click();
  }

  async clickReset() {
    await this.resetButton.click();
  }

  nodes() {
    return this.nodeLocator;
  }

  nodeByText(value) {
    return this.page.locator('.node', { hasText: String(value) });
  }

  async nodeCount() {
    return await this.nodeLocator.count();
  }

  async waitForNodeWithValue(value) {
    const node = this.nodeByText(value);
    await expect(node).toBeVisible();
    return node;
  }

  async getNodeBoxByText(value) {
    const node = await this.waitForNodeWithValue(value);
    // Sometimes bounding box can be null if not attached; ensure it's attached
    await expect(node).toBeVisible();
    const box = await node.boundingBox();
    return box;
  }

  async getAllNodeValues() {
    const count = await this.nodeCount();
    const values = [];
    for (let i = 0; i < count; i++) {
      const text = await this.nodeLocator.nth(i).innerText();
      values.push(text.trim());
    }
    return values;
  }
}

// Helper assertions for layout relationships
async function expectLeftOf(page, aValue, bValue) {
  const a = await page.getNodeBoxByText(aValue);
  const b = await page.getNodeBoxByText(bValue);
  expect(a && b).toBeTruthy();
  expect(a.x + a.width / 2).toBeLessThan(b.x + b.width / 2);
}

async function expectRightOf(page, aValue, bValue) {
  const a = await page.getNodeBoxByText(aValue);
  const b = await page.getNodeBoxByText(bValue);
  expect(a && b).toBeTruthy();
  expect(a.x + a.width / 2).toBeGreaterThan(b.x + b.width / 2);
}

async function expectBelow(page, aValue, bValue) {
  const a = await page.getNodeBoxByText(aValue);
  const b = await page.getNodeBoxByText(bValue);
  expect(a && b).toBeTruthy();
  expect(a.y + a.height / 2).toBeGreaterThan(b.y + b.height / 2);
}

test.describe('Interactive Application - BST FSM end-to-end', () => {
  let bst;

  test.beforeEach(async ({ page }) => {
    bst = new BstPage(page);
    await bst.navigate();
  });

  test('Initial idle state: UI loads with no nodes and controls available', async () => {
    // FSM: onEnter set_idle -> nothing rendered; idle state with controls active
    await expect(bst.input).toBeVisible();
    await expect(bst.insertButton).toBeVisible();
    await expect(bst.resetButton).toBeVisible();
    await expect(bst.nodes()).toHaveCount(0);
  });

  test('validating_input -> error_alert on invalid input (empty) and returns to idle after ALERT_DISMISSED', async () => {
    // Ensure input is empty
    await bst.input.fill('');
    // Prepare to intercept alert
    const dialogPromise = bst.page.waitForEvent('dialog');
    await bst.clickInsert(); // CLICK_INSERT -> validating_input -> INPUT_INVALID -> error_alert
    const dialog = await dialogPromise;
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('Please enter a valid number.');
    await dialog.accept(); // ALERT_DISMISSED -> idle

    // Back to idle: no nodes added
    await expect(bst.nodes()).toHaveCount(0);

    // Insert a valid number afterward to confirm app is fully idle and responsive
    await bst.setInputValue(42);
    await bst.clickInsert();
    await expect(bst.nodeByText(42)).toBeVisible();
    await expect(bst.nodes()).toHaveCount(1);
  });

  test('valid path: one valid insertion updates DOM and returns to idle (inserting_node -> drawing_tree -> idle)', async () => {
    await bst.setInputValue(10);
    await bst.clickInsert(); // CLICK_INSERT -> validating_input -> INPUT_VALID -> inserting_node -> drawing_tree -> idle
    await expect(bst.nodes()).toHaveCount(1);
    await expect(bst.nodeByText(10)).toHaveCount(1);

    // Verify node renders with correct label
    const values = await bst.getAllNodeValues();
    expect(values).toEqual(['10']);
  });

  test('Inserting left and right children: positions reflect BST structure (render_bst correctness)', async () => {
    // Insert root, then left < root, then right > root
    await bst.setInputValue(10);
    await bst.clickInsert();
    await bst.setInputValue(5);
    await bst.clickInsert();
    await bst.setInputValue(15);
    await bst.clickInsert();

    await expect(bst.nodes()).toHaveCount(3);
    // Positional checks: left (5) is left and below 10, right (15) is right and below 10
    await expectLeftOf(bst, 5, 10);
    await expectRightOf(bst, 15, 10);
    await expectBelow(bst, 5, 10);
    await expectBelow(bst, 15, 10);
  });

  test('Float input is parsed as integer: "3.7" results in node value "3"', async () => {
    await bst.setInputValue('3.7');
    await bst.clickInsert();
    // parseInt("3.7") => 3
    await expect(bst.nodeByText(3)).toBeVisible();
    await expect(bst.nodes()).toHaveCount(1);
  });

  test('Resetting tree clears DOM and allows subsequent inserts (tree_resetting -> RESET_DONE -> idle)', async () => {
    await bst.setInputValue(7);
    await bst.clickInsert();
    await bst.setInputValue(4);
    await bst.clickInsert();
    await expect(bst.nodes()).toHaveCount(2);

    await bst.clickReset(); // CLICK_RESET -> tree_resetting -> RESET_DONE -> idle
    await expect(bst.nodes()).toHaveCount(0);

    // Verify tree is usable again after reset
    await bst.setInputValue(9);
    await bst.clickInsert();
    await expect(bst.nodeByText(9)).toBeVisible();
    await expect(bst.nodes()).toHaveCount(1);
  });

  test('Multiple inserts produce correct BST structure: relative positions for deeper levels', async () => {
    // Insert a range of values to build a larger tree
    const values = [8, 3, 10, 1, 6, 14];
    for (const v of values) {
      await bst.setInputValue(v);
      await bst.clickInsert();
    }
    await expect(bst.nodes()).toHaveCount(values.length);

    // Verify key positional relationships using render_bst outputs
    await expectLeftOf(bst, 3, 8);
    await expectRightOf(bst, 10, 8);
    await expectLeftOf(bst, 1, 3);
    await expectRightOf(bst, 6, 3);
    await expectRightOf(bst, 14, 10);

    // All child nodes should be below their parents
    await expectBelow(bst, 3, 8);
    await expectBelow(bst, 10, 8);
    await expectBelow(bst, 1, 3);
    await expectBelow(bst, 6, 3);
    await expectBelow(bst, 14, 10);
  });

  test('Invalid non-numeric input set via JS triggers error_alert and no DOM changes', async () => {
    // Bypass number input constraint to set "abc"
    await bst.setInputValueRaw('abc');
    // Prepare alert expectation
    const dialogPromise = bst.page.waitForEvent('dialog');
    await bst.clickInsert();
    const dialog = await dialogPromise;
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('Please enter a valid number.');
    await dialog.accept();
    await expect(bst.nodes()).toHaveCount(0);
  });

  test('Rapid consecutive inserts render synchronously (BST_INSERTED -> TREE_RENDERED per insert)', async () => {
    const seq = [20, 10, 30, 5, 15, 25, 35];
    for (const v of seq) {
      await bst.setInputValue(v);
      await bst.clickInsert();
    }
    await expect(bst.nodes()).toHaveCount(seq.length);

    // Spot-check some positions
    await expectLeftOf(bst, 10, 20);
    await expectRightOf(bst, 30, 20);
    await expectLeftOf(bst, 5, 10);
    await expectRightOf(bst, 15, 10);
    await expectLeftOf(bst, 25, 30);
    await expectRightOf(bst, 35, 30);
  });

  test('Reset with empty tree keeps idle state with no errors', async () => {
    await expect(bst.nodes()).toHaveCount(0);
    await bst.clickReset();
    await expect(bst.nodes()).toHaveCount(0);

    // Ensure idle usability after noop reset
    await bst.setInputValue(1);
    await bst.clickInsert();
    await expect(bst.nodeByText(1)).toBeVisible();
  });

  test('Negative numbers are accepted and placed correctly in BST', async () => {
    await bst.setInputValue(0);
    await bst.clickInsert();
    await bst.setInputValue(-5);
    await bst.clickInsert();

    await expect(bst.nodes()).toHaveCount(2);
    await expectLeftOf(bst, -5, 0);
    await expectBelow(bst, -5, 0);
  });

  test('Whitespace-only input behaves like empty and triggers alert', async () => {
    // Set input to whitespace via JS to simulate invalid value
    await bst.setInputValueRaw('   ');
    const dialogPromise = bst.page.waitForEvent('dialog');
    await bst.clickInsert();
    const dialog = await dialogPromise;
    expect(dialog.message()).toBe('Please enter a valid number.');
    await dialog.accept();
    await expect(bst.nodes()).toHaveCount(0);
  });
});