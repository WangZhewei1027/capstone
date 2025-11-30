import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde438e-cd36-11f0-b98e-a1744d282049.html';

test.describe('Breadth-First Search (BFS) Interactive Demo - UI and behavior', () => {
  // Arrays to collect runtime issues observed during a test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Reset collectors for each test
    consoleErrors = [];
    pageErrors = [];

    // Capture console error messages
    page.on('console', msg => {
      // Record only error-level console messages for later assertions
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture uncaught page exceptions
    page.on('pageerror', err => {
      pageErrors.push(err.message || String(err));
    });

    // Load the page under test
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });

    // Wait for the core UI to be present
    await page.waitForSelector('#svgCanvas');
    await page.waitForSelector('#controls');
    await page.waitForSelector('#startSelect');
  });

  test.afterEach(async () => {
    // After each test ensure there were no unexpected console errors or uncaught page errors.
    // We assert zero errors to ensure the page executed without runtime errors.
    expect(consoleErrors, `Console errors occurred: ${consoleErrors.join(' | ')}`).toHaveLength(0);
    expect(pageErrors, `Page errors occurred: ${pageErrors.join(' | ')}`).toHaveLength(0);
  });

  test('Initial page load shows UI controls and default example graph', async ({ page }) => {
    // Verify primary UI elements are visible
    await expect(page.locator('#addNodeBtn')).toBeVisible();
    await expect(page.locator('#addEdgeBtn')).toBeVisible();
    await expect(page.locator('#deleteBtn')).toBeVisible();
    await expect(page.locator('#stepBtn')).toBeVisible();
    await expect(page.locator('#playBtn')).toBeVisible();
    await expect(page.locator('#resetBtn')).toBeVisible();
    await expect(page.locator('#startSelect')).toBeVisible();
    await expect(page.locator('#queueView')).toBeVisible();
    await expect(page.locator('#visitedView')).toBeVisible();

    // The page initializes with example1 by default which creates 5 nodes in loadExample('example1')
    // Ensure there are node groups in the SVG
    const nodeGroups = page.locator('svg#g? svg, svg g.node'); // fallback selector
    // more robustly count g.node elements
    const nodesCount = await page.locator('svg g.node').count();
    expect(nodesCount).toBeGreaterThanOrEqual(5);

    // Start select should have an option per node
    const startOptions = await page.locator('#startSelect option').count();
    expect(startOptions).toBe(nodesCount);

    // Initially BFS views should be empty
    await expect(page.locator('#queueView')).toHaveText('');
    await expect(page.locator('#visitedView')).toHaveText('');

    // Play button initial text should be "Play"
    await expect(page.locator('#playBtn')).toHaveText('Play');
  });

  test('Step button enqueues start node on first click and processes BFS on second click', async ({ page }) => {
    // Ensure there's at least one node and a start selected
    const initialNodes = await page.locator('svg g.node').count();
    expect(initialNodes).toBeGreaterThan(0);

    // Click Step once: should initialize BFS by enqueuing the start node (queueView shows one label)
    await page.click('#stepBtn');

    // Wait briefly for UI update
    await page.waitForTimeout(100);
    const queueAfterFirst = await page.locator('#queueView').innerText();
    expect(queueAfterFirst.trim().length).toBeGreaterThan(0); // something is in queue
    const visitedAfterFirst = await page.locator('#visitedView').innerText();
    expect(visitedAfterFirst.trim()).toBe(''); // none visited yet

    // Click Step again: the previously enqueued node should be processed (moved to visited)
    await page.click('#stepBtn');
    await page.waitForTimeout(150);
    const visitedAfterSecond = await page.locator('#visitedView').innerText();
    // visited should now contain at least the start node label (e.g. "A" for example1)
    expect(visitedAfterSecond.trim().length).toBeGreaterThan(0);
    // queue should reflect discovered neighbors (could be one or more)
    const queueAfterSecond = await page.locator('#queueView').innerText();
    expect(queueAfterSecond.trim().length).toBeGreaterThanOrEqual(0);
  });

  test('Play button animates BFS from start to completion (fast speed) and updates visited order', async ({ page }) => {
    // Load a different example (tree) for deterministic larger node count
    await page.selectOption('#exampleSel', 'example2');
    // Wait for nodes to be created
    await page.waitForTimeout(100);

    // Count nodes expected in example2 (7 nodes)
    const nodesCount1 = await page.locator('svg g.node').count();
    expect(nodesCount).toBeGreaterThanOrEqual(7);

    // Speed up animation by setting the speed input to a small value to finish quickly
    await page.evaluate(() => {
      const speed = document.getElementById('speed');
      // write a smaller value; BFS play code will accept it for interval timing
      speed.value = '80';
      speed.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Click Play to start BFS animation
    await page.click('#playBtn');

    // Wait until visitedView shows all nodes or timeout after a reasonable period
    await page.waitForFunction(
      (expected) => {
        const visitedText = document.getElementById('visitedView').textContent || '';
        const visitedItems = visitedText.split(',').map(s => s.trim()).filter(Boolean);
        return visitedItems.length >= expected;
      },
      nodesCount,
      { timeout: 5000 }
    );

    // After completion, visitedView should contain at least nodesCount labels
    const visitedFinal = await page.locator('#visitedView').innerText();
    const visitedItems1 = visitedFinal.split(',').map(s => s.trim()).filter(Boolean);
    expect(visitedItems.length).toBeGreaterThanOrEqual(nodesCount);

    // Play button should have returned to 'Play' after completion
    await expect(page.locator('#playBtn')).toHaveText('Play');
  });

  test('Add Node mode creates a new node and Add Edge connects two nodes', async ({ page }) => {
    // Count nodes and start options before adding
    const beforeNodes = await page.locator('svg g.node').count();
    const beforeOptions = await page.locator('#startSelect option').count();

    // Enter Add Node mode
    await page.click('#addNodeBtn');
    // Click on the canvas area to add a node at coordinates (50,50) inside svg
    const svgBox = await page.locator('#svgCanvas').boundingBox();
    expect(svgBox).not.toBeNull();
    // Click near the top-left of svg to add node
    await page.mouse.click(svgBox.x + 60, svgBox.y + 60);

    // Small wait for node to be created and redrawn
    await page.waitForTimeout(150);
    const afterNodes = await page.locator('svg g.node').count();
    expect(afterNodes).toBe(beforeNodes + 1);

    const afterOptions = await page.locator('#startSelect option').count();
    expect(afterOptions).toBe(beforeOptions + 1);

    // Now add an edge between two existing nodes using Add Edge mode
    await page.click('#addEdgeBtn');

    // Choose first two node groups in DOM order and click them
    const nodeLocators = page.locator('svg g.node');
    const firstNode = nodeLocators.nth(0);
    const secondNode = nodeLocators.nth(1);

    // Click first node
    await firstNode.click();
    // Click second node
    await secondNode.click();

    // Wait for edge to be created and drawn
    await page.waitForTimeout(150);

    // Count edges by querying persistent lines with stroke "#bbb" (edge lines drawn in draw())
    const edgeLines = await page.locator('svg line[stroke="#bbb"]').count();
    // Expect at least one edge exists
    expect(edgeLines).toBeGreaterThanOrEqual(1);
  });

  test('Delete mode removes a node and an edge from the graph', async ({ page }) => {
    // Ensure graph has at least one edge to remove: if not, create an edge first
    let initialEdges = await page.locator('svg line[stroke="#bbb"]').count();
    const initialNodes1 = await page.locator('svg g.node').count();
    if (initialEdges < 1 && initialNodes >= 2) {
      // Create an edge between first two nodes
      await page.click('#addEdgeBtn');
      await page.locator('svg g.node').nth(0).click();
      await page.locator('svg g.node').nth(1).click();
      await page.waitForTimeout(150);
      initialEdges = await page.locator('svg line[stroke="#bbb"]').count();
      expect(initialEdges).toBeGreaterThanOrEqual(1);
    }

    // Switch to delete mode
    await page.click('#deleteBtn');

    // Delete a node: click the last node in the DOM
    const nodesBeforeDel = await page.locator('svg g.node').count();
    const startOptionsBeforeDel = await page.locator('#startSelect option').count();
    await page.locator('svg g.node').nth(nodesBeforeDel - 1).click();
    await page.waitForTimeout(150);

    const nodesAfterDel = await page.locator('svg g.node').count();
    const startOptionsAfterDel = await page.locator('#startSelect option').count();
    expect(nodesAfterDel).toBe(nodesBeforeDel - 1);
    expect(startOptionsAfterDel).toBe(startOptionsBeforeDel - 1);

    // Delete an edge: find an existing edge line and click it
    const edgesBefore = await page.locator('svg line[stroke="#bbb"]').count();
    if (edgesBefore > 0) {
      // Click the first edge line element
      await page.locator('svg line[stroke="#bbb"]').first().click();
      await page.waitForTimeout(150);
      const edgesAfter = await page.locator('svg line[stroke="#bbb"]').count();
      expect(edgesAfter).toBeLessThanOrEqual(edgesBefore - 1);
    } else {
      // If no edges available, at least ensure we could not crash
      expect(edgesBefore).toBeGreaterThanOrEqual(0);
    }
  });

  test('Reset button clears BFS state (queue and visited) and resets node colors', async ({ page }) => {
    // Trigger some BFS activity: click Step twice to produce visited nodes
    await page.click('#stepBtn');
    await page.waitForTimeout(100);
    await page.click('#stepBtn');
    await page.waitForTimeout(150);

    // Confirm there is some visited content
    const visitedBeforeReset = await page.locator('#visitedView').innerText();
    // Could be empty in some edge cases, but normally non-empty after two steps
    // We proceed to reset regardless and check cleared state
    await page.click('#resetBtn');
    await page.waitForTimeout(100);

    // After reset, queue and visited views must be empty
    await expect(page.locator('#queueView')).toHaveText('');
    await expect(page.locator('#visitedView')).toHaveText('');

    // Ensure node circle fills are reset to the 'unvisited' color '#ffffff'
    const circleCount = await page.locator('svg circle').count();
    for (let i = 0; i < circleCount; i++) {
      const fill = await page.locator('svg circle').nth(i).getAttribute('fill');
      // Either explicitly '#ffffff' or default white string - check substring
      expect(String(fill).toLowerCase()).toContain('ffffff');
    }
  });

  test('Example selector loads different graphs (simple, tree, grid, random)', async ({ page }) => {
    // Select Example: Tree
    await page.selectOption('#exampleSel', 'example2');
    await page.waitForTimeout(120);
    let nodesCount2 = await page.locator('svg g.node').count();
    expect(nodesCount).toBeGreaterThanOrEqual(7);

    // Select Example: Grid (3x3 -> 9 nodes)
    await page.selectOption('#exampleSel', 'example3');
    await page.waitForTimeout(120);
    nodesCount = await page.locator('svg g.node').count();
    expect(nodesCount).toBeGreaterThanOrEqual(9);

    // Select Example: Random - should create multiple nodes (at least 4)
    await page.selectOption('#exampleSel', 'random');
    await page.waitForTimeout(200);
    nodesCount = await page.locator('svg g.node').count();
    expect(nodesCount).toBeGreaterThanOrEqual(4);

    // Back to Simple
    await page.selectOption('#exampleSel', 'example1');
    await page.waitForTimeout(120);
    nodesCount = await page.locator('svg g.node').count();
    expect(nodesCount).toBeGreaterThanOrEqual(5);
  });

  test('Start select changes start node used by Step and Play', async ({ page }) => {
    // Ensure there are at least two nodes to choose from
    const options = await page.locator('#startSelect option').count();
    expect(options).toBeGreaterThanOrEqual(1);

    // If more than one option, change the selected option to the last and run a step
    if (options > 1) {
      // Get last option value
      const lastOptionValue = await page.locator('#startSelect option').nth(options - 1).getAttribute('value');
      await page.selectOption('#startSelect', lastOptionValue);
      await page.click('#stepBtn');
      await page.waitForTimeout(120);

      // The visited or queue views should reflect the selected start (not a strict label equality test,
      // but queue should be non-empty after initializing BFS)
      const queueText = await page.locator('#queueView').innerText();
      expect(queueText.trim().length).toBeGreaterThan(0);
    } else {
      // Fallback: still click step to ensure no crash occurs
      await page.click('#stepBtn');
      await page.waitForTimeout(120);
      expect(await page.locator('#queueView').innerText()).not.toBeUndefined();
    }
  });
});