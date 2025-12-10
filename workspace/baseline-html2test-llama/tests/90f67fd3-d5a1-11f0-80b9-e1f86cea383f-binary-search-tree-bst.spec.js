import { test, expect } from '@playwright/test';

// Test file: 90f67fd3-d5a1-11f0-80b9-e1f86cea383f-binary-search-tree-bst.spec.js
// Purpose: End-to-end tests for the Binary Search Tree interactive HTML application.
// The tests load the page as-is, observe console logs and page errors, exercise user interactions,
// and assert expected console output and DOM behavior. We do NOT modify the application code.
//
// Notes:
// - The application has known logical issues (it does not attach new nodes beyond the root,
//   and it logs HTML to the console instead of updating the .tree container).
// - These tests verify those behaviors by asserting on console output and DOM state.
// - We listen for page errors (uncaught exceptions) and assert expectations about them.

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f67fd3-d5a1-11f0-80b9-e1f86cea383f.html';

test.describe('Binary Search Tree (BST) page - integration tests', () => {
  // Shared state for capturing console messages and page errors per test
  let consoleMessages;
  let pageErrors;

  // Helper page object functions
  const bstPage = {
    // Fill the "Insert" input and click Insert
    async insertValue(page, value) {
      await page.fill('#node-value', String(value));
      await page.click('#insert-btn');
    },
    // Fill the "Search" input and click Search
    async searchValue(page, value) {
      await page.fill('#search-value', String(value));
      await page.click('#search-btn');
    },
    // Read the tree container innerHTML
    async getTreeHtml(page) {
      return await page.locator('.tree').innerHTML();
    }
  };

  // Setup before each test: navigate to the page and start listening to console and errors
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages for assertions
    page.on('console', (msg) => {
      // Record text for easier assertions
      try {
        consoleMessages.push(msg.text());
      } catch (e) {
        // best effort; do not interfere with page runtime
        consoleMessages.push(String(msg));
      }
    });

    // Capture uncaught page errors (e.g., ReferenceError, TypeError)
    page.on('pageerror', (err) => {
      pageErrors.push(err && err.message ? err.message : String(err));
    });

    // Go to the application page
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // Basic expectation: no uncaught runtime page errors occurred during interactions.
    // If there are uncaught errors, fail the test and surface the messages for debugging.
    expect(pageErrors, 'No uncaught page errors should occur').toEqual([]);
  });

  test('Initial page load shows inputs, buttons, and an empty tree container', async ({ page }) => {
    // Purpose: Verify initial DOM elements exist and default state is correct.

    // Assert page title and heading present
    await expect(page).toHaveTitle(/Binary Search Tree/i);
    await expect(page.locator('h1')).toHaveText(/Binary Search Tree/i);

    // Check presence of inputs and buttons
    await expect(page.locator('#node-value')).toBeVisible();
    await expect(page.locator('#insert-btn')).toBeVisible();
    await expect(page.locator('#search-value')).toBeVisible();
    await expect(page.locator('#search-btn')).toBeVisible();

    // The .tree container should exist and be empty (app logs HTML to console rather than inserting)
    const treeHtml = await bstPage.getTreeHtml(page);
    expect(treeHtml.trim(), 'Tree container should be empty on initial load').toBe('');
  });

  test('Inserting first node (root) logs HTML representation and does not update DOM tree', async ({ page }) => {
    // Purpose: Insert the first node and verify console output and DOM remain unchanged.

    // Insert root value 10
    await bstPage.insertValue(page, 10);

    // Wait briefly to allow console logs to be emitted
    await page.waitForTimeout(100);

    // Expect console to contain HTML string representation for the root node (displayTree returns HTML)
    const hasHtmlLog = consoleMessages.some(msg => msg.includes('<div') && msg.includes('10'));
    expect(hasHtmlLog, 'Console should log HTML containing the root value "10"').toBe(true);

    // The .tree container is NOT updated by the implementation: expect it still empty
    const treeHtml1 = await bstPage.getTreeHtml(page);
    expect(treeHtml.trim(), 'Tree container should remain empty after insert (application logs to console instead)').toBe('');
  });

  test('Inserting a second value does not attach a new node and logs "not found" message', async ({ page }) => {
    // Purpose: Demonstrate the known bug: only root is stored; subsequent inserts log "not found".

    // Insert root 20 first
    await bstPage.insertValue(page, 20);
    await page.waitForTimeout(50);

    // Clear previous consoleMessages snapshot for clearer assertions
    consoleMessages = [];

    // Attempt to insert 10 (should traverse and ultimately log "not found" instead of attaching)
    await bstPage.insertValue(page, 10);
    await page.waitForTimeout(100);

    // Assert that console logged a "not found" message for value 10
    const notFoundLogged = consoleMessages.some(msg => msg.includes('not found') && msg.includes('10'));
    expect(notFoundLogged, 'Inserting a non-root value should log a "not found" message due to buggy insertion logic').toBe(true);

    // Confirm tree DOM still empty
    const treeHtml2 = await bstPage.getTreeHtml(page);
    expect(treeHtml.trim(), 'Tree container should still be empty after failed attach').toBe('');
  });

  test('Searching for existing root value logs "found" and prints HTML; searching for missing value logs "not found"', async ({ page }) => {
    // Purpose: Verify search behavior for present and absent values and the console outputs.

    // Insert root value 7
    await bstPage.insertValue(page, 7);
    await page.waitForTimeout(50);

    // Clear messages to capture search output only
    consoleMessages = [];

    // Search for existing root value 7
    await bstPage.searchValue(page, 7);
    await page.waitForTimeout(100);

    // Expect a "found" message and an HTML representation printed to console
    const foundMessage = consoleMessages.some(msg => msg.includes('found') && msg.includes('7'));
    const htmlLogged = consoleMessages.some(msg => msg.includes('<div') && msg.includes('7'));
    expect(foundMessage, 'Searching for the root should log a "found" message').toBe(true);
    expect(htmlLogged, 'Searching for the root should cause the application to log the HTML representation').toBe(true);

    // Now search for a non-existing value 999
    consoleMessages = [];
    await bstPage.searchValue(page, 999);
    await page.waitForTimeout(100);

    // Expect a "not found" console message for 999
    const notFoundSearch = consoleMessages.some(msg => msg.includes('not found') && msg.includes('999'));
    expect(notFoundSearch, 'Searching for a non-existent value should log "not found"').toBe(true);
  });

  test('Inserting a duplicate value logs "already exists" and does not create duplicates', async ({ page }) => {
    // Purpose: Ensure that attempting to insert a duplicate logs the corresponding message.

    // Insert root value 42
    await bstPage.insertValue(page, 42);
    await page.waitForTimeout(50);

    // Clear console messages
    consoleMessages = [];

    // Attempt to insert duplicate 42
    await bstPage.insertValue(page, 42);
    await page.waitForTimeout(100);

    // Expect the "already exists" message
    const alreadyExists = consoleMessages.some(msg => msg.includes('already exists') && msg.includes('42'));
    expect(alreadyExists, 'Duplicate insert should log "already exists"').toBe(true);

    // Tree DOM should still be empty (application logs instead of rendering)
    const treeHtml3 = await bstPage.getTreeHtml(page);
    expect(treeHtml.trim(), 'Tree container should not contain duplicate nodes').toBe('');
  });

  test('Verify UI remains responsive and no uncaught exceptions were thrown during various interactions', async ({ page }) => {
    // Purpose: Perform a sequence of interactions and assert there were no uncaught runtime errors.

    // Perform multiple inserts and searches
    await bstPage.insertValue(page, 100);
    await page.waitForTimeout(30);
    await bstPage.insertValue(page, 50);
    await page.waitForTimeout(30);
    await bstPage.insertValue(page, 150);
    await page.waitForTimeout(30);

    await bstPage.searchValue(page, 100);
    await page.waitForTimeout(30);
    await bstPage.searchValue(page, 9999); // not present
    await page.waitForTimeout(30);

    // Ensure the page remained responsive by checking that input fields are still enabled/visible
    await expect(page.locator('#node-value')).toBeEnabled();
    await expect(page.locator('#search-value')).toBeEnabled();

    // Any uncaught page errors would have been collected; assert there were none
    // (This mirrors the requirement to observe page errors; we expect none for this application)
    // The afterEach hook will assert pageErrors is empty as well.
    expect(pageErrors.length, 'There should be no uncaught page errors after interactions').toBe(0);
  });
});