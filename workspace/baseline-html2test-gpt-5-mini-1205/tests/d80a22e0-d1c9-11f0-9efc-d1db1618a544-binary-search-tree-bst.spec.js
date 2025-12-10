import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80a22e0-d1c9-11f0-9efc-d1db1618a544.html';

test.describe('BST Visualizer - Binary Search Tree (BST)', () => {
  // Arrays to collect console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  // Helper: set animation speed via the range input and ensure UI reflects it
  const setAnimSpeed = async (page, ms) => {
    await page.evaluate((ms) => {
      const el = document.getElementById('speedRange');
      el.value = String(ms);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, ms);
    await expect(page.locator('#speedVal')).toHaveText(String(ms) + ' ms');
  };

  // Helper: convenience getters for frequently used locators
  const els = (page) => ({
    svg: page.locator('svg#svgCanvas'),
    nodes: page.locator('svg#svgCanvas g.node'),
    valueInput: page.locator('#valueInput'),
    insertBtn: page.locator('#insertBtn'),
    searchBtn: page.locator('#searchBtn'),
    deleteBtn: page.locator('#deleteBtn'),
    clearBtn: page.locator('#clearBtn'),
    inorderBtn: page.locator('#inorderBtn'),
    preorderBtn: page.locator('#preorderBtn'),
    postorderBtn: page.locator('#postorderBtn'),
    levelBtn: page.locator('#levelBtn'),
    travOutput: page.locator('#travOutput'),
    message: page.locator('#message'),
    nodeCount: page.locator('#nodeCount'),
    nodeHeight: page.locator('#nodeHeight'),
    randomBtn: page.locator('#randomBtn'),
    balanceBtn: page.locator('#balanceBtn'),
    infoBtn: page.locator('#infoBtn'),
    speedRange: page.locator('#speedRange'),
    speedVal: page.locator('#speedVal'),
  });

  test.beforeEach(async ({ page }) => {
    // initialize collectors for console and page errors
    consoleMessages = [];
    pageErrors = [];

    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the application
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });

    // Reduce animation speed to minimum for faster tests and confirm UI update
    await setAnimSpeed(page, 50);
  });

  test.afterEach(async ({ page }) => {
    // After each test, assert that no uncaught page errors happened
    expect(pageErrors.length, 'No uncaught page errors should occur').toBe(0);

    // Also assert that no console messages were emitted with type 'error'
    const errorConsole = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsole.length, 'No console.error messages should be present').toBe(0);
  });

  test('loads page and shows initial sample BST with stats and nodes', async ({ page }) => {
    // Purpose: verify initial render contains the seeded sample BST and stats are correct
    const $ = els(page);

    // The script seeds the sample and updates the message element
    await expect($.message).toHaveText(/Sample BST loaded/);

    // Node count should reflect the seeded sample [50,30,70,20,40,60,80] -> 7 nodes
    await expect($.nodeCount).toHaveText('7');

    // Height for the balanced-ish sample should be 3 (levels)
    await expect($.nodeHeight).toHaveText('3');

    // Ensure SVG has 7 node groups
    await expect($.nodes).toHaveCount(7);

    // Ensure a textual placeholder is not present when nodes exist
    const placeholder = page.locator('svg#svgCanvas text');
    await expect(placeholder).not.toHaveText(/Empty BST/);
  });

  test('speed control updates display and affects animation speed variable', async ({ page }) => {
    // Purpose: ensure the speed range input updates the display and the app reads it
    const $ = els(page);

    // Set speed to 120 ms and verify the UI reflects the change
    await setAnimSpeed(page, 120);
    await expect($.speedVal).toHaveText('120 ms');

    // Set back to a small value for subsequent animations
    await setAnimSpeed(page, 50);
    await expect($.speedVal).toHaveText('50 ms');
  });

  test('inserting with empty input shows validation message', async ({ page }) => {
    // Purpose: verify edge-case when user clicks Insert with no numeric input
    const $ = els(page);

    // Ensure input is empty
    await $.valueInput.fill('');
    await $.insertBtn.click();

    // Should show a prompt to enter numeric value
    await expect($.message).toHaveText('Enter a numeric value to insert.');
  });

  test('insert a new numeric value updates tree and node count', async ({ page }) => {
    // Purpose: insert a new value (deterministic), verify nodeCount increments and insertion message appears
    const $ = els(page);

    // Insert a value known not to be in initial sample: 55 (sample has 50,30,70,20,40,60,80)
    await $.valueInput.fill('55');
    await $.insertBtn.click();

    // The UI animates; wait until message indicates insertion completed for 55
    await expect($.message).toHaveText(/Inserted 55/);

    // Node count should increase to 8
    await expect($.nodeCount).toHaveText('8');

    // Ensure there is a node element with data-val="55"
    const newNode = page.locator('svg#svgCanvas g.node[data-val="55"]');
    await expect(newNode).toHaveCount(1);
  });

  test('search finds existing value and reports not found for absent value', async ({ page }) => {
    // Purpose: verify search animation finds an existing node and reports missing nodes correctly
    const $ = els(page);

    // Search for an existing value 60
    await $.valueInput.fill('60');
    await $.searchBtn.click();

    // Should eventually show Found 60
    await expect($.message).toHaveText(/Found 60/);

    // Now search for a non-existing large value e.g., 999
    await $.valueInput.fill('999');
    await $.searchBtn.click();

    // Should report not found
    await expect($.message).toHaveText(/999 not found in the tree/);
  });

  test('delete a leaf node reduces node count and updates message', async ({ page }) => {
    // Purpose: test deletion of a known leaf node (20 is a leaf in the sample)
    const $ = els(page);

    // Confirm node 20 is present initially
    await expect(page.locator('svg#svgCanvas g.node[data-val="20"]')).toHaveCount(1);
    await expect($.nodeCount).toHaveText('7');

    // Delete 20
    await $.valueInput.fill('20');
    await $.deleteBtn.click();

    // Wait for confirmation message 'Deleted 20.' (note the script sets 'Deleted ' + val + '.')
    await expect($.message).toHaveText(/Deleted 20\./);

    // Node count should decrease to 6
    await expect($.nodeCount).toHaveText('6');

    // Node 20 should no longer exist in the SVG
    await expect(page.locator('svg#svgCanvas g.node[data-val="20"]')).toHaveCount(0);
  });

  test('inorder traversal produces sorted sequence in travOutput', async ({ page }) => {
    // Purpose: verify that in-order traversal outputs sorted node sequence visually in travOutput
    const $ = els(page);

    // Click In-order traversal and wait for traversal to complete (message updated at end)
    await $.inorderBtn.click();

    // Expect travOutput to contain sequence chips; final message contains 'Traversal complete'
    await expect($.message).toHaveText(/Traversal complete: /);

    // Collect chip texts in travOutput - the inorder of the sample should be sorted ascending
    const chips = page.locator('#travOutput .chip');
    // There should be 7 chips for the seeded sample
    await expect(chips).toHaveCount(7);

    // Read the text content of the chips and assert ascending order
    const texts = await chips.allTextContents();
    const nums = texts.map(t => parseInt(t, 10));
    // Ensure it's sorted ascending
    const sorted = [...nums].sort((a,b) => a-b);
    expect(nums).toEqual(sorted);
  });

  test('clicking a node highlights path and updates message with path', async ({ page }) => {
    // Purpose: clicking on a node should highlight the path from root to that node and update the message
    const $ = els(page);

    // Click on node with value 60 in the SVG
    const targetSelector = 'svg#svgCanvas g.node[data-val="60"]';
    await page.locator(targetSelector).click();

    // Message should indicate path to 60
    await expect($.message).toHaveText(/Path to 60:/);

    // Nodes along the path to 60 should have the 'highlight' class (root 50, then 70, then 60)
    const rootNode = page.locator('svg#svgCanvas g.node[data-val="50"]');
    const midNode = page.locator('svg#svgCanvas g.node[data-val="70"]');
    const leafNode = page.locator('svg#svgCanvas g.node[data-val="60"]');

    // Confirm each of these have class attribute including 'highlight' (renderTree adds 'highlight' to visited)
    await expect(rootNode).toHaveAttribute('class', /highlight/);
    await expect(midNode).toHaveAttribute('class', /highlight/);
    await expect(leafNode).toHaveAttribute('class', /highlight/);
  });

  test('info button opens an alert dialog with expected text and is accepted', async ({ page }) => {
    // Purpose: clicking Info should open an alert; the test handles and asserts dialog text
    const $ = els(page);

    // Intercept the dialog that will open and verify its message, then accept it
    let dialogMessage = null;
    page.once('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    await $.infoBtn.click();

    // dialogMessage should have been set and include a short description of BST ops
    expect(dialogMessage).toMatch(/BST operations/);
    expect(dialogMessage).toMatch(/Insert: add value/);
  });

  test('clear button resets tree to empty and stats update accordingly', async ({ page }) => {
    // Purpose: verify that Clear builds a new empty BST and the UI updates to the empty state
    const $ = els(page);

    // Click Clear
    await $.clearBtn.click();

    // Message should state 'Cleared tree.'
    await expect($.message).toHaveText('Cleared tree.');

    // Node count and height should be zero
    await expect($.nodeCount).toHaveText('0');
    await expect($.nodeHeight).toHaveText('0');

    // The SVG should show the Empty BST placeholder message
    await expect(page.locator('svg#svgCanvas text')).toHaveText(/Empty BST — insert nodes to begin/);
  });

  test('random and build balanced utilities produce trees and update message/statistics', async ({ page }) => {
    // Purpose: ensure utility buttons produce trees and update DOM & stats
    const $ = els(page);

    // Click Random Tree - should produce a non-zero node count and a message starting with 'Random tree'
    await $.randomBtn.click();
    await expect($.message).toHaveText(/Random tree with/);
    const countText = await $.nodeCount.textContent();
    const countNum = parseInt(countText, 10);
    expect(countNum).toBeGreaterThanOrEqual(8);
    expect(countNum).toBeLessThanOrEqual(14);

    // Click Build Balanced - with empty input it builds a balanced tree (script uses random 9 values)
    await $.valueInput.fill(''); // ensure raw input is empty
    await $.balanceBtn.click();
    await expect($.message).toHaveText(/Built balanced tree from/);
    const balancedCount = parseInt((await $.nodeCount.textContent()), 10);
    expect(balancedCount).toBeGreaterThan(0);
  });
});