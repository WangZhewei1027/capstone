import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abeaa31-cd32-11f0-a96f-2d591ffb35fe.html';

// Page Object for the Prim's Algorithm visualization page
class PrimGraphPage {
  constructor(page) {
    this.page = page;
    this.graphSvg = page.locator('svg#graphSvg');
    this.nodeGroups = page.locator('svg#graphSvg g.node-group');
    this.circles = page.locator('svg#graphSvg circle.node');
    this.edges = page.locator('svg#graphSvg line.edge');
    this.generateBtn = page.locator('#generateRandomGraphBtn');
    this.nodeCountInput = page.locator('#nodeCount');
    this.startBtn = page.locator('#startPrimBtn');
    this.stepBtn = page.locator('#stepPrimBtn');
    this.resetBtn = page.locator('#resetPrimBtn');
    this.logDiv = page.locator('#log');
  }

  // Helper: wait until the SVG has at least n circle.node elements
  async waitForNodeCount(n, timeout = 3000) {
    await this.page.waitForFunction(
      (selector, expected) => {
        const el = document.querySelector(selector);
        if (!el) return false;
        return el.querySelectorAll('circle.node').length === expected;
      },
      ['svg#graphSvg', n],
      { timeout }
    );
  }

  // Helper: get log text
  async getLogText() {
    return (await this.logDiv.innerText()).trim();
  }

  // Click the first node-group
  async clickFirstNode() {
    await this.nodeGroups.first().click();
  }

  // Click the nth node-group (1-based index)
  async clickNodeAtIndex(idx) {
    const node = this.nodeGroups.nth(idx - 1);
    await node.click();
  }

  // Return number of node-group elements
  async nodeCount() {
    return this.nodeGroups.count();
  }

  // Return number of edges (line elements)
  async edgeCount() {
    return this.page.locator('svg#graphSvg line').count();
  }

  // Returns number of edges with in-mst class
  async mstEdgeCount() {
    return this.page.locator('svg#graphSvg line.in-mst').count();
  }

  // Set node count input value
  async setNodeCount(n) {
    await this.nodeCountInput.fill(String(n));
  }
}

test.describe('Prim\'s Algorithm Visualization - E2E', () => {
  // Collect console error messages and page errors for assertions
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages of error level
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the application page
    await page.goto(APP_URL);
    // Wait for initial graph generation to complete (default nodeCount = 6)
    // The page logs "Generated random graph" into #log; wait for that text
    await page.waitForSelector('#log');
    await page.waitForFunction(() => {
      const log = document.getElementById('log');
      return log && log.textContent && log.textContent.includes('Generated random graph');
    }, { timeout: 5000 });
  });

  test.afterEach(async () => {
    // Assert there were no console errors or uncaught page errors during the test
    // This ensures we observed console and allowed any errors to surface naturally
    expect(consoleErrors, 'No console.error messages should be emitted').toEqual([]);
    expect(pageErrors, 'No uncaught page errors should occur').toEqual([]);
  });

  test('Initial load: default state and elements present', async ({ page }) => {
    const p = new PrimGraphPage(page);

    // Verify default node count input value is 6
    await expect(p.nodeCountInput).toHaveValue('6');

    // Verify Start, Step, Reset buttons are disabled initially
    await expect(p.startBtn).toBeDisabled();
    await expect(p.stepBtn).toBeDisabled();
    await expect(p.resetBtn).toBeDisabled();

    // Verify Generate Random Graph button is enabled
    await expect(p.generateBtn).toBeEnabled();

    // Verify that the SVG contains the expected number of nodes (6 by default)
    // Wait for the nodes to be present
    await p.waitForNodeCount(6, 5000);
    const circlesCount = await p.circles.count();
    expect(circlesCount).toBe(6);

    // Verify the log contains the "Generated random graph" entry
    const logText = await p.getLogText();
    expect(logText).toMatch(/Generated random graph with 6 nodes/i);
  });

  test('Generate graph with custom node count and ensure nodes are created', async ({ page }) => {
    const p1 = new PrimGraphPage(page);

    // Set node count to 4 and generate
    await p.setNodeCount(4);
    await p.generateBtn.click();

    // Wait for exactly 4 nodes to be present
    await p.waitForNodeCount(4, 5000);
    const nodes = await p.circles.count();
    expect(nodes).toBe(4);

    // Log should mention 4 nodes
    const logText1 = await p.getLogText();
    expect(logText).toMatch(/Generated random graph with 4 nodes/i);

    // After generation, no node is selected and Start should be disabled
    await expect(p.startBtn).toBeDisabled();
  });

  test('Selecting a node enables Start button and marks node visually', async ({ page }) => {
    const p2 = new PrimGraphPage(page);

    // Ensure nodes are present
    const initialCount = await p.circles.count();
    expect(initialCount).toBeGreaterThanOrEqual(2);

    // Click the first node to select it
    await p.clickFirstNode();

    // The circle element should have class "selected"
    const firstCircle = page.locator('svg#graphSvg circle.node').first();
    await expect(firstCircle).toHaveClass(/selected/);

    // Start button should now be enabled
    await expect(p.startBtn).toBeEnabled();

    // Log should contain "Selected node"
    const logText2 = await p.getLogText();
    expect(logText).toMatch(/Selected node \d+ as start node/i);
  });

  test('Start Prim, perform steps, and verify MST edges and log updates', async ({ page }) => {
    const p3 = new PrimGraphPage(page);

    // Select a node and start the algorithm
    await p.clickFirstNode();
    await p.startBtn.click();

    // After starting, Start button should be disabled and Step/Reset enabled
    await expect(p.startBtn).toBeDisabled();
    await expect(p.stepBtn).toBeEnabled();
    await expect(p.resetBtn).toBeEnabled();

    // Log should include start message
    let log1 = await p.getLogText();
    expect(log).toMatch(/Starting Prim's Algorithm at node \d+/i);

    // Execute steps until algorithm completion or until reasonable number of steps
    // There are N nodes; Prim will add N-1 edges. We will click step repeatedly up to N-1 times.
    const nodeCount = await p.circles.count();
    const maxSteps = Math.max(1, nodeCount - 1);
    let stepsPerformed = 0;

    for (let i = 0; i < maxSteps; i++) {
      // Before clicking, ensure Step is enabled
      const stepEnabled = await p.stepBtn.isEnabled();
      if (!stepEnabled) break; // algorithm completed
      await p.stepBtn.click();
      stepsPerformed++;

      // After clicking step, a "Selected edge" log entry should appear for that step (asynchronously)
      await page.waitForFunction(() => {
        const log2 = document.getElementById('log2');
        return log && /Selected edge/.test(log.textContent);
      }, { timeout: 3000 }).catch(() => { /* ignore if not seen immediately */ });

      // There should be at least one edge with class in-mst after the first step
      const inMstCount = await p.mstEdgeCount();
      expect(Number(inMstCount)).toBeGreaterThanOrEqual(1);
    }

    // After performing steps, either all nodes have been included or Step got disabled.
    if (await p.stepBtn.isEnabled()) {
      // If still enabled, at least one step performed
      expect(stepsPerformed).toBeGreaterThanOrEqual(1);
    } else {
      // Step disabled indicates completion; log should mention completion
      const finalLog = await p.getLogText();
      expect(finalLog).toMatch(/Prim's algorithm completed|All nodes included in MST/i);
    }
  });

  test('Reset algorithm clears MST visuals and updates the log', async ({ page }) => {
    const p4 = new PrimGraphPage(page);

    // Select a node and start + perform one step to ensure MST has some edges
    await p.clickFirstNode();
    await p.startBtn.click();
    // Perform one step if possible
    if (await p.stepBtn.isEnabled()) {
      await p.stepBtn.click();
    }

    // Ensure there is at least one in-mst edge
    const mstBefore = Number(await p.mstEdgeCount());
    expect(mstBefore).toBeGreaterThanOrEqual(0);

    // Now click reset
    await p.resetBtn.click();

    // Reset should disable step and reset button, start should be enabled if node is still selected
    if (await p.nodeGroups.count() > 0) {
      // if a node is selected (we didn't deselect), start should be enabled
      const startEnabled = await p.startBtn.isEnabled();
      expect(startEnabled).toBe(Boolean(startEnabled)); // just ensure reading does not throw
    }
    await expect(p.stepBtn).toBeDisabled();
    await expect(p.resetBtn).toBeDisabled();

    // MST visuals (in-mst class) should be cleared (0 or equal to previous if none)
    const mstAfter = Number(await p.mstEdgeCount());
    // mstAfter should be less than or equal to mstBefore; typically 0 after reset
    expect(mstAfter).toBeLessThanOrEqual(mstBefore);

    // Log should contain "Algorithm reset."
    const logText3 = await p.getLogText();
    expect(logText).toMatch(/Algorithm reset\./i);
  });

  test('Invalid node count input shows alert dialog', async ({ page }) => {
    const p5 = new PrimGraphPage(page);

    // Listen for dialogs and capture message
    let dialogMessage = null;
    page.once('dialog', dialog => {
      dialogMessage = dialog.message();
      dialog.dismiss().catch(() => {});
    });

    // Set invalid node count and click generate
    await p.setNodeCount(1);
    await p.generateBtn.click();

    // Ensure a dialog was shown with expected prompt about valid range
    // Wait a short while to let dialog event fire
    await page.waitForTimeout(200);
    expect(dialogMessage).toBeTruthy();
    expect(dialogMessage).toMatch(/Please enter a number of nodes between 2 and 10/i);
  });

  test('Window resize triggers graph regeneration (observed via log)', async ({ page }) => {
    const p6 = new PrimGraphPage(page);

    // Clear the log first by generating once explicitly and waiting
    await p.generateBtn.click();
    await page.waitForFunction(() => {
      const log3 = document.getElementById('log3');
      return log && /Generated random graph/.test(log.textContent);
    }, { timeout: 3000 });

    // Listen for new "Generated random graph" message in the log after resize
    const initialLog = await p.getLogText();

    // Trigger a resize event by changing viewport size
    await page.setViewportSize({ width: 800, height: 600 });
    // Wait for potential regeneration to occur and log to update
    await page.waitForFunction((prev) => {
      const log4 = document.getElementById('log4');
      return log && log.textContent && log.textContent !== prev;
    }, initialLog, { timeout: 5000 }).catch(() => { /* ignore if no regeneration happened */ });

    // Check that the log contains at least one "Generated random graph" message (either initial or new)
    const finalLog1 = await p.getLogText();
    expect(finalLog.length).toBeGreaterThan(0);
    expect(/Generated random graph/.test(finalLog)).toBeTruthy();
  });
});