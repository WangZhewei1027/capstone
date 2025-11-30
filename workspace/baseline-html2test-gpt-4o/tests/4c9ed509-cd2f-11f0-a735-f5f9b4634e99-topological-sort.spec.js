import { test, expect } from '@playwright/test';

const URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9ed509-cd2f-11f0-a735-f5f9b4634e99.html';

// Page Object for the Topological Sort page
class TopoPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.nodesLocator = page.locator('#nodes .node');
    this.edgesLocator = page.locator('#edges .edge');
    this.outputLocator = page.locator('#output');
    this.sortButton = page.getByRole('button', { name: 'Perform Topological Sort' });
  }

  async goto() {
    await this.page.goto(URL, { waitUntil: 'load' });
  }

  // Return array of node texts in display order
  async getDisplayedNodes() {
    const count = await this.nodesLocator.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push((await this.nodesLocator.nth(i).innerText()).trim());
    }
    return texts;
  }

  // Return array of edge texts in display order
  async getDisplayedEdges() {
    const count = await this.edgesLocator.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push((await this.edgesLocator.nth(i).innerText()).trim());
    }
    return texts;
  }

  // Click the topological sort button
  async performTopologicalSort() {
    await this.sortButton.click();
  }

  // Get output text
  async getOutputText() {
    return (await this.outputLocator.innerText()).trim();
  }
}

test.describe('Topological Sort Visualization (4c9ed509-cd2f-11f0-a735-f5f9b4634e99)', () => {
  let pageErrors = [];
  let consoleErrors = [];

  // Setup listeners to observe console and runtime errors for each test
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];

    // Collect uncaught exceptions from the page
    page.on('pageerror', (err) => {
      // pageerror provides an Error object; store message for assertions
      pageErrors.push(err && err.message ? err.message : String(err));
    });

    // Collect console.error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
  });

  // Ensure no stray errors occurred during basic load and usage
  test.afterEach(async () => {
    // After each test we will assert there were no uncaught exceptions or console errors
    expect(pageErrors, 'No uncaught page errors should have occurred').toEqual([]);
    expect(consoleErrors, 'No console.error messages should have been emitted').toEqual([]);
  });

  test.describe('Initial load and DOM structure', () => {
    // Test initial page load and default state: nodes and edges rendered correctly
    test('should load the page and display all nodes and edges', async ({ page }) => {
      const topo = new TopoPage(page);
      await topo.goto();

      // Verify the sort button is visible and enabled
      await expect(topo.sortButton).toBeVisible();
      await expect(topo.sortButton).toBeEnabled();

      // Verify nodes: expect A, B, C, D in display
      const nodes = await topo.getDisplayedNodes();
      // There must be exactly 4 nodes
      expect(nodes.length).toBe(4);
      // The nodes in insertion order should be A, B, C, D
      expect(nodes).toEqual(['A', 'B', 'C', 'D']);

      // Verify edges: A -> B, A -> D, B -> C, D -> C
      const edges = await topo.getDisplayedEdges();
      expect(edges.length).toBe(4);
      expect(edges).toEqual(expect.arrayContaining([
        'A --> B',
        'A --> D',
        'B --> C',
        'D --> C'
      ]));

      // Output should be empty initially
      const out = await topo.getOutputText();
      expect(out).toBe('');
    });

    // Test that the performTopologicalSort function is exposed on window (sanity)
    test('should expose performTopologicalSort function on window', async ({ page }) => {
      const topo = new TopoPage(page);
      await topo.goto();

      // Check global function exists and is a function
      const fnType = await page.evaluate(() => typeof performTopologicalSort);
      expect(fnType).toBe('function');
    });
  });

  test.describe('Topological sort behavior and interactions', () => {
    // Clicking the sort button should produce the correct topological order
    test('should display correct topological order when button is clicked', async ({ page }) => {
      const topo = new TopoPage(page);
      await topo.goto();

      // Click the button to perform sort
      await topo.performTopologicalSort();

      // Read output and verify correct format and order
      const outputText = await topo.getOutputText();
      // Expect exact string "Topological Sort Order: A -> D -> B -> C"
      expect(outputText).toBe('Topological Sort Order: A -> D -> B -> C');

      // Additional checks: ensure the output contains arrows and all nodes in the expected sequence
      const parts = outputText.replace('Topological Sort Order:', '').trim().split('->').map(s => s.trim());
      expect(parts).toEqual(['A', 'D', 'B', 'C']);
    });

    // Clicking multiple times should not append new results; it should replace/update output consistently
    test('should remain stable on repeated clicks (idempotent output)', async ({ page }) => {
      const topo = new TopoPage(page);
      await topo.goto();

      // Click twice with a short pause
      await topo.performTopologicalSort();
      const first = await topo.getOutputText();
      // Click again
      await topo.performTopologicalSort();
      const second = await topo.getOutputText();

      // Both outputs should be identical and equal to the expected sequence
      expect(first).toBe(second);
      expect(second).toBe('Topological Sort Order: A -> D -> B -> C');

      // Ensure nodes and edges DOM did not change after performing the sort
      const nodesAfter = await topo.getDisplayedNodes();
      expect(nodesAfter).toEqual(['A', 'B', 'C', 'D']);
      const edgesAfter = await topo.getDisplayedEdges();
      expect(edgesAfter.length).toBe(4);
      expect(edgesAfter).toEqual(expect.arrayContaining([
        'A --> B',
        'A --> D',
        'B --> C',
        'D --> C'
      ]));
    });

    // Test behavior if user inspects the output element visibility and styling
    test('output element should be visible after performing sort and present bold text', async ({ page }) => {
      const topo = new TopoPage(page);
      await topo.goto();

      // Initially invisible/empty
      expect(await topo.getOutputText()).toBe('');

      // Perform sort
      await topo.performTopologicalSort();

      // Output should now be visible and have non-empty text
      await expect(topo.outputLocator).toBeVisible();
      const outputText = await topo.getOutputText();
      expect(outputText.length).toBeGreaterThan(0);

      // The HTML uses font-weight:bold in style; we check computed style for font-weight to be at least '700' or 'bold'
      const fontWeight = await page.evaluate(() => {
        const el = document.getElementById('output');
        return window.getComputedStyle(el).fontWeight;
      });
      // Accept common bold values
      expect(['700', 'bold', '800', '900']).toContain(fontWeight);
    });
  });

  test.describe('Edge cases, accessibility, and errors', () => {
    // Test that the button is reachable by role (accessibility)
    test('button should be accessible by role and name', async ({ page }) => {
      const topo = new TopoPage(page);
      await topo.goto();

      // getByRole should find exactly one button with that name
      const btns = page.getByRole('button', { name: 'Perform Topological Sort' });
      await expect(btns).toHaveCount(1);
      await expect(btns).toBeEnabled();
    });

    // Test for absence of runtime errors and console.error messages during normal usage
    test('should not emit page errors or console.error messages during normal usage', async ({ page }) => {
      const topo = new TopoPage(page);
      await topo.goto();

      // Perform an action
      await topo.performTopologicalSort();

      // At this point the afterEach hook will assert there were no errors.
      // However, we also assert here explicitly that our arrays are empty.
      // Because the listeners were created in beforeEach, we need to access them via page events we captured.
      // We cannot access the local arrays here (they are in closure), so we perform a quick sanity check:
      const output = await topo.getOutputText();
      expect(output).toContain('Topological Sort Order:');
    });

    // Try to exercise the DFS path by verifying the order respects dependencies (C after B and D)
    test('order should respect dependencies: C must come after B and D', async ({ page }) => {
      const topo = new TopoPage(page);
      await topo.goto();

      await topo.performTopologicalSort();
      const outputText = await topo.getOutputText();
      // Extract sequence
      const seq = outputText.replace('Topological Sort Order:', '').trim().split('->').map(s => s.trim());
      // Find indices
      const idxC = seq.indexOf('C');
      const idxB = seq.indexOf('B');
      const idxD = seq.indexOf('D');
      // C should appear after B and D
      expect(idxC).toBeGreaterThan(idxB);
      expect(idxC).toBeGreaterThan(idxD);
    });
  });
});