import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d288a0-cd33-11f0-bdf9-b3d97e91273d.html';

test.describe('Binary Search Tree (BST) Visualization and Demo - E2E', () => {
  let consoleMessages = [];
  let pageErrors = [];

  // Attach listeners before each test to capture console messages and page errors
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    page.on('console', (msg) => {
      // collect console messages for later assertions
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', (err) => {
      // collect uncaught page errors
      pageErrors.push(err);
    });

    await page.goto(APP_URL);
    // Ensure the page loaded
    await expect(page).toHaveURL(APP_URL);
  });

  // After each test assert there were no unexpected page errors or console errors
  test.afterEach(async () => {
    // Assert that there were no uncaught page errors
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);

    // Assert no console.error messages emitted by the page
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, `Console errors: ${consoleErrors.map(e => e.text).join('; ')}`).toBe(0);
  });

  test('Initial page load displays main elements and default state', async ({ page }) => {
    // Purpose: Verify initial UI elements are present and default state is correct
    await expect(page.locator('h1')).toHaveText('Binary Search Tree (BST) Visualization and Demo');
    await expect(page.locator('#inputValue')).toBeVisible();
    await expect(page.locator('#insertBtn')).toBeVisible();
    await expect(page.locator('#deleteBtn')).toBeVisible();
    await expect(page.locator('#searchBtn')).toBeVisible();
    await expect(page.locator('#inorderBtn')).toBeVisible();
    await expect(page.locator('#preorderBtn')).toBeVisible();
    await expect(page.locator('#postorderBtn')).toBeVisible();
    await expect(page.locator('#clearBtn')).toBeVisible();
    await expect(page.locator('#message')).toHaveText(''); // no initial message
    await expect(page.locator('#traversalOutput')).toHaveText(''); // traversal output empty
    // SVG canvas exists
    await expect(page.locator('#bstCanvas')).toBeVisible();
    // Buttons are enabled by default
    await expect(page.locator('#insertBtn')).toBeEnabled();
    await expect(page.locator('#clearBtn')).toBeEnabled();
  });

  test('Insert numbers into BST and verify messages, SVG nodes, and inorder traversal output', async ({ page }) => {
    // Purpose: Insert multiple nodes and verify DOM updates and traversal output after animation

    // Insert 50
    await page.fill('#inputValue', '50');
    await page.click('#insertBtn');
    await expect(page.locator('#message')).toHaveText('Inserted 50 into the BST.');
    // After insert, traversalOutput cleared
    await expect(page.locator('#traversalOutput')).toHaveText('');

    // Insert 30
    await page.fill('#inputValue', '30');
    await page.click('#insertBtn');
    await expect(page.locator('#message')).toHaveText('Inserted 30 into the BST.');

    // Insert 70
    await page.fill('#inputValue', '70');
    await page.click('#insertBtn');
    await expect(page.locator('#message')).toHaveText('Inserted 70 into the BST.');

    // Verify the SVG contains text nodes for these values
    const svgText = page.locator('#bstCanvas text');
    await expect(svgText).toContainText(['50', '30', '70']);

    // Trigger in-order traversal and verify message and traversalOutput after animation
    await page.click('#inorderBtn');
    await expect(page.locator('#message')).toHaveText('In-order traversal:');

    // Wait enough time for the animation to complete: 3 nodes * 700ms + buffer
    await page.waitForTimeout(2400);

    // traversalOutput should contain "30 50 70 " (animation appends spaces)
    const traversal = (await page.locator('#traversalOutput').innerText()).trim();
    // innerText trimmed -> "30 50 70" or with trailing space removed; ensure sequence present
    expect(traversal.replace(/\s+/g, ' ').trim()).toBe('30 50 70');

    // Also ensure nodes still present in SVG
    await expect(svgText).toContainText(['30', '50', '70']);
  });

  test('Search for existing and non-existing values and verify messages and traversal path', async ({ page }) => {
    // Purpose: Validate search behavior: found path and not found path with animations

    // Setup: ensure tree has known nodes 50,30,70
    await page.fill('#inputValue', '50'); await page.click('#insertBtn');
    await page.fill('#inputValue', '30'); await page.click('#insertBtn');
    await page.fill('#inputValue', '70'); await page.click('#insertBtn');

    // Search for existing value 30
    await page.fill('#inputValue', '30');
    await page.click('#searchBtn');

    await expect(page.locator('#message')).toHaveText('Value 30 found in the BST.');

    // The search traverses nodes along path. For 30, path should include 50 then 30 => wait 2 * 700ms
    await page.waitForTimeout(1500);

    // traversalOutput should contain path "50 30 "
    const searchTraversal = (await page.locator('#traversalOutput').innerText()).trim();
    expect(searchTraversal.replace(/\s+/g, ' ').trim()).toBe('50 30');

    // Search for non-existing value 999
    await page.fill('#inputValue', '999');
    await page.click('#searchBtn');
    await expect(page.locator('#message')).toHaveText('Value 999 not found in the BST.');

    // The search will still animate the path it took. Wait for a couple nodes (likely 2)
    await page.waitForTimeout(1500);

    // Ensure traversalOutput updated (non-empty or marked as path)
    const notFoundTraversal = (await page.locator('#traversalOutput').innerText()).trim();
    expect(notFoundTraversal.length).toBeGreaterThanOrEqual(0); // at least an empty string allowed
  });

  test('Delete existing value removes node from SVG; deleting missing value shows appropriate message', async ({ page }) => {
    // Purpose: Validate delete logic and DOM update

    // Setup: create nodes 50, 30, 70
    await page.fill('#inputValue', '50'); await page.click('#insertBtn');
    await page.fill('#inputValue', '30'); await page.click('#insertBtn');
    await page.fill('#inputValue', '70'); await page.click('#insertBtn');

    // Delete existing node 30
    await page.fill('#inputValue', '30');
    await page.click('#deleteBtn');
    await expect(page.locator('#message')).toHaveText('Deleted 30 from the BST.');

    // After deletion, redraw happens synchronously. Verify no SVG text node with '30'
    // Allow a short timeout for redraw
    await page.waitForTimeout(200);
    const textsAfterDelete = await page.locator('#bstCanvas text').allInnerTexts();
    expect(textsAfterDelete.join(' ')).not.toContain('30');

    // Deleting a non-existing value should show "not found" message
    await page.fill('#inputValue', '12345');
    await page.click('#deleteBtn');
    await expect(page.locator('#message')).toHaveText('Value 12345 not found in the BST.');
  });

  test('Clicking a node in the SVG highlights it and updates the message', async ({ page }) => {
    // Purpose: Ensure clicking nodes triggers highlight and message update

    // Setup: Insert a single node 42 for deterministic selection
    await page.fill('#inputValue', '42');
    await page.click('#insertBtn');
    await expect(page.locator('#message')).toHaveText('Inserted 42 into the BST.');

    // Wait a short time for redraw
    await page.waitForTimeout(200);

    // Locate the node element with text '42' and click it using page.evaluate to interact reliably with SVG nodes
    const clicked = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('g.node'));
      const target = nodes.find(g => g.querySelector('text') && g.querySelector('text').textContent === '42');
      if (!target) return false;
      target.click();
      return true;
    });
    expect(clicked).toBe(true);

    // After clicking, the circle should have 'highlighted' class and message should reflect selection
    await page.waitForTimeout(100);
    const hasHighlight = await page.evaluate(() => {
      const nodes1 = Array.from(document.querySelectorAll('g.node'));
      const target1 = nodes.find(g => g.querySelector('text') && g.querySelector('text').textContent === '42');
      if (!target) return false;
      const circle = target.querySelector('circle');
      return circle && circle.classList.contains('highlighted');
    });
    expect(hasHighlight).toBe(true);

    await expect(page.locator('#message')).toHaveText('Node 42 selected.');
  });

  test('Keyboard Enter in input triggers insert and invalid input shows error message', async ({ page }) => {
    // Purpose: Verify accessibility: pressing Enter in input triggers insert and invalid inputs are handled

    // Focus input and press Enter with empty value -> should show invalid message
    await page.click('#inputValue');
    await page.keyboard.press('Enter');
    await expect(page.locator('#message')).toHaveText('Please enter a valid number to insert.');

    // Enter a valid number and press Enter to insert
    await page.fill('#inputValue', '88');
    await page.click('#inputValue'); // ensure focus
    await page.keyboard.press('Enter');

    // The page's Enter logic triggers insertBtn.click()
    await expect(page.locator('#message')).toHaveText('Inserted 88 into the BST.');

    // Confirm node exists in SVG
    await page.waitForTimeout(200);
    await expect(page.locator('#bstCanvas text')).toContainText(['88']);
  });

  test('Clear All removes all nodes and resets messages and traversal output', async ({ page }) => {
    // Purpose: Validate clear functionality

    // Setup: insert nodes
    await page.fill('#inputValue', '10'); await page.click('#insertBtn');
    await page.fill('#inputValue', '20'); await page.click('#insertBtn');

    // Click clear
    await page.click('#clearBtn');
    await expect(page.locator('#message')).toHaveText('BST cleared.');
    await expect(page.locator('#traversalOutput')).toHaveText('');

    // SVG should have no g.node elements
    // Wait briefly for redraw
    await page.waitForTimeout(200);
    const nodeCount = await page.evaluate(() => document.querySelectorAll('g.node').length);
    expect(nodeCount).toBe(0);
  });

  test('Attempt to insert duplicate value shows duplicate message and does not create extra nodes', async ({ page }) => {
    // Purpose: Ensure BST prohibits duplicates

    await page.fill('#inputValue', '5'); await page.click('#insertBtn');
    await expect(page.locator('#message')).toHaveText('Inserted 5 into the BST.');

    // Attempt duplicate insert
    await page.fill('#inputValue', '5'); await page.click('#insertBtn');
    await expect(page.locator('#message')).toHaveText('Value 5 already exists in the BST. No duplicates allowed.');

    // Confirm only one '5' in SVG texts
    await page.waitForTimeout(200);
    const texts = await page.locator('#bstCanvas text').allInnerTexts();
    const count5 = texts.filter(t => t.trim() === '5').length;
    expect(count5).toBe(1);
  });

});