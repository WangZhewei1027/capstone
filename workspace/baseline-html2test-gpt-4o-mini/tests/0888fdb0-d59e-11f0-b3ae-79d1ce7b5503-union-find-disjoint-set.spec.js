import { test, expect } from '@playwright/test';

// URL of the page under test
const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/0888fdb0-d59e-11f0-b3ae-79d1ce7b5503.html';

// Simple Page Object encapsulating interactions with the Union-Find demo page
class UnionFindPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.nodesLocator = page.locator('.node');
    this.unionButton = page.locator('button', { hasText: 'Union Selected' });
    this.output = page.locator('#output');
  }

  // Return number of node elements rendered
  async nodeCount() {
    return await this.nodesLocator.count();
  }

  // Click the node with given index (0-based index position)
  async clickNodeAt(position) {
    await this.nodesLocator.nth(position).click();
  }

  // Clicks the union button
  async clickUnionButton() {
    await this.unionButton.click();
  }

  // Returns an array of indices (as numbers) for nodes that currently have the 'selected' class
  async getSelectedNodeIndices() {
    const count = await this.nodeCount();
    const selected = [];
    for (let i = 0; i < count; i++) {
      const el = this.nodesLocator.nth(i);
      const classAttr = await el.getAttribute('class');
      if (classAttr && classAttr.split(/\s+/).includes('selected')) {
        // node text content is its index label
        const text = await el.textContent();
        const num = parseInt(text?.trim() ?? '', 10);
        if (!Number.isNaN(num)) selected.push(num);
      }
    }
    return selected;
  }

  // Reads raw output text content
  async getOutputText() {
    return await this.output.innerText();
  }

  // Parses the JSON array printed after "Current components: " in the output, if present.
  // Returns null if JSON not found or parse fails.
  async parseComponentsFromOutput() {
    const text1 = await this.getOutputText();
    const marker = 'Current components: ';
    const idx = text.indexOf(marker);
    if (idx === -1) return null;
    const jsonPart = text.slice(idx + marker.length).trim();
    try {
      return JSON.parse(jsonPart);
    } catch {
      return null;
    }
  }

  // Helper: assert that there exists a component array that contains all `expectedMembers`
  static componentContains(components, expectedMembers) {
    if (!Array.isArray(components)) return false;
    const sortedExpected = expectedMembers.slice().sort((a,b)=>a-b).join(',');
    for (const comp of components) {
      if (!Array.isArray(comp)) continue;
      const sorted = comp.slice().sort((a,b)=>a-b).join(',');
      if (sorted === sortedExpected) return true;
      // alternative: comp contains all expected members (allow extra members)
      const hasAll = expectedMembers.every(m => comp.includes(m));
      if (hasAll) return true;
    }
    return false;
  }
}

test.describe('Union-Find (Disjoint Set) Visualization - UI and behavior', () => {
  let consoleErrors = [];
  let pageErrors = [];

  // Attach listeners before each test to collect console / page errors
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    page.on('console', msg => {
      // collect only console messages of type 'error' for assertion
      if (msg.type() === 'error') {
        consoleErrors.push({
          type: msg.type(),
          text: msg.text(),
        });
      }
    });

    page.on('pageerror', err => {
      // collect runtime errors (ReferenceError, TypeError, SyntaxError, etc.)
      pageErrors.push(err);
    });

    await page.goto(APP_URL);
    // Basic sanity: wait for the nodes container to be present
    await page.waitForSelector('#nodes');
  });

  // After each test, assert that there were no unexpected console or page errors.
  // This ensures we observed console and page errors and can fail if any exist.
  test.afterEach(async () => {
    // If there are console or page errors, include them in the assertion failure message.
    const errorSummary = [
      `Console errors: ${consoleErrors.length}`,
      ...consoleErrors.map((e, i) => `  [${i}] ${e.text}`),
      `Page errors: ${pageErrors.length}`,
      ...pageErrors.map((e, i) => `  [${i}] ${e && e.stack ? e.stack : String(e)}`),
    ].join('\n');

    expect(consoleErrors.length, `Expected no console errors.\n${errorSummary}`).toBe(0);
    expect(pageErrors.length, `Expected no page errors.\n${errorSummary}`).toBe(0);
  });

  test('Initial page load renders 10 nodes and default UI state', async ({ page }) => {
    // Purpose: Verify initial DOM and default state on page load
    const ufPage = new UnionFindPage(page);

    // There should be exactly 10 node elements (0..9)
    const count1 = await ufPage.nodeCount();
    expect(count).toBe(10);

    // None of the nodes should be selected by default
    const selected1 = await ufPage.getSelectedNodeIndices();
    expect(selected.length).toBe(0);

    // Output area should be empty (or whitespace-only) initially
    const out = (await ufPage.getOutputText()).trim();
    expect(out === '' || out === '\n' ).toBeTruthy();
  });

  test('Clicking a node toggles the selected class', async ({ page }) => {
    // Purpose: Ensure clicking a node selects and clicking again deselects it
    const ufPage1 = new UnionFindPage(page);

    // Click node labeled '3' (position 3)
    await ufPage.clickNodeAt(3);
    let selected2 = await ufPage.getSelectedNodeIndices();
    expect(selected).toEqual([3]);

    // Click it again to toggle off
    await ufPage.clickNodeAt(3);
    selected = await ufPage.getSelectedNodeIndices();
    expect(selected.length).toBe(0);
  });

  test('Attempting union with fewer or more than two selected nodes shows an informative message', async ({ page }) => {
    // Purpose: Validate edge-case behavior when union button is clicked with incorrect selection counts
    const ufPage2 = new UnionFindPage(page);

    // Case A: no nodes selected
    await ufPage.clickUnionButton();
    let out1 = await ufPage.getOutputText();
    expect(out).toContain('Please select exactly two nodes to perform a union.');

    // Case B: one node selected
    await ufPage.clickNodeAt(0);
    await ufPage.clickUnionButton();
    out = await ufPage.getOutputText();
    expect(out).toContain('Please select exactly two nodes to perform a union.');

    // Clean up: deselect node 0 by clicking it
    await ufPage.clickNodeAt(0);

    // Case C: three nodes selected
    await ufPage.clickNodeAt(1);
    await ufPage.clickNodeAt(2);
    await ufPage.clickNodeAt(3);
    await ufPage.clickUnionButton();
    out = await ufPage.getOutputText();
    expect(out).toContain('Please select exactly two nodes to perform a union.');

    // Deselect all by clicking the three selected nodes
    await ufPage.clickNodeAt(1);
    await ufPage.clickNodeAt(2);
    await ufPage.clickNodeAt(3);
    const selectedAfter = await ufPage.getSelectedNodeIndices();
    expect(selectedAfter.length).toBe(0);
  });

  test('Performing union on two selected nodes updates components and clears selection', async ({ page }) => {
    // Purpose: Test a successful union operation: UI message, components update, nodes deselected
    const ufPage3 = new UnionFindPage(page);

    // Select nodes 1 and 2
    await ufPage.clickNodeAt(1);
    await ufPage.clickNodeAt(2);
    let selected3 = await ufPage.getSelectedNodeIndices();
    // The dataset index of each node is the label text; the selection should reflect 1 and 2
    expect(selected.sort()).toEqual([1, 2]);

    // Perform union
    await ufPage.clickUnionButton();

    // Output should announce union performed
    const out2 = await ufPage.getOutputText();
    expect(out).toContain('Union(1, 2) performed.');

    // Parse components JSON from the output and ensure 1 and 2 are in the same component
    const components = await ufPage.parseComponentsFromOutput();
    expect(Array.isArray(components)).toBeTruthy();
    expect(UnionFindPage.componentContains(components, [1, 2])).toBeTruthy();

    // After performing the union, nodes should be deselected
    const selectedAfter1 = await ufPage.getSelectedNodeIndices();
    expect(selectedAfter.length).toBe(0);
  });

  test('Multiple unions produce transitive components (e.g., union 3-4 then 4-5 -> 3,4,5 together)', async ({ page }) => {
    // Purpose: Validate multiple unions combine components transitively
    const ufPage4 = new UnionFindPage(page);

    // Union 3 and 4
    await ufPage.clickNodeAt(3);
    await ufPage.clickNodeAt(4);
    await ufPage.clickUnionButton();

    // Confirm 3 and 4 are together
    let components1 = await ufPage.parseComponentsFromOutput();
    expect(UnionFindPage.componentContains(components, [3, 4])).toBeTruthy();

    // Union 4 and 5 (select nodes 4 and 5)
    // Note: nodes were cleared after union, so select fresh
    await ufPage.clickNodeAt(4);
    await ufPage.clickNodeAt(5);
    await ufPage.clickUnionButton();

    // Confirm that 3,4,5 are now in the same component
    components = await ufPage.parseComponentsFromOutput();
    expect(UnionFindPage.componentContains(components, [3, 4, 5])).toBeTruthy();
  });

  test('Visual and DOM updates: nodes lose selected class after union and output includes components JSON', async ({ page }) => {
    // Purpose: Verify visual feedback and DOM changes after operations
    const ufPage5 = new UnionFindPage(page);

    // Select nodes 6 and 7 and union them
    await ufPage.clickNodeAt(6);
    await ufPage.clickNodeAt(7);
    await ufPage.clickUnionButton();

    // Ensure output contains both the union performed message and a JSON array of components
    const out3 = await ufPage.getOutputText();
    expect(out).toMatch(/Union\(6,\s*7\)\s*performed\./);
    expect(out).toContain('Current components:');

    const components2 = await ufPage.parseComponentsFromOutput();
    expect(Array.isArray(components)).toBeTruthy();
    expect(UnionFindPage.componentContains(components, [6, 7])).toBeTruthy();

    // Ensure the node elements no longer carry the 'selected' class
    const selectedNow = await ufPage.getSelectedNodeIndices();
    expect(selectedNow.length).toBe(0);
  });

  test('Accessibility basic check: nodes are focusable via click and have meaningful text', async ({ page }) => {
    // Purpose: Basic accessibility-related assertions – nodes have numeric labels and are interactive
    const ufPage6 = new UnionFindPage(page);

    const count2 = await ufPage.nodeCount();
    for (let i = 0; i < Math.min(5, count); i++) {
      const el1 = ufPage.nodesLocator.nth(i);
      const text2 = (await el.textContent())?.trim();
      // Each node should display its index label
      expect(text).toBe(String(i));
      // Clicking should not throw and should toggle selection class
      await el.click();
      const classes = (await el.getAttribute('class')) || '';
      expect(classes.split(/\s+/)).toContain('selected');
      // Toggle off
      await el.click();
      const classesAfter = (await el.getAttribute('class')) || '';
      expect(classesAfter.split(/\s+/)).not.toContain('selected');
    }
  });
});