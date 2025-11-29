import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-58-04/html/df898810-ca8c-11f0-ad7a-c12be6d976fe.html';

// Page Object for the linked list page
class LinkedListPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Wait until the linked list container exists in DOM
  async waitForContainer() {
    await this.page.waitForSelector('#linked-list');
  }

  // Returns an array of elements matching .node
  async getNodeElements() {
    return this.page.locator('#linked-list .node');
  }

  // Returns an array of elements matching .arrow
  async getArrowElements() {
    return this.page.locator('#linked-list .arrow');
  }

  // Returns the texts of each .node in order
  async getNodeTexts() {
    const nodes = await this.getNodeElements();
    const count = await nodes.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push((await nodes.nth(i).innerText()).trim());
    }
    return texts;
  }

  // Returns the sequence of child node types under #linked-list,
  // e.g. ['node','arrow','node',...]
  async getChildSequence() {
    const seq = await this.page.evaluate(() => {
      const container = document.getElementById('linked-list');
      if (!container) return [];
      return Array.from(container.children).map(el => {
        if (el.classList.contains('node')) return 'node';
        if (el.classList.contains('arrow')) return 'arrow';
        // fallback to tagName
        return el.tagName.toLowerCase();
      });
    });
    return seq;
  }

  // Wait for the list to reach a specific node count (polling)
  async waitForNodeCount(expectedCount, timeout = 2000) {
    await this.page.waitForFunction(
      (selector, expected) => {
        const container = document.querySelector(selector);
        if (!container) return false;
        return container.querySelectorAll('.node').length === expected;
      },
      '#linked-list',
      expectedCount,
      { timeout }
    );
  }

  // Wait for the list to reach a specific arrow count (polling)
  async waitForArrowCount(expectedCount, timeout = 2000) {
    await this.page.waitForFunction(
      (selector, expected) => {
        const container = document.querySelector(selector);
        if (!container) return false;
        return container.querySelectorAll('.arrow').length === expected;
      },
      '#linked-list',
      expectedCount,
      { timeout }
    );
  }
}

test.describe('Linked List FSM - df898810-ca8c-11f0-ad7a-c12be6d976fe', () => {
  let consoleMessages = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    // Reset collectors
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages for inspection
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    // Collect page errors (uncaught exceptions)
    page.on('pageerror', error => {
      pageErrors.push({
        name: error && error.name ? error.name : 'Error',
        message: error && error.message ? error.message : String(error)
      });
    });

    // Navigate to the application page (this triggers the FSM starting at PAGE_LOADED)
    await page.goto(APP_URL);
  });

  // Test: initial -> populating transition via page load
  test('PAGE_LOADED triggers populating: linked list is created and append operations run', async ({ page }) => {
    const lst = new LinkedListPage(page);

    // Wait for container to exist (trigger RENDER_CALLED/RENDER_COMPLETE equivalents)
    await lst.waitForContainer();

    // The script appends 4 nodes (1..4). Wait until 4 nodes are present.
    await lst.waitForNodeCount(4);

    // Assert node count and arrow count reflect a populated linked list
    const nodeCount = await lst.getNodeElements().count();
    const arrowCount = await lst.getArrowElements().count();
    expect(nodeCount).toBe(4); // Expect 4 .node elements created by append calls
    expect(arrowCount).toBe(3); // Expect 3 arrows between 4 nodes

    // Verify the node text values in order (verifies append ordering and render correctness)
    const texts = await lst.getNodeTexts();
    expect(texts).toEqual(['1', '2', '3', '4']);

    // Ensure the DOM child sequence alternates node, arrow, node... and ends with a node
    const seq = await lst.getChildSequence();
    // Expect 7 children: node,arrow,node,arrow,node,arrow,node
    expect(seq.length).toBe(7);
    expect(seq).toEqual(['node', 'arrow', 'node', 'arrow', 'node', 'arrow', 'node']);

    // Confirm arrow markup is as implemented (→)
    const firstArrowHtml = await page.locator('#linked-list .arrow').first().innerHTML();
    expect(firstArrowHtml).toContain('rarr'); // the HTML uses &rarr; entity

    // Observe console and page-level errors - assert none occurred during normal load
    // This validates that no uncaught ReferenceError/SyntaxError/TypeError happened
    const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test: rendering transitions (multiple NODE_ELEMENT_CREATED and ARROW_ELEMENT_CREATED)
  test('render() creates .node and .arrow elements for each append (rendering state behavior)', async ({ page }) => {
    const lst = new LinkedListPage(page);

    await lst.waitForContainer();

    // The implementation calls render() after each append. We at least should see final state.
    await lst.waitForNodeCount(4);
    await lst.waitForArrowCount(3);

    // Confirm each .node has correct class and is displayed as inline-block (style applied)
    const nodes = lst.getNodeElements();
    for (let i = 0; i < await nodes.count(); i++) {
      const el = nodes.nth(i);
      const className = await el.getAttribute('class');
      expect(className).toContain('node');
      // Check that the element is visible
      await expect(el).toBeVisible();
    }

    // Confirm arrows are present and visible
    const arrows = lst.getArrowElements();
    for (let i = 0; i < await arrows.count(); i++) {
      const arrowEl = arrows.nth(i);
      const className = await arrowEl.getAttribute('class');
      expect(className).toContain('arrow');
      await expect(arrowEl).toBeVisible();
    }

    // Validate that render() cleared previous content before populating by ensuring no duplicate nodes beyond expected count
    expect(await lst.getNodeElements().count()).toBe(4);
    expect(await lst.getArrowElements().count()).toBe(3);

    // Ensure no runtime errors observed while rendering
    const runtimeErrors = pageErrors.filter(e => ['ReferenceError', 'TypeError', 'SyntaxError'].includes(e.name));
    expect(runtimeErrors.length).toBe(0);
  });

  // Test: populated state and PAGE_RELOAD -> initial transition
  test('populated state persists after appends and page reload transitions back to initial then repopulates', async ({ page }) => {
    const lst = new LinkedListPage(page);

    await lst.waitForContainer();
    await lst.waitForNodeCount(4);

    // Validate populated state: DOM has nodes and arrows
    expect(await lst.getNodeElements().count()).toBe(4);
    expect(await lst.getArrowElements().count()).toBe(3);

    // Reload the page to trigger PAGE_RELOAD -> initial
    await page.reload();

    // After reload, the FSM should once again create the linked list and append nodes.
    await lst.waitForContainer();
    await lst.waitForNodeCount(4);

    // Re-assert populated state after reload
    expect(await lst.getNodeElements().count()).toBe(4);
    expect(await lst.getArrowElements().count()).toBe(3);

    // Check node texts again to ensure appends were executed on the new load
    const textsAfterReload = await lst.getNodeTexts();
    expect(textsAfterReload).toEqual(['1', '2', '3', '4']);

    // Ensure no persistent page errors across reload
    const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Edge case: ensure that unexpected errors (ReferenceError, SyntaxError, TypeError) are not present.
  // The test intentionally observes the page's runtime and console; it does NOT patch the environment.
  test('edge case: observe console and page errors for ReferenceError/SyntaxError/TypeError', async ({ page }) => {
    const lst = new LinkedListPage(page);
    await lst.waitForContainer();

    // Collect any pageErrors or console error messages that indicate Reference/Type/Syntax errors
    const runtimeErrors = pageErrors.filter(e => ['ReferenceError', 'TypeError', 'SyntaxError'].includes(e.name));
    const consoleErrorTexts = consoleMessages.filter(m => m.type === 'error').map(m => m.text);

    // Assert no such critical runtime errors occurred during natural execution of the page
    expect(runtimeErrors.length).toBe(0);
    // Also assert that console 'error' messages do not contain keywords suggesting these critical errors
    const foundCriticalInConsole = consoleErrorTexts.some(t =>
      /ReferenceError|TypeError|SyntaxError/i.test(t)
    );
    expect(foundCriticalInConsole).toBe(false);

    // Also make sure final DOM is consistent
    await lst.waitForNodeCount(4);
    expect(await lst.getNodeElements().count()).toBe(4);
  });

  // Structural validation: children count and alternation ensure render() produced expected DOM layout.
  test('DOM structure validation: children count and alternation of node/arrow', async ({ page }) => {
    const lst = new LinkedListPage(page);
    await lst.waitForContainer();

    // Wait for full population
    await lst.waitForNodeCount(4);
    await lst.waitForArrowCount(3);

    // Validate exact number of child elements
    const childSeq = await lst.getChildSequence();
    expect(childSeq.length).toBe(7);

    // Validate alternation pattern matches the expected FSM-driven rendering
    for (let i = 0; i < childSeq.length; i++) {
      if (i % 2 === 0) {
        // Even positions should be nodes
        expect(childSeq[i]).toBe('node');
      } else {
        // Odd positions should be arrows
        expect(childSeq[i]).toBe('arrow');
      }
    }
  });
});