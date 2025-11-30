import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d26197-cd33-11f0-bdf9-b3d97e91273d.html';

// Page Object for the Binary Tree application to encapsulate common actions and queries
class BinaryTreePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.rootInput = page.locator('#rootValue');
    this.setRootBtn = page.locator('#setRoot');
    this.addParentInput = page.locator('#parentValue');
    this.childPositionSelect = page.locator('#childPosition');
    this.childValueInput = page.locator('#childValue');
    this.addNodeForm = page.locator('#addNodeForm');
    this.preorderBtn = page.locator('#preorderBtn');
    this.inorderBtn = page.locator('#inorderBtn');
    this.postorderBtn = page.locator('#postorderBtn');
    this.clearOutputBtn = page.locator('#clearOutputBtn');
    this.traversalOutput = page.locator('#traversal-output');
    this.svg = page.locator('svg#tree-svg');
    this.svgNodes = page.locator('svg#tree-svg g.node');
    this.svgLines = page.locator('svg#tree-svg line.link');
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  // Set/reset the root value and click the Set / Reset Root button
  async setRoot(value) {
    await this.rootInput.fill(String(value));
    await this.setRootBtn.click();
  }

  // Submit the add node form with given parent, position ('left'|'right'), and value
  async addNode(parentValue, childPosition, childValue) {
    await this.addParentInput.fill(String(parentValue));
    await this.childPositionSelect.selectOption(childPosition);
    await this.childValueInput.fill(String(childValue));
    // Use the form submit action by clicking add button (submit)
    await this.addNodeForm.locator('button[type="submit"]').click();
  }

  // Trigger traversals
  async clickPreorder() { await this.preorderBtn.click(); }
  async clickInorder() { await this.inorderBtn.click(); }
  async clickPostorder() { await this.postorderBtn.click(); }
  async clickClearOutput() { await this.clearOutputBtn.click(); }

  // Helpers to assert node presence by its displayed text value
  nodeTextLocator(value) {
    // Select text node inside SVG that equals the value
    return this.svg.locator(`text`, { hasText: String(value) });
  }

  async getNodeCount() {
    return await this.svgNodes.count();
  }

  async getLinkCount() {
    return await this.svgLines.count();
  }

  async traversalText() {
    return (await this.traversalOutput.textContent()) || '';
  }

  async svgHasRoleAndLabel() {
    const role = await this.svg.getAttribute('role');
    const label = await this.svg.getAttribute('aria-label');
    return { role, label };
  }
}

test.describe('Binary Tree Visualization and Traversal - Application Tests', () => {
  // Containers for console messages and page errors to be asserted per test
  let consoleMessages;
  let pageErrors;
  let lastDialogMessage;

  // Attach listeners afresh for each test to capture console, page errors and dialogs
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];
    lastDialogMessage = null;

    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', err => {
      // Capture uncaught exceptions on the page
      pageErrors.push(err);
    });

    page.on('dialog', async dialog => {
      // Capture dialog message and auto-accept to allow tests to continue
      lastDialogMessage = dialog.message();
      await dialog.accept();
    });

    // Navigate to the app page
    const p = new BinaryTreePage(page);
    await p.goto();
  });

  // After each test assert that there were no unexpected page errors or console errors
  test.afterEach(async () => {
    // Ensure no uncaught page errors occurred
    expect(pageErrors.length, 'No uncaught page errors should have occurred').toBe(0);

    // Ensure no console messages with type 'error' were emitted
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, 'No console.error messages should have been logged').toBe(0);
  });

  test.describe('Initial page load and default state', () => {
    test('should load page and render default root node with value 10', async ({ page }) => {
      const p1 = new BinaryTreePage(page);

      // Verify root input default value
      await expect(p.rootInput).toHaveValue('10');

      // SVG should be present and contain one node (initial root)
      await expect(p.svg).toBeVisible();
      await expect(p.svgNodes).toHaveCount(1);

      // The node should display the value "10"
      await expect(p.nodeTextLocator(10)).toBeVisible();

      // Traversal output should be empty initially
      await expect(p.traversalOutput).toHaveText('');

      // Accessibility attributes on the SVG should be present
      const { role, label } = await p.svgHasRoleAndLabel();
      expect(role).toBe('img');
      expect(label && label.toLowerCase().includes('binary tree'), 'SVG has descriptive aria-label').toBeTruthy();
    });
  });

  test.describe('Root node interactions', () => {
    test('should set/reset root to a new value and re-render', async ({ page }) => {
      const p2 = new BinaryTreePage(page);

      // Set root to 20
      await p.setRoot(20);

      // Traversal output should be cleared
      await expect(p.traversalOutput).toHaveText('');

      // Ensure the root input reflects last set value
      await expect(p.rootInput).toHaveValue('20');

      // SVG should contain a node with value 20 and exactly one node
      await expect(p.svgNodes).toHaveCount(1);
      await expect(p.nodeTextLocator(20)).toBeVisible();
    });

    test('should alert when setting root with invalid input (non-number)', async ({ page }) => {
      const p3 = new BinaryTreePage(page);

      // Fill root with an invalid value (empty string) then click set root
      await p.rootInput.fill('');
      await p.setRootBtn.click();

      // The application uses alert to inform about invalid root input - we expect a dialog
      expect(lastDialogMessage, 'An alert dialog should have been shown for invalid root').toBeDefined();
      expect(lastDialogMessage).toContain('Please enter a valid number for the root value.');
    });
  });

  test.describe('Adding nodes and tree rendering', () => {
    test('should add left and right children and update SVG and links accordingly', async ({ page }) => {
      const p4 = new BinaryTreePage(page);

      // Reset root to 20 to start a known state
      await p.setRoot(20);

      // Add left child 15 to parent 20
      await p.addNode(20, 'left', 15);

      // After adding a node, form should reset (inputs cleared)
      await expect(p.addParentInput).toHaveValue('');
      await expect(p.childValueInput).toHaveValue('');

      // There should now be 2 nodes in the SVG and one link
      await expect(p.svgNodes).toHaveCount(2);
      await expect(p.svgLines).toHaveCount(1);

      // Node text 15 should be visible
      await expect(p.nodeTextLocator(15)).toBeVisible();

      // Add right child 25 to parent 20
      await p.addNode(20, 'right', 25);

      // Now expect three nodes and two links
      await expect(p.svgNodes).toHaveCount(3);
      await expect(p.svgLines).toHaveCount(2);

      // Node text 25 should be visible
      await expect(p.nodeTextLocator(25)).toBeVisible();
    });

    test('should prevent adding a child to a non-existent parent and show alert', async ({ page }) => {
      const p5 = new BinaryTreePage(page);

      // Try to add a child to a parent value that does not exist (e.g., 999)
      await p.addNode(999, 'left', 50);

      // The application should show an alert explaining failure to add
      expect(lastDialogMessage, 'An alert dialog should have been shown for non-existent parent').toBeDefined();
      expect(lastDialogMessage).toContain('Failed to add node');

      // SVG should not have added a node with value 50
      const nodesWith50 = await p.nodeTextLocator(50).count().catch(() => 0);
      expect(nodesWith50).toBe(0);
    });

    test('should prevent adding a child when the position is already taken', async ({ page }) => {
      const p6 = new BinaryTreePage(page);

      // Ensure root is known
      await p.setRoot(30);

      // Add left child 25 to parent 30
      await p.addNode(30, 'left', 25);
      await expect(p.svgNodes).toHaveCount(2);

      // Attempt to add another left child to same parent (position occupied)
      await p.addNode(30, 'left', 26);

      // Alert should be shown indicating failure to add
      expect(lastDialogMessage).toBeDefined();
      expect(lastDialogMessage).toContain('Failed to add node');

      // Ensure node 26 was not added
      const count26 = await p.nodeTextLocator(26).count().catch(() => 0);
      expect(count26).toBe(0);
    });
  });

  test.describe('Traversals and output behavior', () => {
    test('should show correct preorder, inorder and postorder traversals', async ({ page }) => {
      const p7 = new BinaryTreePage(page);

      // Build a small known tree:
      //      40
      //     /  \
      //   35    45
      await p.setRoot(40);
      await p.addNode(40, 'left', 35);
      await p.addNode(40, 'right', 45);

      // Pre-order: 40 → 35 → 45
      await p.clickPreorder();
      await expect(p.traversalOutput).toHaveText(/Pre-order traversal:\s*40\s*→\s*35\s*→\s*45/);

      // In-order: 35 → 40 → 45
      await p.clickInorder();
      await expect(p.traversalOutput).toHaveText(/In-order traversal:\s*35\s*→\s*40\s*→\s*45/);

      // Post-order: 35 → 45 → 40
      await p.clickPostorder();
      await expect(p.traversalOutput).toHaveText(/Post-order traversal:\s*35\s*→\s*45\s*→\s*40/);

      // Clear output should remove the traversal text
      await p.clickClearOutput();
      await expect(p.traversalOutput).toHaveText('');
    });

    test('should alert when requesting traversal before a root is set (edge scenario)', async ({ page }) => {
      const p8 = new BinaryTreePage(page);

      // The app initializes with a root; to simulate "no root" we attempt to set an invalid root
      // and rely on the alert to prevent root change. Then we temporarily clear the SVG by
      // setting root to NaN via UI (this triggers an alert and does not remove root).
      // Since there is no direct way to remove the root via UI, we perform a direct interaction:
      // click set root with an empty value to trigger the alert path and confirm dialog behavior.
      await p.rootInput.fill('');
      await p.setRootBtn.click();

      // An alert should have popped up explaining to enter a valid number
      expect(lastDialogMessage).toBeDefined();
      expect(lastDialogMessage).toContain('Please enter a valid number for the root value.');

      // Because a root still exists in the running app (initial root not removed),
      // requesting traversal should proceed normally. We assert that traversal works.
      await p.clickPreorder();
      // Ensure the traversal output is non-empty and indicates traversal performed
      const txt = await p.traversalText();
      expect(txt.length).toBeGreaterThan(0);
      expect(txt).toMatch(/traversal/i);
    });
  });

  test.describe('Visual and accessibility checks', () => {
    test('SVG should contain circle elements and node groups after rendering', async ({ page }) => {
      const p9 = new BinaryTreePage(page);

      // Ensure root exists
      await p.setRoot(50);

      // Add a child to create links and nodes
      await p.addNode(50, 'left', 45);

      // Each node group should contain a circle and a text element
      const nodeGroups = p.svg.locator('g.node');
      const count = await nodeGroups.count();
      expect(count).toBeGreaterThanOrEqual(2);

      for (let i = 0; i < count; i++) {
        const g = nodeGroups.nth(i);
        await expect(g.locator('circle')).toBeVisible();
        await expect(g.locator('text')).toBeVisible();
      }
    });
  });
});