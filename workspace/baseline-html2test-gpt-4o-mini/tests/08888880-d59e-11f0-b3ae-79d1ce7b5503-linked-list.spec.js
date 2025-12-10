import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/08888880-d59e-11f0-b3ae-79d1ce7b5503.html';

// Page Object for the Linked List page
class LinkedListPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.selectors = {
      header: 'h1',
      input: '#valueInput',
      addButton: 'button:has-text("Add Node")',
      removeButton: 'button:has-text("Remove Last Node")',
      clearButton: 'button:has-text("Clear List")',
      listContainer: '#linkedList',
      node: '.node',
      arrow: '.arrow'
    };
  }

  // Navigate to the application URL
  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  }

  // Add a node via the UI
  async addNode(value) {
    await this.page.fill(this.selectors.input, value);
    await this.page.click(this.selectors.addButton);
  }

  // Click remove last node button
  async removeNode() {
    await this.page.click(this.selectors.removeButton);
  }

  // Click clear list button
  async clearList() {
    await this.page.click(this.selectors.clearButton);
  }

  // Get visible node texts in the list
  async getNodeTexts() {
    return this.page.$$eval(this.selectors.node, nodes => nodes.map(n => n.textContent.trim()));
  }

  // Count arrows
  async countArrows() {
    return this.page.$$eval(this.selectors.arrow, arr => arr.length);
  }

  // Get the input value
  async getInputValue() {
    return this.page.$eval(this.selectors.input, el => el.value);
  }

  // Get the innerHTML of the list container (for debugging/visual checks)
  async getListInnerHTML() {
    return this.page.$eval(this.selectors.listContainer, el => el.innerHTML);
  }

  // Read the internal linkedList.toArray() from page context (verifies internal state)
  async getInternalArray() {
    return this.page.evaluate(() => {
      // Return array representation if linkedList exists, otherwise null
      try {
        // eslint-disable-next-line no-undef
        if (typeof linkedList !== 'undefined' && linkedList && typeof linkedList.toArray === 'function') {
          return linkedList.toArray();
        }
        return null;
      } catch (e) {
        return { error: e && e.message ? e.message : String(e) };
      }
    });
  }
}

test.describe('Linked List Visualization - UI and state tests', () => {
  let page;
  let listPage;
  // Capture console messages and page errors to assert there are no runtime errors
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ browser }) => {
    // Create a new context and page for isolation
    const context = await browser.newContext();
    page = await context.newPage();

    consoleMessages = [];
    pageErrors = [];

    // Collect console messages
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect page errors (uncaught exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    listPage = new LinkedListPage(page);
    await listPage.goto();
  });

  test.afterEach(async () => {
    // Assert no uncaught page errors occurred during the test
    expect(pageErrors, 'Expected no uncaught page errors').toEqual([]);
    // Also assert there are no console messages of type "error"
    const errorConsole = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsole, 'Expected no console.error messages').toEqual([]);
    // Close page context
    await page.close();
  });

  test('Initial page load shows header, input and controls and empty list', async () => {
    // Purpose: Verify the default UI elements are present and list is empty on load
    await expect(page.locator(listPage.selectors.header)).toHaveText('Linked List Visualization');
    await expect(page.locator(listPage.selectors.input)).toBeVisible();
    await expect(page.locator(listPage.selectors.addButton)).toBeVisible();
    await expect(page.locator(listPage.selectors.removeButton)).toBeVisible();
    await expect(page.locator(listPage.selectors.clearButton)).toBeVisible();

    // The list container should be present and empty
    const nodeTexts = await listPage.getNodeTexts();
    expect(nodeTexts.length).toBe(0);
    const arrows = await listPage.countArrows();
    expect(arrows).toBe(0);

    // Internal linked list should be an empty array
    const internal = await listPage.getInternalArray();
    expect(internal).toEqual([]);
  });

  test('Adding a single node updates DOM, clears input, and updates internal state', async () => {
    // Purpose: Test adding one node updates the DOM and the internal linked list
    await listPage.addNode('A');

    // Node appears with correct text
    const nodes = await listPage.getNodeTexts();
    expect(nodes).toEqual(['A']);

    // There should be no arrow for single node
    expect(await listPage.countArrows()).toBe(0);

    // Input should be cleared after adding
    expect(await listPage.getInputValue()).toBe('');

    // Internal linked list state should reflect the added value
    const internal1 = await listPage.getInternalArray();
    expect(internal).toEqual(['A']);
  });

  test('Adding multiple nodes shows arrows between nodes and preserves order', async () => {
    // Purpose: Verify that multiple adds produce nodes with arrows between them and maintain order
    await listPage.addNode('One');
    await listPage.addNode('Two');
    await listPage.addNode('Three');

    const nodes1 = await listPage.getNodeTexts();
    expect(nodes).toEqual(['One', 'Two', 'Three']);

    // Arrows count should be nodes - 1
    expect(await listPage.countArrows()).toBe(2);

    // Internal representation should match
    const internal2 = await listPage.getInternalArray();
    expect(internal).toEqual(['One', 'Two', 'Three']);
  });

  test('Remove last node removes only the last element and updates DOM and internal state', async () => {
    // Purpose: Test removing the last node when multiple nodes present
    await listPage.addNode('first');
    await listPage.addNode('second');
    await listPage.addNode('third');

    // Confirm initial state
    expect(await listPage.getNodeTexts()).toEqual(['first', 'second', 'third']);

    // Remove last node
    await listPage.removeNode();

    // Now last node should be removed
    expect(await listPage.getNodeTexts()).toEqual(['first', 'second']);
    // Arrow count should be 1 now
    expect(await listPage.countArrows()).toBe(1);

    // Internal array matches
    expect(await listPage.getInternalArray()).toEqual(['first', 'second']);
  });

  test('Remove on single-node list clears the list', async () => {
    // Purpose: Ensure removing when exactly one node exists clears the list
    await listPage.addNode('solo');

    expect(await listPage.getNodeTexts()).toEqual(['solo']);

    // Remove should cause list to be empty
    await listPage.removeNode();

    expect(await listPage.getNodeTexts()).toEqual([]);
    expect(await listPage.countArrows()).toBe(0);
    expect(await listPage.getInternalArray()).toEqual([]);
  });

  test('Remove on empty list does nothing and does not throw errors', async () => {
    // Purpose: Ensure calling remove on an empty list is safe (no exceptions) and leaves UI unchanged
    // List is already empty from beforeEach
    await listPage.removeNode();

    expect(await listPage.getNodeTexts()).toEqual([]);
    expect(await listPage.countArrows()).toBe(0);
    // No page errors should have been recorded (checked in afterEach)
    // Internal state remains an empty array
    expect(await listPage.getInternalArray()).toEqual([]);
  });

  test('Clear list removes all nodes and resets internal state', async () => {
    // Purpose: Test clear functionality clears UI and internal list
    await listPage.addNode('x');
    await listPage.addNode('y');

    expect(await listPage.getNodeTexts()).toEqual(['x', 'y']);

    await listPage.clearList();

    expect(await listPage.getNodeTexts()).toEqual([]);
    expect(await listPage.countArrows()).toBe(0);
    expect(await listPage.getInternalArray()).toEqual([]);
  });

  test('Adding empty or whitespace-only input does not create nodes', async () => {
    // Purpose: Edge case - verify whitespace-only inputs are ignored (value.trim())
    await listPage.addNode('   '); // whitespace only
    expect(await listPage.getNodeTexts()).toEqual([]);

    // Add a valid value then try adding empty again
    await listPage.addNode('valid');
    expect(await listPage.getNodeTexts()).toEqual(['valid']);

    await listPage.addNode(''); // empty string should not add
    expect(await listPage.getNodeTexts()).toEqual(['valid']);

    // Internal state should match
    expect(await listPage.getInternalArray()).toEqual(['valid']);
  });

  test('DOM structure is correct: nodes have class "node" and arrows have class "arrow"', async () => {
    // Purpose: Visual/structural checks to ensure the expected classes are used for styling/semantics
    await listPage.addNode('alpha');
    await listPage.addNode('beta');

    // Check that every node element has class 'node' and contains text
    const nodeHandles = await page.$$(listPage.selectors.node);
    expect(nodeHandles.length).toBe(2);
    for (const handle of nodeHandles) {
      const cls = await handle.getAttribute('class');
      expect(cls).toContain('node');
      const txt = (await handle.textContent()).trim();
      expect(txt.length).toBeGreaterThan(0);
    }

    // Check arrows exist and have the arrow character
    const arrowHandles = await page.$$(listPage.selectors.arrow);
    expect(arrowHandles.length).toBe(1);
    const arrowText = (await arrowHandles[0].textContent()).trim();
    expect(arrowText).toBe('→');
  });

  test('Accessibility basic checks: input is focusable and buttons are accessible', async () => {
    // Purpose: Basic accessibility checks like focus and presence of accessible name
    const input = page.locator(listPage.selectors.input);
    await input.focus();
    // After focusing, the active element should be the input
    const activeTag = await page.evaluate(() => document.activeElement.tagName.toLowerCase());
    expect(activeTag).toBe('input');

    // Buttons should have accessible text
    await expect(page.locator(listPage.selectors.addButton)).toHaveText(/Add Node/);
    await expect(page.locator(listPage.selectors.removeButton)).toHaveText(/Remove Last Node/);
    await expect(page.locator(listPage.selectors.clearButton)).toHaveText(/Clear List/);
  });

  test('Internal state remains consistent with DOM after repeated operations', async () => {
    // Purpose: Stress test sequence of operations and verify internal state matches DOM
    await listPage.addNode('1');
    await listPage.addNode('2');
    await listPage.addNode('3');
    expect(await listPage.getInternalArray()).toEqual(['1', '2', '3']);

    await listPage.removeNode(); // removes 3
    expect(await listPage.getInternalArray()).toEqual(['1', '2']);
    expect(await listPage.getNodeTexts()).toEqual(['1', '2']);

    await listPage.addNode('4');
    expect(await listPage.getInternalArray()).toEqual(['1', '2', '4']);
    expect(await listPage.getNodeTexts()).toEqual(['1', '2', '4']);

    await listPage.clearList();
    expect(await listPage.getInternalArray()).toEqual([]);
    expect(await listPage.getNodeTexts()).toEqual([]);
  });
});