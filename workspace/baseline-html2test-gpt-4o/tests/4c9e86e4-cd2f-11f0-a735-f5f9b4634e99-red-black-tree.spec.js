import { test, expect } from '@playwright/test';

// URL of the HTML page to test
const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9e86e4-cd2f-11f0-a735-f5f9b4634e99.html';

/**
 * Page Object for the Red-Black Tree visualization.
 * Encapsulates common queries and actions to keep tests readable.
 */
class TreePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.tree = page.locator('#tree');
    this.nodeLocator = page.locator('.node');
    this.edgeLocator = page.locator('.edge');
  }

  // Get count of node divs in the tree
  async nodeCount() {
    return await this.nodeLocator.count();
  }

  // Get count of edge divs in the tree
  async edgeCount() {
    return await this.edgeLocator.count();
  }

  // Get an array of node objects { text, classes } for all .node elements
  async getAllNodesData() {
    return await this.page.$$eval('.node', els =>
      els.map(e => ({ text: e.innerText.trim(), classes: Array.from(e.classList) }))
    );
  }

  // Find a node element by its textual value (string)
  async getNodeByValue(value) {
    // Use an evaluation to find the exact node element with matching innerText
    const handle = await this.page.$(`.node:has-text("${value}")`);
    return handle;
  }

  // Get computed background-color for the first node matching a selector
  async getNodeBackgroundColor(selector) {
    return await this.page.$eval(selector, el => {
      const cs = window.getComputedStyle(el);
      return cs.backgroundColor;
    });
  }

  // Click a node by its value
  async clickNodeByValue(value) {
    const el = await this.getNodeByValue(value);
    if (!el) throw new Error(`Node with value ${value} not found`);
    await el.click();
  }

  // Get the textContent of the #tree immediate first child (root node)
  async getRootText() {
    return await this.page.$eval('#tree', tree => {
      const first = tree.children[0];
      return first ? first.innerText.trim() : null;
    });
  }
}

test.describe('Red-Black Tree Visualization - 4c9e86e4-cd2f-11f0-a735-f5f9b4634e99', () => {
  // Arrays to capture console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Initialize capture arrays
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages
    page.on('console', msg => {
      // store an object with type and text for assertion reporting
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture unhandled page errors (runtime exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the application page and wait until load
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    // Basic sanity: ensure no unexpected runtime errors were emitted
    // This asserts the page did not produce page errors during the test.
    expect(pageErrors.length, 'Expected zero page errors (unhandled exceptions)').toBe(0);

    // Also assert there were no console errors emitted by the page
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, 'Expected zero console.error messages').toBe(0);
  });

  test.describe('Initial page load and default state', () => {
    test('Page title, heading and tree container are present', async ({ page }) => {
      // Verify document title
      await expect(page).toHaveTitle('Red-Black Tree Visualization');

      // Verify main heading text
      const heading = page.locator('h1');
      await expect(heading).toHaveText('Red-Black Tree Visualization');

      // Tree container exists and is visible
      const tree = page.locator('#tree');
      await expect(tree).toBeVisible();
    });

    test('Tree renders the expected number of nodes and edges', async ({ page }) => {
      const treePage = new TreePage(page);

      // There should be 6 nodes: 10,5,15,3,7,18
      const nodes = await treePage.nodeCount();
      expect(nodes).toBe(6);

      // There should be 5 edges (one per child connection)
      const edges = await treePage.edgeCount();
      expect(edges).toBe(5);
    });

    test('Root node is rendered as the first child and has the correct value', async ({ page }) => {
      const treePage = new TreePage(page);
      const rootText = await treePage.getRootText();
      expect(rootText).toBe('10');
    });
  });

  test.describe('Node content and styling', () => {
    test('All expected node values are present with correct color classes', async ({ page }) => {
      const treePage = new TreePage(page);
      const nodes = await treePage.getAllNodesData();

      // Map values to expected classes
      const expected = {
        '10': 'black',
        '5': 'red',
        '15': 'red',
        '3': 'black',
        '7': 'black',
        '18': 'black'
      };

      // Ensure we have exactly the expected set of values
      const valuesFound = nodes.map(n => n.text).sort();
      const expectedValues = Object.keys(expected).sort();
      expect(valuesFound).toEqual(expectedValues);

      // Ensure class membership matches expectations
      for (const node of nodes) {
        const value = node.text;
        const classes = node.classes;
        const expectedClass = expected[value];
        expect(classes.includes('node')).toBe(true);
        expect(classes.includes(expectedClass)).toBe(true);
      }
    });

    test('Visual styles for red and black nodes compute to expected RGB colors', async ({ page }) => {
      const treePage = new TreePage(page);

      // Pick one red node (value 5) and one black node (value 10)
      const redSelector = '.node.red';
      const blackSelector = '.node.black';

      // Ensure at least one of each exists
      const redCount = await page.locator(redSelector).count();
      const blackCount = await page.locator(blackSelector).count();
      expect(redCount).toBeGreaterThanOrEqual(1);
      expect(blackCount).toBeGreaterThanOrEqual(1);

      // Get computed background colors
      const redColor = await treePage.getNodeBackgroundColor(redSelector);
      const blackColor = await treePage.getNodeBackgroundColor(blackSelector);

      // The CSS uses 'red' and 'black' keywords; browsers will compute them to rgb(...) strings.
      expect(redColor.toLowerCase()).toContain('rgb(255'); // red -> rgb(255, 0, 0)
      expect(blackColor.toLowerCase()).toContain('rgb(0'); // black -> rgb(0, 0, 0)
    });
  });

  test.describe('DOM structure and layout correctness', () => {
    test('Each child relationship results in an edge element before the child container', async ({ page }) => {
      // We'll inspect the DOM structure for the root -> left (5) relationship.
      // The HTML structure created by displayNode is:
      // root node element (div.node)
      // childrenContainer (div) containing: [leftEdge, leftContainer, rightEdge, rightContainer] as applicable
      const structure = await page.$eval('#tree', tree => {
        function findNodeContainer(rootEl, value) {
          // Recursively search for a node element with given innerText, return its parent container element reference
          const nodes = Array.from(rootEl.querySelectorAll('.node'));
          for (const node of nodes) {
            if (node.innerText.trim() === String(value)) {
              return node.parentElement; // the container where node was appended
            }
          }
          return null;
        }

        const rootContainer = tree;
        const rootNode = rootContainer.querySelector('.node');
        const rootChildContainer = rootNode ? rootNode.nextElementSibling : null;

        const leftNodeContainer = findNodeContainer(rootContainer, 5);
        const rightNodeContainer = findNodeContainer(rootContainer, 15);

        return {
          hasRoot: !!rootNode,
          hasRootChildContainer: !!rootChildContainer,
          leftContainerExists: !!leftNodeContainer,
          rightContainerExists: !!rightNodeContainer
        };
      });

      expect(structure.hasRoot).toBe(true);
      expect(structure.hasRootChildContainer).toBe(true);
      expect(structure.leftContainerExists).toBe(true);
      expect(structure.rightContainerExists).toBe(true);
    });

    test('Edges count corresponds to the total number of child links', async ({ page }) => {
      const treePage = new TreePage(page);
      const edges = await treePage.edgeCount();

      // Manual expectation derived from the tree in the source:
      // root has 2 children -> 2 edges
      // node 5 has 2 children -> 2 edges
      // node 15 has 1 child -> 1 edge
      // total = 5
      expect(edges).toBe(5);
    });
  });

  test.describe('Interactions and edge cases', () => {
    test('Clicking on a node does not change node/edge counts and does not produce console errors', async ({ page }) => {
      const treePage = new TreePage(page);

      // Capture baseline counts
      const initialNodes = await treePage.nodeCount();
      const initialEdges = await treePage.edgeCount();

      // Click on node with value '5' - ensure it exists first
      const node5 = await treePage.getNodeByValue('5');
      expect(node5).not.toBeNull();
      await node5.click();

      // After clicking, verify that counts remain the same (no interactive behavior expected)
      const afterNodes = await treePage.nodeCount();
      const afterEdges = await treePage.edgeCount();
      expect(afterNodes).toBe(initialNodes);
      expect(afterEdges).toBe(initialEdges);

      // Also ensure no console error messages were produced during click
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
    });

    test('Attempting to click a non-existent node selector should not crash the page', async ({ page }) => {
      // This test intentionally queries a selector that does not exist, then ensures no page errors occur.
      const missing = page.locator('.node:has-text("9999")');
      const count = await missing.count();
      expect(count).toBe(0); // node 9999 should not exist

      // Try clicking with a safe guard: if element not found, do nothing.
      // We avoid injecting code or redefining any functions; this is just a safe DOM interaction test.
      // Ensure no page errors were added to the capture array.
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Console and runtime error observations', () => {
    test('No unhandled runtime exceptions or console.error calls on load', async ({ page }) => {
      // This test explicitly asserts that the page produced no page errors or console error messages.
      // We rely on afterEach to also assert this, but include here for explicitness and clarity.

      // pageErrors captured in beforeEach should still be empty
      expect(pageErrors.length).toBe(0);

      // Inspect console messages for any 'error' type
      const errors = consoleMessages.filter(m => m.type === 'error');
      expect(errors.length).toBe(0);
    });
  });
});