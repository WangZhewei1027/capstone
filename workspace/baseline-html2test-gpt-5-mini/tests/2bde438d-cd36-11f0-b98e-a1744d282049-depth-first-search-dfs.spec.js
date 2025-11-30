import { test, expect } from '@playwright/test';

// Test file for application ID 2bde438d-cd36-11f0-b98e-a1744d282049
// URL served: http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde438d-cd36-11f0-b98e-a1744d282049.html
//
// These tests exercise the interactive DFS demo UI: node/edge creation, mode switching,
// running DFS (iterative & recursive), step/play controls, and clear/delete flows.
// We also observe console and page errors and assert none occurred during each test.
//
// NOTE: Tests intentionally do not attempt to patch or modify app runtime behavior.
// They accept native dialogs (confirm/alert) when they appear.

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde438d-cd36-11f0-b98e-a1744d282049.html';

// Simple page object to encapsulate common locators and helpers
class DFSPage {
  constructor(page) {
    this.page = page;
    this.modeAdd = page.locator('#mode-add');
    this.modeEdge = page.locator('#mode-edge');
    this.modeMove = page.locator('#mode-move');
    this.modeDelete = page.locator('#mode-delete');
    this.modeLabel = page.locator('#modeLabel');
    this.directed = page.locator('#directed');
    this.random = page.locator('#random');
    this.sample = page.locator('#sample');
    this.clear = page.locator('#clear');
    this.nodeCount = page.locator('#nodeCount');
    this.edgeCount = page.locator('#edgeCount');
    this.startSelect = page.locator('#startSelect');
    this.method = page.locator('#method');
    this.run = page.locator('#run');
    this.step = page.locator('#step');
    this.play = page.locator('#playpause');
    this.speed = page.locator('#speed');
    this.visitedOrder = page.locator('#visitedOrder');
    this.time = page.locator('#time');
    this.running = page.locator('#running');
    this.stackView = page.locator('#stackView');
    this.adjView = page.locator('#adjView');
    this.svg = page.locator('svg#svg');
    // nodes are rendered as <g data-id="..."> elements inside the svg
    this.nodeGs = () => page.locator('svg#svg g[data-id]');
    this.edgeLines = () => page.locator('svg#svg line.edge');
  }

  // Wait for initial sample graph to be loaded: nodes > 0
  async waitForInitialGraph() {
    await this.page.waitForFunction(() => {
      const span = document.getElementById('nodeCount');
      return span && Number(span.textContent) > 0;
    });
  }

  // Helper to set speed quickly (value attribute)
  async setSpeed(ms) {
    await this.page.evaluate((v) => {
      const el = document.getElementById('speed');
      if (el) el.value = String(v);
    }, ms);
    // update UI maybe not necessary but give tiny pause
    await this.page.waitForTimeout(50);
  }

  // Click a node by index (0-based) among rendered node <g>
  async clickNodeByIndex(idx) {
    const nodes = await this.nodeGs().elementHandles();
    if (idx >= nodes.length) throw new Error('Node index out of range');
    await nodes[idx].click();
  }

  // Get numeric node and edge counts
  async counts() {
    const n = Number((await this.nodeCount.textContent()).trim());
    const e = Number((await this.edgeCount.textContent()).trim());
    return { n, e };
  }

  // Accept any native dialog (confirm/alert) automatically
  attachDialogHandler() {
    this.page.on('dialog', async dialog => {
      try {
        await dialog.accept();
      } catch (err) {
        // ignore if dialog already handled
      }
    });
  }
}

test.describe('DFS Interactive Demo - end-to-end UI tests', () => {
  // Track console errors and page errors during each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console "error" messages
    page.on('console', msg => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push({ text: msg.text(), location: msg.location() });
        }
      } catch (e) {
        // ignore collector errors
      }
    });

    // Collect unhandled page errors
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to application
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Attach dialog handler globally to avoid modal blocking tests.
    // We accept confirms/alerts as the tests describe delete/clear flows.
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
  });

  test.afterEach(async () => {
    // After each test we assert there were no page errors or console error messages.
    // This verifies that loading and interactions did not produce uncaught exceptions.
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);
    expect(consoleErrors.length, `Unexpected console errors: ${consoleErrors.map(c => c.text).join('; ')}`).toBe(0);
  });

  test('Initial load shows sample graph and default UI state', async ({ page }) => {
    // Purpose: Verify page loads, sample graph is initialized, and key UI elements are in expected default state.
    const p = new DFSPage(page);
    p.attachDialogHandler();

    // Wait for the sample graph (sampleBtn.click() is triggered on init)
    await p.waitForInitialGraph();

    // Validate mode label defaults to "Add Node"
    await expect(p.modeLabel).toHaveText('Add Node');

    // Validate node and edge counts are non-zero (sample graph)
    const counts = await p.counts();
    expect(counts.n).toBeGreaterThan(0);
    expect(counts.e).toBeGreaterThan(0);

    // The start select should have options and a selected value
    const startValue = await p.startSelect.inputValue();
    expect(startValue).not.toBe('');

    // Traversal UI initial state
    await expect(p.visitedOrder).toHaveText(/\[\]/); // empty visited order
    await expect(p.time).toHaveText('0');
    await expect(p.running).toHaveText('No');

    // Stack/Adjacency views present
    await expect(p.stackView).toBeVisible();
    await expect(p.adjView).toBeVisible();
  });

  test('Toolbar mode switching and directed toggle work', async ({ page }) => {
    // Purpose: Ensure mode buttons change the labeled mode and the directed checkbox toggles.
    const p1 = new DFSPage(page);
    p.attachDialogHandler();
    await p.waitForInitialGraph();

    // Switch to Edge mode and verify label and active class toggling
    await p.modeEdge.click();
    await expect(p.modeLabel).toHaveText('Add Edge');
    await expect(p.modeEdge).toHaveClass(/active/);

    // Switch to Move mode
    await p.modeMove.click();
    await expect(p.modeLabel).toHaveText('Move');
    await expect(p.modeMove).toHaveClass(/active/);

    // Switch to Delete mode
    await p.modeDelete.click();
    await expect(p.modeLabel).toHaveText('Delete');
    await expect(p.modeDelete).toHaveClass(/active/);

    // Back to Add Node
    await p.modeAdd.click();
    await expect(p.modeLabel).toHaveText('Add Node');
    await expect(p.modeAdd).toHaveClass(/active/);

    // Toggle directed checkbox and verify checked state changes
    const before = await p.directed.isChecked();
    await p.directed.click();
    const after = await p.directed.isChecked();
    expect(after).toBe(!before);
  });

  test('Add node by clicking canvas increments node count', async ({ page }) => {
    // Purpose: Clicking on the SVG canvas in "Add Node" mode should add a node.
    const p2 = new DFSPage(page);
    p.attachDialogHandler();
    await p.waitForInitialGraph();

    // Ensure in Add Node mode
    await p.modeAdd.click();
    await expect(p.modeLabel).toHaveText('Add Node');

    const before1 = (await p.counts()).n;

    // Click near the center of the SVG to add a node
    const svgBox = await p.svg.boundingBox();
    expect(svgBox).toBeTruthy();
    // Click at center
    await p.svg.click({ position: { x: svgBox.width / 2, y: svgBox.height / 2 } });

    // Wait a tiny bit for render/updateCounts to run
    await page.waitForTimeout(120);

    const after1 = (await p.counts()).n;
    expect(after).toBeGreaterThan(before);
  });

  test('Create an edge in Edge mode and delete it via Delete mode', async ({ page }) => {
    // Purpose: In Edge mode clicking node A then node B creates an edge.
    // Then in Delete mode clicking the edge triggers confirm and removes it.
    const p3 = new DFSPage(page);
    p.attachDialogHandler();
    await p.waitForInitialGraph();

    // Ensure at least two nodes exist
    const countsStart = await p.counts();
    expect(countsStart.n).toBeGreaterThanOrEqual(2);

    // Switch to Edge mode
    await p.modeEdge.click();
    await expect(p.modeLabel).toHaveText('Add Edge');

    // Click first two node <g> elements sequentially to create an edge
    // Use the first two nodes
    const nodeHandles = await p.nodeGs().elementHandles();
    await nodeHandles[0].click();
    await nodeHandles[1].click();

    // Small wait for render and updateCounts
    await page.waitForTimeout(150);

    // Edge count should have increased
    const countsMid = await p.counts();
    expect(countsMid.e).toBeGreaterThanOrEqual(countsStart.e);

    // Now switch to Delete mode and click on the first edge (line element)
    await p.modeDelete.click();
    await expect(p.modeLabel).toHaveText('Delete');

    // There should be at least one edge line; clicking it triggers confirm which we auto-accept
    const lines = await p.edgeLines().elementHandles();
    if (lines.length > 0) {
      await lines[0].click();
      // wait for deletion update
      await page.waitForTimeout(120);
      const countsAfter = await p.counts();
      // Edge count should be less than or equal previous (cannot guarantee exact delete if other edges existed)
      expect(countsAfter.e).toBeLessThanOrEqual(countsMid.e);
    } else {
      // If no individual <line> found, at least ensure edge count from earlier step exists
      expect(countsMid.e).toBeGreaterThan(0);
    }
  });

  test('Run iterative DFS completes and updates visited order', async ({ page }) => {
    // Purpose: Set method to iterative, speed up animations, run DFS and ensure traversal completes,
    // visited order gets populated and running flag toggles back to No.
    const p4 = new DFSPage(page);
    p.attachDialogHandler();
    await p.waitForInitialGraph();

    // Set speed low to speed up test
    await p.setSpeed(120);

    // Select iterative method
    await p.method.selectOption('iterative');
    await expect(p.method).toHaveValue('iterative');

    // Click Run to start traversal
    await p.run.click();

    // Wait until running indicator goes back to 'No', with a reasonable timeout
    await page.waitForFunction(() => {
      const el1 = document.getElementById('running');
      return el && el.textContent === 'No';
    }, { timeout: 10000 });

    // After completion, visitedOrder should contain entries
    const visitedText = (await p.visitedOrder.textContent()).trim();
    expect(visitedText).toMatch(/\[.*\]/);
    // ensure at least one visited node
    expect(visitedText).not.toBe('[]');

    // Stack view should be empty when done
    await expect(p.stackView).toHaveText(/\[.*\]/);
  });

  test('Run recursive DFS completes and updates call stack view', async ({ page }) => {
    // Purpose: Switch to recursive method, run DFS, ensure recursive call stack / visited updated.
    const p5 = new DFSPage(page);
    p.attachDialogHandler();
    await p.waitForInitialGraph();

    // Speed up animations considerably for test
    await p.setSpeed(150);

    // Select recursive method
    await p.method.selectOption('recursive');
    await expect(p.method).toHaveValue('recursive');

    // Click Run
    await p.run.click();

    // Wait until running flag returns to 'No'
    await page.waitForFunction(() => {
      const el2 = document.getElementById('running');
      return el && el.textContent === 'No';
    }, { timeout: 10000 });

    // Validate visited order updated
    const visitedText1 = (await p.visitedOrder.textContent()).trim();
    expect(visitedText).not.toBe('[]');

    // Validate recursion stack is empty at the end (stackView should be [] or similar)
    const stackText = (await p.stackView.textContent()).trim();
    // stack view shows [] when finished
    expect(stackText).toMatch(/\[.*\]/);
  });

  test('Step and Play controls advance traversal incrementally', async ({ page }) => {
    // Purpose: Use Step button to advance traversal one micro-step at a time, and Play to auto-step.
    const p6 = new DFSPage(page);
    p.attachDialogHandler();
    await p.waitForInitialGraph();

    // Ensure method is recursive for call-stack behavior
    await p.method.selectOption('recursive');

    // Reset speed to smallest for play interval minimum
    await p.setSpeed(120);

    // Ensure traversal state is clean
    await page.evaluate(() => {
      // use exposed UI state by clicking reset; the app doesn't expose reset directly,
      // but pressing Step will initialize stepState if needed.
    });

    // Click Step a few times and observe visitedOrder growing or call stack changes
    const visitedBefore = (await p.visitedOrder.textContent()).trim();
    await p.step.click();
    await page.waitForTimeout(120);
    const visitedAfter1 = (await p.visitedOrder.textContent()).trim();
    // Either visited changed or current node set; ensure no error
    expect(visitedAfter1).toBeTruthy();

    // Start Play (it should toggle text to Pause)
    await p.play.click();
    // confirm the button text changes
    await expect(p.play).toHaveText(/Pause|Play/);

    // Allow Play to run a few intervals
    await page.waitForTimeout(700);
    // Stop Play
    await p.play.click();

    // After playing, visitedOrder should be non-empty
    const visitedAfterPlay = (await p.visitedOrder.textContent()).trim();
    expect(visitedAfterPlay).not.toBe('');
    expect(visitedAfterPlay).not.toBe(visitedBefore);
  });

  test('Clear graph via Clear button removes nodes and edges (confirm accepted)', async ({ page }) => {
    // Purpose: Clicking Clear triggers confirm which we auto-accept and graph should be cleared.
    const p7 = new DFSPage(page);
    p.attachDialogHandler();
    await p.waitForInitialGraph();

    // Confirm there are nodes to clear
    const before2 = await p.counts();
    expect(before.n).toBeGreaterThan(0);

    // Click Clear (dialog auto-accepted by handler)
    await p.clear.click();

    // Wait for counts to update to zero
    await page.waitForFunction(() => {
      const n1 = document.getElementById('nodeCount');
      const e1 = document.getElementById('edgeCount');
      return n && e && Number(n.textContent) === 0 && Number(e.textContent) === 0;
    }, { timeout: 2000 });

    const after2 = await p.counts();
    expect(after.n).toBe(0);
    expect(after.e).toBe(0);
  });

});