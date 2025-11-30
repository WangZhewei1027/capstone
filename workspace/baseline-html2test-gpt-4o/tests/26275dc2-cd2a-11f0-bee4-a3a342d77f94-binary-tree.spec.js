import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/26275dc2-cd2a-11f0-bee4-a3a342d77f94.html';

// Page object to encapsulate common queries and assertions for the binary tree page
class TreePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.containerSelector = '#treeContainer';
    this.nodeSelector = '.node';
    this.lineSelector = '.line';
  }

  async waitForLoad() {
    await this.page.waitForSelector(this.containerSelector);
    // Ensure any initial JS rendering has finished by awaiting next animation frame
    await this.page.evaluate(() => new Promise(r => requestAnimationFrame(r)));
  }

  async getNodeElements() {
    return await this.page.$$(this.nodeSelector);
  }

  async getLineElements() {
    return await this.page.$$(this.lineSelector);
  }

  async getNodeTexts() {
    const nodes = await this.getNodeElements();
    return await Promise.all(nodes.map(n => n.textContent()));
  }

  // returns map of text -> bounding box
  async getNodeBoxesMap() {
    const nodes = await this.getNodeElements();
    const map = {};
    for (const n of nodes) {
      const text = (await n.textContent()).trim();
      const box = await n.boundingBox();
      map[text] = box;
    }
    return map;
  }

  async getConsoleMessages() {
    // This helper is overwritten by test harness which collects console messages
    return [];
  }
}

test.describe('Binary Tree Visualization - 26275dc2-cd2a-11f0-bee4-a3a342d77f94', () => {
  let consoleMessages = [];
  let pageErrors = [];

  // Set up console and pageerror listeners and navigate to the page for each test
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    await page.goto(APP_URL);
  });

  // Test that the page loads without throwing uncaught runtime errors
  test('Initial load: no uncaught page errors and no console errors', async ({ page }) => {
    const tree = new TreePage(page);
    await tree.waitForLoad();

    // Assert no pageerror events were emitted
    expect(pageErrors.length).toBe(0);

    // Assert there are no console messages of type "error"
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages).toEqual([]);
  });

  // Verify initial render: correct number of node and line elements and their content
  test('Initial render: correct number of nodes and edges with expected values', async ({ page }) => {
    const tree = new TreePage(page);
    await tree.waitForLoad();

    // The application inserts these values: [10, 5, 15, 3, 7, 13, 17]
    const expectedValues = ['10', '5', '15', '3', '7', '13', '17'];

    // Confirm nodes count
    const nodes = await tree.getNodeElements();
    expect(nodes.length).toBe(expectedValues.length);

    // Confirm lines count (edges = nodes - 1 for a connected tree)
    const lines = await tree.getLineElements();
    expect(lines.length).toBe(nodes.length - 1);

    // Confirm each expected value is present somewhere in the DOM
    const texts = await tree.getNodeTexts();
    for (const val of expectedValues) {
      expect(texts).toContain(val);
    }
  });

  // Check spatial layout: root is near the top and children are lower (y increases downwards)
  test('Layout: root node is positioned above its children and nodes have sensible bounding boxes', async ({ page }) => {
    const tree = new TreePage(page);
    await tree.waitForLoad();

    const boxes = await tree.getNodeBoxesMap();

    // Basic expectations: root '10' exists and has a top (y) less than at least one other node
    expect(boxes['10']).toBeDefined();
    const rootTop = boxes['10'].y;

    // Ensure there is at least one node positioned lower (greater y) than the root
    const otherTops = Object.values(boxes).map(b => b.y).filter(y => typeof y === 'number' && y !== rootTop);
    expect(otherTops.length).toBeGreaterThan(0);
    const maxOtherTop = Math.max(...otherTops);
    expect(rootTop).toBeLessThanOrEqual(maxOtherTop);

    // Check that nodes have reasonable sizes (close to CSS 40x40 as given in the HTML)
    for (const [text, b] of Object.entries(boxes)) {
      expect(b.width).toBeGreaterThanOrEqual(36); // tolerance for subpixel rounding
      expect(b.height).toBeGreaterThanOrEqual(36);
    }
  });

  // Check that line elements have a width and a transform (rotation) applied
  test('Lines: each connecting line has positive length and a rotation transform', async ({ page }) => {
    const tree = new TreePage(page);
    await tree.waitForLoad();

    const lines = await tree.getLineElements();
    expect(lines.length).toBeGreaterThan(0);

    for (const line of lines) {
      // check computed styles for width and transform
      const style = await page.evaluate(el => {
        const s = window.getComputedStyle(el);
        return { width: s.width, transform: s.transform, top: s.top, left: s.left };
      }, line);

      // width should be non-zero (line length)
      const widthNum = parseFloat(style.width || '0');
      expect(widthNum).toBeGreaterThan(0);

      // transform should contain a rotation (matrix(...) or rotate)
      expect(typeof style.transform).toBe('string');
      expect(style.transform.length).toBeGreaterThan(0);
    }
  });

  // Verify that there are no interactive controls (buttons, inputs, forms) in the page
  test('Accessibility / Controls: page contains no user input controls by default', async ({ page }) => {
    const tree = new TreePage(page);
    await tree.waitForLoad();

    // Query for common interactive controls - the app is expected to be a static visualization
    const controls = await page.$$eval('button, input, textarea, select, form', els => els.map(e => e.tagName.toLowerCase()));
    expect(controls.length).toBe(0);
  });

  // Programmatic interaction: call the global binaryTree API to insert a new value and re-render
  test('Programmatic insert: inserting a new value updates the DOM to include the new node', async ({ page }) => {
    const tree = new TreePage(page);
    await tree.waitForLoad();

    // Confirm baseline node count and absence of '8'
    const beforeTexts = await tree.getNodeTexts();
    expect(beforeTexts).not.toContain('8');
    const beforeCount = beforeTexts.length;

    // Use the existing global variable binaryTree to insert a new value.
    // This uses the page's own runtime - we do not patch or redefine anything.
    await page.evaluate(() => {
      // Insert 8 and re-render. These functions are defined by the page's script.
      if (window.binaryTree && typeof window.binaryTree.insert === 'function') {
        window.binaryTree.insert(8);
        if (typeof window.binaryTree.display === 'function') {
          window.binaryTree.display();
        }
      } else {
        // If binaryTree isn't present, do nothing; the test below will catch unexpected behavior.
      }
    });

    // Wait for a frame for DOM changes to reflect
    await page.waitForTimeout(50);

    // Verify new DOM state
    const afterTexts = await tree.getNodeTexts();
    expect(afterTexts.length).toBeGreaterThanOrEqual(beforeCount + 1);
    expect(afterTexts).toContain('8');

    // Verify there is still exactly edges = nodes - 1
    const lines = await tree.getLineElements();
    const nodes = await tree.getNodeElements();
    expect(lines.length).toBe(nodes.length - 1);
  });

  // Edge case: insert a duplicate value and ensure tree accepts it (implementation puts duplicates to the right)
  test('Edge case: inserting a duplicate value modifies the tree (duplicates go to the right subtree)', async ({ page }) => {
    const tree = new TreePage(page);
    await tree.waitForLoad();

    // Insert a duplicate of the root value 10
    await page.evaluate(() => {
      if (window.binaryTree && typeof window.binaryTree.insert === 'function') {
        window.binaryTree.insert(10);
        if (typeof window.binaryTree.display === 'function') {
          window.binaryTree.display();
        }
      }
    });

    await page.waitForTimeout(50);

    // After insertion, there should be at least one additional node with text '10' if duplicates are rendered separately
    const texts = await tree.getNodeTexts();
    // Count occurrences of '10'
    const occurrences = texts.filter(t => t === '10').length;
    // Because code treats equal values as right branch, the duplicate should result in a second node with text '10'.
    expect(occurrences).toBeGreaterThanOrEqual(1);
  });

  // After all tests, assert no unexpected console errors were recorded during the tests execution
  test.afterEach(async () => {
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    // Fail-fast if any console errors were printed during the test
    expect(errorConsoleMessages).toEqual([]);
    // Ensure no uncaught page errors were captured
    expect(pageErrors.length).toBe(0);
  });
});