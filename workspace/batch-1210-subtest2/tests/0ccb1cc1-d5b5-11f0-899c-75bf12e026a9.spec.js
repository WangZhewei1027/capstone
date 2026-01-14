import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/0ccb1cc1-d5b5-11f0-899c-75bf12e026a9.html';

test.describe('Binary Tree Visualization and Demo - FSM validation', () => {
  // Collect console errors and page errors for each test run
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture any console error messages emitted by the page
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture uncaught exceptions from the page
    page.on('pageerror', (err) => {
      // push the message (string) for easier assertions
      pageErrors.push(String(err.message || err));
    });

    // Navigate to the page under test
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  // Utility: get text content of #output
  async function outputText(page) {
    return await page.locator('#output').textContent();
  }

  // Utility: helper to insert a value and accept any dialogs if they appear
  async function insertValue(page, value) {
    // Listen for potential dialog; return its message if any
    let dialogMessage = null;
    const dialogPromise = page.waitForEvent('dialog').then(async (dialog) => {
      dialogMessage = dialog.message();
      // Alert dialogs should be accepted to proceed
      await dialog.accept();
      return dialogMessage;
    }).catch(() => null);

    await page.fill('#nodeValue', String(value));
    await page.click('#insertBtn');

    // small delay to allow dialog to fire if it will
    try {
      await dialogPromise;
    } catch {
      // ignore
    }
    return dialogMessage;
  }

  // Test initial Idle state (S0_Idle)
  test('Initial state (Idle) should render and have empty tree', async ({ page }) => {
    // Validate initial output text as documented in HTML
    const out = await outputText(page);
    expect(out.trim()).toBe('(Press traversal buttons to see output here)');

    // The global `tree` object should exist and be empty (root === null)
    const rootIsNull = await page.evaluate(() => {
      return typeof window.tree === 'object' && window.tree.root === null;
    });
    expect(rootIsNull).toBeTruthy();

    // The initial drawTree(tree) should have executed (no thrown exceptions)
    // Assert that there were no page errors or console errors during load
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  // Test inserting a single node transitions to Node Inserted (S2_Node_Inserted)
  test('InsertNode event inserts a node and updates output and tree (single insert)', async ({ page }) => {
    // Insert a valid number
    const dialogMsg = await insertValue(page, 10);
    // No dialog expected for valid insert
    expect(dialogMsg).toBeNull();

    // Output must reflect insertion
    const out = await outputText(page);
    expect(out.trim()).toBe('Inserted value: 10');

    // Verify tree internal structure: root value should be 10
    const rootValue = await page.evaluate(() => window.tree && window.tree.root && window.tree.root.value);
    expect(rootValue).toBe(10);

    // Validate that positional properties used by drawing are present (x,y)
    const hasPositions = await page.evaluate(() => {
      const r = window.tree.root;
      return r && typeof r.x === 'number' && typeof r.y === 'number';
    });
    expect(hasPositions).toBeTruthy();

    // No runtime errors should have occurred
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  // Test multiple inserts and verify traversals (S2 -> S3/S4/S5/S6 transitions)
  test('Multiple inserts produce correct traversals: inorder, preorder, postorder, levelorder', async ({ page }) => {
    // Insert sequence: 10, 5, 15
    await insertValue(page, 10);
    await insertValue(page, 5);
    await insertValue(page, 15);

    // After last insert the output should show the last inserted value
    const afterInserts = await outputText(page);
    expect(afterInserts.trim()).toBe('Inserted value: 15');

    // Click In-order Traversal (should be 5, 10, 15)
    await page.click('#inorderBtn');
    const inorderOut = await outputText(page);
    expect(inorderOut.trim()).toBe('In-order: 5, 10, 15');

    // Click Pre-order Traversal (should be 10, 5, 15)
    await page.click('#preorderBtn');
    const preorderOut = await outputText(page);
    expect(preorderOut.trim()).toBe('Pre-order: 10, 5, 15');

    // Click Post-order Traversal (should be 5, 15, 10)
    await page.click('#postorderBtn');
    const postorderOut = await outputText(page);
    expect(postorderOut.trim()).toBe('Post-order: 5, 15, 10');

    // Click Level-order Traversal (should be 10, 5, 15)
    await page.click('#levelorderBtn');
    const levelorderOut = await outputText(page);
    expect(levelorderOut.trim()).toBe('Level-order: 10, 5, 15');

    // Verify tree inorder via internal API matches expected
    const internalInorder = await page.evaluate(() => window.tree.inorder());
    expect(internalInorder).toEqual([5, 10, 15]);

    // Ensure no uncaught errors during these interactions
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  // Test clear tree transition (S2 or S0 -> S1_Tree_Cleared) and subsequent traversals on empty
  test('ClearTree event clears the tree and traversals on empty show (empty)', async ({ page }) => {
    // Insert some nodes first
    await insertValue(page, 30);
    await insertValue(page, 20);

    // Clear the tree
    await page.click('#clearBtn');

    // Output should reflect tree cleared
    const clearedOut = await outputText(page);
    expect(clearedOut.trim()).toBe('Tree cleared.');

    // Internally the tree root must be null
    const rootNull = await page.evaluate(() => window.tree.root === null);
    expect(rootNull).toBeTruthy();

    // Traversals on empty tree should indicate (empty)
    await page.click('#inorderBtn');
    expect((await outputText(page)).trim()).toBe('In-order: (empty)');

    await page.click('#preorderBtn');
    expect((await outputText(page)).trim()).toBe('Pre-order: (empty)');

    await page.click('#postorderBtn');
    expect((await outputText(page)).trim()).toBe('Post-order: (empty)');

    await page.click('#levelorderBtn');
    expect((await outputText(page)).trim()).toBe('Level-order: (empty)');

    // No runtime errors expected
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  // Edge case: invalid input triggers alert - "Please enter a valid number."
  test('Invalid input (non-number / empty) shows alert and does not modify tree', async ({ page }) => {
    // Ensure tree is cleared to start from known state
    await page.click('#clearBtn');
    expect((await outputText(page)).trim()).toBe('Tree cleared.');

    // Attempt to insert with empty input - expect an alert
    const dialogPromise = page.waitForEvent('dialog');
    await page.click('#insertBtn');

    const dialog = await dialogPromise;
    expect(dialog).toBeTruthy();
    expect(dialog.message()).toBe('Please enter a valid number.');
    await dialog.accept();

    // Tree should remain empty
    const isEmpty = await page.evaluate(() => window.tree.root === null);
    expect(isEmpty).toBeTruthy();

    // Now attempt to insert a non-numeric string via direct fill - input is type=number so filling with text still yields empty value
    await page.fill('#nodeValue', 'not-a-number');
    const dialogPromise2 = page.waitForEvent('dialog');
    await page.click('#insertBtn');
    const dialog2 = await dialogPromise2;
    expect(dialog2.message()).toBe('Please enter a valid number.');
    await dialog2.accept();

    // Still empty
    expect(await page.evaluate(() => window.tree.root === null)).toBeTruthy();

    // No other runtime errors
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  // Edge case: duplicate insertion triggers alert "Duplicate values are not allowed."
  test('Duplicate inserts are prevented and produce alert', async ({ page }) => {
    // Clear and insert a unique value
    await page.click('#clearBtn');
    await insertValue(page, 42);
    expect((await outputText(page)).trim()).toBe('Inserted value: 42');

    // Insert duplicate and expect alert
    const dialogPromise = page.waitForEvent('dialog');
    await page.fill('#nodeValue', '42');
    await page.click('#insertBtn');

    const dialog = await dialogPromise;
    expect(dialog).toBeTruthy();
    expect(dialog.message()).toBe('Duplicate values are not allowed.');
    await dialog.accept();

    // Tree inorder should still contain only one element [42]
    const inorder = await page.evaluate(() => window.tree.inorder());
    expect(inorder).toEqual([42]);

    // No uncaught runtime errors
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  // Verify drawTree entry-actions were executed on different states by checking node position assignment
  test('drawTree is invoked after insert and after clear without throwing (positions assigned or root null)', async ({ page }) => {
    // Clear first
    await page.click('#clearBtn');
    expect((await outputText(page)).trim()).toBe('Tree cleared.');

    // Insert node should cause positions to be assigned (x,y)
    await insertValue(page, 7);

    const positionsAssigned = await page.evaluate(() => {
      const r = window.tree.root;
      return r && typeof r.x === 'number' && typeof r.y === 'number';
    });
    expect(positionsAssigned).toBeTruthy();

    // Clear again and ensure no exception: root null and drawTree returned gracefully
    await page.click('#clearBtn');
    expect((await outputText(page)).trim()).toBe('Tree cleared.');
    const isNowNull = await page.evaluate(() => window.tree.root === null);
    expect(isNowNull).toBeTruthy();

    // No runtime errors raised during draw operations
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  // Final sanity: after a sequence of interactions ensure no unexpected runtime errors accumulated
  test('Overall runtime error check after multiple operations', async ({ page }) => {
    // Perform a mix of actions
    await page.click('#clearBtn');
    await insertValue(page, 100);
    await insertValue(page, 50);
    await insertValue(page, 150);
    await page.click('#inorderBtn');
    await page.click('#preorderBtn');
    await page.click('#postorderBtn');
    await page.click('#levelorderBtn');
    await page.click('#clearBtn');

    // Ensure output corresponds to last action (Tree cleared.)
    expect((await outputText(page)).trim()).toBe('Tree cleared.');

    // Assert that there were no console errors or page errors through the interactions
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});