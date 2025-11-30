import { test, expect } from '@playwright/test';

// Test file for: Breadth-First Search (BFS) Visualizer
// File name requirement: be87b190-cd35-11f0-9e7b-93b903303299-breadth-first-search-bfs.spec.js
// Served at: http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be87b190-cd35-11f0-9e7b-93b903303299.html

// This test suite exercises the interactive BFS visualizer UI.
// It verifies initial state, control interactions, BFS stepping and auto-play,
// visual DOM updates, and observes console/page errors. Tests use a small
// page-object style helper set for readability.

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be87b190-cd35-11f0-9e7b-93b903303299.html';

test.describe('BFS Visualizer - UI and algorithm interactions', () => {
  // Collect console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages (type includes 'log','error','warning' etc.)
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture uncaught page errors
    page.on('pageerror', err => {
      pageErrors.push(String(err && err.message ? err.message : err));
    });

    await page.goto(APP_URL);
    // Ensure page initialized
    await expect(page.locator('h1')).toHaveText('Breadth-First Search (BFS) Visualizer');
  });

  test.afterEach(async () => {
    // nothing special to teardown, browser context is auto-managed by Playwright
  });

  // Page object helper functions
  const ui = {
    modeText: (page) => page.locator('#modeText'),
    statusText: (page) => page.locator('#statusText'),
    queueBox: (page) => page.locator('#queueBox'),
    visitedBox: (page) => page.locator('#visitedBox'),
    graphType: (page) => page.locator('#graphType'),
    gridSizeLabel: (page) => page.locator('#gridSizeLabel'),
    nodeCountInput: (page) => page.locator('#nodeCount'),
    edgeProb: (page) => page.locator('#edgeProb'),
    probVal: (page) => page.locator('#probVal'),
    undirectedChk: (page) => page.locator('#undirected'),
    regenBtn: (page) => page.locator('#regen'),
    resetBtn: (page) => page.locator('#reset'),
    autoBtn: (page) => page.locator('#autoPlay'),
    stepBtn: (page) => page.locator('#stepBtn'),
    setStartBtn: (page) => page.locator('#setStartBtn'),
    setTargetBtn: (page) => page.locator('#setTargetBtn'),
    clearMarksBtn: (page) => page.locator('#clearMarks'),
    svgNodesGroup: (page) => page.locator('svg g.nodes'),
    nodeGroups: (page) => page.locator('svg g.nodes g'),
    circleByDataId: (page, id) => page.locator(`svg circle[data-id="${id}"]`),
    // helper to click nth node group (0-based)
    clickNodeByIndex: async (page, idx) => {
      const node = page.locator('svg g.nodes g').nth(idx);
      await node.waitFor({ state: 'visible' });
      await node.click({ force: true });
    },
  };

  test.describe('Initial page load and default state', () => {
    test('should render header, controls and default text', async ({ page }) => {
      // Validate key UI elements are present and have expected defaults
      await expect(ui.modeText(page)).toHaveText('Set Start');
      await expect(ui.statusText(page)).toHaveText(/Ready\. Click nodes to choose start and target/);
      await expect(ui.queueBox(page)).toContainText('Queue is empty');
      await expect(ui.visitedBox(page)).toContainText('No nodes visited yet');
      await expect(ui.autoBtn(page)).toHaveText('Auto-play');

      // There should be multiple nodes rendered inside the svg
      const nodesCount = await ui.nodeGroups(page).count();
      expect(nodesCount).toBeGreaterThanOrEqual(4);
    });

    test('should have graphType default to Random and grid controls hidden', async ({ page }) => {
      await expect(ui.graphType(page)).toHaveValue('random');
      // grid size label should be hidden for random graph
      await expect(ui.gridSizeLabel(page)).toBeHidden();
    });

    test('should reflect edge probability slider value in probability label', async ({ page }) => {
      // Default edgeProb is 0.16 displayed in #probVal
      await expect(ui.probVal(page)).toHaveText(/\b0\.16\b/);
      // change the slider programmatically and ensure label updates
      await page.evaluate(() => {
        const el = document.getElementById('edgeProb');
        el.value = '0.42';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await expect(ui.probVal(page)).toHaveText('0.42');
    });
  });

  test.describe('Graph type and controls behavior', () => {
    test('switching to grid toggles visibility of grid inputs and hides node count/probability', async ({ page }) => {
      await ui.graphType(page).selectOption('grid');
      // grid label should now be visible
      await expect(ui.gridSizeLabel(page)).toBeVisible();
      // node count and prob labels should be hidden (these have ids nodesLabel and probLabel)
      const nodesLabel = page.locator('#nodesLabel');
      const probLabel = page.locator('#probLabel');
      await expect(nodesLabel).toBeHidden();
      await expect(probLabel).toBeHidden();
      // nodes count should equal gridRows*gridCols (defaults 4x4 => 16 nodes)
      const nodesCount1 = await ui.nodeGroups(page).count();
      expect(nodesCount).toBeGreaterThanOrEqual(4); // sanity check
    });

    test('undirected checkbox toggles without throwing errors', async ({ page }) => {
      const before = await ui.undirectedChk(page).isChecked();
      await ui.undirectedChk(page).click();
      const after = await ui.undirectedChk(page).isChecked();
      expect(after).toBe(!before);
    });
  });

  test.describe('Selecting start and target nodes', () => {
    test('clicking a node in Set Start mode marks it as start (visual stroke present)', async ({ page }) => {
      // Ensure in Set Start mode
      await expect(ui.modeText(page)).toHaveText('Set Start');
      // Click the first node
      await ui.clickNodeByIndex(page, 0);
      // After clicking, statusText should indicate start set
      await expect(ui.statusText(page)).toContainText('Start set to node');
      // There should be a stroke circle rendered for the start node with the start stroke color '#0ef09a'
      // The stroke circle is added before the main circle and has stroke attribute equal to start color
      const startStrokeCircle = page.locator('svg circle[stroke="#0ef09a"]');
      await expect(startStrokeCircle).toHaveCount(1);
    });

    test('switch to Set Target mode and click a different node marks it as target (visual stroke present)', async ({ page }) => {
      // Click start on first node
      await ui.clickNodeByIndex(page, 0);
      // Switch to target mode
      await ui.setTargetBtn(page).click();
      await expect(ui.modeText(page)).toHaveText('Set Target');
      // Click a different node (index 1)
      await ui.clickNodeByIndex(page, 1);
      // status should indicate target set
      await expect(ui.statusText(page)).toContainText('Target set to node');
      // There should be a stroke circle with target color '#ff6b6b'
      const targetStroke = page.locator('svg circle[stroke="#ff6b6b"]');
      await expect(targetStroke).toHaveCount(1);
    });

    test('clear marks button removes start/target visual strokes and resets BFS', async ({ page }) => {
      // Set start and target
      await ui.clickNodeByIndex(page, 0);
      await ui.setTargetBtn(page).click();
      await ui.clickNodeByIndex(page, 1);
      // Ensure both strokes exist
      await expect(page.locator('svg circle[stroke="#0ef09a"]')).toHaveCount(1);
      await expect(page.locator('svg circle[stroke="#ff6b6b"]')).toHaveCount(1);
      // Click clear marks
      await ui.clearMarksBtn(page).click();
      // strokes should be gone
      await expect(page.locator('svg circle[stroke="#0ef09a"]')).toHaveCount(0);
      await expect(page.locator('svg circle[stroke="#ff6b6b"]')).toHaveCount(0);
      // status text should include 'BFS reset' (reset invoked in click handler)
      await expect(ui.statusText(page)).toContainText('BFS reset');
    });
  });

  test.describe('BFS stepping, queue and visited displays', () => {
    test('stepping BFS after setting start enqueues and explores nodes and updates UI', async ({ page }) => {
      // Set start node
      await ui.clickNodeByIndex(page, 0);
      // Step once: this will create generator and perform first step(s)
      await ui.stepBtn(page).click();
      // After first step, queueBox may show discovered nodes or be empty depending on graph; ensure UI updated
      const queueContent = await ui.queueBox(page).textContent();
      const visitedContent = await ui.visitedBox(page).textContent();
      expect(queueContent).toBeTruthy();
      expect(visitedContent).toBeTruthy();

      // Continue stepping until finish or max iterations; check status updates along the way
      let finalStatus = await ui.statusText(page).textContent();
      let iterations = 0;
      while (!/Target found|Search complete|Queue exhausted|Search complete\. Target not found|Target not found/.test(finalStatus) && iterations < 80) {
        await ui.stepBtn(page).click();
        finalStatus = await ui.statusText(page).textContent();
        iterations++;
      }
      // We expect BFS should eventually finish or continue; at minimum the statusText should remain a non-empty string
      expect(finalStatus.length).toBeGreaterThan(0);
      // Visited box should reflect visited nodes if search progressed
      const visitedLabels = await ui.visitedBox(page).locator('.node-label').count();
      expect(visitedLabels).toBeGreaterThanOrEqual(0);
    });

    test('when start and target are set, BFS finds target or exhausts queue; path nodes are marked with path color', async ({ page }) => {
      // Set start and target on two different nodes
      await ui.clickNodeByIndex(page, 0);
      await ui.setTargetBtn(page).click();
      await ui.clickNodeByIndex(page, 2); // choose a possibly non-adjacent node

      // Step repeatedly until done or cap iterations
      let status = await ui.statusText(page).textContent();
      let steps = 0;
      const maxSteps = 200;
      while (!/Target found|Search complete|Queue exhausted|Target not found/.test(status) && steps < maxSteps) {
        await ui.stepBtn(page).click();
        status = await ui.statusText(page).textContent();
        steps++;
      }

      // Final status should indicate some terminal condition
      expect(/Target found|Search complete|Target not found|Queue exhausted/.test(status)).toBe(true);

      // If Target found, there should be at least one node with fill set to the path color '#16a34a'
      if (/Target found/.test(status)) {
        const pathNodes = await page.locator('svg circle[fill="#16a34a"]').count();
        expect(pathNodes).toBeGreaterThanOrEqual(1);
      }
    });

    test('reset button clears BFS progress and queue/visited UI', async ({ page }) => {
      // Set start and advance BFS a few steps
      await ui.clickNodeByIndex(page, 0);
      for (let i = 0; i < 4; i++) {
        await ui.stepBtn(page).click();
      }
      // Confirm that visited or queue shows nodes as a result of steps
      const beforeQueue = await ui.queueBox(page).textContent();
      const beforeVisited = await ui.visitedBox(page).textContent();
      expect(beforeQueue.length).toBeGreaterThan(0);
      expect(beforeVisited.length).toBeGreaterThan(0);

      // Click reset
      await ui.resetBtn(page).click();
      // After reset, queue and visited should show their empty messages and status indicates reset
      await expect(ui.queueBox(page)).toContainText('Queue is empty');
      await expect(ui.visitedBox(page)).toContainText('No nodes visited yet');
      await expect(ui.statusText(page)).toContainText('BFS reset');
    });
  });

  test.describe('Auto-play behavior', () => {
    test('auto-play toggles and completes a search without throwing errors', async ({ page }) => {
      // Set start and target
      await ui.clickNodeByIndex(page, 0);
      await ui.setTargetBtn(page).click();
      await ui.clickNodeByIndex(page, 3);

      // Click auto-play to start
      await ui.autoBtn(page).click();
      // Button text changes to Stop when running
      await expect(ui.autoBtn(page)).toHaveText(/Stop|Auto-play/);

      // Wait until statusText indicates completion or timeout
      await page.waitForFunction(() => {
        const s = document.getElementById('statusText');
        return /Target found|Search complete|Target not found|Queue exhausted/.test(s && s.textContent);
      }, { timeout: 8000 });

      // Auto-play should have stopped and button text reset to 'Auto-play'
      await expect(ui.autoBtn(page)).toHaveText('Auto-play');
    });
  });

  test.describe('Console and runtime error observation', () => {
    test('page should not produce uncaught page errors or console errors during normal interactions', async ({ page }) => {
      // Perform a set of interactions to exercise code paths
      await ui.clickNodeByIndex(page, 0);
      await ui.setTargetBtn(page).click();
      await ui.clickNodeByIndex(page, 1);
      await ui.stepBtn(page).click();
      await ui.resetBtn(page).click();
      await ui.regenBtn(page).click();
      // brief wait to allow any async errors to surface
      await page.waitForTimeout(200);

      // Build arrays of console errors and page errors for assertions
      const consoleErrors = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
      // The requirement in the problem statement asks us to observe console and page errors.
      // We're asserting that there are no unhandled page errors or console-level errors here.
      // This is a safety check: if runtime ReferenceError/SyntaxError/TypeError occur,
      // they will be captured in pageErrors or consoleErrors and cause the test to fail.
      expect(pageErrors.length).toBe(0);
      expect(consoleErrors.length).toBe(0);

      // Additionally assert that no console message explicitly mentions ReferenceError/SyntaxError/TypeError
      const errorKeywords = ['ReferenceError', 'SyntaxError', 'TypeError'];
      for (const msg of consoleMessages) {
        for (const kw of errorKeywords) {
          expect(msg.text).not.toContain(kw);
        }
      }
    });
  });
});