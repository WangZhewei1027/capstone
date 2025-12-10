import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d809fbd0-d1c9-11f0-9efc-d1db1618a544.html';

// Page Object for the BST demo
class BSTPage {
  constructor(page) {
    this.page = page;
    this.locators = {
      valueInput: page.locator('#valueInput'),
      insertBtn: page.locator('#insertBtn'),
      deleteBtn: page.locator('#deleteBtn'),
      searchBtn: page.locator('#searchBtn'),
      clearBtn: page.locator('#clearBtn'),
      randomBtn: page.locator('#randomBtn'),
      inorderBtn: page.locator('#inorderBtn'),
      preorderBtn: page.locator('#preorderBtn'),
      postorderBtn: page.locator('#postorderBtn'),
      levelBtn: page.locator('#levelBtn'),
      playBtn: page.locator('#playBtn'),
      stepBtn: page.locator('#stepBtn'),
      speed: page.locator('#speed'),
      nodeCount: page.locator('#nodeCount'),
      height: page.locator('#height'),
      rootVal: page.locator('#rootVal'),
      status: page.locator('#status'),
      svg: page.locator('svg#canvas'),
      svgGroups: page.locator('svg#canvas g[data-id]'),
      svgTexts: page.locator('svg#canvas text'),
    };
  }

  async goto() {
    await this.page.goto(BASE_URL);
    // wait for initial render showing sample tree loaded in status
    await expect(this.locators.status).toHaveText(/Sample tree loaded\./, { timeout: 3000 });
  }

  // Insert a numeric value via UI
  async insertValue(val) {
    await this.locators.valueInput.fill(String(val));
    await Promise.all([
      this.page.waitForTimeout(50), // slight delay for input to register
      this.locators.insertBtn.click()
    ]);
  }

  // Delete a numeric value via UI
  async deleteValue(val) {
    await this.locators.valueInput.fill(String(val));
    await Promise.all([
      this.page.waitForTimeout(50),
      this.locators.deleteBtn.click()
    ]);
  }

  // Search a value via UI
  async searchValue(val) {
    await this.locators.valueInput.fill(String(val));
    await Promise.all([
      this.page.waitForTimeout(50),
      this.locators.searchBtn.click()
    ]);
  }

  // Click a node by the label text inside the SVG: clicks the <text> element inside the group
  async clickNodeByValue(val) {
    const textLocator = this.page.locator('svg#canvas text', { hasText: String(val) });
    await expect(textLocator).toHaveCount(1);
    await textLocator.click();
  }

  // Run a traversal by clicking the appropriate button name: 'inorder'|'preorder'|'postorder'|'level'
  async runTraversal(kind) {
    if (kind === 'inorder') await this.locators.inorderBtn.click();
    else if (kind === 'preorder') await this.locators.preorderBtn.click();
    else if (kind === 'postorder') await this.locators.postorderBtn.click();
    else if (kind === 'level') await this.locators.levelBtn.click();
    else throw new Error('Unknown traversal kind: ' + kind);
  }

  async setSpeed(value) {
    // set input range value
    await this.locators.speed.evaluate((el, v) => { el.value = v; }, String(value));
  }

  async playTraversal() {
    await this.locators.playBtn.click();
  }

  async stepTraversal() {
    await this.locators.stepBtn.click();
  }

  async clearTree() {
    await this.locators.clearBtn.click();
  }

  async clickRandomAndAccept(countStr = '5') {
    // Handle the prompt and accept with countStr
    this.page.once('dialog', async (dialog) => {
      await dialog.accept(countStr);
    });
    await this.locators.randomBtn.click();
  }

  async getNodeCountText() {
    return (await this.locators.nodeCount.textContent()).trim();
  }

  async getHeightText() {
    return (await this.locators.height.textContent()).trim();
  }

  async getRootValText() {
    return (await this.locators.rootVal.textContent()).trim();
  }

  async getStatusText() {
    return (await this.locators.status.textContent()).trim();
  }

  async countSvgNodes() {
    return await this.locators.svgGroups.count();
  }

  async hasSvgText(val) {
    const texts = this.page.locator('svg#canvas text', { hasText: String(val) });
    return (await texts.count()) > 0;
  }
}

test.describe('Binary Tree Visualizer (BST) - E2E', () => {
  // arrays to collect console and page errors for assertions
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];
    // capture console error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    // capture page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });
  });

  test.afterEach(async () => {
    // no-op here; individual tests will assert collected errors as appropriate
  });

  test('Initial load: sample tree rendered and stats populated', async ({ page }) => {
    // Purpose: Verify the page loads, sample tree is initialized, and stats reflect the initial tree
    const bst = new BSTPage(page);
    await bst.goto();

    // Assert basic stats for the sample tree [50,30,70,20,40,60,80]
    await expect(bst.locators.nodeCount).toHaveText('7');
    await expect(bst.locators.height).toHaveText('3');
    await expect(bst.locators.rootVal).toHaveText('50');
    // status should indicate sample tree loaded
    await expect(bst.locators.status).toHaveText(/Sample tree loaded\./);

    // There should be 7 SVG node groups drawn
    const svgCount = await bst.countSvgNodes();
    expect(svgCount).toBe(7);

    // Verify that expected node labels are present in the SVG
    for (const v of [50,30,70,20,40,60,80]) {
      expect(await bst.hasSvgText(v)).toBeTruthy();
    }

    // Ensure no console errors or uncaught page errors occurred during load
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Clicking a node shows node info in status and does not throw errors', async ({ page }) => {
    // Purpose: Validate clicking a node inspects it and updates the status text
    const bst = new BSTPage(page);
    await bst.goto();

    // Click node with value 30
    await bst.clickNodeByValue(30);

    // Status should contain 'Node 30' and show its children (left: 20, right: 40)
    await expect(bst.locators.status).toHaveText(/Node 30/);
    await expect(bst.locators.status).toHaveText(/left: 20/);
    await expect(bst.locators.status).toHaveText(/right: 40/);

    // No console errors or page errors as a result of the interaction
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Insert a new value, verify node count, new node rendered, and input cleared', async ({ page }) => {
    // Purpose: Ensure inserting a value updates the tree and UI accordingly
    const bst = new BSTPage(page);
    await bst.goto();

    // Insert 55 which should go under 50 -> right->left (between 50 and 60)
    await bst.insertValue(55);

    // Wait for render: node count increments to 8
    await expect(bst.locators.nodeCount).toHaveText('8');

    // New node with label 55 should exist in SVG
    expect(await bst.hasSvgText(55)).toBeTruthy();

    // Input should be cleared after insertion
    await expect(bst.locators.valueInput).toHaveValue('');

    // No console or page errors were produced
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Delete an existing value and verify removal from DOM and stats', async ({ page }) => {
    // Purpose: Delete the previously inserted node and ensure tree updates
    const bst = new BSTPage(page);
    await bst.goto();

    // Insert a value and then delete it to keep test self-contained
    await bst.insertValue(99);
    await expect(bst.locators.nodeCount).toHaveText('8');
    expect(await bst.hasSvgText(99)).toBeTruthy();

    // Now delete 99
    await bst.deleteValue(99);

    // Node count should go back to 7 and 99 should not be present
    await expect(bst.locators.nodeCount).toHaveText('7');
    expect(await bst.hasSvgText(99)).toBeFalsy();

    // No console or page errors produced
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Search for a value: path highlighting and final "Found" status', async ({ page }) => {
    // Purpose: Use the search feature and wait for the search to complete and report found status
    const bst = new BSTPage(page);
    await bst.goto();

    // Search for 40 (known to be in sample tree)
    await bst.searchValue(40);

    // The search highlights nodes stepwise using timeouts; wait for the final "Found 40." status
    await page.waitForFunction(() => {
      const el = document.getElementById('status');
      return el && /Found\s*40\./.test(el.textContent);
    }, null, { timeout: 3000 });

    // Confirm status contains Found 40
    await expect(bst.locators.status).toHaveText(/Found\s*40\./);

    // No console or page errors produced by search
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Traversals: Inorder shows expected sequence and Play/Step functionality', async ({ page }) => {
    // Purpose: Verify traversals populate the status with sequences and playback controls work
    const bst = new BSTPage(page);
    await bst.goto();

    // Run inorder traversal and verify the reported sequence
    await bst.runTraversal('inorder');
    await expect(bst.locators.status).toHaveText(/inorder\s*→\s*20,\s*30,\s*40,\s*50,\s*60,\s*70,\s*80/);

    // Prepare playback by setting speed low to accelerate the test
    await bst.setSpeed(100);

    // Start playing the traversal
    await bst.playTraversal();

    // While playing, status should briefly be 'Playing traversal...' (or change). Wait for completion.
    await page.waitForFunction(() => {
      const s = document.getElementById('status');
      return s && /Traversal complete\./.test(s.textContent);
    }, null, { timeout: 10000 });

    // After playback, ensure status says traversal complete
    await expect(bst.locators.status).toHaveText(/Traversal complete\./);

    // Now test Step: re-run traversal to populate currentSequence then step once
    await bst.runTraversal('inorder');
    // Click Step once and verify status shows Step: <value>
    await bst.stepTraversal();
    await expect(bst.locators.status).toHaveText(/Step:\s*\d+/);

    // No console or page errors produced
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Random tree generation via prompt and Clear button', async ({ page }) => {
    // Purpose: Test random tree creation via prompt, confirm node count updates, then clear the tree
    const bst = new BSTPage(page);
    await bst.goto();

    // Click random and accept the prompt with '5' nodes
    await bst.clickRandomAndAccept('5');

    // Wait for status to indicate random tree created
    await expect(bst.locators.status).toHaveText(/Random tree with 5 nodes created\./, { timeout: 3000 });

    // Node count should reflect 5
    await expect(bst.locators.nodeCount).toHaveText('5');

    // Now clear the tree
    await bst.clearTree();

    // After clearing, nodeCount and height should be 0, root should be '—', status 'Idle'
    await expect(bst.locators.nodeCount).toHaveText('0');
    await expect(bst.locators.height).toHaveText('0');
    await expect(bst.locators.rootVal).toHaveText('—');
    await expect(bst.locators.status).toHaveText('Idle');

    // The SVG should have no node groups
    const svgCount = await bst.countSvgNodes();
    expect(svgCount).toBe(0);

    // No console or page errors produced
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('No uncaught runtime errors or console errors occurred during entire interaction suite', async ({ page }) => {
    // Purpose: Final safeguard to ensure no console 'error' messages or uncaught page errors accumulated
    // (This test navigates and performs a small benign interaction to observe any errors as a final check)
    const bst = new BSTPage(page);
    await bst.goto();

    // Do a quick click on SVG background to clear selection (should be handled)
    await bst.locators.svg.click();

    // Assert there were no console.error or window errors captured during this test run
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});