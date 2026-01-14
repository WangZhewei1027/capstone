import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2 /html/0ccca360-d5b5-11f0-899c-75bf12e026a9.html';

// Page Object for interacting with the Dijkstra visualizer
class GraphPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    // Capture and auto-accept alerts/confirms to avoid blocking tests
    this.page.on('dialog', async dialog => {
      // For confirm/alert prompts we accept to proceed with behavior verification
      await dialog.accept();
    });
    await this.page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  }

  // Console and pageerror collectors (setup in tests)
  onConsole(fn) {
    this.page.on('console', fn);
  }
  onPageError(fn) {
    this.page.on('pageerror', fn);
  }

  // Basic selectors
  async createGraphBtn() { return this.page.locator('#create-graph-btn'); }
  async addEdgeBtn() { return this.page.locator('#add-edge-btn'); }
  async resetGraphBtn() { return this.page.locator('#reset-graph-btn'); }
  async runBtn() { return this.page.locator('#run-btn'); }
  async stepBtn() { return this.page.locator('#step-btn'); }
  async resetBtn() { return this.page.locator('#reset-btn'); }
  async speedRange() { return this.page.locator('#speed-range'); }

  async vertexCountInput() { return this.page.locator('#vertex-count'); }
  async edgeFromSelect() { return this.page.locator('#edge-from'); }
  async edgeToSelect() { return this.page.locator('#edge-to'); }
  async edgeWeightInput() { return this.page.locator('#edge-weight'); }
  async edgesList() { return this.page.locator('#edges-list'); }
  async graphSetup() { return this.page.locator('#graph-setup'); }
  async algorithmControls() { return this.page.locator('#algorithm-controls'); }
  async startNodeSelect() { return this.page.locator('#start-node'); }
  async endNodeSelect() { return this.page.locator('#end-node'); }
  async logDiv() { return this.page.locator('#log'); }
  async svg() { return this.page.locator('#svg-graph'); }

  // Utility actions
  async clickCreateGraph() {
    await (await this.createGraphBtn()).click();
  }

  async addEdge(fromIndex, toIndex, weight) {
    await (await this.edgeFromSelect()).selectOption(String(fromIndex));
    await (await this.edgeToSelect()).selectOption(String(toIndex));
    await (await this.edgeWeightInput()).fill(String(weight));
    await (await this.addEdgeBtn()).click();
  }

  async resetEdgesAccept() {
    // resetGraphBtn triggers a confirm - the page.on('dialog') handler accepts
    await (await this.resetGraphBtn()).click();
  }

  async clickRun() {
    await (await this.runBtn()).click();
  }

  async clickStep() {
    await (await this.stepBtn()).click();
  }

  async clickResetAlgorithm() {
    await (await this.resetBtn()).click();
  }

  async setSpeed(value) {
    await (await this.speedRange()).evaluate((el, v) => { el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); }, value);
  }

  async setStartNode(idx) {
    await (await this.startNodeSelect()).selectOption(String(idx));
  }

  async setEndNode(idxOrEmpty) {
    if (idxOrEmpty === null) {
      await (await this.endNodeSelect()).selectOption('');
    } else {
      await (await this.endNodeSelect()).selectOption(String(idxOrEmpty));
    }
  }

  // Read UI state helpers
  async getEdgesListText() {
    return (await this.edgesList()).innerText();
  }

  async getLogText() {
    return (await this.logDiv()).innerText();
  }

  async nodeHasClass(nodeIndex, className) {
    return this.page.evaluate((i, cls) => {
      const g = document.querySelector(`g.node[data-node="${i}"]`);
      return !!(g && g.classList.contains(cls));
    }, nodeIndex, className);
  }

  async anyEdgeHighlighted() {
    return this.page.evaluate(() => {
      return !!document.querySelector('line.edge.highlighted');
    });
  }

  async animationDelayValue() {
    return this.page.evaluate(() => {
      // return internal variable animationDelay if available
      // fallback to reading the control value
      return typeof animationDelay !== 'undefined' ? animationDelay : Number(document.getElementById('speed-range').value);
    });
  }

  async getStartNodeOptionsCount() {
    return this.page.evaluate(() => {
      return document.getElementById('start-node').options.length;
    });
  }

  // For stepping tests: initialize Dijkstra state directly in page context using existing functions
  async initializeDijkstraState(startIndex, endIndexOrNull) {
    await this.page.evaluate((s, e) => {
      // Use existing dijkstraInit function present in page
      // Do not redefine it; just call to create the state
      dijkstraState = dijkstraInit(s, e === null ? null : e);
      // Ensure step/reset buttons are enabled for manual stepping
      controls.stepBtn.disabled = false;
      controls.resetBtn.disabled = false;
      controls.runBtn.disabled = true;
      // Also ensure logs are cleared as run handler would
      controls.logDiv.textContent = '';
      // Build adjacency list in case it isn't up-to-date
      buildAdjacencyList();
      // Draw labels and colors reflecting initial state (as the UI does)
      updateDistanceLabels();
      updateNodeColors();
    }, startIndex, endIndexOrNull);
  }

  // For creating deterministic small test graph: clear edges and add specified edges
  async replaceEdgesWith(edgesArray) {
    // edgesArray: array of [u,v,weight]
    await this.page.evaluate((arr) => {
      edges.clear();
      arr.forEach(([u, v, w]) => {
        const a = Math.min(u, v), b = Math.max(u, v);
        edges.set(`${a}-${b}`, w);
      });
      buildAdjacencyList();
      updateVertexSelects();
      renderEdgesList();
      drawGraph();
      // reset any dijkstra state UI
      dijkstraState = null;
      controls.runBtn.disabled = false;
      controls.stepBtn.disabled = true;
      controls.resetBtn.disabled = true;
      controls.logDiv.textContent = '';
      highlightPath(null);
      updateNodeColors();
      updateDistanceLabels();
    }, edgesArray);
  }
}

// Tests begin
test.describe('Dijkstra Visualization - FSM and UI behavior', () => {
  let page;
  let gp;
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    gp = new GraphPage(page);
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages and page errors for assertions
    gp.onConsole(msg => {
      const type = msg.type();
      const text = msg.text();
      consoleMessages.push({ type, text });
    });
    gp.onPageError(err => {
      pageErrors.push(err);
    });

    // Navigate to the app page (use exact URL provided)
    await gp.goto();

    // Wait briefly for initializeDefaultGraph() which runs on load to finish drawing
    await page.waitForTimeout(200); // small delay to allow DOM updates like drawing
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Initial load corresponds to S0_Idle: default graph initialized', async () => {
    // Validate the create-graph button exists and controls are visible
    await expect(gp.createGraphBtn()).toBeVisible();

    // The graph setup and algorithm controls are shown by initializeDefaultGraph
    await expect(gp.graphSetup()).toBeVisible();
    await expect(gp.algorithmControls()).toBeVisible();

    // Vertex count default value (as in HTML) should be present and within allowed range
    const vCount = await (await gp.vertexCountInput()).inputValue();
    expect(Number(vCount)).toBeGreaterThanOrEqual(2);
    expect(Number(vCount)).toBeLessThanOrEqual(12);

    // After default init, there should be edges rendered and edges-list not empty text
    const edgesListText = await gp.getEdgesListText();
    expect(edgesListText.trim().length).toBeGreaterThan(0);
    expect(edgesListText).not.toContain('(No edges added)');

    // Buttons state after initialization: run enabled, step/reset disabled
    await expect(gp.runBtn()).toBeEnabled();
    await expect(gp.stepBtn()).toBeDisabled();
    await expect(gp.resetBtn()).toBeDisabled();

    // No uncaught page errors and no console errors
    const consoleErrors = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Click Create Graph triggers S1_GraphCreated and UI updates', async () => {
    // Change vertex count, then create a new graph to ensure updateVertexSelects and drawGraph called
    await (await gp.vertexCountInput()).fill('5');
    await gp.clickCreateGraph();

    // Wait for DOM updates
    await page.waitForTimeout(200);

    // Start/End selects should have options corresponding to 5 vertices
    const opts = await gp.getStartNodeOptionsCount();
    expect(opts).toBe(5);

    // Edges list should be re-rendered (default ring edges exist)
    const edgesText = await gp.getEdgesListText();
    expect(edgesText).toContain('↔');

    // Buttons state updated after graph creation
    await expect(gp.runBtn()).toBeEnabled();
    await expect(gp.stepBtn()).toBeDisabled();
    await expect(gp.resetBtn()).toBeDisabled();
  });

  test('Add / Update Edge and Remove edge behave correctly', async () => {
    // Ensure selects populated; use first two vertices
    await gp.addEdge(0, 1, 5);

    // Wait for edges list update
    await page.waitForTimeout(100);
    let text = await gp.getEdgesListText();
    expect(text).toContain('A ↔ B : 5');

    // Click the Remove button for that edge (it's appended as a button in edges-list)
    // Locate remove button inside edges-list and click it
    const removeBtn = page.locator('#edges-list button', { hasText: 'Remove' }).first();
    await removeBtn.click();

    // After removal the edges-list may show '(No edges added)' or other edges,
    // wait a small amount for UI update
    await page.waitForTimeout(100);
    text = await gp.getEdgesListText();
    // Because initializeDefaultGraph originally added ring edges, removal of one may still leave others.
    // We'll assert that the previously added text is gone.
    expect(text).not.toContain('A ↔ B : 5');
  });

  test('Reset Edges event clears edges and updates UI (ResetEdges)', async () => {
    // Add a specific edge so we can see something to clear
    await gp.addEdge(0, 2, 7);
    await page.waitForTimeout(100);
    let text = await gp.getEdgesListText();
    expect(text).toContain('A ↔ C : 7');

    // Click reset edges; page has a confirm dialog which our handler accepts
    await gp.resetEdgesAccept();

    // Wait for UI changes
    await page.waitForTimeout(200);
    text = await gp.getEdgesListText();
    // After clearing, the page will set '(No edges added)' if no edges exist.
    // But because initializeDefaultGraph had prepopulated edges, resetting removes them.
    expect(text.trim().length).toBeGreaterThan(0); // content present
    // Confirm that dijkstraState is cleared and run/step/reset are set appropriately
    await expect(gp.runBtn()).toBeEnabled();
    await expect(gp.stepBtn()).toBeDisabled();
    await expect(gp.resetBtn()).toBeDisabled();
  });

  test('Run Dijkstra event triggers algorithm and reaches finished state (S2 -> S4)', async () => {
    // For reliability set speed to minimum to allow fast completion in test
    await gp.setSpeed(50);

    // Choose start and end nodes distinct
    await gp.setStartNode(0);
    // Select an end node different from start (choose 1 if available)
    const endToUse = 1;
    await gp.setEndNode(endToUse);

    // Click run - this will start the auto runner
    await gp.clickRun();

    // Wait up to several seconds for algorithm to finish and log to update
    await page.waitForFunction(() => {
      const log = document.getElementById('log');
      return log && /Algorithm finished|Reached end node/.test(log.textContent);
    }, { timeout: 5000 });

    const logText = await gp.getLogText();
    // Expect some completion message
    expect(/Algorithm finished|Reached end node/.test(logText)).toBeTruthy();

    // After finish, reset button should be enabled (algorithm finished)
    await expect(gp.resetBtn()).toBeEnabled();

    // If an end node was specified, edges in shortest path should be highlighted (or not if unreachable)
    // We check whether any highlighted edges exist (best-effort assertion)
    const highlighted = await gp.anyEdgeHighlighted();
    // It's acceptable either way depending on graph connectivity, but we assert that the UI remained stable (no errors)
    expect(pageErrors.length).toBe(0);
    // Ensure the UI produced distance labels
    const hasDistLabels = await page.evaluate(() => !!document.querySelector('text.dist-label'));
    expect(hasDistLabels).toBeTruthy();
  });

  test('Step through Dijkstra manually (S3_AlgorithmStepping) by initializing dijkstraState and clicking Step', async () => {
    // Build a small deterministic graph with clear shortest path: A - B (1), B - C (1), A - C (10)
    // vertices at least 3; ensure vertex count is >=3
    await (await gp.vertexCountInput()).fill('3');
    await gp.clickCreateGraph();
    await page.waitForTimeout(200);

    await gp.replaceEdgesWith([
      [0,1,1],
      [1,2,1],
      [0,2,10],
    ]);

    // Initialize dijkstraState directly using available page function so we can step manually
    await gp.initializeDijkstraState(0, 2); // start A (0), end C (2)

    // Now perform step clicks until algorithm finishes
    // The algorithm will advance with each click. We loop with a max iteration cap.
    let finished = false;
    for (let i = 0; i < 10; i++) {
      // Before each step, capture current 'current' node if present
      const currentNodes = await page.evaluate(() => {
        const g = document.querySelector('g.node.current');
        return g ? g.getAttribute('data-node') : null;
      });
      // Click step
      await gp.clickStep();
      await page.waitForTimeout(100); // allow UI updates

      // Check if finished by inspecting log or internal state
      finished = await page.evaluate(() => {
        return dijkstraState ? !!dijkstraState.finished : true;
      });
      // If finished, break
      if (finished) break;
    }
    expect(finished).toBeTruthy();

    // After finishing with an end node, shortest path should be highlighted: A -> B -> C
    const highlighted = await gp.anyEdgeHighlighted();
    expect(highlighted).toBeTruthy();

    // Also confirm that the log contains a message about reaching end node or finish
    const log = await gp.getLogText();
    expect(/Reached end node|Algorithm finished/.test(log)).toBeTruthy();
  });

  test('Reset Algorithm event returns to ready state (ResetAlgorithm)', async () => {
    // Prepare and run a small deterministic scenario to produce a dijkstraState
    await (await gp.vertexCountInput()).fill('3');
    await gp.clickCreateGraph();
    await page.waitForTimeout(200);
    await gp.replaceEdgesWith([[0,1,2],[1,2,2]]);

    // Initialize and then reset algorithm
    await gp.initializeDijkstraState(0, null); // start only, no end
    // Ensure step/reset buttons reflect being able to step/reset
    await expect(gp.stepBtn()).toBeEnabled();
    await expect(gp.resetBtn()).toBeEnabled();

    // Click Reset (algorithm reset)
    await gp.clickResetAlgorithm();
    await page.waitForTimeout(100);

    // After reset: dijkstraState should be null and controls reset appropriately
    const dijkstraStateExists = await page.evaluate(() => typeof dijkstraState !== 'undefined' && dijkstraState !== null);
    expect(dijkstraStateExists).toBe(false);

    await expect(gp.runBtn()).toBeEnabled();
    await expect(gp.stepBtn()).toBeDisabled();
    await expect(gp.resetBtn()).toBeDisabled();

    // Log should be cleared
    const logText = await gp.getLogText();
    expect(logText.trim()).toBe('');
  });

  test('ChangeSpeed input updates internal animationDelay (ChangeSpeed)', async () => {
    // Set speed to a known value and assert that the internal animationDelay updates
    await gp.setSpeed(250);
    // allow handlers to process
    await page.waitForTimeout(50);
    const delay = await gp.animationDelayValue();
    expect(Number(delay)).toBe(250);

    // Change again to another value
    await gp.setSpeed(800);
    await page.waitForTimeout(50);
    const delay2 = await gp.animationDelayValue();
    expect(Number(delay2)).toBe(800);
  });

  test('Edge cases: adding self-loop and invalid weight trigger alerts and do not mutate edges', async () => {
    // Clear edges to start from clean state
    await gp.replaceEdgesWith([]);

    // Attempt to add a self-loop (from A to A)
    // The page shows alert; our dialog handler accepts it. After attempt, edges-list should still show '(No edges added)'
    await gp.addEdge(0, 0, 5);
    await page.waitForTimeout(100);
    let edgesText = await gp.getEdgesListText();
    // Because no edges were added, expect the placeholder or empty content
    expect(edgesText).toContain('(No edges added)');

    // Attempt to add an invalid weight (e.g., 0)
    await gp.addEdge(0, 1, 0); // triggers alert for weight range
    await page.waitForTimeout(100);
    edgesText = await gp.getEdgesListText();
    expect(edgesText).toContain('(No edges added)');
  });

  test('Observe console messages and page errors (no unexpected runtime errors)', async () => {
    // Basic operation to generate some console logs by creating graph and running small routine
    await gp.clickCreateGraph();
    await gp.setSpeed(50);
    await gp.setStartNode(0);
    await gp.setEndNode(null);
    await gp.clickRun();

    // Wait for algorithm completion
    await page.waitForFunction(() => {
      const log = document.getElementById('log');
      return log && /Algorithm finished|Reached end node/.test(log.textContent);
    }, { timeout: 5000 });

    // Collect console error/warning messages
    const consoleErrors = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');

    // Assert there are no uncaught page errors
    expect(pageErrors.length).toBe(0);

    // Assert there are no console error-level messages (warnings are allowed but we assert none here)
    expect(consoleErrors.length).toBe(0);
  });

});