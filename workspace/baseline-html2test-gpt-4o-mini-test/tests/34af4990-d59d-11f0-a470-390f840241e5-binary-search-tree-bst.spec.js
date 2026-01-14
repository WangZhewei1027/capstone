import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini-test/html/34af4990-d59d-11f0-a470-390f840241e5.html';

test.describe('Binary Search Tree (BST) Visualization - 34af4990-d59d-11f0-a470-390f840241e5', () => {
  // Arrays to collect console messages and page errors for each test run
  let consoleMessages = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages and page errors
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Load the application page as-is
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    // Expose console output in the test trace for debugging if needed
    if (consoleMessages.length > 0) {
      // No operation, but keeping messages captured for assertions below in tests
    }
    // No explicit teardown required; Playwright handles closing pages/contexts
  });

  test('Initial page load shows controls and empty BST visualization', async ({ page }) => {
    // Purpose: Verify the default state of the page after load.
    // Check that input and buttons are visible and BST container is empty initially.
    const input = page.locator('#inputValue');
    const insertButton = page.locator('#insertButton');
    const traverseButton = page.locator('#traverseButton');
    const bstContainer = page.locator('#bst');
    const output = page.locator('#output');

    await expect(input).toBeVisible();
    await expect(insertButton).toBeVisible();
    await expect(traverseButton).toBeVisible();
    await expect(bstContainer).toBeVisible();
    await expect(output).toBeVisible();

    // No nodes initially
    await expect(page.locator('.node')).toHaveCount(0);
    // No links initially
    await expect(page.locator('.link')).toHaveCount(0);
    // Output area should be empty text
    await expect(output).toHaveText('');

    // Assert that there were no page errors during initial load (capture natural runtime errors)
    expect(pageErrors.length, `Expected no page errors on initial load, found: ${pageErrors.length}`).toBe(0);

    // Ensure there are no console messages of type 'error'
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length, `Expected no console.error messages, found: ${errorConsoleMessages.length}`).toBe(0);
  });

  test('Inserting a single node renders a node element and clears the input', async ({ page }) => {
    // Purpose: Verify inserting a single value updates the DOM correctly and input is reset.
    const input = page.locator('#inputValue');
    const insertButton = page.locator('#insertButton');

    // Fill input with a number and click insert
    await input.fill('50');
    await insertButton.click();

    // One node should be rendered with text '50'
    const nodes = page.locator('.node');
    await expect(nodes).toHaveCount(1);
    await expect(nodes.first()).toHaveText('50');

    // Input should be cleared after insertion
    // Use evaluate to read value property because type=number might render value as ''
    const inputValue = await input.inputValue();
    expect(inputValue).toBe('', 'Expected input to be cleared after insertion');

    // No page errors or console errors after this interaction
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(pageErrors.length, 'No runtime page errors expected after insertion').toBe(0);
    expect(errorConsoleMessages.length, 'No console.error expected after insertion').toBe(0);
  });

  test('Inserting multiple nodes creates correct structure and in-order traversal', async ({ page }) => {
    // Purpose: Insert multiple values to form a balanced-ish BST and verify visualization and traversal output.
    const input = page.locator('#inputValue');
    const insertButton = page.locator('#insertButton');
    const traverseButton = page.locator('#traverseButton');
    const output = page.locator('#output');

    // Sequence to insert: root then left/right children
    const values = ['50', '30', '70', '20', '40', '60', '80'];
    for (const val of values) {
      await input.fill(val);
      await insertButton.click();
      // small wait for DOM updates
      await page.waitForTimeout(50);
    }

    // Expect 7 node elements
    await expect(page.locator('.node')).toHaveCount(7);

    // Expect correct number of links (edges). For n nodes in a tree, edges = n - 1
    await expect(page.locator('.link')).toHaveCount(6);

    // Trigger in-order traversal and check output text (should be sorted ascending)
    await traverseButton.click();
    await expect(output).toHaveText('In-Order Traversal: 20, 30, 40, 50, 60, 70, 80');

    // Verify that each inserted value appears somewhere in .node elements
    for (const val of values) {
      const nodeWithValue = page.locator('.node', { hasText: val });
      await expect(nodeWithValue).toHaveCount(1);
    }

    // Ensure no unexpected runtime errors happened during mass insertion/traversal
    expect(pageErrors.length, 'No runtime page errors expected after multiple insertions').toBe(0);
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length, 'No console.error expected after traversal').toBe(0);
  });

  test('Edge cases: empty input or non-numeric input should not insert nodes', async ({ page }) => {
    // Purpose: Verify the application handles empty and invalid numeric input gracefully (no insertion).
    const input = page.locator('#inputValue');
    const insertButton = page.locator('#insertButton');

    // Ensure starting from clean state: no nodes
    await expect(page.locator('.node')).toHaveCount(0);

    // Case 1: empty input
    await input.fill(''); // empty
    await insertButton.click();
    await page.waitForTimeout(50);
    await expect(page.locator('.node')).toHaveCount(0);

    // Case 2: non-numeric input (attempt). Because input type=number, browsers may sanitize,
    // but script uses parseInt, so we attempt to fill a non-numeric string.
    // Playwright's fill will set the value attribute; parseInt will return NaN and insertion should be skipped.
    await input.fill('abc');
    await insertButton.click();
    await page.waitForTimeout(50);
    await expect(page.locator('.node')).toHaveCount(0);

    // Case 3: whitespace input
    await input.fill('   ');
    await insertButton.click();
    await page.waitForTimeout(50);
    await expect(page.locator('.node')).toHaveCount(0);

    // Confirm no runtime errors happened due to invalid inputs
    expect(pageErrors.length, 'No runtime page errors expected from invalid inputs').toBe(0);
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length, 'No console.error expected from invalid inputs').toBe(0);
  });

  test('Visual relationships: links are present for internal nodes', async ({ page }) => {
    // Purpose: Verify that left/right link elements appear when child nodes are present.
    const input = page.locator('#inputValue');
    const insertButton = page.locator('#insertButton');

    // Build a simple tree with a root and both left and right children
    await input.fill('10');
    await insertButton.click();
    await input.fill('5');
    await insertButton.click();
    await input.fill('15');
    await insertButton.click();

    // Expect three nodes and two links (edges)
    await expect(page.locator('.node')).toHaveCount(3);
    await expect(page.locator('.link')).toHaveCount(2);

    // There should be at least one .link.left and one .link.right
    await expect(page.locator('.link.left')).toHaveCount(1);
    await expect(page.locator('.link.right')).toHaveCount(1);

    // Ensure nodes contain the expected values
    await expect(page.locator('.node', { hasText: '10' })).toHaveCount(1);
    await expect(page.locator('.node', { hasText: '5' })).toHaveCount(1);
    await expect(page.locator('.node', { hasText: '15' })).toHaveCount(1);

    // Confirm no page errors arose during link creation
    expect(pageErrors.length, 'No runtime page errors expected when creating links').toBe(0);
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length, 'No console.error expected when creating links').toBe(0);
  });

  test('Accessibility and focus behavior for controls', async ({ page }) => {
    // Purpose: Basic accessibility checks - controls are focusable and have expected accessible names.
    const input = page.locator('#inputValue');
    const insertButton = page.locator('#insertButton');
    const traverseButton = page.locator('#traverseButton');

    await expect(input).toBeVisible();
    await input.focus();
    // After focus, the active element should be the input (accessible check)
    const activeTag = await page.evaluate(() => document.activeElement?.id || '');
    expect(activeTag).toBe('inputValue');

    // Buttons should be focusable
    await insertButton.focus();
    let activeId = await page.evaluate(() => document.activeElement?.id || '');
    expect(activeId).toBe('insertButton');

    await traverseButton.focus();
    activeId = await page.evaluate(() => document.activeElement?.id || '');
    expect(activeId).toBe('traverseButton');

    // No runtime errors from focus operations
    expect(pageErrors.length, 'No page errors expected during focus operations').toBe(0);
  });
});