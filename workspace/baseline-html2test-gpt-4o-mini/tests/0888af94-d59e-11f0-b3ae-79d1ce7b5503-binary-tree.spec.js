import { test, expect } from '@playwright/test';

// Page Object for the Binary Tree application
class BinaryTreePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.container = page.locator('#tree-container');
    this.addAButton = page.locator('button', { hasText: 'Add Node A' });
    this.addBButton = page.locator('button', { hasText: 'Add Node B' });
    this.addCButton = page.locator('button', { hasText: 'Add Node C' });
    this.buildExampleButton = page.locator('button', { hasText: 'Build Example Tree' });
    this.nodes = () => page.locator('.node');
    this.heading = page.locator('h1');
    this.instructions = page.locator('p');
  }

  // Convenience helpers to interact with the UI
  async goto() {
    await this.page.goto('http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/0888af94-d59e-11f0-b3ae-79d1ce7b5503.html', { waitUntil: 'load' });
  }

  async addNodeA() {
    await this.addAButton.click();
  }
  async addNodeB() {
    await this.addBButton.click();
  }
  async addNodeC() {
    await this.addCButton.click();
  }
  async buildExample() {
    await this.buildExampleButton.click();
  }

  async countNodes() {
    return await this.nodes().count();
  }

  // Return array of visible text content for each .node element in DOM order
  async getNodeTexts() {
    const count = await this.countNodes();
    const texts = [];
    for (let i = 0; i < count; i++) {
      const locator = this.nodes().nth(i);
      const text = await locator.innerText();
      // Trim whitespace and newlines that may come from nested children
      texts.push(text.trim());
    }
    return texts;
  }

  async getContainerInnerHTML() {
    return await this.container.evaluate(el => el.innerHTML);
  }
}

test.describe('Binary Tree Visualization - 0888af94-d59e-11f0-b3ae-79d1ce7b5503', () => {
  let pageErrors = [];
  let consoleMessages = [];

  test.beforeEach(async ({ page }) => {
    // Reset captured messages for each test
    pageErrors = [];
    consoleMessages = [];

    // Capture console messages for later assertions / inspection
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
  });

  // Group tests related to layout and initial state
  test.describe('Initial load and layout', () => {
    test('should load the page and show heading, instructions and buttons', async ({ page }) => {
      // Arrange
      const app = new BinaryTreePage(page);

      // Act
      await app.goto();

      // Assert UI elements are present and have expected content
      await expect(app.heading).toHaveText('Binary Tree Visualization');
      await expect(app.instructions).toHaveText('Click the buttons to create a binary tree.');

      // Verify buttons exist
      await expect(app.addAButton).toBeVisible();
      await expect(app.addBButton).toBeVisible();
      await expect(app.addCButton).toBeVisible();
      await expect(app.buildExampleButton).toBeVisible();

      // Verify the tree container is present and initially empty
      const inner = await app.getContainerInnerHTML();
      expect(inner.trim()).toBe('', 'Tree container should be empty on initial load');

      // Ensure no uncaught page errors occurred on load
      expect(pageErrors.length).toBe(0);
    });
  });

  // Group tests that exercise node insertion via buttons
  test.describe('Node insertion interactions', () => {
    test('clicking "Add Node A" creates a single root node with value A', async ({ page }) => {
      // Arrange
      const app1 = new BinaryTreePage(page);
      await app.goto();

      // Act: add A
      await app.addNodeA();

      // Assert: one .node element exists with text 'A'
      const count1 = await app.countNodes();
      expect(count).toBe(1);

      const texts1 = await app.getNodeTexts();
      // The node text may include nested whitespace; check it contains 'A'
      expect(texts[0]).toContain('A');

      // No page errors should have been thrown
      expect(pageErrors.length).toBe(0);
    });

    test('adding B then C results in two node elements and correct DOM order', async ({ page }) => {
      // Arrange
      const app2 = new BinaryTreePage(page);
      await app.goto();

      // Act: add B then C
      await app.addNodeB();
      await app.addNodeC();

      // Assert: there should be two nodes
      const count2 = await app.countNodes();
      expect(count).toBe(2);

      const texts2 = await app.getNodeTexts();
      // First node should be root (B) and second should be C (right child)
      expect(texts[0]).toContain('B');
      expect(texts[1]).toContain('C');

      // Container HTML should include nested structure for children
      const html = await app.getContainerInnerHTML();
      expect(html).toContain('B');
      expect(html).toContain('C');

      // Ensure no uncaught errors
      expect(pageErrors.length).toBe(0);
    });

    test('building the example tree creates exactly seven nodes containing D,B,A,C,F,E,G', async ({ page }) => {
      // Arrange
      const app3 = new BinaryTreePage(page);
      await app.goto();

      // Act: build example tree
      await app.buildExample();

      // Assert: seven nodes rendered
      const count3 = await app.countNodes();
      expect(count).toBe(7);

      // Collect node texts and check for presence of each expected value
      const texts3 = await app.getNodeTexts();
      const flatText = texts.join(' ');
      ['D', 'B', 'A', 'C', 'F', 'E', 'G'].forEach(letter => {
        expect(flatText).toContain(letter);
      });

      // First .node should be the root 'D' according to the draw order (root then left then right)
      expect(texts[0]).toContain('D');

      // No page errors thrown by building the example
      expect(pageErrors.length).toBe(0);
    });

    test('adding duplicate values places the duplicate in the right subtree (insertion uses else branch)', async ({ page }) => {
      // Arrange
      const app4 = new BinaryTreePage(page);
      await app.goto();

      // Act: add A twice via the button
      await app.addNodeA();
      await app.addNodeA(); // duplicate

      // Assert: two nodes should exist and both should contain 'A'
      const count4 = await app.countNodes();
      expect(count).toBe(2);

      const texts4 = await app.getNodeTexts();
      // Both entries should include an 'A' (root and its right child)
      expect(texts[0]).toContain('A');
      expect(texts[1]).toContain('A');

      // Check DOM structure: container innerHTML should contain two 'A' occurrences
      const html1 = await app.getContainerInnerHTML();
      const occurrences = (html.match(/A/g) || []).length;
      expect(occurrences).toBeGreaterThanOrEqual(2);

      expect(pageErrors.length).toBe(0);
    });
  });

  // Tests relating to console messages and error observation
  test.describe('Console and page error observation', () => {
    test('should not emit uncaught page errors during normal interactions', async ({ page }) => {
      // Arrange
      const app5 = new BinaryTreePage(page);
      await app.goto();

      // Act: do a set of interactions
      await app.addNodeA();
      await app.addNodeB();
      await app.buildExample();

      // Assert: inspect captured page errors and console messages
      // We expect no uncaught exceptions (pageerror) during normal operation
      expect(pageErrors.length).toBe(0);

      // Collect any console.error messages if present and surface them in assertion messages
      const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
      // It's acceptable to have no console errors; if there are, fail the test to surface issues
      expect(errorConsoleMessages.length, `console.error messages were emitted: ${JSON.stringify(errorConsoleMessages)}`).toBe(0);
    });

    test('captures console logs and page errors if they occur (observability test)', async ({ page }) => {
      // This test ensures our listeners are working. We do not expect errors for the current implementation.
      const app6 = new BinaryTreePage(page);
      await app.goto();

      // Trigger some interactions
      await app.addNodeC();
      await app.addNodeB();

      // Basic sanity assertions about captured console messages array shape
      expect(Array.isArray(consoleMessages)).toBe(true);
      consoleMessages.forEach(msg => {
        expect(msg).toHaveProperty('type');
        expect(msg).toHaveProperty('text');
      });

      // Ensure again no unexpected page errors
      expect(pageErrors.length).toBe(0);
    });
  });

  test.afterEach(async ({ page }) => {
    // As part of teardown we assert there are no unexpected uncaught exceptions collected.
    // If tests intentionally caused errors, those tests should assert their presence themselves.
    expect(pageErrors.length).toBe(0);
  });
});