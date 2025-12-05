import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d576a11-d1d8-11f0-bbda-359f3f96b638.html';

// Page Object for the Kruskal visualization page
class GraphPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.consoleErrors = [];
    this.consoleMessages = [];
    this.pageErrors = [];
    // store handlers to detach later
    this._consoleHandler = msg => {
      // Record all console messages; also keep error types separately
      this.consoleMessages.push({ type: msg.type(), text: msg.text() });
      if (msg.type() === 'error') {
        this.consoleErrors.push(msg.text());
      }
    };
    this._pageErrorHandler = err => {
      // pageerror provides Error object
      this.pageErrors.push(err && err.message ? err.message : String(err));
    };
    this.page.on('console', this._consoleHandler);
    this.page.on('pageerror', this._pageErrorHandler);
  }

  // Detach listeners to avoid cross-test noise
  detachListeners() {
    this.page.off('console', this._consoleHandler);
    this.page.off('pageerror', this._pageErrorHandler);
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
    // Ensure initial rendering has settled
    await this.page.waitForTimeout(100); // small delay to allow drawGraph to execute
  }

  async clickStart() {
    await this.page.click('#start');
    // small delay for DOM updates (class additions)
    await this.page.waitForTimeout(50);
  }

  async edgeCount() {
    return await this.page.locator('#graph .edge').count();
  }

  async vertexCount() {
    return await this.page.locator('#graph .vertex').count();
  }

  async textLabelCount() {
    return await this.page.locator('#graph text').count();
  }

  async selectedEdgeCount() {
    return await this.page.locator('#graph .edge.selected').count();
  }

  // Return an array of selected edge coordinate objects [{x1,y1,x2,y2}]
  async getSelectedEdgeCoords() {
    return await this.page.evaluate(() => {
      return Array.from(document.querySelectorAll('#graph .edge.selected')).map(line => ({
        x1: line.getAttribute('x1'),
        y1: line.getAttribute('y1'),
        x2: line.getAttribute('x2'),
        y2: line.getAttribute('y2'),
        class: line.getAttribute('class')
      }));
    });
  }

  // Call kruskal() in page context and return result
  async getKruskalResult() {
    return await this.page.evaluate(() => {
      // If kruskal is not defined, this will throw and be caught by pageerror
      // Let errors happen naturally; caller can assert on pageErrors
      return kruskal();
    });
  }

  // Remove all .edge elements from DOM - used to test edge-case behavior
  async removeAllEdgesFromDOM() {
    await this.page.evaluate(() => {
      document.querySelectorAll('.edge').forEach(e => e.remove());
    });
    await this.page.waitForTimeout(20);
  }

  getConsoleErrors() {
    return this.consoleErrors;
  }

  getConsoleMessages() {
    return this.consoleMessages;
  }

  getPageErrors() {
    return this.pageErrors;
  }
}

test.describe('Kruskal Algorithm Visualization - FSM states and transitions', () => {
  // Each test will create its own page and GraphPage instance
  test('S0_Idle: drawGraph() runs on load and renders expected SVG elements', async ({ page }) => {
    // This test validates entry action drawGraph() for the initial Idle state (S0_Idle)
    const gp = new GraphPage(page);
    try {
      await gp.goto();

      // Verify the Start button exists
      const startButton = page.locator('#start');
      await expect(startButton).toBeVisible();
      await expect(startButton).toHaveText("Run Kruskal's Algorithm");

      // Expect edges (lines) and vertices (circles) & labels to be drawn by drawGraph()
      const edges = await gp.edgeCount();
      const vertices = await gp.vertexCount();
      const labels = await gp.textLabelCount();

      // According to the HTML, there are 5 edges and 4 vertices (and 4 labels)
      expect(edges).toBe(5);
      expect(vertices).toBe(4);
      expect(labels).toBe(4);

      // Assert there are no console "error" messages or uncaught page errors on initial load
      expect(gp.getConsoleErrors().length).toBe(0);
      expect(gp.getPageErrors().length).toBe(0);
    } finally {
      gp.detachListeners();
    }
  });

  test('S1_AlgorithmRunning -> S2_Visualization: clicking Run executes kruskal() and highlights MST edges', async ({ page }) => {
    // This test validates the RunAlgorithm event and both transitions:
    // - S0_Idle -> S1_AlgorithmRunning (kruskal() called)
    // - S1_AlgorithmRunning -> S2_Visualization (edges highlighted via selected class)
    const gp1 = new GraphPage(page);
    try {
      await gp.goto();

      // Before running algorithm, ensure no edges are selected
      expect(await gp.selectedEdgeCount()).toBe(0);

      // Execute kruskal() in page context to inspect result programmatically
      const kruskalResult = await gp.getKruskalResult();
      // The algorithm sorts edges and should return 3 edges for MST on 4 vertices
      expect(Array.isArray(kruskalResult)).toBe(true);
      expect(kruskalResult.length).toBe(3);

      // Validate the expected weights are present in the result (MST weights: 4,5,10)
      const weights = kruskalResult.map(e => e.weight).sort((a, b) => a - b);
      expect(weights).toEqual([4, 5, 10]);

      // Now simulate the user clicking the Start button to trigger DOM highlighting
      await gp.clickStart();

      // After clicking, the DOM should have exactly 3 edges with class 'selected'
      const selectedCount = await gp.selectedEdgeCount();
      expect(selectedCount).toBe(3);

      // Verify that the selected edge coordinates correspond to the expected edges:
      // Expected edges (by start/end indexes): {2,3,4}, {0,3,5}, {0,1,10}
      // Map those to vertex coordinates used in the page HTML:
      const expectedCoords = [
        // edge {2,3}
        { x1: '150', y1: '200', x2: '300', y2: '200' },
        // edge {0,3}
        { x1: '50', y1: '50', x2: '300', y2: '200' },
        // edge {0,1}
        { x1: '50', y1: '50', x2: '200', y2: '30' }
      ];

      const selectedCoords = await gp.getSelectedEdgeCoords();

      // For each expected edge, assert there is at least one matching selected edge in DOM
      expectedCoords.forEach(expected => {
        const found = selectedCoords.some(s =>
          s.x1 === expected.x1 &&
          s.y1 === expected.y1 &&
          s.x2 === expected.x2 &&
          s.y2 === expected.y2
        );
        expect(found).toBe(true);
      });

      // Confirm no console errors or uncaught page errors occurred during the click/run
      expect(gp.getConsoleErrors().length).toBe(0);
      expect(gp.getPageErrors().length).toBe(0);
    } finally {
      gp.detachListeners();
    }
  });

  test('Clicking Start twice resets previous selection and reapplies selection without errors', async ({ page }) => {
    // This test validates that clicking the Run button multiple times clears previous selections
    // (code removes 'selected' from all edgeLines before applying) and does not produce errors.
    const gp2 = new GraphPage(page);
    try {
      await gp.goto();

      // First click
      await gp.clickStart();
      const firstSelected = await gp.selectedEdgeCount();
      expect(firstSelected).toBe(3);

      // Manually toggle a selected class on one edge to simulate external change,
      // then click again to ensure the code clears and reapplies correctly.
      // We will add a 'selected' class to the first non-selected edge (if any),
      // but we do not change functions or globals.
      await page.evaluate(() => {
        const all = Array.from(document.querySelectorAll('.edge'));
        if (all.length > 0) {
          all[0].classList.toggle('selected');
        }
      });

      // Click Start again: script should remove all selected classes then reapply correct ones
      await gp.clickStart();
      const secondSelected = await gp.selectedEdgeCount();
      expect(secondSelected).toBe(3);

      // No page errors or console errors expected
      expect(gp.getConsoleErrors().length).toBe(0);
      expect(gp.getPageErrors().length).toBe(0);
    } finally {
      gp.detachListeners();
    }
  });

  test('Edge case: no .edge elements in DOM -> clicking Run should not throw and no selected edges are added', async ({ page }) => {
    // This test removes edge elements from the DOM before clicking Run to validate the code path
    // where querySelectorAll('.edge') returns an empty NodeList. The application should handle
    // this gracefully without throwing errors.
    const gp3 = new GraphPage(page);
    try {
      await gp.goto();

      // Remove all edges from the DOM
      await gp.removeAllEdgesFromDOM();

      // Verify there are now 0 edges in the DOM
      expect(await gp.edgeCount()).toBe(0);

      // Click Start; code should not crash when trying to clear/add classes to non-existent lines
      await gp.clickStart();

      // Since there are no edge DOM elements, selected count should be 0
      expect(await gp.selectedEdgeCount()).toBe(0);

      // However, kruskal() should still return the MST result because it uses the internal edges array
      const kruskalResult1 = await gp.getKruskalResult();
      expect(Array.isArray(kruskalResult)).toBe(true);
      expect(kruskalResult.length).toBe(3);

      // Confirm no console errors or page errors occurred as a result of this edge-case interaction
      expect(gp.getConsoleErrors().length).toBe(0);
      expect(gp.getPageErrors().length).toBe(0);
    } finally {
      gp.detachListeners();
    }
  });

  test('Sanity check: observe console and pageerror events during normal interactions', async ({ page }) => {
    // This test explicitly records console and page errors across typical interactions and asserts nothing unexpected occurred.
    const gp4 = new GraphPage(page);
    try {
      await gp.goto();

      // Perform typical interactions
      await gp.clickStart();
      await gp.clickStart();

      // Validate the recorded console messages include no "error" type entries
      const consoleErrors = gp.getConsoleErrors();
      const pageErrors = gp.getPageErrors();

      // We expect the provided HTML/JS to run without runtime exceptions under normal conditions.
      // Assert that no console errors and no uncaught page errors were recorded.
      expect(consoleErrors.length).toBe(0);
      expect(pageErrors.length).toBe(0);

      // Additionally, examine collected console messages to ensure there is benign console activity or none
      const consoleMessages = gp.getConsoleMessages();
      // At minimum, ensure consoleMessages is an array (no strict expectations on content)
      expect(Array.isArray(consoleMessages)).toBe(true);
    } finally {
      gp.detachListeners();
    }
  });

  // Note: We intentionally do NOT inject or modify global functions or try to patch the page's JavaScript.
  // The tests above operate on the DOM and call existing page functions (like kruskal()) and observe natural behavior.
});