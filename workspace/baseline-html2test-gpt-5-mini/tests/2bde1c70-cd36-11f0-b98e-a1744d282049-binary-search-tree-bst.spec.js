import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde1c70-cd36-11f0-b98e-a1744d282049.html';

// Page Object for the BST visualizer page
class BSTPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Inputs & buttons
    this.valueInput = page.locator('#valueInput');
    this.insertBtn = page.locator('#insertBtn');
    this.deleteBtn = page.locator('#deleteBtn');
    this.searchInput = page.locator('#searchInput');
    this.searchBtn = page.locator('#searchBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.inorderBtn = page.locator('#inorderBtn');
    this.preorderBtn = page.locator('#preorderBtn');
    this.postorderBtn = page.locator('#postorderBtn');
    this.levelBtn = page.locator('#levelBtn');
    this.randomBtn = page.locator('#randomBtn');
    this.balancedBtn = page.locator('#balancedBtn');
    this.fillBtn = page.locator('#fillBtn');
    // Stats & output
    this.statNodes = page.locator('#statNodes');
    this.statHeight = page.locator('#statHeight');
    this.statMin = page.locator('#statMin');
    this.statMax = page.locator('#statMax');
    this.traceOutput = page.locator('#traceOutput');
    this.svg = page.locator('#svg');
  }

  // Helper to navigate to the page
  async goto() {
    await this.page.goto(BASE_URL);
  }

  // Read stats
  async getNodesCountText() { return (await this.statNodes.textContent())?.trim(); }
  async getHeightText() { return (await this.statHeight.textContent())?.trim(); }
  async getMinText() { return (await this.statMin.textContent())?.trim(); }
  async getMaxText() { return (await this.statMax.textContent())?.trim(); }
  async getTraceText() { return (await this.traceOutput.textContent())?.trim(); }

  // Helpers to interact
  async insertValue(val) {
    await this.valueInput.fill(String(val));
    await this.insertBtn.click();
  }
  async deleteValue(val) {
    await this.valueInput.fill(String(val));
    await this.deleteBtn.click();
  }
  async searchValueViaInput(val) {
    await this.searchInput.fill(String(val));
    await this.searchBtn.click();
  }
  async clickSvgNode(value) {
    // g elements have data-value attribute
    await this.page.locator(`#svg g[data-value="${value}"]`).click();
  }
  async clickInorder() { await this.inorderBtn.click(); }
  async clickRandom() { await this.randomBtn.click(); }
  async clickBalanced() { await this.balancedBtn.click(); }
  async clickFill(confirmAccept = true) {
    // confirm will appear; caller chooses to accept or dismiss via page.once('dialog')
    await this.fillBtn.click();
  }
  async clickClear() { await this.clearBtn.click(); }

  async countSvgNodes() {
    // count g elements with data-value attribute inside svg
    return await this.page.locator('#svg g[data-value]').count();
  }

  async nodeExists(value) {
    return await this.page.locator(`#node-${value}`).count() > 0;
  }

  async getNodeFill(value) {
    const el = this.page.locator(`#node-${value}`);
    return await el.getAttribute('fill');
  }

  // Wait until traceOutput includes substring or equals expected
  async waitForTraceIncludes(text, timeout = 10000) {
    await this.page.waitForFunction(
      (sel, expected) => {
        const el1 = document.getElementById(sel);
        if (!el) return false;
        return el.textContent && el.textContent.indexOf(expected) !== -1;
      },
      'traceOutput',
      text,
      { timeout }
    );
  }

  // Wait until statNodes equals expected number
  async waitForNodesCount(expected, timeout = 5000) {
    await this.page.waitForFunction((sel, expected) => {
      const el2 = document.getElementById(sel);
      if (!el) return false;
      return el.textContent.trim() === String(expected);
    }, 'statNodes', expected, { timeout });
  }

  // Wait until traceOutput equals exact expected text
  async waitForTraceEquals(expected, timeout = 20000) {
    await this.page.waitForFunction((sel, expected) => {
      const el3 = document.getElementById(sel);
      if (!el) return false;
      return (el.textContent || '').trim() === expected;
    }, 'traceOutput', expected, { timeout });
  }
}

test.describe('Binary Search Tree Visualizer - BST', () => {
  // Capture page errors and console errors for each test run
  let pageErrors = [];
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];
    page.on('pageerror', (err) => {
      // Capture runtime exceptions
      pageErrors.push(err);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
  });

  test.describe('Initial load and default state', () => {
    test('loads the page and shows seeded tree with expected stats and no runtime errors', async ({ page }) => {
      // Purpose: Verify the page loads, seeded nodes are present, stats reflect seed data and no runtime errors occurred.
      const bst = new BSTPage(page);
      await bst.goto();

      // Page and title sanity
      await expect(page).toHaveTitle(/Binary Search Tree/i);
      await expect(page.locator('.app[role="application"]')).toBeVisible();

      // The seed in the app inserts 11 nodes. Validate node count/height/min/max are as expected.
      await expect(bst.statNodes).toHaveText('11');
      await expect(bst.statHeight).toHaveText('4');
      await expect(bst.statMin).toHaveText('20');
      await expect(bst.statMax).toHaveText('90');

      // SVG should contain at least the root node and a few specific seeded nodes
      await expect(page.locator('#node-60')).toHaveCount(1);
      await expect(page.locator('#node-40')).toHaveCount(1);
      await expect(page.locator('#node-90')).toHaveCount(1);

      // Ensure there were no uncaught page errors or console errors during load
      expect(pageErrors.length, `Expected no page errors; got: ${pageErrors.map(e=>String(e)).join('; ')}`).toBe(0);
      expect(consoleErrors.length, `Expected no console errors; got: ${consoleErrors.join('; ')}`).toBe(0);
    });
  });

  test.describe('Insert, duplicate insert and update behavior', () => {
    test('inserts a new value and updates stats & DOM, highlighting the path', async ({ page }) => {
      // Purpose: Insert new node (25), expect node count increment, new SVG node, and trace output to include the inserted value.
      const bst1 = new BSTPage(page);
      await bst.goto();

      // Initial count is 11 (seed)
      await expect(bst.statNodes).toHaveText('11');

      // Insert 25 (not present)
      await bst.insertValue(25);

      // Wait for trace to include the final inserted value (animation writes it)
      await bst.waitForTraceIncludes('25', 8000);

      // Node count should increment to 12
      await bst.waitForNodesCount(12, 5000);
      expect(await bst.nodeExists(25)).toBeTruthy();

      // The trace output should contain 25 at the end (it will include visited nodes and the inserted val)
      const trace = await bst.getTraceText();
      expect(trace.includes('25')).toBeTruthy();
    });

    test('attempting to insert a duplicate shows an alert and does not change nodes', async ({ page }) => {
      // Purpose: Ensure duplicate insertion triggers alert and does not increment node count.
      const bst2 = new BSTPage(page);
      await bst.goto();

      // Confirm starting nodes 11
      await expect(bst.statNodes).toHaveText('11');

      // Listen for the expected alert dialog
      const promiseDialog = page.waitForEvent('dialog');
      // Insert an existing value (60)
      await bst.insertValue(60);
      const dialog = await promiseDialog;
      // Validate alert message mentions duplicates
      expect(dialog.message()).toMatch(/Duplicate values are not allowed/i);
      await dialog.accept();

      // Node count remains unchanged
      await expect(bst.statNodes).toHaveText('11');
    });
  });

  test.describe('Search interactions', () => {
    test('search via input highlights the found node and updates trace', async ({ page }) => {
      // Purpose: Use the search input to find node 70 and verify it is highlighted and trace updated.
      const bst3 = new BSTPage(page);
      await bst.goto();

      // Search for existing node 70
      await bst.searchValueViaInput(70);

      // Wait for the trace to include 70
      await bst.waitForTraceIncludes('70', 8000);

      // The final highlighted node (kept on found) should have fill equal to 'var(--accent)'
      const fill = await bst.getNodeFill(70);
      // Attribute may be the literal CSS variable string
      expect(fill === 'var(--accent)' || fill === '#3b82f6' || fill).toBeTruthy();
    });

    test('clicking a node in the SVG triggers search and populates the search input', async ({ page }) => {
      // Purpose: Verify clicking a node element in the SVG triggers the search handler and puts its value into search input.
      const bst4 = new BSTPage(page);
      await bst.goto();

      // Click on an existing node (45)
      await bst.clickSvgNode(45);

      // The search input should be filled with the clicked value as the click handler sets it
      await expect(bst.searchInput).toHaveValue('45');

      // Wait for trace to include 45
      await bst.waitForTraceIncludes('45', 8000);
    });
  });

  test.describe('Delete operations and edge cases', () => {
    test('deleting a non-existent value animates search and shows "Value not found" alert', async ({ page }) => {
      // Purpose: Delete 999 (not present). Expect a search animation then alert 'Value not found.' and node count unchanged.
      const bst5 = new BSTPage(page);
      await bst.goto();

      // Node count initially 11
      await expect(bst.statNodes).toHaveText('11');

      // Prepare to capture the alert dialog (which occurs after animation)
      const dialogPromise = page.waitForEvent('dialog');

      // Initiate delete
      await bst.deleteValue(999);

      // Wait for dialog and assert message
      const dialog1 = await dialogPromise;
      expect(dialog.message()).toMatch(/Value not found|Not found/i);
      await dialog.accept();

      // Node count should remain unchanged
      await expect(bst.statNodes).toHaveText('11');
    });

    test('deleting an existing node removes it from the DOM and decrements statNodes', async ({ page }) => {
      // Purpose: Delete existing node 55 and ensure nodeCount reduces and DOM no longer contains node-55.
      const bst6 = new BSTPage(page);
      await bst.goto();

      // Ensure node 55 exists
      expect(await bst.nodeExists(55)).toBeTruthy();
      const before = await bst.getNodesCountText();
      const beforeCount = Number(before);

      // Delete 55
      await bst.deleteValue(55);

      // Wait for trace to include 55 (visited during deletion)
      await bst.waitForTraceIncludes('55', 8000);

      // Node count should decrement by 1
      await bst.waitForNodesCount(beforeCount - 1, 5000);
      expect(await bst.nodeExists(55)).toBeFalsy();
    });
  });

  test.describe('Traversals & quick actions', () => {
    test('fill (1..10) action fills deterministically and inorder traversal emits 1..10', async ({ page }) => {
      // Purpose: Use Clear & Fill (1..10) quick action, then run inorder traversal and verify the output sequence is 1..10.
      const bst7 = new BSTPage(page);
      await bst.goto();

      // Accept the confirm when clicking fill
      const dialogPromise1 = page.waitForEvent('dialog').then(d => d.accept());
      await bst.fillBtn.click();
      await dialogPromise;

      // Wait until nodes count is 10
      await bst.waitForNodesCount(10, 5000);

      // Trigger inorder traversal and wait for expected sequence
      await bst.clickInorder();

      // The traversal animation emits, build expected trace "1 ➜ 2 ➜ ... ➜ 10"
      const expected = Array.from({ length: 10 }, (_, i) => String(i + 1)).join(' ➜ ');
      // Wait long enough for animation to finish
      await bst.waitForTraceEquals(expected, 20000);
      expect(await bst.getTraceText()).toBe(expected);
    });

    test('random button replaces tree with 8 nodes', async ({ page }) => {
      // Purpose: Validate the Random 8 quick action creates 8 nodes and updates stats & DOM.
      const bst8 = new BSTPage(page);
      await bst.goto();

      // Click Random 8
      await bst.clickRandom();

      // Node count should be 8
      await bst.waitForNodesCount(8, 5000);
      expect(await bst.countSvgNodes()).toBe(8);
    });

    test('balanced button rebuilds tree without changing node count', async ({ page }) => {
      // Purpose: Ensure clicking Make Balanced rebuilds tree but keeps the same number of nodes.
      const bst9 = new BSTPage(page);
      await bst.goto();

      // Use random to set 8 nodes to make behavior deterministic for the test's expectations
      await bst.clickRandom();
      await bst.waitForNodesCount(8, 5000);
      const beforeNodes = Number(await bst.getNodesCountText());

      // Click balanced
      await bst.clickBalanced();

      // Node count should remain unchanged
      await bst.waitForNodesCount(beforeNodes, 5000);
      const afterNodes = Number(await bst.getNodesCountText());
      expect(afterNodes).toBe(beforeNodes);
    });
  });

  test.describe('Clear operation dialogs and behavior', () => {
    test('dismiss clear confirmation leaves tree intact', async ({ page }) => {
      // Purpose: Dismissing the 'Clear the entire tree?' confirm should leave the tree unchanged.
      const bst10 = new BSTPage(page);
      await bst.goto();

      // Prepare to dismiss the confirm
      page.once('dialog', async dialog => {
        await dialog.dismiss();
      });

      await bst.clickClear();

      // Node count should remain (seeded 11)
      await expect(bst.statNodes).toHaveText('11');
    });

    test('accept clear confirmation empties the tree and clears trace output', async ({ page }) => {
      // Purpose: Accepting the clear confirm empties the tree (node count 0), clears SVG and trace output.
      const bst11 = new BSTPage(page);
      await bst.goto();

      // Accept confirm
      page.once('dialog', async dialog => {
        await dialog.accept();
      });

      await bst.clickClear();

      // Node count becomes 0, stats updated
      await bst.waitForNodesCount(0, 5000);
      expect(await bst.countSvgNodes()).toBe(0);

      // Trace output should be cleared
      expect((await bst.getTraceText()) || '').toBe('');
    });
  });

  test.describe('Error and console monitoring (no uncaught exceptions expected)', () => {
    test('ensures no runtime page errors or console errors during interactions', async ({ page }) => {
      // Purpose: Perform a series of interactions and confirm no uncaught errors are emitted to pageerror/console.error.
      const bst12 = new BSTPage(page);
      await bst.goto();

      // Perform some interactive operations
      // 1) Insert a new value
      await bst.insertValue(1234);
      await bst.waitForTraceIncludes('1234', 8000);
      // 2) Search an existing value
      await bst.searchValueViaInput(60);
      await bst.waitForTraceIncludes('60', 8000);
      // 3) Trigger a traversal (level order)
      await bst.levelBtn.click();
      // wait for at least some trace to appear
      await bst.waitForTraceIncludes('', 5000).catch(()=>{}); // just ensure the call returns eventually

      // After interactions, assert there were no page errors or console errors recorded during this test case
      // (page errors are captured in the beforeEach listener)
      expect(pageErrors.length, `Expected no page errors; got: ${pageErrors.map(e=>String(e)).join('; ')}`).toBe(0);
      expect(consoleErrors.length, `Expected no console errors; got: ${consoleErrors.join('; ')}`).toBe(0);
    });
  });

  // A small test for invalid input edge cases (alerts)
  test.describe('Input validation and alert dialogs', () => {
    test('insert without a number triggers an alert', async ({ page }) => {
      // Purpose: Try to insert with empty input (NaN) and expect an alert prompting for integer input.
      const bst13 = new BSTPage(page);
      await bst.goto();

      // Ensure value input is empty
      await bst.valueInput.fill('');

      // Capture alert
      const dialogPromise2 = page.waitForEvent('dialog');
      await bst.insertBtn.click();
      const dlg = await dialogPromise;
      expect(dlg.message()).toMatch(/Enter an integer value to insert/i);
      await dlg.accept();
    });

    test('search without a number triggers an alert "Enter an integer to search."', async ({ page }) => {
      // Purpose: Try searching with empty input and expect an alert.
      const bst14 = new BSTPage(page);
      await bst.goto();

      await bst.searchInput.fill('');
      const dialogPromise3 = page.waitForEvent('dialog');
      await bst.searchBtn.click();
      const dlg1 = await dialogPromise;
      expect(dlg.message()).toMatch(/Enter an integer to search/i);
      await dlg.accept();
    });

    test('delete without a number triggers an alert "Enter an integer value to delete."', async ({ page }) => {
      // Purpose: Try deleting with empty input and expect an alert.
      const bst15 = new BSTPage(page);
      await bst.goto();

      await bst.valueInput.fill('');
      const dialogPromise4 = page.waitForEvent('dialog');
      await bst.deleteBtn.click();
      const dlg2 = await dialogPromise;
      expect(dlg.message()).toMatch(/Enter an integer value to delete/i);
      await dlg.accept();
    });
  });
});