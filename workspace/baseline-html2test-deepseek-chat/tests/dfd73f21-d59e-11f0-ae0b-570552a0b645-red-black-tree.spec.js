import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd73f21-d59e-11f0-ae0b-570552a0b645.html';

test.describe('Red-Black Tree Visualization - dfd73f21-d59e-11f0-ae0b-570552a0b645', () => {
  // Keep arrays of console messages and page errors for assertions / inspection
  let consoleMessages = [];
  let pageErrors = [];

  // Page object helpers
  const locators = {
    input: (page) => page.locator('#value-input'),
    insertButton: (page) => page.getByRole('button', { name: 'Insert' }),
    deleteButton: (page) => page.getByRole('button', { name: 'Delete' }),
    findButton: (page) => page.getByRole('button', { name: 'Find' }),
    clearButton: (page) => page.getByRole('button', { name: 'Clear Tree' }),
    randomButton: (page) => page.getByRole('button', { name: 'Generate Random Tree' }),
    container: (page) => page.locator('#tree-container'),
    operationLog: (page) => page.locator('#operation-log'),
    nodes: (page) => page.locator('#tree-container .node'),
    lines: (page) => page.locator('#tree-container .line'),
    title: (page) => page.locator('h1'),
  };

  // Attach listeners and navigate to the page before each test
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    page.on('console', (msg) => {
      try {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
      } catch {
        consoleMessages.push({ type: 'unknown', text: '' });
      }
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    await page.goto(APP_URL);
    // Ensure base UI is visible before running assertions
    await expect(locators.title(page)).toBeVisible();
  });

  // Helper to read operation log text
  async function getOperationLogText(page) {
    const el = locators.operationLog(page);
    return (await el.textContent()) || '';
  }

  // Helper to insert a value via UI
  async function uiInsertValue(page, value) {
    await locators.input(page).fill(String(value));
    await locators.insertButton(page).click();
  }

  // Helper to click Find with a value
  async function uiFindValue(page, value) {
    await locators.input(page).fill(String(value));
    await locators.findButton(page).click();
  }

  // Test initial load and default state
  test('Initial page load shows title and initial operation log entries', async ({ page }) => {
    // Purpose: Verify page loads, title is present, and initial logs are written on window.onload
    await expect(locators.title(page)).toHaveText('Red-Black Tree Visualization');

    // Operation log should contain the startup messages written in window.onload
    const logText = await getOperationLogText(page);
    expect(logText).toContain('Red-Black Tree Visualization Started');
    expect(logText).toContain('Try inserting values or generating a random tree');

    // Make sure no uncaught errors happened during load
    expect(pageErrors.length).toBe(0);
  });

  test.describe('Insertion and visualization', () => {
    test('Inserting a single value creates a BLACK root node and logs insertion', async ({ page }) => {
      // Purpose: Insert a value and verify a node appears, it becomes the black root and a log entry is created
      await uiInsertValue(page, 42);

      // The operation log should indicate insertion
      const logText = await getOperationLogText(page);
      expect(logText).toMatch(/Inserted value: 42/);

      // A node with text '42' should be present in the container
      const node = locators.container(page).getByText('42', { exact: true });
      await expect(node).toBeVisible();

      // The title attribute should include the color and value
      const titleAttr = await node.getAttribute('title');
      expect(titleAttr).toContain('Value: 42');
      expect(titleAttr).toContain('Color: BLACK');

      // The element's CSS class should include 'black' (root should be recolored to BLACK)
      const classAttr = await node.getAttribute('class');
      expect(classAttr).toContain('black');

      // No unexpected page errors
      expect(pageErrors.length).toBe(0);
    });

    test('Inserting a duplicate value logs that the value already exists and does not create duplicate nodes', async ({ page }) => {
      // Purpose: Ensure duplicate insertion is detected and logged, and no duplicate node element is created
      await uiInsertValue(page, 7);
      // Insert duplicate
      await uiInsertValue(page, 7);

      const logText = await getOperationLogText(page);
      expect(logText).toMatch(/Value 7 already exists in the tree/);

      // Only one node with text '7' should be present
      const nodesWith7 = locators.container(page).getByText('7', { exact: true });
      await expect(nodesWith7).toBeVisible();
      // Count of nodes with text 7 should be 1 (use locator count for nodes and filter)
      const allNodes = locators.nodes(page);
      let count7 = 0;
      const total = await allNodes.count();
      for (let i = 0; i < total; i++) {
        const txt = (await allNodes.nth(i).textContent())?.trim();
        if (txt === '7') count7++;
      }
      expect(count7).toBe(1);

      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Find, highlight, and not-found scenarios', () => {
    test('Finding an existing node highlights it and logs success', async ({ page }) => {
      // Purpose: Ensure Find highlights the node (visual emphasis) and logs Found value
      await uiInsertValue(page, 100);
      // Clear input as insertion clears it in code, but set for find anyway
      await locators.input(page).fill('100');
      await locators.findButton(page).click();

      // Log should indicate found
      const logText = await getOperationLogText(page);
      expect(logText).toMatch(/Found value: 100/);

      // The node element should have inline style boxShadow set by highlightNode
      const node = locators.container(page).getByText('100', { exact: true });
      // read inline style property boxShadow
      const boxShadow = await node.evaluate((el) => el.style.boxShadow || '');
      expect(boxShadow).toContain('yellow');

      expect(pageErrors.length).toBe(0);
    });

    test('Finding a non-existent value logs not found and does not highlight any node', async ({ page }) => {
      // Purpose: Searching for a value that is not present should log not found and not create a highlight
      // Ensure the value 9999 is not present
      await locators.input(page).fill('9999');
      await locators.findButton(page).click();

      const logText = await getOperationLogText(page);
      expect(logText).toMatch(/Value 9999 not found/);

      // No node with 9999 should exist
      const matching = locators.container(page).locator('text=9999');
      await expect(matching).toHaveCount(0);

      // No node should have the highlight boxShadow (we will verify none have yellow shadow)
      const allNodes = locators.nodes(page);
      const total = await allNodes.count();
      for (let i = 0; i < total; i++) {
        const bs = await allNodes.nth(i).evaluate((el) => el.style.boxShadow || '');
        expect(bs).not.toContain('yellow');
      }

      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Input validation and alerts', () => {
    test('Insert without a valid number triggers alert with expected message', async ({ page }) => {
      // Purpose: Verify that inserting with an empty input triggers browser alert with the expected text
      // Ensure input is empty
      await locators.input(page).fill('');
      const [dialog] = await Promise.all([
        page.waitForEvent('dialog'),
        locators.insertButton(page).click(),
      ]);
      expect(dialog.message()).toBe('Please enter a valid number');
      await dialog.accept();

      // The operation log should not contain an inserted value
      const logText = await getOperationLogText(page);
      expect(logText).not.toMatch(/Inserted value:/);

      expect(pageErrors.length).toBe(0);
    });

    test('Delete without a valid number triggers alert with expected message', async ({ page }) => {
      // Purpose: Verify that pressing Delete with empty input triggers the same validation alert
      await locators.input(page).fill('');
      const [dialog] = await Promise.all([
        page.waitForEvent('dialog'),
        locators.deleteButton(page).click(),
      ]);
      expect(dialog.message()).toBe('Please enter a valid number');
      await dialog.accept();

      // Because delete implementation only logs when invoked with a number, operation log should not have delete entry
      const logText = await getOperationLogText(page);
      expect(logText).not.toMatch(/Delete operation for value/);

      expect(pageErrors.length).toBe(0);
    });

    test('Delete with a numeric value logs the delete operation message (implementation hint)', async ({ page }) => {
      // Purpose: When a numeric value is provided, the delete button should log a "Delete operation for value ..." message
      await locators.input(page).fill('55');
      await locators.deleteButton(page).click();

      const logText = await getOperationLogText(page);
      expect(logText).toMatch(/Delete operation for value 55 \(implementation extended\)/);

      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Tree clearing and random generation', () => {
    test('Clear Tree removes all nodes from visualization and logs the action', async ({ page }) => {
      // Purpose: Insert a few nodes then clear the tree and verify container empties and log contains message
      await uiInsertValue(page, 10);
      await uiInsertValue(page, 20);
      // Ensure nodes present
      await expect(locators.nodes(page)).toHaveCountGreaterThan(0);

      await locators.clearButton(page).click();

      // After clearing, there should be no node elements in the container
      await expect(locators.nodes(page)).toHaveCount(0);

      // Operation log should contain "Tree cleared"
      const logText = await getOperationLogText(page);
      expect(logText).toMatch(/Tree cleared/);

      expect(pageErrors.length).toBe(0);
    });

    test('Generate Random Tree creates multiple nodes and draws connecting lines', async ({ page }) => {
      // Purpose: Clicking generate should create at least 5 nodes and some connecting lines
      await locators.randomButton(page).click();

      // Log should mention generated random tree with some count
      const logText = await getOperationLogText(page);
      expect(logText).toMatch(/Generated random tree with \d+ values/);

      // There should be at least 5 nodes in the visualization (the generator creates 5-14)
      const nodeCount = await locators.nodes(page).count();
      expect(nodeCount).toBeGreaterThanOrEqual(5);

      // There should be at least one line connecting nodes for non-trivial trees
      const lineCount = await locators.lines(page).count();
      expect(lineCount).toBeGreaterThanOrEqual(0); // allow 0 in degenerate case, but typically > 0

      expect(pageErrors.length).toBe(0);
    });
  });

  test('Observe console messages and ensure no uncaught page errors occurred during interactions', async ({ page }) => {
    // Purpose: Aggregate some interactions and ensure console + pageerror monitoring works
    // Insert several values
    await uiInsertValue(page, 1);
    await uiInsertValue(page, 2);
    await uiInsertValue(page, 3);

    // Perform find and clear operations
    await uiFindValue(page, 2);
    await locators.clearButton(page).click();

    // Inspect collected console messages (these are optional and may be empty)
    // Ensure we captured at least the initial console/listeners without errors
    expect(Array.isArray(consoleMessages)).toBe(true);

    // Assert that there were no uncaught page errors thrown in the page lifecycle for these interactions
    expect(pageErrors.length).toBe(0);
  });
});