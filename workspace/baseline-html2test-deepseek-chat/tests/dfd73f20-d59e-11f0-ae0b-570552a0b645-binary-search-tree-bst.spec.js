import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd73f20-d59e-11f0-ae0b-570552a0b645.html';

test.describe('Binary Search Tree Visualization - BST (dfd73f20-d59e-11f0-ae0b-570552a0b645)', () => {
  // Arrays to capture console messages and page errors for each test
  let consoleMessages = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages and page errors so tests can assert on them
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    await page.goto(APP_URL, { waitUntil: 'load' });
    // Ensure initial UI is rendered
    await expect(page.locator('h1')).toHaveText(/Binary Search Tree Visualization/);
  });

  test.afterEach(async () => {
    // no-op teardown placeholder (keeps pattern explicit)
  });

  // Helper page object like utilities scoped to tests
  const selectors = {
    input: '#nodeValue',
    alert: '#alert',
    output: '#output',
    treeVisualization: '#treeVisualization',
    insertBtn: 'button:has-text("Insert Node")',
    deleteBtn: 'button:has-text("Delete Node")',
    searchBtn: 'button:has-text("Search Node")',
    inOrderBtn: 'button:has-text("In-Order Traversal")',
    preOrderBtn: 'button:has-text("Pre-Order Traversal")',
    postOrderBtn: 'button:has-text("Post-Order Traversal")',
    findMinBtn: 'button:has-text("Find Minimum")',
    findMaxBtn: 'button:has-text("Find Maximum")',
    clearBtn: 'button:has-text("Clear Tree")',
    randomBtn: 'button:has-text("Random Tree (10 nodes)")',
    treeNode: '#treeVisualization .node'
  };

  test.describe('Initial load and default state', () => {
    test('shows page title, initial tree and in-order traversal output', async ({ page }) => {
      // Verify title exists
      await expect(page.locator('title')).toHaveCount(1);

      // The script initializes the BST with nodes and runs traverseInOrder at the end.
      // Expect the output to show the in-order traversal of the initial nodes:
      // The initialized nodes: 50,30,70,20,40,60,80 -> in-order: 20,30,40,50,60,70,80
      await expect(page.locator(selectors.output)).toHaveText(/In-Order:\s*\[20,\s*30,\s*40,\s*50,\s*60,\s*70,\s*80\]/);

      // Tree visualization should contain nodes displaying numbers, including root 50
      await expect(page.locator(selectors.treeNode).filter({ hasText: '50' })).toHaveCount(1);
      await expect(page.locator(selectors.treeNode).filter({ hasText: '20' })).toHaveCount(1);
      await expect(page.locator(selectors.treeNode).filter({ hasText: '80' })).toHaveCount(1);
    });

    test('no uncaught page errors or console error messages on initial load', async ({ page }) => {
      // Allow a brief moment for any asynchronous errors to surface
      await page.waitForTimeout(200);
      // Assert there are no page errors captured
      expect(pageErrors.length).toBe(0);
      // Assert there are no console messages of type 'error'
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe('Insertion, deletion and search interactions', () => {
    test('inserts a new node via Insert Node button and updates visualization + traversal', async ({ page }) => {
      // Insert node 25
      await page.fill(selectors.input, '25');
      await page.click(selectors.insertBtn);

      // Alert should indicate successful insertion
      const alert = page.locator(selectors.alert);
      await expect(alert).toHaveText(/Node 25 inserted successfully!/);

      // Visualization should contain a node with text '25'
      await expect(page.locator(selectors.treeNode).filter({ hasText: '25' })).toHaveCount(1);

      // In-order traversal should include the new value 25 in the correct sorted position
      await page.click(selectors.inOrderBtn);
      await expect(page.locator(selectors.output)).toHaveText(/In-Order:\s*\[20,\s*25,\s*30,\s*40,\s*50,\s*60,\s*70,\s*80\]/);
    });

    test('deletes an existing node via Delete Node button and updates visualization', async ({ page }) => {
      // Insert then delete to ensure deterministic test (start from initial tree)
      await page.fill(selectors.input, '25');
      await page.click(selectors.insertBtn);
      await expect(page.locator(selectors.alert)).toHaveText(/Node 25 inserted successfully!/);
      await expect(page.locator(selectors.treeNode).filter({ hasText: '25' })).toHaveCount(1);

      // Now delete it
      await page.fill(selectors.input, '25');
      await page.click(selectors.deleteBtn);

      // Alert should confirm deletion
      await expect(page.locator(selectors.alert)).toHaveText(/Node 25 deleted successfully!/);

      // Visualization should no longer contain node '25'
      await expect(page.locator(selectors.treeNode).filter({ hasText: '25' })).toHaveCount(0);

      // Confirm in-order traversal no longer includes 25
      await page.click(selectors.inOrderBtn);
      await expect(page.locator(selectors.output)).toHaveText(/In-Order:\s*\[20,\s*30,\s*40,\s*50,\s*60,\s*70,\s*80\]/);
    });

    test('searches for existing and non-existing nodes and shows appropriate alerts', async ({ page }) => {
      // Search for an existing value
      await page.fill(selectors.input, '60');
      await page.click(selectors.searchBtn);
      await expect(page.locator(selectors.alert)).toHaveText(/Node 60 found in the tree!/);

      // Search for a non-existing value
      await page.fill(selectors.input, '999');
      await page.click(selectors.searchBtn);
      await expect(page.locator(selectors.alert)).toHaveText(/Node 999 not found in the tree!/);
      // Since not found is an error alert class, ensure it has 'error' in className
      const alertClass = await page.locator(selectors.alert).getAttribute('class');
      expect(alertClass).toContain('error');
    });
  });

  test.describe('Traversal, min/max and visualization checks', () => {
    test('pre-order and post-order traversals update output correctly', async ({ page }) => {
      // Pre-order for initial tree root-first should be: 50,30,20,40,70,60,80
      await page.click(selectors.preOrderBtn);
      await expect(page.locator(selectors.output)).toHaveText(/Pre-Order:\s*\[50,\s*30,\s*20,\s*40,\s*70,\s*60,\s*80\]/);

      // Post-order should be: 20,40,30,60,80,70,50
      await page.click(selectors.postOrderBtn);
      await expect(page.locator(selectors.output)).toHaveText(/Post-Order:\s*\[20,\s*40,\s*30,\s*60,\s*80,\s*70,\s*50\]/);
    });

    test('find minimum and maximum values use the BST and update output', async ({ page }) => {
      await page.click(selectors.findMinBtn);
      await expect(page.locator(selectors.output)).toHaveText(/Minimum value:\s*20/);

      await page.click(selectors.findMaxBtn);
      await expect(page.locator(selectors.output)).toHaveText(/Maximum value:\s*80/);
    });

    test('visualization renders nodes and placeholders; counting non-placeholder nodes', async ({ page }) => {
      // Count non-placeholder nodes (nodes whose textContent is not '·')
      const nonPlaceholderCount = await page.evaluate(() => {
        const nodes = Array.from(document.querySelectorAll('#treeVisualization .node'));
        return nodes.filter(n => n.textContent.trim() !== '·').length;
      });

      // The initialized tree has 7 inserted nodes -> expect at least 7 non-placeholder nodes
      expect(nonPlaceholderCount).toBeGreaterThanOrEqual(7);
    });
  });

  test.describe('Edge cases, keyboard support and invalid input handling', () => {
    test('pressing Enter in input inserts a node (keyboard support)', async ({ page }) => {
      // Use Enter key to insert 65
      await page.fill(selectors.input, '65');
      await page.press(selectors.input, 'Enter');

      // Expect alert showing insertion
      await expect(page.locator(selectors.alert)).toHaveText(/Node 65 inserted successfully!/);
      // Visualization contains the node
      await expect(page.locator(selectors.treeNode).filter({ hasText: '65' })).toHaveCount(1);
    });

    test('inserting an existing node shows an error alert', async ({ page }) => {
      // 50 already exists in the initial tree
      await page.fill(selectors.input, '50');
      await page.click(selectors.insertBtn);
      await expect(page.locator(selectors.alert)).toHaveText(/Node 50 already exists!/);
      const alertClass = await page.locator(selectors.alert).getAttribute('class');
      expect(alertClass).toContain('error');
    });

    test('attempting to insert invalid (non-numeric) input shows an error alert', async ({ page }) => {
      // Force a non-numeric value into the number input
      await page.evaluate(() => {
        // Note: we set the value attribute directly, not invoking any functions
        document.getElementById('nodeValue').value = 'abc';
      });
      await page.click(selectors.insertBtn);
      await expect(page.locator(selectors.alert)).toHaveText(/Please enter a valid number/);
      const alertClass = await page.locator(selectors.alert).getAttribute('class');
      expect(alertClass).toContain('error');
    });

    test('deleting a non-existing node shows an error alert', async ({ page }) => {
      await page.fill(selectors.input, '9999');
      await page.click(selectors.deleteBtn);
      await expect(page.locator(selectors.alert)).toHaveText(/Node 9999 not found!/);
      const alertClass = await page.locator(selectors.alert).getAttribute('class');
      expect(alertClass).toContain('error');
    });
  });

  test.describe('Random tree generation and clearing', () => {
    test('clearing the tree removes nodes, updates output, and shows alert', async ({ page }) => {
      await page.click(selectors.clearBtn);
      await expect(page.locator(selectors.alert)).toHaveText(/Tree cleared successfully!/);
      await expect(page.locator(selectors.output)).toHaveText(/Tree cleared!/);

      // Visualization should display "Tree is empty" message
      await expect(page.locator(selectors.treeVisualization)).toContainText('Tree is empty');
    });

    test('generateRandomTree creates 10 nodes (non-placeholder) and shows alert', async ({ page }) => {
      await page.click(selectors.randomBtn);

      // Alert should confirm generation
      await expect(page.locator(selectors.alert)).toHaveText(/Random tree with 10 nodes generated!/);

      // Count non-placeholder nodes rendered in the visualization (should be at least 10)
      const nonPlaceholderCount = await page.evaluate(() => {
        const nodes = Array.from(document.querySelectorAll('#treeVisualization .node'));
        return nodes.filter(n => n.textContent.trim() !== '·').length;
      });

      expect(nonPlaceholderCount).toBeGreaterThanOrEqual(10);
    });
  });

  test.describe('Console and runtime error observations', () => {
    test('records console messages and page errors during user interactions', async ({ page }) => {
      // Perform several operations to exercise client-side code paths
      await page.fill(selectors.input, '33');
      await page.click(selectors.insertBtn);
      await page.fill(selectors.input, '33');
      await page.click(selectors.deleteBtn);
      await page.click(selectors.findMinBtn);
      await page.click(selectors.findMaxBtn);
      await page.click(selectors.preOrderBtn);

      // Allow any asynchronous console messages or errors to be captured
      await page.waitForTimeout(200);

      // Assert that there are no uncaught page errors (if any exist, the test will fail here)
      expect(pageErrors.length).toBe(0);

      // Assert there are no console messages of severity 'error'
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length).toBe(0);

      // For visibility, also assert there were some console messages (info/debug) or none is acceptable
      // This does not fail the test but documents that we observed console traffic
      // (Do not assert presence to avoid flakiness across environments)
    });
  });
});