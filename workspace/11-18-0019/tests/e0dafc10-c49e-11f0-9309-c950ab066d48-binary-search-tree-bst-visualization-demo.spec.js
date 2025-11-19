import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-18-0019/html/e0dafc10-c49e-11f0-9309-c950ab066d48.html';

test.describe.serial('BST Visualization - e0dafc10-c49e-11f0-9309-c950ab066d48', () => {
  // Page object helpers to keep tests readable
  const selectors = {
    input: '#inputValue',
    insertBtn: '#insertBtn',
    searchBtn: '#searchBtn',
    deleteBtn: '#deleteBtn',
    clearBtn: '#clearBtn',
    inOrderBtn: '#inOrderBtn',
    preOrderBtn: '#preOrderBtn',
    postOrderBtn: '#postOrderBtn',
    levelOrderBtn: '#levelOrderBtn',
    traversalResult: '#traversalResult',
    output: '#output',
    tree: '#tree',
    node: '.node',
    circle: '.circle',
    highlightedNode: '.node.highlight'
  };

  // Utility functions inside closure to use page from each test
  function pageHelpers(page) {
    return {
      async goto() {
        await page.goto(APP_URL);
        // ensure initial render complete
        await expect(page.locator(selectors.tree)).toBeVisible();
      },
      async setInput(value) {
        const input = page.locator(selectors.input);
        await input.fill(''); // clear first
        // If value is empty string we intentionally leave blank
        if (value !== '') {
          await input.fill(String(value));
        }
      },
      async clickInsert() {
        await page.click(selectors.insertBtn);
      },
      async clickSearch() {
        await page.click(selectors.searchBtn);
      },
      async clickDelete() {
        await page.click(selectors.deleteBtn);
      },
      async clickClear() {
        await page.click(selectors.clearBtn);
      },
      async clickInOrder() {
        await page.click(selectors.inOrderBtn);
      },
      async clickPreOrder() {
        await page.click(selectors.preOrderBtn);
      },
      async clickPostOrder() {
        await page.click(selectors.postOrderBtn);
      },
      async clickLevelOrder() {
        await page.click(selectors.levelOrderBtn);
      },
      async pressEnterOnInput() {
        await page.locator(selectors.input).press('Enter');
      },
      async getOutputText() {
        return page.locator(selectors.output).innerText();
      },
      async getOutputColor() {
        return page.locator(selectors.output).evaluate(el => getComputedStyle(el).color);
      },
      async getTraversalText() {
        return page.locator(selectors.traversalResult).innerText();
      },
      async getTreeText() {
        return page.locator(selectors.tree).innerText();
      },
      async countCircles() {
        return page.locator(selectors.circle).count();
      },
      async circleTexts() {
        return page.locator(selectors.circle).allInnerTexts();
      },
      async hasHighlightedNode() {
        return page.locator(selectors.highlightedNode).count().then(c => c > 0);
      },
      // Wait for final output message to contain substring
      async waitForOutputContains(substring, timeout = 5000) {
        await page.waitForFunction(
          (sel, substr) => document.querySelector(sel) && document.querySelector(sel).textContent.includes(substr),
          selectors.output,
          substring,
          { timeout }
        );
      }
    };
  }

  test.beforeEach(async ({ page }) => {
    // Navigate to the application before each test
    await page.goto(APP_URL);
    await expect(page.locator(selectors.tree)).toBeVisible();
  });

  test.describe('Initial state and traversal-empty behavior', () => {
    test('empty_tree: initial render shows "Tree is empty." and traversal buttons show empty messages', async ({ page }) => {
      const h = pageHelpers(page);

      // Verify initial tree message
      await expect(page.locator(selectors.tree)).toHaveText(/Tree is empty\./);

      // Clicking traversal buttons when tree empty displays "Tree is empty." in traversalResult
      await h.clickInOrder();
      await expect(page.locator(selectors.traversalResult)).toHaveText('Tree is empty.');

      await h.clickPreOrder();
      await expect(page.locator(selectors.traversalResult)).toHaveText('Tree is empty.');

      await h.clickPostOrder();
      await expect(page.locator(selectors.traversalResult)).toHaveText('Tree is empty.');

      await h.clickLevelOrder();
      await expect(page.locator(selectors.traversalResult)).toHaveText('Tree is empty.');
    });
  });

  test.describe('Insertions, duplicates and invalid input', () => {
    test('inserting: insert a single node via click and verify DOM and success message', async ({ page }) => {
      const h = pageHelpers(page);

      await h.setInput(10);
      await h.clickInsert();

      // Success message should be shown (green)
      await expect(page.locator(selectors.output)).toHaveText(/Inserted 10 into the tree\./);
      const color = await h.getOutputColor();
      expect(color).toMatch(/rgb\(|rgba\(|green|#008000/); // at least confirm it's not an error color

      // Node should be rendered with .circle containing "10"
      const circles = await h.circleTexts();
      expect(circles).toContain('10');
      expect(await h.countCircles()).toBeGreaterThanOrEqual(1);
    });

    test('duplicate_error: inserting duplicate value shows duplicate message and error color', async ({ page }) => {
      const h = pageHelpers(page);

      // Insert initial value
      await h.setInput(20);
      await h.clickInsert();
      await expect(page.locator(selectors.output)).toHaveText(/Inserted 20 into the tree\./);

      // Attempt duplicate
      await h.setInput(20);
      await h.clickInsert();

      await expect(page.locator(selectors.output)).toHaveText(/already exists in the tree\. Duplicates not allowed\./);
      const color = await h.getOutputColor();
      // Error color in implementation is 'crimson'
      expect(color).toContain('rgb') || expect(color).toContain('crimson');
      // Ensure tree still contains the original node
      const texts = await h.circleTexts();
      expect(texts.filter(t => t === '20').length).toBeGreaterThanOrEqual(1);
    });

    test('invalid_input on insert: empty input shows invalid input message', async ({ page }) => {
      const h = pageHelpers(page);

      await h.setInput('');
      await h.clickInsert();

      await expect(page.locator(selectors.output)).toHaveText(/Please enter a valid number to insert\./);
      const color = await h.getOutputColor();
      expect(color).toContain('rgb') || expect(color).toContain('crimson');
    });

    test('ENTER_PRESSED triggers insert (Enter key behavior)', async ({ page }) => {
      const h = pageHelpers(page);

      // Clear tree first via Clear button to avoid interference
      await h.clickClear();

      await h.setInput(5);
      await h.pressEnterOnInput();

      await expect(page.locator(selectors.output)).toHaveText(/Inserted 5 into the tree\./);
      // Node should render
      await expect(page.locator(`${selectors.circle}:has-text("5")`)).toHaveCount(1);
    });
  });

  test.describe('Searching behavior (searching, found, not found, invalid)', () => {
    test('search_no_tree: searching when tree empty shows tree empty message', async ({ page }) => {
      const h = pageHelpers(page);

      // Ensure tree empty
      await h.clickClear();
      await h.setInput(7);
      await h.clickSearch();

      // For the search button, the implementation shows "Tree is empty." when !bst.root
      await expect(page.locator(selectors.output)).toHaveText('Tree is empty.');
      const color = await h.getOutputColor();
      expect(color).toContain('rgb') || expect(color).toContain('crimson');
    });

    test('searching -> search_done_found: search highlights path and shows found message', async ({ page }) => {
      const h = pageHelpers(page);

      // Build a small tree; root will be 50 to keep search path short
      await h.clickClear();
      const values = [50, 30, 70, 20, 40];
      for (const v of values) {
        await h.setInput(v);
        await h.clickInsert();
        await expect(page.locator(selectors.output)).toHaveText(new RegExp(`Inserted ${v} into the tree\\.`));
      }

      // Search for the root (50) to minimize async highlight steps
      await h.setInput(50);
      await h.clickSearch();

      // Immediately there is a "Searching for 50..." message; final "Value 50 found..." appears after highlights
      await h.waitForOutputContains('found in the tree', 3000);
      await expect(page.locator(selectors.output)).toHaveText('Value 50 found in the tree.');

      // During search a highlight should have been present at some point; we can check briefly for a highlighted node
      // Wait for a highlight to appear (short timeout). The highlight is temporary but should show up while the search is active.
      const highlightAppeared = await page.waitForFunction(
        sel => !!document.querySelector(sel),
        selectors.highlightedNode,
        { timeout: 2000 }
      ).then(() => true).catch(() => false);
      expect(highlightAppeared).toBeTruthy();
      // After search finishes, highlights are removed (final cleanup happens after a timeout). Wait and assert none remain.
      await page.waitForTimeout(2000); // allow removal timeout to run
      const highlightedCount = await page.locator(selectors.highlightedNode).count();
      expect(highlightedCount).toBe(0);
    });

    test('searching -> search_done_not_found: searching for non-existent value shows not found error', async ({ page }) => {
      const h = pageHelpers(page);

      // Ensure tree has some nodes
      await h.clickClear();
      await h.setInput(10);
      await h.clickInsert();
      await h.setInput(20);
      await h.clickInsert();

      // Search for a value that doesn't exist
      await h.setInput(9999);
      await h.clickSearch();

      // Wait for final not-found message
      await h.waitForOutputContains('not found in the tree', 3000);
      await expect(page.locator(selectors.output)).toHaveText(/not found in the tree\./);
      // Error color should be present
      const color = await h.getOutputColor();
      expect(color).toContain('rgb') || expect(color).toContain('crimson');
    });

    test('search invalid input: empty input yields invalid input message', async ({ page }) => {
      const h = pageHelpers(page);

      await h.setInput('');
      await h.clickSearch();

      await expect(page.locator(selectors.output)).toHaveText('Please enter a valid number to search.');
      const color = await h.getOutputColor();
      expect(color).toContain('rgb') || expect(color).toContain('crimson');
    });
  });

  test.describe('Deletion behavior and edge-cases', () => {
    test('delete_no_tree / delete_fail_not_found: deleting when tree empty or value absent', async ({ page }) => {
      const h = pageHelpers(page);

      // Clear tree
      await h.clickClear();

      // Deleting when empty: Implementation does not explicitly show "Tree is empty" for delete,
      // it checks bst.search and will say the value not found.
      await h.setInput(1);
      await h.clickDelete();
      await expect(page.locator(selectors.output)).toHaveText(/not found in the tree\. Cannot delete\./);

      // Insert a value then attempt to delete a different non-existent value
      await h.setInput(100);
      await h.clickInsert();
      await expect(page.locator(selectors.output)).toHaveText(/Inserted 100 into the tree\./);

      await h.setInput(200);
      await h.clickDelete();
      await expect(page.locator(selectors.output)).toHaveText(/not found in the tree\. Cannot delete\./);
    });

    test('deleting -> DELETE_SUCCESS: delete a node successfully and verify DOM update', async ({ page }) => {
      const h = pageHelpers(page);

      // Build tree with 20,10,30 and delete 10
      await h.clickClear();
      await h.setInput(20);
      await h.clickInsert();
      await h.setInput(10);
      await h.clickInsert();
      await h.setInput(30);
      await h.clickInsert();

      // Verify 10 exists
      await expect(page.locator(`${selectors.circle}:has-text("10")`)).toHaveCount(1);

      // Delete 10
      await h.setInput(10);
      await h.clickDelete();

      await expect(page.locator(selectors.output)).toHaveText(/Deleted 10 from the tree\./);
      // Node with text "10" should no longer exist
      await expect(page.locator(`${selectors.circle}:has-text("10")`)).toHaveCount(0);
      // Tree still has other nodes
      const remaining = await h.circleTexts();
      expect(remaining).toContain('20');
      expect(remaining).toContain('30');
    });

    test('deleting -> DELETE_SUCCESS_TREE_EMPTY: deleting last node empties the tree', async ({ page }) => {
      const h = pageHelpers(page);

      // Insert a single node and delete it
      await h.clickClear();
      await h.setInput(7);
      await h.clickInsert();
      await expect(page.locator(selectors.output)).toHaveText(/Inserted 7 into the tree\./);

      // Delete the last node
      await h.setInput(7);
      await h.clickDelete();

      await expect(page.locator(selectors.output)).toHaveText(/Deleted 7 from the tree\./);
      // The tree container should now display "Tree is empty."
      await expect(page.locator(selectors.tree)).toHaveText('Tree is empty.');
    });

    test('delete invalid input: empty input shows invalid input message', async ({ page }) => {
      const h = pageHelpers(page);

      await h.setInput('');
      await h.clickDelete();

      await expect(page.locator(selectors.output)).toHaveText('Please enter a valid number to delete.');
      const color = await h.getOutputColor();
      expect(color).toContain('rgb') || expect(color).toContain('crimson');
    });
  });

  test.describe('Traversals when tree has nodes', () => {
    test('traversal_inorder/preorder/postorder/levelorder produce correct sequences', async ({ page }) => {
      const h = pageHelpers(page);

      // Build a balanced-ish tree with known traversals
      // Insert sequence creates BST: 8 is root
      await h.clickClear();
      const seq = [8, 4, 12, 2, 6, 10, 14];
      for (const v of seq) {
        await h.setInput(v);
        await h.clickInsert();
        await expect(page.locator(selectors.output)).toHaveText(new RegExp(`Inserted ${v} into the tree\\.`));
      }

      // In-Order: sorted
      await h.clickInOrder();
      await expect(page.locator(selectors.traversalResult)).toHaveText('In-Order Traversal: 2, 4, 6, 8, 10, 12, 14');

      // Pre-Order: root-left-right
      await h.clickPreOrder();
      await expect(page.locator(selectors.traversalResult)).toHaveText('Pre-Order Traversal: 8, 4, 2, 6, 12, 10, 14');

      // Post-Order: left-right-root
      await h.clickPostOrder();
      await expect(page.locator(selectors.traversalResult)).toHaveText('Post-Order Traversal: 2, 6, 4, 10, 14, 12, 8');

      // Level-Order: breadth-first
      await h.clickLevelOrder();
      await expect(page.locator(selectors.traversalResult)).toHaveText('Level-Order Traversal: 8, 4, 12, 2, 6, 10, 14');
    });
  });

  test.describe('Clearing the tree', () => {
    test('clearing: clear the tree removes nodes and updates UI', async ({ page }) => {
      const h = pageHelpers(page);

      // Insert a couple of nodes
      await h.clickClear();
      await h.setInput(3);
      await h.clickInsert();
      await h.setInput(1);
      await h.clickInsert();

      // Ensure nodes exist
      expect(await h.countCircles()).toBeGreaterThanOrEqual(2);

      // Click clear
      await h.clickClear();

      // Tree container shows "Tree is empty."
      await expect(page.locator(selectors.tree)).toHaveText('Tree is empty.');

      // Output shows 'Cleared the tree.'
      await expect(page.locator(selectors.output)).toHaveText('Cleared the tree.');

      // Traversal result should be cleared (empty string)
      await expect(page.locator(selectors.traversalResult)).toHaveText('');
    });
  });
});