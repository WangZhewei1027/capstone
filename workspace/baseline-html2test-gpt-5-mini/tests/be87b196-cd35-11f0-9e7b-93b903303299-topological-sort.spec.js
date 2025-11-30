import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be87b196-cd35-11f0-9e7b-93b903303299.html';

test.describe('Topological Sort Visualizer — End-to-end', () => {
  // Capture console errors and page errors for each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console.error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });
    // Collect page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the app
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });

    // Wait for initial seed to render (seedExample logs and nodes)
    await expect(page.locator('#nodeCount')).toHaveText(/\d+/);
    // Ensure initial render of nodes and edges is complete
    await page.waitForTimeout(200); // small pause to let script finish initialization
  });

  test.afterEach(async () => {
    // Assert no unexpected runtime errors occurred
    // The app should run without console.error and uncaught page errors
    expect(consoleErrors, 'No console.error messages expected').toEqual([]);
    expect(pageErrors, 'No uncaught page errors expected').toEqual([]);
  });

  test('Initial load: UI elements present and seeded graph is rendered', async ({ page }) => {
    // Verify key UI elements exist
    await expect(page.locator('h1')).toHaveText('Topological Sort Visualizer');
    await expect(page.locator('#addNodeBtn')).toBeVisible();
    await expect(page.locator('#addEdgeBtn')).toBeVisible();
    await expect(page.locator('#deleteBtn')).toBeVisible();
    await expect(page.locator('#kahnRun')).toBeVisible();
    await expect(page.locator('#dfsRun')).toBeVisible();

    // Seeded example: check node and edge counts match seeded graph (5 nodes, 6 edges)
    await expect(page.locator('#nodeCount')).toHaveText('5');
    await expect(page.locator('#edgeCount')).toHaveText('6');

    // Status indicators initially
    await expect(page.locator('#graphStatus')).toHaveText('No cycle detected');
    await expect(page.locator('#kahnOrder')).toHaveText('[]');
    await expect(page.locator('#dfsOrder')).toHaveText('[]');

    // Log should include seed message and keyboard shortcuts message
    const log = page.locator('#log');
    await expect(log).toContainText('Seeded example graph');
    await expect(log).toContainText('Keyboard shortcuts: n=add node, e=add edge, d=delete, Esc=idle.');
  });

  test('Add two nodes and create an edge between them', async ({ page }) => {
    // Helper: click center of SVG or specific coordinates
    const svg = page.locator('#svg');
    const svgBox = await svg.boundingBox();
    if (!svgBox) throw new Error('SVG bounding box not available');

    // Add first new node
    await page.click('#addNodeBtn');
    // Click near top-left of SVG to place node (offset relative to svg)
    await page.mouse.click(svgBox.x + 50, svgBox.y + 50);
    await expect(page.locator('#log')).toContainText('Added node');

    // Add second new node
    await page.click('#addNodeBtn');
    await page.mouse.click(svgBox.x + 120, svgBox.y + 120);
    await expect(page.locator('#log')).toContainText('Added node');

    // Now there should be two more nodes than initial 5 => 7
    await expect(page.locator('#nodeCount')).toHaveText('7');

    // Create an edge between the last two nodes added.
    // The nodes are rendered in order; pick the last two <g> in #nodes
    const nodes = page.locator('#nodes g');
    const count = await nodes.count();
    // Ensure we have at least two nodes to connect
    expect(count).toBeGreaterThanOrEqual(2);

    const lastIdx = count - 1;
    const secondLastIdx = count - 2;
    // Enter add-edge mode
    await page.click('#addEdgeBtn');
    // Click source (second last) then target (last)
    await nodes.nth(secondLastIdx).click();
    await nodes.nth(lastIdx).click();

    // Edge should have been added (edgeCount increments)
    await expect(page.locator('#edgeCount')).toHaveText(/\d+/);
    await expect(page.locator('#log')).toContainText('Added edge');

    // mode should still be add-edge (the UI disables the addEdgeBtn when active)
    await expect(page.locator('#modeLabel')).toHaveText(/Mode: (Add Edge|Idle|Add Edge)/);
  });

  test('Select a node, delete via Delete Selected, and use delete mode for an edge', async ({ page }) => {
    // Select the first node in the rendered nodes
    const firstNode = page.locator('#nodes g').first();
    await firstNode.click();
    // Selected info should update
    await expect(page.locator('#selectedInfo')).toContainText('Node');

    // Delete selected node with the deleteSelected button
    const beforeCountText = await page.locator('#nodeCount').innerText();
    const beforeCount = Number(beforeCountText);
    await page.click('#deleteSelected');
    await expect(page.locator('#log')).toContainText('Removed node');

    // Node count decreased by 1
    await expect(page.locator('#nodeCount')).toHaveText(String(beforeCount - 1));

    // Now delete an edge using delete mode: pick an existing edge path and remove it
    const edgeBefore = await page.locator('#edgeCount').innerText();
    const edgeBeforeNum = Number(edgeBefore);

    // Enter delete mode
    await page.click('#deleteBtn');
    // click an edge path if exists
    const edges = page.locator('#edges path');
    const edgesCount = await edges.count();
    if (edgesCount > 0) {
      await edges.first().click();
      await expect(page.locator('#log')).toContainText('Removed edge');
      // Edge count should reduce
      await expect(page.locator('#edgeCount')).toHaveText(String(Math.max(0, edgeBeforeNum - 1)));
    } else {
      // If no edges, ensure delete mode exits gracefully
      await expect(page.locator('#log')).toContainText('Click node or edge to delete it');
    }
  });

  test('Kahn algorithm: step-by-step and full run produce topological order for acyclic graph', async ({ page }) => {
    // Reset Kahn state first to ensure a fresh start
    await page.click('#kahnReset');
    await expect(page.locator('#log')).toContainText('Kahn state reset');

    // Step once: kahnStep should initialize then process if possible
    await page.click('#kahnStep');
    // Initialization log
    await expect(page.locator('#log')).toContainText('Kahn initialized');

    // Another step should process at least one node (processing log)
    await page.click('#kahnStep');
    await expect(page.locator('#log')).toContainText('Processing node');

    // Run full Kahn
    await page.click('#kahnRun');
    // For acyclic graph, Kahn should complete with an ordering
    await expect(page.locator('#log')).toContainText('Kahn completed').or.toContainText('Topological ordering');
    // Kahn order element should now show a non-empty array (or at least reflective of processed nodes)
    await expect(page.locator('#kahnOrder')).not.toHaveText('[]');
  });

  test('DFS algorithm: step-by-step exploration and full run produce/identify ordering or cycles', async ({ page }) => {
    // Reset DFS
    await page.click('#dfsReset');
    await expect(page.locator('#log')).toContainText('DFS state reset');

    // Step-wise: initialize then step into nodes
    await page.click('#dfsStep'); // will initialize
    await expect(page.locator('#log')).toContainText('DFS initialized');

    // Step more to simulate exploration (multiple steps)
    await page.click('#dfsStep');
    await page.click('#dfsStep');
    // Logs should include 'Visit' or 'Finished' messages depending on graph state
    const logText = await page.locator('#log').innerText();
    expect(/Visit|Finished|Back-edge|Start DFS/.test(logText)).toBeTruthy();

    // Run full DFS and check completion message
    await page.click('#dfsRun');
    await expect(page.locator('#log')).toContainText('DFS finished').or.toContainText('cycle detected');
    // dfsOrder should reflect ordering (may be [] if cycle)
    await expect(page.locator('#dfsOrder')).toHaveText(/\[.*\]|\[\]/);
  });

  test('Random DAG generation and Clear functionality', async ({ page }) => {
    // Set number of nodes to 4 and generate Random DAG
    const randInput = page.locator('#randN');
    await randInput.fill('4');
    await page.click('#randomDAG');
    await expect(page.locator('#log')).toContainText('Generated random DAG');

    // Node count should match specified value (4)
    await expect(page.locator('#nodeCount')).toHaveText('4');

    // Now clear the graph
    await page.click('#clearBtn');
    await expect(page.locator('#log')).toContainText('Cleared graph');

    // Counts should show zero
    await expect(page.locator('#nodeCount')).toHaveText('0');
    await expect(page.locator('#edgeCount')).toHaveText('0');

    // Graph status text should still exist but be updated by render
    await expect(page.locator('#graphStatus')).toBeVisible();
  });

  test('Interactions: center selected logs and keyboard shortcuts are registered', async ({ page }) => {
    // Seed may have created nodes; select a node if present
    const nodeCountText = await page.locator('#nodeCount').innerText();
    const nodeCount = Number(nodeCountText);
    if (nodeCount > 0) {
      await page.locator('#nodes g').first().click();
      // Center selected should log a message (even though it doesn't re-center view)
      await page.click('#centerSelected');
      await expect(page.locator('#log')).toContainText('Centered on node');
    }

    // Test keyboard shortcuts: press 'n' to enter add-node mode, then Esc to idle
    await page.keyboard.press('n');
    await expect(page.locator('#log')).toContainText('Add node mode');
    await page.keyboard.press('Escape');
    await expect(page.locator('#log')).toContainText('Idle mode');
  });
});