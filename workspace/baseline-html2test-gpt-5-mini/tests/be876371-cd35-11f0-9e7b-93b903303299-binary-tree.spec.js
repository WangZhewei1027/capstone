import { test, expect } from '@playwright/test';

// File: be876371-cd35-11f0-9e7b-93b903303299-binary-tree.spec.js
// Tests for the Interactive Binary Tree (BST) Demonstrator
// - Uses ES module syntax
// - Verifies UI, DOM updates, traversal behavior, alerts/confirms, and console/page errors

test.describe('Binary Tree Visualizer - be876371-cd35-11f0-9e7b-93b903303299', () => {
  const URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be876371-cd35-11f0-9e7b-93b903303299.html';

  // Page Object encapsulating common interactions
  class BinaryTreePage {
    constructor(page) {
      this.page = page;
      this.valueInput = page.locator('#valueInput');
      this.insertBtn = page.locator('#insertBtn');
      this.deleteBtn = page.locator('#deleteBtn');
      this.searchBtn = page.locator('#searchBtn');
      this.randomBtn = page.locator('#randomBtn');
      this.clearBtn = page.locator('#clearBtn');

      this.traversalOutput = page.locator('#traversalOutput');
      this.nodeCountEl = page.locator('#nodeCount');
      this.treeHeightEl = page.locator('#treeHeight');
      this.rootValEl = page.locator('#rootVal');
      this.searchResult = page.locator('#searchResult');

      this.playBtn = page.locator('#playBtn');
      this.stepBtn = page.locator('#stepBtn');
      this.stopBtn = page.locator('#stopBtn');
    }

    async go() {
      await this.page.goto(URL, { waitUntil: 'load' });
      // Wait for initial render - nodeCount should reflect the demo initialization (7 nodes)
      await expect(this.nodeCountEl).toHaveText(/\d+/);
    }

    async getNodeCountNumber() {
      const txt = await this.nodeCountEl.textContent();
      return Number(txt.trim());
    }

    async getTreeHeightNumber() {
      const txt1 = await this.treeHeightEl.textContent();
      return Number(txt.trim());
    }

    async getRootValueText() {
      return (await this.rootValEl.textContent()).trim();
    }

    async setInput(value) {
      await this.valueInput.fill(String(value));
    }

    async clickInsert() {
      await this.insertBtn.click();
    }

    async clickDelete() {
      await this.deleteBtn.click();
    }

    async clickSearch() {
      await this.searchBtn.click();
    }

    async clickRandom() {
      await this.randomBtn.click();
    }

    // Clicks the Clear button. The test must handle the confirm dialog via page.once('dialog', ...)
    async clickClear() {
      await this.clearBtn.click();
    }

    async pressEnterInInput() {
      await this.valueInput.press('Enter');
    }

    // Select traversal by data attribute: 'inorder', 'preorder', 'postorder', 'levelorder'
    async selectTraversal(type) {
      await this.page.locator(`[data-tr="${type}"]`).click();
      // traversalOutput is updated synchronously in prepareTraversal
      await expect(this.traversalOutput).toBeVisible();
    }

    // Click an SVG node by matching its text content (value).
    // Uses XPath to find the <text> element inside the svg with exact text.
    async clickNodeByValue(value) {
      const locator = this.page.locator(`xpath=//svg[@id="svgCanvas"]//text[text()="${value}"]`);
      await expect(locator).toHaveCount(1);
      await locator.click();
    }

    // Click the svg background at a position; used to clear input/searchTarget
    async clickSvgBackground(x = 10, y = 10) {
      // click the svg element at a given point; should not target a node normally
      await this.page.locator('#svgCanvas').click({ position: { x, y } });
    }

    async stepTraversal() {
      await this.stepBtn.click();
    }

    async playTraversal() {
      await this.playBtn.click();
    }

    async stopTraversal() {
      await this.stopBtn.click();
    }

    async getTraversalOutputText() {
      return (await this.traversalOutput.textContent())?.trim() ?? '';
    }

    async getSearchResultText() {
      return (await this.searchResult.textContent())?.trim() ?? '';
    }
  }

  // Arrays to capture console messages and page errors per test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages
    page.on('console', msg => {
      // collect useful info about console messages
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture uncaught exceptions in page
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
  });

  test.afterEach(async ({ page }) => {
    // Assert there are no fatal page errors from the application runtime
    expect(pageErrors.length, `No page errors expected, but got: ${pageErrors.map(e => String(e)).join('\n')}`).toBe(0);

    // Ensure no console messages of type 'error' were emitted
    const errors = consoleMessages.filter(m => m.type === 'error');
    expect(errors.length, `No console errors expected, but got: ${JSON.stringify(errors)}`).toBe(0);

    // Optionally stop any traversal timers to avoid background activity affecting other tests
    try {
      await page.locator('#stopBtn').click();
    } catch (e) {
      // ignore if stop button not available
    }
  });

  // Basic smoke test: initial page state
  test('Initial load: default demo tree is rendered with correct stats and inorder traversal', async ({ page }) => {
    // Purpose: verify the demo initializes a balanced sample BST and UI reflects it
    const p = new BinaryTreePage(page);
    await p.go();

    // The demo inserts 7 sample nodes on init
    await expect(p.nodeCountEl).toHaveText('7');
    // Height should be 3 for the sample tree: root + two levels
    await expect(p.treeHeightEl).toHaveText('3');
    // Root value should be 50 per the initDemo values
    await expect(p.rootValEl).toHaveText('50');

    // The default traversal selected is inorder; ensure traversal output matches expected sequence
    const expectedInorder = '20 → 30 → 40 → 50 → 60 → 70 → 80';
    await expect(p.traversalOutput).toHaveText(expectedInorder);
  });

  test('Clicking a node populates input and triggers visual highlight', async ({ page }) => {
    // Purpose: clicking nodes should fill the input with the node value
    const p1 = new BinaryTreePage(page);
    await p.go();

    // Click node '70' and expect valueInput to be set
    await p.clickNodeByValue(70);
    await expect(p.valueInput).toHaveValue('70');

    // Click a different node '30' and expect valueInput updated
    await p.clickNodeByValue(30);
    await expect(p.valueInput).toHaveValue('30');
  });

  test('Insert operation: pressing Enter triggers insert and node count increases', async ({ page }) => {
    // Purpose: verify insert via keyboard (Enter) and that stats update
    const p2 = new BinaryTreePage(page);
    await p.go();

    const before = await p.getNodeCountNumber();
    // Choose a value not in the initial tree (e.g., 55)
    await p.setInput(55);
    // Press Enter to trigger insert via keydown listener
    await p.pressEnterInInput();

    // Node count should increment
    await expect(p.nodeCountEl).toHaveText(String(before + 1));
    // The traversal output (inorder) should include the inserted value
    const traversalOut = await p.getTraversalOutputText();
    expect(traversalOut.includes('55')).toBeTruthy();
  });

  test('Insert duplicate value triggers alert and does not change node count', async ({ page }) => {
    // Purpose: verify duplicate insertion is blocked and an alert is shown
    const p3 = new BinaryTreePage(page);
    await p.go();

    const before1 = await p.getNodeCountNumber();

    // Prepare to capture the alert dialog
    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toContain('already exists'); // message from page script
      await dialog.accept();
    });

    // Attempt to insert root value 50 which already exists
    await p.setInput(50);
    await p.clickInsert();

    // Node count remains unchanged
    await expect(p.nodeCountEl).toHaveText(String(before));
  });

  test('Delete operation removes existing node and updates stats', async ({ page }) => {
    // Purpose: verify delete removes nodes correctly
    const p4 = new BinaryTreePage(page);
    await p.go();

    const before2 = await p.getNodeCountNumber();
    // Delete an existing leaf node, e.g., 20
    await p.setInput(20);
    await p.clickDelete();

    // Node count should decrement
    await expect(p.nodeCountEl).toHaveText(String(before - 1));
    // Traversal should no longer include deleted value
    const traversalOut1 = await p.getTraversalOutputText();
    expect(traversalOut.includes('20')).toBeFalsy();
  });

  test('Search existing and non-existing values update search result and highlight path', async ({ page }) => {
    // Purpose: verify search shows Found and Not found messages and path
    const p5 = new BinaryTreePage(page);
    await p.go();

    // Search for an existing value
    await p.setInput(60);
    await p.clickSearch();
    // Search result should indicate Found
    await expect(p.searchResult).toContainText('Found.');

    // Search for a non-existing value
    await p.setInput(9999);
    await p.clickSearch();
    // Expect Not found in result
    await expect(p.searchResult).toContainText('Not found.');
  });

  test('Traversal button selection updates traversal output (preorder)', async ({ page }) => {
    // Purpose: selecting preorder should show correct sequence for the demo tree
    const p6 = new BinaryTreePage(page);
    await p.go();

    await p.selectTraversal('preorder');
    // For the initial demo tree, expected preorder sequence:
    const expectedPreorder = '50 → 30 → 20 → 40 → 70 → 60 → 80';
    await expect(p.traversalOutput).toHaveText(expectedPreorder);
  });

  test('Step traversal shows visiting flash and then reverts to normal output', async ({ page }) => {
    // Purpose: step traversal should briefly show "[visiting]" in traversal output then revert
    const p7 = new BinaryTreePage(page);
    await p.go();

    // Ensure traversal prepared (inorder by default)
    await p.selectTraversal('inorder');

    // Press Step: should show visiting state briefly
    await p.stepTraversal();

    // Shortly after stepping, traversalOutput should include "[visiting]"
    await page.waitForTimeout(120); // small wait for immediate UI update
    let out = await p.getTraversalOutputText();
    expect(out.includes('[visiting]')).toBeTruthy();

    // Wait for highlight revert (script reverts after ~travSpeed*0.9 ~ 630ms)
    await page.waitForTimeout(800);
    out = await p.getTraversalOutputText();
    expect(out.includes('[visiting]')).toBeFalsy();
  });

  test('Play traversal animates visiting nodes and Stop halts it', async ({ page }) => {
    // Purpose: Play starts automated visiting; Stop stops it. We assert visiting starts.
    const p8 = new BinaryTreePage(page);
    await p.go();

    await p.selectTraversal('inorder');

    // Start playing
    await p.playTraversal();
    // Give some time for the first visit to be emitted
    await page.waitForTimeout(300);
    let out1 = await p.getTraversalOutputText();
    // When playing, flashOutput sets traversalOutput to include '[visiting]' during visits
    expect(out.includes('[visiting]')).toBeTruthy();

    // Now stop traversal
    await p.stopTraversal();
    // Wait to ensure no further changes; but at least the control didn't crash
    await page.waitForTimeout(200);
    // No console errors expected, validated in afterEach
  });

  test('Random tree generates between 4 and 11 nodes', async ({ page }) => {
    // Purpose: verify Random tree button populates a tree of expected size range
    const p9 = new BinaryTreePage(page);
    await p.go();

    await p.clickRandom();
    // Wait briefly for rendering
    await page.waitForTimeout(150);
    const count = await p.getNodeCountNumber();
    expect(count).toBeGreaterThanOrEqual(4);
    expect(count).toBeLessThanOrEqual(11);
  });

  test('Clear action: cancelling confirm keeps tree; accepting clears tree', async ({ page }) => {
    // Purpose: test confirm dialog behavior for Clear button both dismiss and accept
    const p10 = new BinaryTreePage(page);
    await p.go();

    const before3 = await p.getNodeCountNumber();

    // First attempt: cancel the confirm dialog -> tree remains intact
    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm');
      // Dismiss (cancel)
      await dialog.dismiss();
    });
    await p.clickClear();
    // Tree should remain unchanged
    await expect(p.nodeCountEl).toHaveText(String(before));

    // Second attempt: accept the confirm dialog -> tree cleared
    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm');
      await dialog.accept();
    });
    await p.clickClear();

    // Wait and assert tree cleared: node count 0 and root '—'
    await page.waitForTimeout(150);
    await expect(p.nodeCountEl).toHaveText('0');
    await expect(p.rootValEl).toHaveText('—');
  });

  test('Clicking SVG background clears input and resets search state', async ({ page }) => {
    // Purpose: clicking on background should clear the value input and clear searchTarget
    const p11 = new BinaryTreePage(page);
    await p.go();

    // Click a node to populate input
    await p.clickNodeByValue(40);
    await expect(p.valueInput).toHaveValue('40');

    // Click on the SVG background to clear the input
    // Use a coordinate likely to be background (top-left)
    await p.clickSvgBackground(8, 8);
    await expect(p.valueInput).toHaveValue('');
    // searchResult should report 'No query' as per event handler
    await expect(p.searchResult).toHaveText('No query');
  });

  test('Clicking Delete with empty input shows alert error', async ({ page }) => {
    // Purpose: verify error handling when delete invoked with invalid input
    const p12 = new BinaryTreePage(page);
    await p.go();

    // Ensure input is empty
    await p.valueInput.fill('');

    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toContain('Enter an integer to delete.');
      await dialog.accept();
    });

    await p.clickDelete();
    // Node count remains unchanged
    await expect(p.nodeCountEl).toHaveText('7');
  });

  test('Clicking Insert with empty input shows alert error', async ({ page }) => {
    // Purpose: verify error handling when insert invoked with invalid input
    const p13 = new BinaryTreePage(page);
    await p.go();

    // Ensure input is empty
    await p.valueInput.fill('');

    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toContain('Enter an integer value.');
      await dialog.accept();
    });

    await p.clickInsert();
    // Node count remains unchanged
    await expect(p.nodeCountEl).toHaveText('7');
  });

});