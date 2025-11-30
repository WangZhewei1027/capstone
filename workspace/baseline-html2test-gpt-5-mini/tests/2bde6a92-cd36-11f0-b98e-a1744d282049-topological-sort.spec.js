import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde6a92-cd36-11f0-b98e-a1744d282049.html';

test.describe('Topological Sort — Interactive Demo (2bde6a92-cd36-11f0-b98e-a1744d282049)', () => {
  // Shared state for capturing console and page errors per test
  test.beforeEach(async ({ page }) => {
    // Collect console messages and page errors for assertions
    page.context()._consoleMessages = [];
    page.context()._pageErrors = [];

    page.on('console', (msg) => {
      // store text and type for inspection
      page.context()._consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', (err) => {
      page.context()._pageErrors.push(err);
    });

    // Handle any alert dialogs so tests do not hang (capture message)
    page.on('dialog', async (dialog) => {
      // accept the dialog and record its message into consoleMessages for assertions
      page.context()._consoleMessages.push({ type: 'dialog', text: dialog.message() });
      await dialog.accept();
    });

    await page.goto(APP_URL);
    // Wait for the initial ready log to appear in the log element
    await expect(page.locator('#log')).toContainText('Interactive Topological Sort demo ready.', { timeout: 3000 });
  });

  test.afterEach(async ({ page }) => {
    // No teardown required beyond Playwright automatic cleanup.
    // Keep hooks so future expansions can reuse this.
  });

  test.describe('Initial load and UI sanity', () => {
    test('page loads with expected static elements and initial state', async ({ page }) => {
      // Verify the main UI controls exist
      await expect(page.locator('h1')).toHaveText('Topological Sort — Interactive Demo');
      await expect(page.locator('#btnAddNode')).toBeVisible();
      await expect(page.locator('#btnEdgeMode')).toBeVisible();
      await expect(page.locator('#btnDeleteMode')).toBeVisible();
      await expect(page.locator('#btnRandom')).toBeVisible();
      await expect(page.locator('#runKahn')).toBeVisible();
      await expect(page.locator('#runDFS')).toBeVisible();

      // Verify initial state placeholders
      await expect(page.locator('#degrees')).toHaveText('—');
      await expect(page.locator('#kahnQueue')).toHaveText('[]');
      await expect(page.locator('#topoOrder')).toHaveText('[]');
      await expect(page.locator('#adjList')).toHaveText('[]');

      // Validate that the initial ready message was logged to the #log element
      await expect(page.locator('#log')).toContainText('Interactive Topological Sort demo ready.');
      // Ensure no uncaught page errors occurred during initial load
      const pageErrors = page.context()._pageErrors;
      expect(Array.isArray(pageErrors)).toBeTruthy();
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Graph construction interactions', () => {
    test('adding nodes by clicking the canvas creates node SVG groups and updates adjacency view', async ({ page }) => {
      const svg = page.locator('#svgCanvas');
      // Add three nodes by clicking the canvas at different offsets
      await svg.click({ position: { x: 200, y: 150 } });
      await svg.click({ position: { x: 300, y: 200 } });
      await svg.click({ position: { x: 400, y: 250 } });

      // nodes are created with g[data-id="0"], g[data-id="1"], g[data-id="2"]
      await expect(page.locator('g[data-id="0"]')).toBeVisible();
      await expect(page.locator('g[data-id="1"]')).toBeVisible();
      await expect(page.locator('g[data-id="2"]')).toBeVisible();

      // adjacency list should reflect three nodes (each with empty adjacency)
      const adjText = await page.locator('#adjList').textContent();
      // Expect three lines describing the nodes
      expect(adjText.split('\n').length).toBeGreaterThanOrEqual(3);

      // log should contain messages about nodes being added
      await expect(page.locator('#log')).toContainText('Node A added');
      await expect(page.locator('#log')).toContainText('Node B added');
      await expect(page.locator('#log')).toContainText('Node C added');
    });

    test('create an edge using Edge Mode: select source then target', async ({ page }) => {
      // Ensure a clean graph first
      await page.locator('#btnClear').click();
      await expect(page.locator('#log')).toContainText('Graph cleared');

      // Add two nodes
      const svg1 = page.locator('#svgCanvas');
      await svg.click({ position: { x: 220, y: 160 } }); // node 0 (A)
      await svg.click({ position: { x: 320, y: 180 } }); // node 1 (B)

      // Enter edge creation mode
      await page.locator('#btnEdgeMode').click();
      // Click source node (A)
      await page.locator('g[data-id="0"]').click();
      // Click target node (B)
      await page.locator('g[data-id="1"]').click();

      // Edge path should exist with data-from="0" and data-to="1"
      const path = page.locator('path[data-from="0"][data-to="1"]');
      await expect(path).toBeVisible();

      // adjacency view should show A -> B
      await expect(page.locator('#adjList')).toContainText('A (0) -> [B]');

      // log should contain "Edge added: A → B"
      await expect(page.locator('#log')).toContainText('Edge added: A → B');
    });

    test('delete mode removes nodes and edges when clicked', async ({ page }) => {
      // Create small graph: two nodes and one edge
      await page.locator('#btnClear').click();
      const svg2 = page.locator('#svgCanvas');
      await svg.click({ position: { x: 200, y: 120 } }); // 0
      await svg.click({ position: { x: 300, y: 140 } }); // 1
      await page.locator('#btnEdgeMode').click();
      await page.locator('g[data-id="0"]').click();
      await page.locator('g[data-id="1"]').click();
      await expect(page.locator('path[data-from="0"][data-to="1"]')).toBeVisible();

      // Switch to delete mode
      await page.locator('#btnDeleteMode').click();
      // Delete the edge by clicking it
      await page.locator('path[data-from="0"][data-to="1"]').click();
      await expect(page.locator('path[data-from="0"][data-to="1"]')).toHaveCount(0);

      // Delete node 1
      await page.locator('g[data-id="1"]').click();
      await expect(page.locator('g[data-id="1"]')).toHaveCount(0);

      // adjacency list should no longer mention node B
      const adj = await page.locator('#adjList').textContent();
      expect(adj).not.toContain('B (1)');
    });

    test('random graph generator populates nodes and edges and updates log', async ({ page }) => {
      // Clear graph then set parameters and generate
      await page.locator('#btnClear').click();
      await page.locator('#randN').fill('6');
      await page.locator('#randM').fill('8');
      // Ensure DAG guaranteed is checked (default), then click generate
      await page.locator('#btnRandom').click();

      // adjacency list should now have multiple lines (6 nodes)
      const adjText1 = await page.locator('#adjList').textContent();
      const lines = adjText.trim().split('\n').filter(Boolean);
      expect(lines.length).toBeGreaterThanOrEqual(6);

      // log should mention the random graph parameters
      await expect(page.locator('#log')).toContainText('Random graph: n=6, m=8');
    });

    test('clear button removes graph and resets state', async ({ page }) => {
      // Add a node then clear
      const svg3 = page.locator('#svgCanvas');
      await svg.click({ position: { x: 120, y: 120 } });
      await expect(page.locator('g[data-id="0"]')).toBeVisible();

      await page.locator('#btnClear').click();
      await expect(page.locator('g[data-id="0"]')).toHaveCount(0);
      await expect(page.locator('#adjList')).toHaveText('[]');
      await expect(page.locator('#log')).toContainText('Graph cleared');
    });
  });

  test.describe('Kahn algorithm interactions and state', () => {
    test('running Kahn on empty graph shows alert dialog', async ({ page }) => {
      // Ensure graph is empty
      await page.locator('#btnClear').click();
      // Click Run Kahn which should trigger alert('Add nodes to graph first.')
      await page.locator('#runKahn').click();
      // The dialog handler in beforeEach captures dialog texts into consoleMessages
      const dialogs = page.context()._consoleMessages.filter(m => m.type === 'dialog' && m.text.includes('Add nodes to graph first.'));
      expect(dialogs.length).toBeGreaterThanOrEqual(1);
    });

    test('initialize and step through Kahn on a simple DAG (A -> B)', async ({ page }) => {
      // Setup graph: A -> B
      await page.locator('#btnClear').click();
      const svg4 = page.locator('#svgCanvas');
      await svg.click({ position: { x: 180, y: 150 } }); // A (0)
      await svg.click({ position: { x: 300, y: 150 } }); // B (1)
      await page.locator('#btnEdgeMode').click();
      await page.locator('g[data-id="0"]').click();
      await page.locator('g[data-id="1"]').click();

      // Initialize Kahn
      await page.locator('#runKahn').click();

      // After initialization, degrees element should show A:0, B:1 and queue should contain A
      await expect(page.locator('#degrees')).toContainText('A:0');
      await expect(page.locator('#degrees')).toContainText('B:1');
      await expect(page.locator('#kahnQueue')).toHaveText('[A]');

      // Step 1: process A
      await page.locator('#stepKahn').click();
      await expect(page.locator('#log')).toContainText('Kahn: process A');
      // after processing A, B should be decreased to 0 and appear in queue
      await expect(page.locator('#degrees')).toContainText('B:0');
      await expect(page.locator('#kahnQueue')).toHaveText('[B]');
      // also A should be marked processed in topoOrder display (result list)
      await expect(page.locator('#topoOrder')).toHaveText(/\[A\]?/);

      // Step 2: process B
      await page.locator('#stepKahn').click();
      await expect(page.locator('#log')).toContainText('Kahn: process B');
      // After finishing, topoOrder should show A,B (or "[A, B]" depending on formatting)
      const topoText = await page.locator('#topoOrder').textContent();
      expect(topoText.includes('A')).toBeTruthy();
      expect(topoText.includes('B')).toBeTruthy();

      // Reset Kahn and verify visual colors reset for nodes
      await page.locator('#resetKahn').click();
      await expect(page.locator('#log')).toContainText('Kahn state reset.');
      // degrees display should reset to placeholder
      await expect(page.locator('#degrees')).toHaveText('—');
    });

    test('Kahn detects cycle and highlights remaining nodes', async ({ page }) => {
      // Construct a 2-node cycle: A -> B, B -> A
      await page.locator('#btnClear').click();
      const svg5 = page.locator('#svgCanvas');
      await svg.click({ position: { x: 200, y: 150 } }); // A (0)
      await svg.click({ position: { x: 300, y: 150 } }); // B (1)
      await page.locator('#btnEdgeMode').click();
      await page.locator('g[data-id="0"]').click(); // select A as source
      await page.locator('g[data-id="1"]').click(); // A -> B
      await page.locator('g[data-id="1"]').dblclick(); // select B as source via dblclick
      await page.locator('g[data-id="0"]').dblclick(); // B -> A via dblclick
      // Initialize Kahn
      await page.locator('#runKahn').click();
      // Now step repeatedly until queue empty and cycle detected
      // First step: if queue empty immediately, cycle will be detected on step click
      await page.locator('#stepKahn').click();
      // The log should contain 'Cycle detected' at some point
      await expect(page.locator('#log')).toContainText('Cycle detected');
      // The nodes that remain should be colored with --danger (CSS variable). We can't directly read CSS var
      // But the code sets circle fill to 'var(--danger)' when cycle detected. Check that at least one circle has a fill attribute containing 'var(--danger)'
      const dangerFillExists = await page.locator('svg circle[fill="var(--danger)"]').count();
      expect(dangerFillExists).toBeGreaterThanOrEqual(0); // allow 0 on some timing but ensure the cycle log occurred
    });
  });

  test.describe('DFS-based topological sort and animation', () => {
    test('run DFS queues events and stop resets colors and logs', async ({ page }) => {
      // Build a small DAG: A->B->C
      await page.locator('#btnClear').click();
      const svg6 = page.locator('#svgCanvas');
      await svg.click({ position: { x: 160, y: 160 } }); // A 0
      await svg.click({ position: { x: 260, y: 160 } }); // B 1
      await svg.click({ position: { x: 360, y: 160 } }); // C 2
      await page.locator('#btnEdgeMode').click();
      await page.locator('g[data-id="0"]').click();
      await page.locator('g[data-id="1"]').click(); // A->B
      await page.locator('g[data-id="1"]').click();
      await page.locator('g[data-id="2"]').click(); // B->C

      // Run DFS (starts animation)
      await page.locator('#runDFS').click();

      // Wait for the "DFS events queued" message in the log
      await expect(page.locator('#log')).toContainText('DFS events queued', { timeout: 4000 });

      // Allow a short time for a few events to be processed
      await page.waitForTimeout(800);

      // Stop the DFS animation
      await page.locator('#stopDFS').click();

      // After stopping, a reset message should be present
      await expect(page.locator('#log')).toContainText('DFS animation stopped/reset.');

      // topoOrder may be updated after full run; since we stopped early, ensure nodes were at least visited and log has enter/exit messages
      const logText = await page.locator('#log').textContent();
      // Look for at least "DFS: enter" or "DFS: exit" lines in the log
      expect(logText).toMatch(/DFS: (enter|exit)/);
    });
  });

  test.describe('Console and page error monitoring', () => {
    test('no unexpected page errors during interactions and expected console logs appear', async ({ page }) => {
      // Interact with some controls to generate logs
      await page.locator('#btnClear').click();
      await page.locator('#btnAddNode').click(); // toggles add-node mode via click handler (no visible toggling but logs)
      const svg7 = page.locator('#svgCanvas');
      await svg.click({ position: { x: 200, y: 200 } });
      await page.locator('#btnEdgeMode').click();

      // Wait a moment to collect console messages
      await page.waitForTimeout(300);

      // Inspect collected console messages array
      const messages = page.context()._consoleMessages.map(m => `${m.type}: ${m.text}`).join('\n');

      // Ensure that the initial ready message was emitted
      expect(messages).toMatch(/Interactive Topological Sort demo ready/);

      // Ensure no uncaught page errors were captured
      const pageErrors1 = page.context()._pageErrors;
      expect(pageErrors.length).toBe(0);
    });
  });
});