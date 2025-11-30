import { test, expect } from '@playwright/test';

test.describe('Red-Black Tree Visualizer - 1da0cd81-cd2f-11f0-a440-159d7b77af86', () => {
  const url = 'http://127.0.0.1:5500/workspace/html2test/html/1da0cd81-cd2f-11f0-a440-159d7b77af86.html';

  // Helper to set up listeners to capture console messages and page errors
  async function attachErrorListeners(page) {
    const consoleMessages = [];
    const pageErrors = [];

    page.on('console', msg => {
      // capture all console messages with their type and text
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', err => {
      // capture uncaught exceptions from the page
      pageErrors.push(err);
    });

    return { consoleMessages, pageErrors };
  }

  // Before each test we navigate to the page and attach listeners
  test.beforeEach(async ({ page }) => {
    await page.goto(url);
  });

  test.describe('Initial page load and default state', () => {
    test('should load the page and display title, input and insert button', async ({ page }) => {
      // Arrange: attach listeners to capture console and runtime errors
      const { consoleMessages, pageErrors } = await attachErrorListeners(page);

      // Assert: page title and header text exist
      await expect(page).toHaveTitle(/Red-Black Tree Visualizer/);
      await expect(page.locator('h1')).toHaveText('Red-Black Tree Visualizer');

      // Assert: input and button are present and visible
      const input = page.locator('#nodeValue');
      const insertButton = page.getByRole('button', { name: 'Insert' });
      await expect(input).toBeVisible();
      await expect(insertButton).toBeVisible();

      // Assert: tree container exists and initially empty (no nodes)
      const nodes = page.locator('#tree .node');
      await expect(nodes).toHaveCount(0);

      // Assert: no uncaught page errors on initial load
      expect(pageErrors.length).toBe(0);

      // Optionally ensure no console errors were emitted
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
    });

    test('clicking Insert with empty input should not create a node and no exceptions thrown', async ({ page }) => {
      // Arrange
      const { consoleMessages, pageErrors } = await attachErrorListeners(page);
      const insertButton = page.getByRole('button', { name: 'Insert' });
      const nodes = page.locator('#tree .node');

      // Act: click Insert without filling the input (should be ignored by page script)
      await insertButton.click();

      // Assert: still no nodes
      await expect(nodes).toHaveCount(0);

      // Assert: no uncaught runtime errors triggered by clicking with empty input
      expect(pageErrors.length).toBe(0);

      // Assert: no console error messages
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe('Basic insert operations and DOM updates', () => {
    test('inserting a single value creates a black root node with the correct value', async ({ page }) => {
      // Arrange
      const { consoleMessages, pageErrors } = await attachErrorListeners(page);
      const input = page.locator('#nodeValue');
      const insertButton = page.getByRole('button', { name: 'Insert' });
      const nodes = page.locator('#tree .node');

      // Act: insert value 10
      await input.fill('10');
      await insertButton.click();

      // Assert: one node exists with text "10" and class contains 'black'
      await expect(nodes).toHaveCount(1);
      const firstNode = nodes.nth(0);
      await expect(firstNode).toHaveText('10');
      await expect(firstNode).toHaveClass(/black/);

      // Assert: no uncaught runtime errors
      expect(pageErrors.length).toBe(0);

      // Assert: no console error messages
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
    });

    test('inserting multiple values updates tree and shows children with colors', async ({ page }) => {
      // Arrange
      const { consoleMessages, pageErrors } = await attachErrorListeners(page);
      const input = page.locator('#nodeValue');
      const insertButton = page.getByRole('button', { name: 'Insert' });
      const nodes = page.locator('#tree .node');

      // Act: insert 10 (root), 5 (left), 15 (right)
      await input.fill('10');
      await insertButton.click();
      await input.fill('5');
      await insertButton.click();
      await input.fill('15');
      await insertButton.click();

      // Assert: expect three nodes to be present
      await expect(nodes).toHaveCount(3);

      // The first rendered node should be the root (10)
      const rootNode = nodes.nth(0);
      await expect(rootNode).toHaveText('10');
      await expect(rootNode).toHaveClass(/black/);

      // Child nodes (5 and 15) should be present somewhere in the tree
      const nodeTexts = await nodes.allTextContents();
      expect(nodeTexts).toEqual(expect.arrayContaining(['5', '10', '15']));

      // Verify at least one child (5 or 15) has class 'red' (new nodes default to red unless recolored)
      const leftNode = nodes.filter({ hasText: '5' }).first();
      const rightNode = nodes.filter({ hasText: '15' }).first();
      // At least one of them should exist and be visible
      await expect(leftNode).toBeVisible();
      await expect(rightNode).toBeVisible();
      // They should each have either red or black; assert they have a color class
      await expect(leftNode).toHaveClass(/(red|black)/);
      await expect(rightNode).toHaveClass(/(red|black)/);

      // Assert: no uncaught runtime errors triggered by these operations
      expect(pageErrors.length).toBe(0);

      // Assert: no console error messages emitted
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe('Structural changes, rotations and color fixes', () => {
    test('insert sequence that triggers rotation: [10, 5, 1] - root should become 5 and be black', async ({ page }) => {
      // We reload page to ensure a fresh RedBlackTree instance for deterministic behavior
      await page.goto(url);
      const { consoleMessages, pageErrors } = await attachErrorListeners(page);

      const input = page.locator('#nodeValue');
      const insertButton = page.getByRole('button', { name: 'Insert' });
      const treeNodes = page.locator('#tree .node');

      // Act: insert values 10, 5, 1
      await input.fill('10');
      await insertButton.click();
      await input.fill('5');
      await insertButton.click();
      await input.fill('1');
      await insertButton.click();

      // Assert: at least three nodes present
      await expect(treeNodes).toHaveCount(3);

      // The first rendered node in #tree should be the current root.
      const rootNode = treeNodes.nth(0);
      const rootText = (await rootNode.textContent()).trim();

      // After inserting [10,5,1], the implementation should perform a rotation making 5 the root.
      // We assert the root displays '5' and is black per Red-Black Tree root invariant.
      expect(rootText).toBe('5');
      await expect(rootNode).toHaveClass(/black/);

      // Check that the other expected values (10 and 1) exist in the DOM
      const allTexts = await treeNodes.allTextContents();
      expect(allTexts).toEqual(expect.arrayContaining(['1', '5', '10']));

      // Ensure children are present and have color classes assigned
      const node1 = treeNodes.filter({ hasText: '1' }).first();
      const node10 = treeNodes.filter({ hasText: '10' }).first();
      await expect(node1).toBeVisible();
      await expect(node10).toBeVisible();
      await expect(node1).toHaveClass(/(red|black)/);
      await expect(node10).toHaveClass(/(red|black)/);

      // Assert: no uncaught runtime errors during rotations/fixes
      expect(pageErrors.length).toBe(0);

      // Assert: no console error messages
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
    });

    test('inserting many values preserves DOM stability and does not throw runtime errors', async ({ page }) => {
      // Insert a sequence of values to stress tree insertion and rebalancing logic.
      await page.goto(url);
      const { consoleMessages, pageErrors } = await attachErrorListeners(page);

      const input = page.locator('#nodeValue');
      const insertButton = page.getByRole('button', { name: 'Insert' });
      const values = [50, 25, 75, 10, 30, 60, 85, 5, 15, 27, 40, 55, 65];

      for (const v of values) {
        await input.fill(String(v));
        await insertButton.click();
      }

      // Assert: number of node elements matches number of unique inserted values
      const nodes = page.locator('#tree .node');
      await expect(nodes).toHaveCount(values.length);

      // Validate that each inserted value appears somewhere in the node texts
      const allNodeTexts = await nodes.allTextContents();
      for (const v of values) {
        expect(allNodeTexts).toContain(String(v));
      }

      // Validate every node element has a color class (red or black)
      const countWithColorClass = await nodes.evaluateAll((els) =>
        els.filter(e => /(red|black)/.test(e.className)).length
      );
      expect(countWithColorClass).toBe(values.length);

      // Assert: no uncaught runtime errors during heavy insertions
      expect(pageErrors.length).toBe(0);

      // Assert: no console error messages
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe('Edge cases and robustness', () => {
    test('non-number input is ignored and does not create nodes or throw', async ({ page }) => {
      // Arrange
      await page.goto(url);
      const { consoleMessages, pageErrors } = await attachErrorListeners(page);

      const input = page.locator('#nodeValue');
      const insertButton = page.getByRole('button', { name: 'Insert' });
      const nodes = page.locator('#tree .node');

      // Act: fill with invalid text (should be ignored by parseInt producing NaN)
      // Note: input is type=number; Playwright .fill will attempt to set, but we still attempt to set a non-number string.
      await input.fill('abc');
      await insertButton.click();

      // Assert: still no nodes created
      await expect(nodes).toHaveCount(0);

      // Assert: no uncaught runtime errors
      expect(pageErrors.length).toBe(0);

      // Assert: no console errors
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
    });

    test('inserting duplicate values should still render each inserted node (implementation does not prevent duplicates)', async ({ page }) => {
      await page.goto(url);
      const { consoleMessages, pageErrors } = await attachErrorListeners(page);

      const input = page.locator('#nodeValue');
      const insertButton = page.getByRole('button', { name: 'Insert' });

      // Insert duplicate values
      await input.fill('7');
      await insertButton.click();
      await input.fill('7');
      await insertButton.click();
      await input.fill('7');
      await insertButton.click();

      // Expect three nodes in DOM (implementation uses <= branch and will insert duplicates to the right)
      const nodes = page.locator('#tree .node');
      await expect(nodes).toHaveCount(3);

      // All nodes should contain the text '7'
      const texts = await nodes.allTextContents();
      expect(texts.filter(t => t.trim() === '7').length).toBe(3);

      // Assert: no runtime errors occurred during duplicate insertions
      expect(pageErrors.length).toBe(0);

      // Assert: no console error messages
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
    });
  });
});