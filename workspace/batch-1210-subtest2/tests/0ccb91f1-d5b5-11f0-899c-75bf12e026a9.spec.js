import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2 /html/0ccb91f1-d5b5-11f0-899c-75bf12e026a9.html';

// Helper page object for the Graph page
class GraphPage {
  constructor(page) {
    this.page = page;
    this.info = page.locator('#info');
    this.resetBtn = page.locator('#reset-selection');
    this.svg = page.locator('#graph-svg');
    this.nodesGroup = page.locator('#nodes');
    this.node = id => page.locator(`.node[data-id="${id}"]`);
    this.nodeCircle = id => page.locator(`.node[data-id="${id}"] circle`);
    this.edgePaths = page.locator('#edges path');
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  async getInfoText() {
    return (await this.info.textContent())?.trim();
  }

  async clickNode(id) {
    const locator = this.node(id);
    await expect(locator).toBeVisible({ timeout: 5000 });
    await locator.click();
  }

  async clickReset() {
    await expect(this.resetBtn).toBeVisible();
    await this.resetBtn.click();
  }

  // return computed fill color string like "rgb(233, 78, 119)"
  async getNodeFill(id) {
    return this.page.evaluate(selector => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const circle = el.querySelector('circle');
      if (!circle) return null;
      return window.getComputedStyle(circle).fill;
    }, `.node[data-id="${id}"]`);
  }

  // returns array of d attributes for highlighted (thicker stroke) edge paths
  async getHighlightedEdgesD() {
    return this.page.evaluate(() => {
      const paths = Array.from(document.querySelectorAll('#edges path'));
      return paths.filter(p => {
        const strokeWidth = window.getComputedStyle(p).strokeWidth;
        // strokeWidth may be like '4px' when highlighted
        return parseFloat(strokeWidth) > 2;
      }).map(p => p.getAttribute('d'));
    });
  }

  async countNodes() {
    return this.page.evaluate(() => document.querySelectorAll('#nodes .node').length);
  }
}

test.describe('Weighted Graph Demo - FSM and UI validation', () => {
  // Capture console errors and page errors for each test
  test.beforeEach(async ({ page }) => {
    // Attach listeners to capture errors in tests
    page._consoleErrors = [];
    page._pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        page._consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    page.on('pageerror', err => {
      page._pageErrors.push(err);
    });
  });

  test.afterEach(async ({ page }) => {
    // After each test assert there were no uncaught page errors or console errors
    // This observes console logs and page errors and asserts their absence.
    // If errors exist they will be surfaced here and fail the test.
    const consoleErrors = page._consoleErrors || [];
    const pageErrors = page._pageErrors || [];

    // Provide detailed failures if any errors occurred
    if (consoleErrors.length > 0 || pageErrors.length > 0) {
      // Build diagnostic message to help debugging
      const diag = [
        `Console errors (${consoleErrors.length}):`,
        ...consoleErrors.map((e, i) => `${i + 1}. ${e.text} @ ${JSON.stringify(e.location)}`),
        `Page errors (${pageErrors.length}):`,
        ...pageErrors.map((e, i) => `${i + 1}. ${e.stack || e.message || String(e)}`)
      ].join('\n');
      // Fail the test explicitly with diagnostics
      throw new Error(`Detected console/page errors during test:\n${diag}`);
    }

    // If there are no errors, assert lengths are zero explicitly
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test.describe('Initial render and S0_Idle state', () => {
    test('renders graph, nodes, info text and reset button (S0_Idle entry actions)', async ({ page }) => {
      const gp = new GraphPage(page);
      // Load the page exactly as provided
      await gp.goto();

      // Verify entry action renderPage() effect: svg and nodes are present
      await expect(gp.svg).toBeVisible();
      const nodeCount = await gp.countNodes();
      // FSM expects nodes to be rendered (we know dataset contains 8 nodes)
      expect(nodeCount).toBeGreaterThanOrEqual(1);
      // Verify instructions/info initial text matches S0_Idle evidence
      const info = await gp.getInfoText();
      expect(info).toBe('Click a node to select the start point.');

      // Reset button should exist (component present)
      await expect(gp.resetBtn).toBeVisible();
    });
  });

  test.describe('Selecting start and end nodes (S1_StartSelected -> S2_EndSelected)', () => {
    test('clicking a node selects it as start (S1_StartSelected)', async ({ page }) => {
      const gp = new GraphPage(page);
      await gp.goto();

      // Click node A to select start
      await gp.clickNode('A');

      // Verify info text updated as per transition from S0 -> S1
      const info = await gp.getInfoText();
      expect(info).toBe('Start node selected: A. Now select the end node.');

      // Verify that node A is visually highlighted (fill color changed to red)
      const fill = await gp.getNodeFill('A');
      // Expected highlighted color from code: #e94e77 -> rgb(233, 78, 119)
      expect(fill).toContain('rgb(233, 78, 119)');
    });

    test('selecting a different node computes and highlights shortest path (S2_EndSelected)', async ({ page }) => {
      const gp = new GraphPage(page);
      await gp.goto();

      // Start with A
      await gp.clickNode('A');
      // Then choose B as end
      await gp.clickNode('B');

      // The application first sets a temporary message "End node selected: B. Calculating shortest path..."
      // Then computes and sets the final shortest path message. We expect the final output to begin with:
      const finalInfo = await gp.getInfoText();
      expect(finalInfo.startsWith('Shortest path from A to B:')).toBeTruthy();

      // For this graph, the shortest path A -> B is direct. Ensure the display contains the path A → B
      expect(finalInfo).toContain('A → B');

      // Ensure both nodes A and B are highlighted
      const fillA = await gp.getNodeFill('A');
      const fillB = await gp.getNodeFill('B');
      expect(fillA).toContain('rgb(233, 78, 119)');
      expect(fillB).toContain('rgb(233, 78, 119)');

      // Ensure at least one edge is highlighted (strokeWidth > default 2)
      const highlightedEdges = await gp.getHighlightedEdgesD();
      expect(Array.isArray(highlightedEdges)).toBe(true);
      expect(highlightedEdges.length).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Edge cases and transitions related to node selection', () => {
    test('selecting the same node as end shows appropriate message and does not progress to S2', async ({ page }) => {
      const gp = new GraphPage(page);
      await gp.goto();

      // Click A as start
      await gp.clickNode('A');
      // Click A again to attempt selecting same node as end
      await gp.clickNode('A');

      // Verify the message about same node selection
      const info = await gp.getInfoText();
      expect(info).toBe('End node cannot be the same as start node. Select a different node.');

      // Ensure only start node remains highlighted
      const fillA = await gp.getNodeFill('A');
      expect(fillA).toContain('rgb(233, 78, 119)');
    });

    test('after completing a start+end selection, additional node clicks request reset (S2_EndSelected -> stay/blocked)', async ({ page }) => {
      const gp = new GraphPage(page);
      await gp.goto();

      // Select start and end
      await gp.clickNode('A');
      await gp.clickNode('B');

      // Now click another node (C) - code should respond with 'Please reset selection to start again.'
      await gp.clickNode('C');

      const info = await gp.getInfoText();
      expect(info).toBe('Please reset selection to start again.');
    });
  });

  test.describe('Reset behavior and S4_Reset state', () => {
    test('reset selection clears highlights and returns to S0_Idle (resetSelection entry action)', async ({ page }) => {
      const gp = new GraphPage(page);
      await gp.goto();

      // Select start node
      await gp.clickNode('E');

      // Reset
      await gp.clickReset();

      // info text should return to idle prompt
      const info = await gp.getInfoText();
      expect(info).toBe('Click a node to select the start point.');

      // Ensure no nodes are highlighted (node E should have original fill color)
      const fillE = await gp.getNodeFill('E');
      // original fill color: #4a90e2 -> rgb(74, 144, 226)
      expect(fillE).toContain('rgb(74, 144, 226)');
    });
  });

  test.describe('S3_NoPath state and reachability checks', () => {
    test('NoPath is not reached for any connected node pair in this graph (observational)', async ({ page }) => {
      const gp = new GraphPage(page);
      await gp.goto();

      // We'll attempt to check multiple pairs and assert that "No path found" message is not produced
      const pairs = [['A','H'], ['C','G'], ['D','F'], ['B','H']];
      for (const [s,e] of pairs) {
        // Reset to start fresh state for each pair
        await gp.clickReset();

        // Start
        await gp.clickNode(s);
        // End
        await gp.clickNode(e);

        const info = await gp.getInfoText();
        // If the implementation finds a path, final info starts with "Shortest path from"
        // If No Path were found it would be exactly: `No path found between ${s} and ${e}.`
        // Assert we did not get the no-path message.
        expect(info).not.toBe(`No path found between ${s} and ${e}.`);
      }
      // If the graph was disconnected in some browser environment, the test above would fail,
      // thereby surfacing that S3_NoPath can be reached. This test documents the expected behavior.
    });
  });

  test.describe('Observability: console and page errors (must be zero)', () => {
    test('no console.error or uncaught page errors during user interactions', async ({ page }) => {
      const gp = new GraphPage(page);
      await gp.goto();

      // Perform some interactions
      await gp.clickNode('A');
      await gp.clickNode('B');
      await gp.clickReset();
      await gp.clickNode('C');

      // After interactions the afterEach will assert there were no console/page errors.
      // We still do an immediate check here to give a clearer failure point.
      const consoleErrors = page._consoleErrors || [];
      const pageErrors = page._pageErrors || [];
      expect(consoleErrors.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });
  });
});