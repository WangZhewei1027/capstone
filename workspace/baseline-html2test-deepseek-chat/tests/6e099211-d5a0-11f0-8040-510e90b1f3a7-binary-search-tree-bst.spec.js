import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e099211-d5a0-11f0-8040-510e90b1f3a7.html';

test.describe('Binary Search Tree Visualization (BST) - 6e099211-d5a0-11f0-8040-510e90b1f3a7', () => {
  // Arrays to collect console errors and page errors for each test run
  let consoleErrors;
  let pageErrors;
  let consoleMessages;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];
    consoleMessages = [];

    // Capture console messages and errors BEFORE navigation so we catch initialization logs/errors
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      consoleMessages.push({ type, text });
      if (type === 'error') {
        consoleErrors.push(text);
      }
    });

    page.on('pageerror', err => {
      pageErrors.push(err && err.message ? err.message : String(err));
    });

    // Navigate to the page under test
    await page.goto(APP_URL);
    // Wait for the main container to ensure page script has executed
    await expect(page.locator('.container')).toBeVisible();
  });

  // Test initial page load and default state
  test('loads page and renders demo tree with initial log', async ({ page }) => {
    // Verify page title
    await expect(page).toHaveTitle(/Binary Search Tree Visualization/);

    // The demo script logs a message about the demo tree being created
    const logContent = page.locator('#logContent');
    await expect(logContent).toContainText('Demo tree created with values: 50, 30, 70, 20, 40, 60, 80');

    // The tree container should not show "Tree is empty" on initial load because demo nodes were inserted
    const treeContainerText = await page.locator('#treeContainer').innerText();
    expect(treeContainerText.toLowerCase()).not.toContain('tree is empty');

    // Ensure there are visible node value elements for demo values (at least the root 50)
    await expect(page.locator('.node .node-value', { hasText: '50' })).toBeVisible();

    // Assert no uncaught console errors or page errors occurred during load
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test insert functionality (including duplicate handling)
  test('inserts a value via button and prevents duplicate insertion', async ({ page }) => {
    const input = page.locator('#valueInput');
    const insertBtn = page.getByRole('button', { name: 'Insert' });
    const logContent = page.locator('#logContent');

    // Insert value 25
    await input.fill('25');
    await insertBtn.click();

    // Expect inserted log message and node with value 25 present
    await expect(logContent).toContainText('Inserted value: 25');
    await expect(page.locator('.node .node-value', { hasText: '25' })).toBeVisible();

    // Attempt to insert the same value again -> should log "already exists"
    await input.fill('25');
    await insertBtn.click();
    await expect(logContent).toContainText('Value 25 already exists in the tree');

    // Input should be cleared and focused after operation
    await expect(input).toHaveValue('');
    // Focus check (element handle may be focused)
    const active = await page.evaluate(() => document.activeElement?.id || null);
    expect(active).toBe('valueInput');

    // Ensure no console errors were emitted during these interactions
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test search functionality for existing and non-existing values
  test('searches for existing and non-existing values and logs results', async ({ page }) => {
    const input = page.locator('#valueInput');
    const searchBtn = page.getByRole('button', { name: 'Search' });
    const logContent = page.locator('#logContent');

    // Search for existing value 40
    await input.fill('40');
    await searchBtn.click();
    await expect(logContent).toContainText(/Value 40 found in \d+ steps/);

    // Search for non-existing value 999
    await input.fill('999');
    await searchBtn.click();
    await expect(logContent).toContainText('Value 999 not found in the tree');

    // Ensure no console errors or page errors during search flows
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test remove functionality for existing and non-existing values
  test('removes an existing value and handles removal of non-existing value', async ({ page }) => {
    const input = page.locator('#valueInput');
    const insertBtn = page.getByRole('button', { name: 'Insert' });
    const removeBtn = page.getByRole('button', { name: 'Remove' });
    const logContent = page.locator('#logContent');

    // Insert a specific value 45 to then remove
    await input.fill('45');
    await insertBtn.click();
    await expect(logContent).toContainText('Inserted value: 45');
    await expect(page.locator('.node .node-value', { hasText: '45' })).toBeVisible();

    // Remove that value
    await input.fill('45');
    await removeBtn.click();

    // The removeValue function logs "Attempted to remove value: 45"
    await expect(logContent).toContainText('Attempted to remove value: 45');

    // Also verify that the node with value 45 is no longer present in rendered node values
    const nodeValues = await page.$$eval('.node .node-value', nodes => nodes.map(n => n.textContent.trim()));
    expect(nodeValues).not.toContain('45');

    // Attempt to remove a non-existing value 9999 -> should result in a "not found" log (from _removeNode)
    await input.fill('9999');
    await removeBtn.click();
    await expect(logContent).toContainText('Attempted to remove value: 9999');
    // The internal _removeNode logs "Value 9999 not found in the tree"
    await expect(logContent).toContainText('Value 9999 not found in the tree');

    // Ensure no console or page runtime errors occurred
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test traversal operations, findMin and findMax after clearing and creating a small deterministic tree
  test('clears tree, inserts known values, and validates traversals and min/max', async ({ page }) => {
    const input = page.locator('#valueInput');
    const clearBtn = page.getByRole('button', { name: 'Clear Tree' });
    const insertBtn = page.getByRole('button', { name: 'Insert' });
    const inOrderBtn = page.getByRole('button', { name: 'In-Order Traversal' });
    const preOrderBtn = page.getByRole('button', { name: 'Pre-Order Traversal' });
    const postOrderBtn = page.getByRole('button', { name: 'Post-Order Traversal' });
    const findMinBtn = page.getByRole('button', { name: 'Find Minimum' });
    const findMaxBtn = page.getByRole('button', { name: 'Find Maximum' });
    const logContent = page.locator('#logContent');

    // Clear the tree
    await clearBtn.click();
    await expect(logContent).toContainText('Tree cleared');
    await expect(page.locator('#treeContainer')).toContainText('Tree is empty');

    // Insert a small deterministic set: 10, 5, 15
    for (const v of ['10', '5', '15']) {
      await input.fill(v);
      await insertBtn.click();
      await expect(logContent).toContainText(`Inserted value: ${v}`);
    }

    // In-Order traversal should be "5 → 10 → 15"
    await inOrderBtn.click();
    await expect(logContent).toContainText('In-Order Traversal: 5 → 10 → 15');

    // Pre-Order should be "10 → 5 → 15"
    await preOrderBtn.click();
    await expect(logContent).toContainText('Pre-Order Traversal: 10 → 5 → 15');

    // Post-Order should be "5 → 15 → 10"
    await postOrderBtn.click();
    await expect(logContent).toContainText('Post-Order Traversal: 5 → 15 → 10');

    // Find minimum/max
    await findMinBtn.click();
    await expect(logContent).toContainText('Minimum value: 5');

    await findMaxBtn.click();
    await expect(logContent).toContainText('Maximum value: 15');

    // Ensure no console/page errors occurred in this flow
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test random tree generation and that it results in multiple visible nodes and logs
  test('generates a random tree and logs the generated count', async ({ page }) => {
    const generateBtn = page.getByRole('button', { name: 'Generate Random Tree' });
    const logContent = page.locator('#logContent');

    // Click to generate random tree
    await generateBtn.click();

    // Expect the log to mention "Generated random tree with"
    await expect(logContent).toContainText(/Generated random tree with \d+ nodes/);

    // Ensure there are at least 7 visible node elements (the generator creates 7-14 nodes)
    const visibleNodeCount = await page.$$eval('.node', nodes => {
      return nodes.reduce((count, el) => {
        const style = window.getComputedStyle(el);
        // We consider a node visible if its visibility is not 'hidden' and display is not 'none'
        if (style.visibility !== 'hidden' && style.display !== 'none') return count + 1;
        return count;
      }, 0);
    });
    expect(visibleNodeCount).toBeGreaterThanOrEqual(7);

    // Ensure no console/page runtime errors occurred
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test keyboard support: pressing Enter in the input should insert the value
  test('pressing Enter in the input inserts the value', async ({ page }) => {
    const input = page.locator('#valueInput');
    const logContent = page.locator('#logContent');

    // Clear tree for determinism
    await page.getByRole('button', { name: 'Clear Tree' }).click();
    await expect(logContent).toContainText('Tree cleared');

    // Type value and press Enter
    await input.fill('33');
    await input.press('Enter');

    // Expect insertion
    await expect(logContent).toContainText('Inserted value: 33');
    await expect(page.locator('.node .node-value', { hasText: '33' })).toBeVisible();

    // Ensure no console/page errors occurred
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test invalid input triggers an alert dialog with correct message
  test('shows alert for invalid (empty) input when Insert is clicked', async ({ page }) => {
    const input = page.locator('#valueInput');
    const insertBtn = page.getByRole('button', { name: 'Insert' });

    // Ensure input is empty
    await input.fill('');

    // Prepare to capture dialog
    let dialogMessage = null;
    page.once('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Click insert with empty input should trigger alert
    await insertBtn.click();

    // Assert dialog captured and message is correct
    expect(dialogMessage).toBe('Please enter a valid number');

    // Ensure no console/page errors were produced as a result
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // At the end, report any unexpected console or page errors that might have been captured globally during tests
  test('no unexpected console or page errors were emitted during tests (global check)', async ({ page }) => {
    // The consoleErrors and pageErrors arrays were checked in each test; here we perform a final assertion to ensure no errors at this moment
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});