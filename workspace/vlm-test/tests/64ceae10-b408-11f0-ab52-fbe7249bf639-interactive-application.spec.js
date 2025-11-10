import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/10-28-0006/html/64ceae10-b408-11f0-ab52-fbe7249bf639.html';

class TreeAppPage {
  /**
   * Page Object Model for the "Exploring the Binary Tree" app.
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#nodeValue');
    this.insertBtn = page.locator('#insertBtn');
    this.treeContainer = page.locator('#binaryTree');
    this.treeNodes = page.locator('.tree-node');
    this.output = page.locator('#tree-output');
  }

  async goto() {
    await this.page.goto(APP_URL);
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.insertBtn).toBeVisible();
    await expect(this.input).toBeVisible();
  }

  async getOutputText() {
    return await this.output.innerText();
  }

  async parseOutputValues() {
    const text = await this.getOutputText();
    const matches = text.match(/-?\d+/g) || [];
    return matches.map(v => Number(v));
  }

  async typeNodeValue(val) {
    await this.input.fill('');
    await this.input.type(String(val));
  }

  async setRawInputValue(value) {
    // Directly set the input's value via the DOM (useful for type=number quirks)
    await this.page.evaluate((v) => {
      const el = document.getElementById('nodeValue');
      el.value = v;
    }, value);
  }

  async clickInsert() {
    await this.insertBtn.click();
  }

  treeNodeByValue(value) {
    return this.page.locator('.tree-node', { hasText: String(value) }).first();
  }

  async isNodeHighlighted(value) {
    const node = this.treeNodeByValue(value);
    const classAttr = await node.getAttribute('class');
    return !!classAttr && classAttr.includes('highlight');
  }

  async insertValidAndWait(value) {
    const beforeCount = await this.treeNodes.count();
    await this.typeNodeValue(value);
    await this.clickInsert();
    // Wait for a new node to appear with the given value
    await expect(this.treeNodes).toHaveCount(beforeCount + 1);
    await expect(this.treeNodeByValue(value)).toBeVisible();
    // Input should be cleared after insertion (onExit: clear_input_field)
    await expect(this.input).toHaveValue('');
  }

  async insertDuplicateAndWaitForOutput(value) {
    const beforeCount = await this.treeNodes.count();
    const beforeValues = await this.parseOutputValues();
    const beforeOccurrences = beforeValues.filter(v => v === value).length;

    await this.typeNodeValue(value);
    await this.clickInsert();

    // Visual tree should not add a new node for duplicate
    await expect(this.treeNodes).toHaveCount(beforeCount);

    // Output should include duplicate value twice
    await this.page.waitForFunction((val, beforeOcc) => {
      const text = document.querySelector('#tree-output')?.innerText || '';
      const matches = text.match(/-?\d+/g) || [];
      const occ = matches.filter(s => Number(s) === Number(val)).length;
      return occ === beforeOcc + 1;
    }, value, beforeOccurrences);

    // Input should be cleared after insertion attempt
    await expect(this.input).toHaveValue('');
  }

  async triggerInvalidInsertAndCaptureAlert() {
    const [dialog] = await Promise.all([
      this.page.waitForEvent('dialog'),
      this.clickInsert()
    ]);
    const msg = dialog.message();
    await dialog.dismiss();
    return msg;
  }

  async expectOnlyNodeHighlighted(value) {
    const count = await this.treeNodes.count();
    for (let i = 0; i < count; i++) {
      const node = this.treeNodes.nth(i);
      const textContent = (await node.textContent())?.trim();
      const cls = await node.getAttribute('class') || '';
      const isHighlight = cls.includes('highlight');
      if (String(textContent) === String(value)) {
        expect(isHighlight).toBeTruthy();
      } else {
        expect(isHighlight).toBeFalsy();
      }
    }
  }
}

test.describe('Exploring the Binary Tree - FSM Transitions and Interactions', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new TreeAppPage(page);
    await app.goto();
  });

  test.afterEach(async ({ page }) => {
    // Teardown: Playwright will automatically close pages; no app-level teardown needed.
  });

  test.describe('App Initialization and idle_empty state (APP_READY -> idle_empty)', () => {
    test('App initializes with empty tree and output [] (onEnter: setup_app)', async () => {
      // Validate initial empty state representing idle_empty
      await expect(app.treeNodes).toHaveCount(0);
      await expect(app.treeContainer).toBeVisible();

      const outputText = await app.getOutputText();
      expect(outputText).toContain('Current Tree (Array Representation):');
      expect(outputText).toContain('[]');

      // Input and button are bound (setup_app) and interactive
      await expect(app.input).toBeEnabled();
      await expect(app.insertBtn).toBeEnabled();
    });

    test('Clicking Insert with empty input triggers invalid_input (alert) and remains idle_empty after dismiss', async () => {
      // This validates CLICK_INSERT_INVALID -> invalid_input onEnter action (show_alert_invalid_number)
      const message = await app.triggerInvalidInsertAndCaptureAlert();
      expect(message).toBe('Please enter a valid number.');

      // ALERT_DISMISSED_EMPTY -> returns to idle_empty (tree remains empty)
      await expect(app.treeNodes).toHaveCount(0);
      const values = await app.parseOutputValues();
      expect(values).toEqual([]);
    });
  });

  test.describe('Insertion and Rendering (idle_* -> inserting -> rendering -> idle_populated)', () => {
    test('Valid insert transitions and actions: input cleared, tree renders node, output updates', async () => {
      // CLICK_INSERT_VALID -> inserting (onEnter: insert_node) -> INSERT_DONE -> rendering (onEnter: render_tree_and_update_output) -> RENDER_COMPLETE -> idle_populated
      await app.insertValidAndWait(10);

      // Verify DOM changes (visual feedback)
      await expect(app.treeNodes).toHaveCount(1);
      await expect(app.treeNodeByValue(10)).toBeVisible();

      // Verify output updates
      const values = await app.parseOutputValues();
      expect(values).toEqual([10]);

      // Verify input cleared due to clear_input_field (onExit of inserting)
      await expect(app.input).toHaveValue('');
    });

    test('Multiple inserts create BST structure and render nodes; output reflects insertion order', async () => {
      await app.insertValidAndWait(10);
      await app.insertValidAndWait(5);
      await app.insertValidAndWait(15);

      // We expect 3 distinct nodes in DOM
      await expect(app.treeNodes).toHaveCount(3);
      await expect(app.treeNodeByValue(10)).toBeVisible();
      await expect(app.treeNodeByValue(5)).toBeVisible();
      await expect(app.treeNodeByValue(15)).toBeVisible();

      // Output should include all numbers (nodes array)
      const values = await app.parseOutputValues();
      // Order in array should be insertion order per notes (push on insert)
      expect(values).toEqual([10, 5, 15]);

      // Input cleared after each insert
      await expect(app.input).toHaveValue('');
    });

    test('Insert negative and zero values to ensure robust handling and rendering', async () => {
      await app.insertValidAndWait(0);
      await app.insertValidAndWait(-3);
      await app.insertValidAndWait(2);

      await expect(app.treeNodes).toHaveCount(3);

      // Visible nodes include all values
      await expect(app.treeNodeByValue(0)).toBeVisible();
      await expect(app.treeNodeByValue(-3)).toBeVisible();
      await expect(app.treeNodeByValue(2)).toBeVisible();

      const values = await app.parseOutputValues();
      expect(values).toEqual([0, -3, 2]);
    });
  });

  test.describe('Invalid Input Handling (invalid_input state transitions)', () => {
    test('Alert shows with invalid input in idle_populated and returns to idle_populated after dismiss', async () => {
      // Populate the tree first
      await app.insertValidAndWait(10);

      // Ensure we are in idle_populated by presence of a node
      await expect(app.treeNodes).toHaveCount(1);

      // Trigger invalid input: empty or NaN
      await app.setRawInputValue(''); // Ensure parseInt returns NaN
      const message = await app.triggerInvalidInsertAndCaptureAlert();
      expect(message).toBe('Please enter a valid number.');

      // ALERT_DISMISSED_POPULATED -> back to idle_populated (tree still populated)
      await expect(app.treeNodes).toHaveCount(1);
      await expect(app.treeNodeByValue(10)).toBeVisible();

      const values = await app.parseOutputValues();
      expect(values).toEqual([10]);
    });

    test('Invalid input with whitespace also triggers alert and does not change tree', async () => {
      await app.insertValidAndWait(8);
      await app.setRawInputValue('   '); // whitespace -> parseInt NaN

      const message = await app.triggerInvalidInsertAndCaptureAlert();
      expect(message).toBe('Please enter a valid number.');

      // Tree should remain unchanged
      await expect(app.treeNodes).toHaveCount(1);
      await expect(app.treeNodeByValue(8)).toBeVisible();
      const values = await app.parseOutputValues();
      expect(values).toEqual([8]);
    });
  });

  test.describe('Node Highlighting (idle_populated -> highlighting_path -> idle_populated)', () => {
    test('Clicking a node highlights it; previous highlights cleared upon new node click', async () => {
      await app.insertValidAndWait(10);
      await app.insertValidAndWait(5);
      await app.insertValidAndWait(15);

      // NODE_CLICK -> highlighting_path (onEnter: clear_highlights_and_highlight_path) -> HIGHLIGHT_COMPLETE -> idle_populated
      await app.treeNodeByValue(5).click();
      await app.expectOnlyNodeHighlighted(5);

      // Clicking another node should clear previous highlights and highlight the new one
      await app.treeNodeByValue(15).click();
      await app.expectOnlyNodeHighlighted(15);
    });

    test('Highlight persists in idle_populated until another node is clicked', async () => {
      await app.insertValidAndWait(10);
      await app.insertValidAndWait(20);

      await app.treeNodeByValue(10).click();
      await app.expectOnlyNodeHighlighted(10);

      // Wait briefly; highlight should persist
      await app.page.waitForTimeout(100);
      await app.expectOnlyNodeHighlighted(10);

      // Click on another node to change highlight
      await app.treeNodeByValue(20).click();
      await app.expectOnlyNodeHighlighted(20);
    });
  });

  test.describe('Duplicate Values (special case behavior)', () => {
    test('Duplicate value is added to output array but not rendered as a new DOM node', async () => {
      await app.insertValidAndWait(10);

      // Before duplicate insertion: one node in DOM
      const preDomCount = await app.treeNodes.count();
      const preValues = await app.parseOutputValues();
      expect(preDomCount).toBe(1);
      expect(preValues).toEqual([10]);

      // Insert duplicate 10; DOM nodes should not increase, but output should add another 10
      await app.insertDuplicateAndWaitForOutput(10);

      // DOM node count unchanged
      await expect(app.treeNodes).toHaveCount(preDomCount);

      // Only one visual node with value 10
      await expect(app.treeNodeByValue(10)).toBeVisible();
      // Ensure there is exactly one element with text '10'
      const tenNodesCount = await app.page.locator('.tree-node', { hasText: '10' }).count();
      expect(tenNodesCount).toBe(1);

      // Output should show two occurrences of 10
      const values = await app.parseOutputValues();
      expect(values).toEqual([10, 10]);
    });

    test('Duplicate insertion keeps node clickable and highlighting works on the existing node', async () => {
      await app.insertValidAndWait(7);

      // Duplicate insert should not add a new clickable node
      await app.insertDuplicateAndWaitForOutput(7);

      // Clicking the existing node should highlight it
      await app.treeNodeByValue(7).click();
      await app.expectOnlyNodeHighlighted(7);

      // Verify output contains duplicates but DOM still has a single node
      const values = await app.parseOutputValues();
      expect(values).toEqual([7, 7]);
      const count = await app.page.locator('.tree-node', { hasText: '7' }).count();
      expect(count).toBe(1);
    });
  });

  test.describe('Clear Input Field behavior (onExit: inserting)', () => {
    test('Input field is cleared after each successful insert', async () => {
      await app.typeNodeValue(3);
      await app.clickInsert();
      await expect(app.input).toHaveValue('');

      await app.typeNodeValue(1);
      await app.clickInsert();
      await expect(app.input).toHaveValue('');

      await app.typeNodeValue(4);
      await app.clickInsert();
      await expect(app.input).toHaveValue('');

      // Ensure nodes rendered for unique inserts
      await expect(app.treeNodes).toHaveCount(3);
      const values = await app.parseOutputValues();
      expect(values).toEqual([3, 1, 4]);
    });
  });

  test.describe('Event and Transition Coverage Summary', () => {
    test('Covers APP_READY, CLICK_INSERT_VALID/INVALID, INSERT_DONE, RENDER_COMPLETE, NODE_CLICK, HIGHLIGHT_COMPLETE, ALERT_DISMISSED_*', async () => {
      // APP_READY -> idle_empty: validated by initial state
      await expect(app.treeNodes).toHaveCount(0);

      // CLICK_INSERT_INVALID -> invalid_input -> ALERT_DISMISSED_EMPTY -> idle_empty
      const msg1 = await app.triggerInvalidInsertAndCaptureAlert();
      expect(msg1).toBe('Please enter a valid number.');
      await expect(app.treeNodes).toHaveCount(0);

      // CLICK_INSERT_VALID -> inserting (insert_node) -> INSERT_DONE -> rendering (render_tree_and_update_output) -> RENDER_COMPLETE -> idle_populated
      await app.insertValidAndWait(12);
      await expect(app.treeNodeByValue(12)).toBeVisible();

      // NODE_CLICK -> highlighting_path (clear_highlights_and_highlight_path) -> HIGHLIGHT_COMPLETE -> idle_populated
      await app.treeNodeByValue(12).click();
      await expect(app.treeNodeByValue(12)).toHaveClass(/highlight/);

      // CLICK_INSERT_INVALID in idle_populated -> invalid_input -> ALERT_DISMISSED_POPULATED -> idle_populated
      await app.setRawInputValue('');
      const msg2 = await app.triggerInvalidInsertAndCaptureAlert();
      expect(msg2).toBe('Please enter a valid number.');
      await expect(app.treeNodeByValue(12)).toBeVisible();
    });
  });
});