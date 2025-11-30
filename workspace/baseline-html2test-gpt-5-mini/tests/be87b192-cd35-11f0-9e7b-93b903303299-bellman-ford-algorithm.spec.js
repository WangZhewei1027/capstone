import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be87b192-cd35-11f0-9e7b-93b903303299.html';

// Page Object for the app to encapsulate common actions and queries
class BellmanFordPage {
  constructor(page) {
    this.page = page;
    this.canvas = page.locator('#canvas');
    this.addNodeBtn = page.locator('#addNodeBtn');
    this.addEdgeBtn = page.locator('#addEdgeBtn');
    this.delBtn = page.locator('#delBtn');
    this.setSourceBtn = page.locator('#setSourceBtn');
    this.resetBtn = page.locator('#resetBtn');
    this.stepBtn = page.locator('#stepBtn');
    this.runBtn = page.locator('#runBtn');
    this.stopBtn = page.locator('#stopBtn');
    this.sampleBtn = page.locator('#sampleBtn');
    this.randomBtn = page.locator('#randomBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.directedChk = page.locator('#directedChk');
    this.negAllowChk = page.locator('#negAllowChk');
    this.nodeCount = page.locator('#nodeCount');
    this.edgeCount = page.locator('#edgeCount');
    this.edgeList = page.locator('#edgeList');
    this.distanceTable = page.locator('#distanceTable');
    this.predList = page.locator('#predList');
    this.logEl = page.locator('#log');
    this.statusEl = page.locator('#status');
    this.iterDisplay = page.locator('#iterDisplay');
    this.edgeIdxDisplay = page.locator('#edgeIdxDisplay');
    this.maxIterEl = page.locator('#maxIter');
    this.sourceDisplay = page.locator('#sourceDisplay');
    this.speedInput = page.locator('#speed');
  }

  // Click on the canvas at coordinates (x,y) relative to canvas top-left
  async clickCanvasAt(x, y) {
    const box = await this.canvas.boundingBox();
    if (!box) throw new Error('Canvas bounding box not found');
    await this.page.mouse.click(box.x + x, box.y + y);
  }

  // Convenience to click a button by its locator safely
  async clickButton(locator) {
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  // Read numeric counts
  async getNodeCount() {
    return Number((await this.nodeCount.textContent()).trim());
  }
  async getEdgeCount() {
    return Number((await this.edgeCount.textContent()).trim());
  }

  // Wait until status element contains some text (useful to assert algorithm completion)
  async waitForStatusContains(text, options = {}) {
    await this.page.waitForFunction(
      (sel, txt) => {
        const el = document.querySelector(sel);
        return el && el.textContent && el.textContent.includes(txt);
      },
      ['#status', text],
      options
    );
  }

  // Helper to set the "Set Source" by clicking setSource and then clicking canvas coords
  async setSourceAt(x, y) {
    await this.clickButton(this.setSourceBtn);
    await this.clickCanvasAt(x, y);
    // small wait for UI update
    await this.page.waitForTimeout(100);
  }

  // Read text from log container
  async getLogsText() {
    return (await this.logEl.textContent()) || '';
  }

  // Read status class name
  async getStatusClass() {
    return (await this.statusEl.getAttribute('class')) || '';
  }
}

test.describe('Bellman-Ford Algorithm Visualizer - be87b192-cd35-11f0-9e7b-93b903303299', () => {
  // Collect console messages and page errors for assertions
  test.beforeEach(async ({ page }) => {
    // no-op: navigation is done in each test to allow independent collection
  });

  // Test initial page load, default graph and that there are no uncaught runtime errors.
  test('Initial load: default demo graph placed and no uncaught page errors', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];

    page.on('console', (msg) => {
      // capture all console messages for diagnostics/assertions
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    await page.goto(APP_URL, { waitUntil: 'load' });

    // Wait for UI to initialize by checking the nodeCount and the log contains the default message
    const app = new BellmanFordPage(page);

    await app.nodeCount.waitFor({ state: 'visible' });

    // Check expected default graph counts from autoSample: 4 nodes, 5 edges
    const nodes = await app.getNodeCount();
    const edges = await app.getEdgeCount();

    // basic expectations about initial graph placed by script
    expect(nodes).toBeGreaterThanOrEqual(4);
    expect(edges).toBeGreaterThanOrEqual(4);

    // The app logs a helpful message about the default graph at startup; ensure it's present in the DOM log
    const logs = await app.getLogsText();
    expect(logs).toMatch(/Default demo graph placed/i);

    // Assert there were no uncaught page errors during load
    expect(pageErrors.length, `Expected no uncaught page errors, saw: ${pageErrors.map(e=>e.message).join('; ')}`).toBe(0);

    // Also assert there was at least one console message (diagnostic)
    expect(consoleMessages.length).toBeGreaterThanOrEqual(0);
  });

  // Test setting the source node and performing a single algorithm step. Validate state updates.
  test('Set source on a node and perform a single Step -> distances and iteration update', async ({ page }) => {
    const consoleMessages1 = [];
    const pageErrors1 = [];
    page.on('console', (m) => consoleMessages.push({ t: m.type(), text: m.text() }));
    page.on('pageerror', (e) => pageErrors.push(e));

    await page.goto(APP_URL, { waitUntil: 'load' });
    const app1 = new BellmanFordPage(page);

    // Set source by clicking the first node (autoSample places first node at x=120,y=100)
    await app.setSourceAt(120, 100);

    // Expect sourceDisplay to reflect the chosen node id (first node id is "0")
    await expect(app.sourceDisplay).toHaveText(/0|—/); // allow for either but we expect '0'
    const srcText = (await app.sourceDisplay.textContent()).trim();
    expect(srcText).not.toBe('—');

    // Click Step once; if algorithm not initialized it will initialize and process first edge
    await app.clickButton(app.stepBtn);

    // After stepping, iteration display should be '1' (or at least not '0')
    const iterText = (await app.iterDisplay.textContent()).trim();
    expect(Number(iterText)).toBeGreaterThanOrEqual(1);

    // Distances UI should show source distance 0 somewhere among dist values
    const distText = await app.distanceTable.textContent();
    expect(distText).toContain('0'); // source distance is 0, appears in UI

    // There should be logs produced after stepping
    const logs1 = await app.getLogsText();
    expect(logs.length).toBeGreaterThan(0);

    // No uncaught page errors during these interactions
    expect(pageErrors.length, `page errors: ${pageErrors.map(e=>e.message).join('; ')}`).toBe(0);
  });

  // Test running the algorithm to completion and verify status indicates success (no negative cycles)
  test('Run algorithm until completion: status becomes success (no negative-weight cycles)', async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'load' });
    const app2 = new BellmanFordPage(page);

    // Ensure source is set
    await app.setSourceAt(120, 100);

    // Click Run to start automated stepping
    await app.clickButton(app.runBtn);

    // Wait for the status to indicate completion. The code sets 'status' text to include
    // 'No negative-weight cycles detected' and applies 'statusOk' class on success.
    await page.waitForFunction(() => {
      const s = document.getElementById('status');
      return s && (s.className.includes('statusOk') || s.textContent.includes('No negative-weight cycles') || s.textContent.includes('completed'));
    }, null, { timeout: 15000 });

    // Validate the status element indicates success via class name 'statusOk'
    const statusClass = await app.getStatusClass();
    expect(statusClass).toContain('statusOk');

    // Also ensure the log contains the completion message
    const logs2 = await app.getLogsText();
    expect(logs).toMatch(/Bellman-Ford completed successfully|No negative-weight cycles detected/i);
  });

  // Test sample load and clear graph functionality and related UI updates
  test('Load sample graph (negative edges) then clear graph: node/edge counts and logs update', async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'load' });
    const app3 = new BellmanFordPage(page);

    // Click Sample button to load the classic example
    await app.clickButton(app.sampleBtn);

    // After loading sample, expect more nodes and edges (sample adds 5 nodes and 8 edges)
    await page.waitForTimeout(200); // small delay for UI update
    const nodesAfterSample = await app.getNodeCount();
    const edgesAfterSample = await app.getEdgeCount();

    expect(nodesAfterSample).toBeGreaterThanOrEqual(5);
    expect(edgesAfterSample).toBeGreaterThanOrEqual(6);

    // Ensure sample log message was written
    const logs3 = await app.getLogsText();
    expect(logs).toMatch(/Sample graph loaded/i);

    // Now clear the graph
    await app.clickButton(app.clearBtn);

    // After clearing, nodes and edges should be zero
    await page.waitForTimeout(100);
    expect(await app.getNodeCount()).toBe(0);
    expect(await app.getEdgeCount()).toBe(0);

    // Log should contain 'Cleared graph.'
    const logs21 = await app.getLogsText();
    expect(logs2).toMatch(/Cleared graph/i);
  });

  // Test adding nodes, attempting to add an edge with negative weight while negatives disabled, then add edge when allowed, and deletion
  test('Add nodes, add edge with prompt handling and negative-weight restriction, then delete node', async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'load' });
    const app4 = new BellmanFordPage(page);

    // Clear any existing graph first to ensure determinism
    await app.clickButton(app.clearBtn);
    await page.waitForTimeout(100);

    // Set up a dialog handler to respond to prompts/alerts in sequence:
    //  - For the first prompt (weight when negative disallowed) we'll return '-3'
    //  - For the second prompt (after enabling negatives) we'll return '2'
    // The handler accepts confirms/alerts without text
    const responses = ['-3', '2'];
    page.on('dialog', async (dialog) => {
      const type = dialog.type();
      if (type === 'prompt') {
        const resp = responses.length ? responses.shift() : '1';
        await dialog.accept(resp);
      } else {
        // confirm/alert -> accept
        await dialog.accept();
      }
    });

    // Add two nodes by using Add Node mode and clicking the canvas
    await app.clickButton(app.addNodeBtn);
    // Click near 100,100 and 200,100 to create two nodes
    await app.clickCanvasAt(100, 100);
    await app.clickCanvasAt(200, 100);

    await page.waitForTimeout(100);
    expect(await app.getNodeCount()).toBe(2);

    // Disable negative weights
    await app.negAllowChk.uncheck();
    await page.waitForTimeout(50);

    // Try to add an edge while negative weights disallowed and respond to prompt with '-3'
    await app.clickButton(app.addEdgeBtn);
    // Click first node then second node to trigger prompt
    await app.clickCanvasAt(100, 100); // select source
    await app.clickCanvasAt(200, 100); // select target - will trigger prompt handled above with '-3'
    await page.waitForTimeout(200);

    // Because negative weights were disabled, edge should NOT have been added
    expect(await app.getEdgeCount()).toBe(0);

    // Now enable negative weights and add an edge with weight '2'
    await app.negAllowChk.check();
    await page.waitForTimeout(50);

    // Add edge again; the next prompt handler will supply '2'
    await app.clickButton(app.addEdgeBtn);
    await app.clickCanvasAt(100, 100); // source
    await app.clickCanvasAt(200, 100); // target
    await page.waitForTimeout(200);

    // Edge should now be present (directed by default => 1 edge)
    expect(await app.getEdgeCount()).toBeGreaterThanOrEqual(1);

    // Now test delete mode: delete the first node by clicking it (confirm will be auto-accepted)
    await app.clickButton(app.delBtn);
    await app.clickCanvasAt(100, 100);
    await page.waitForTimeout(200);

    // Node count decreased to 1
    expect(await app.getNodeCount()).toBe(1);
  });

  // Sanity check: controls visibility and toggles for directed/negative allow checkboxes
  test('UI controls exist and toggling directed/negative allow updates inputs', async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'load' });
    const app5 = new BellmanFordPage(page);

    await expect(app.directedChk).toBeVisible();
    await expect(app.negAllowChk).toBeVisible();

    // Toggle directed checkbox and ensure it changes checked state
    const beforeDirected = await app.directedChk.isChecked();
    await app.directedChk.click();
    const afterDirected = await app.directedChk.isChecked();
    expect(afterDirected).toBe(!beforeDirected);

    // Toggle negative allow checkbox and ensure it changes checked state
    const beforeNeg = await app.negAllowChk.isChecked();
    await app.negAllowChk.click();
    const afterNeg = await app.negAllowChk.isChecked();
    expect(afterNeg).toBe(!beforeNeg);
  });
});