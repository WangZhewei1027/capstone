import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be87b195-cd35-11f0-9e7b-93b903303299.html';

test.describe('Prim\'s Algorithm Interactive Demo - be87b195-cd35-11f0-9e7b-93b903303299', () => {
  // Capture console messages and page errors for each test so we can assert no unexpected errors occurred.
  test.beforeEach(async ({ page }) => {
    // arrays to collect console errors and page errors
    page.setDefaultTimeout(10000);
    await page.goto(APP_URL);
  });

  // Helper to attach listeners and return captured arrays
  async function attachDiagnostics(page) {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
    return { consoleMessages, pageErrors };
  }

  test('Initial page load: UI elements present and default state stable', async ({ page }) => {
    // Observe console and page errors
    const { consoleMessages, pageErrors } = await attachDiagnostics(page);

    // Assert that the title and header are visible
    await expect(page.locator('text=Prim\'s Algorithm — Minimum Spanning Tree (Interactive)')).toBeVisible();

    // The range input default should be 7 (from HTML value)
    const nVal = page.locator('#nVal');
    await expect(nVal).toHaveText('7');

    // The SVG canvas should be present and have node groups drawn (generateRandomGraph runs on load)
    const svg = page.locator('#svgCanvas');
    await expect(svg).toBeVisible();

    // There should be node elements present (initial generation uses 7 nodes)
    const nodes = page.locator('#svgCanvas g.node');
    await expect(nodes).toHaveCount(7);

    // The priority queue area should show the muted message before Prim is initialized
    const pq = page.locator('#pq');
    await expect(pq).toContainText('No candidate edges');

    // Step and Play buttons should be disabled initially
    await expect(page.locator('#stepBtn')).toBeDisabled();
    await expect(page.locator('#playBtn')).toBeDisabled();

    // No uncaught page errors expected during load
    expect(pageErrors.length).toBe(0);
    // No console messages of type "error"
    const errors = consoleMessages.filter(m => m.type === 'error');
    expect(errors.length).toBe(0);
  });

  test('Generate graph with different node count updates UI and SVG elements', async ({ page }) => {
    const { consoleMessages, pageErrors } = await attachDiagnostics(page);

    // Change the range value to 5 via JS and dispatch input event
    await page.evaluate(() => {
      const el = document.getElementById('nRange');
      el.value = '5';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Ensure the displayed value updated
    await expect(page.locator('#nVal')).toHaveText('5');

    // Click the Generate Random Graph button
    await page.click('#genBtn');

    // After generation, SVG should contain 5 nodes
    const nodes1 = page.locator('#svgCanvas g.node');
    await expect(nodes).toHaveCount(5);

    // And there should be at least one edge group present
    const edges = page.locator('#svgCanvas g.edge');
    await expect(edges).toHaveCountGreaterThan(0);

    // Validate UI summary updated: start vertex shown as 'none' or a number (depends on script)
    const startText = await page.locator('#startVertex').textContent();
    expect(startText).toBeTruthy();

    // Diagnostics: ensure no page errors and no console errors
    expect(pageErrors.length).toBe(0);
    const errors1 = consoleMessages.filter(m => m.type === 'error');
    expect(errors.length).toBe(0);
  });

  test('Choosing a start vertex via Choose Start button and node click', async ({ page }) => {
    const { consoleMessages, pageErrors } = await attachDiagnostics(page);

    // Click "Choose Start" to enter choosing mode; button text should change
    const chooseBtn = page.locator('#chooseStartBtn');
    await expect(chooseBtn).toHaveText('Choose Start');
    await chooseBtn.click();
    // It toggles to instruction text
    await expect(chooseBtn).toContainText('Click a node to set start');

    // Click the first node group to set it as start
    const firstNode = page.locator('#svgCanvas g.node').first();
    // Use a click on the node; the implementation sets start on mousedown which click triggers
    await firstNode.click();

    // After selection, startVertex should update from 'none'
    await expect(page.locator('#startVertex')).not.toHaveText('none');

    // The node should have the 'start' class applied in its group element
    // We can check that the first node's group has class 'start' or that startVertex equals its id
    const startVertexText = await page.locator('#startVertex').textContent();
    const nodeIdAttr = await firstNode.getAttribute('data-id');
    // Ensure the displayed start vertex matches the clicked node id (string comparison)
    expect(startVertexText).toBe(nodeIdAttr);

    // Diagnostics
    expect(pageErrors.length).toBe(0);
    const errors2 = consoleMessages.filter(m => m.type === 'error');
    expect(errors.length).toBe(0);
  });

  test('Initialize Prim, step once and check MST updates (step button enables and step count increments)', async ({ page }) => {
    const { consoleMessages, pageErrors } = await attachDiagnostics(page);

    // Ensure some node is selected as start (if not, clicking start will default to node 0)
    // Click Initialize Prim
    await page.click('#startBtn');

    // After initialization, Step and Play and Reset should be enabled
    await expect(page.locator('#stepBtn')).toBeEnabled();
    await expect(page.locator('#playBtn')).toBeEnabled();
    await expect(page.locator('#resetBtn')).toBeEnabled();

    // Pseudocode should highlight line 3 after initialization
    const highlighted = page.locator('#pseudocode .pseudocode-line.highlight');
    await expect(highlighted).toBeVisible();
    const highlightedText = await highlighted.textContent();
    expect(highlightedText).toContain('3:'); // initialization highlights line 3

    // Click Step once
    await page.click('#stepBtn');

    // Step count should increment to '1'
    await expect(page.locator('#stepCount')).toHaveText('1');

    // The visited list should reflect at least one visited vertex
    const visited = await page.locator('#visitedList').textContent();
    expect(visited).toContain('['); // should be a list, potentially with one or more entries
    // PQ display should be updated (could be 'No candidate edges' or a list depending on connectivity)
    const pqText = await page.locator('#pq').textContent();
    expect(pqText).toBeTruthy();

    // MST weight displayed should be numeric (string of digits or "0")
    const mstWeight = await page.locator('#mstWeight').textContent();
    expect(mstWeight).toMatch(/^\d+$/);

    // Diagnostics
    expect(pageErrors.length).toBe(0);
    const errors3 = consoleMessages.filter(m => m.type === 'error');
    expect(errors.length).toBe(0);
  });

  test('Play/Pause toggles and Reset clears Prim state', async ({ page }) => {
    const { consoleMessages, pageErrors } = await attachDiagnostics(page);

    // Initialize Prim
    await page.click('#startBtn');

    // Start auto-play: Play button text becomes 'Pause'
    const playBtn = page.locator('#playBtn');
    await playBtn.click();
    await expect(playBtn).toHaveText('Pause');

    // Pause by clicking again
    await playBtn.click();
    await expect(playBtn).toHaveText('Play');

    // Now Reset the algorithm state
    await page.click('#resetBtn');

    // After reset: Step, Play, Reset should be disabled again
    await expect(page.locator('#stepBtn')).toBeDisabled();
    await expect(page.locator('#playBtn')).toBeDisabled();
    await expect(page.locator('#resetBtn')).toBeDisabled();

    // PQ should be cleared
    const pqText1 = await page.locator('#pq').textContent();
    expect(pqText).toBe('');

    // MST weight reset to '0'
    await expect(page.locator('#mstWeight')).toHaveText('0');

    // Diagnostics
    expect(pageErrors.length).toBe(0);
    const errors4 = consoleMessages.filter(m => m.type === 'error');
    expect(errors.length).toBe(0);
  });

  test('Clicking an edge prompts for weight change and updates the SVG text', async ({ page }) => {
    const { consoleMessages, pageErrors } = await attachDiagnostics(page);

    // Ensure Prim is not initialized so edge clicks open prompt (behavior is blocked when primInitialized is true)
    // The page initializes a graph on load; primInitialized defaults to false so we can proceed.

    // Locate first edge text element so we can assert its weight changes
    const edgeTextLocator = page.locator('#svgCanvas g.edge text.edge-text').first();
    const initialWeight = await edgeTextLocator.textContent();

    // Set up dialog handler to accept new weight '3'
    page.once('dialog', async dialog => {
      // Accept with new weight
      await dialog.accept('3');
    });

    // Click the parent group of the edge (the <g class="edge">). Clicking the group triggers the prompt handler in the app.
    const edgeGroup = page.locator('#svgCanvas g.edge').first();
    await edgeGroup.click();

    // After dialog accepted, the edge text node should update to '3'
    await expect(edgeTextLocator).toHaveText('3');

    // Ensure the weight actually changed and differs from initial if initial wasn't already '3'
    if (initialWeight !== '3') {
      expect(await edgeTextLocator.textContent()).toBe('3');
    }

    // Diagnostics
    expect(pageErrors.length).toBe(0);
    const errors5 = consoleMessages.filter(m => m.type === 'error');
    expect(errors.length).toBe(0);
  });

  test('Dragging a node updates its circle position attributes (cx, cy change)', async ({ page }) => {
    const { consoleMessages, pageErrors } = await attachDiagnostics(page);

    // Pick the first node's circle element
    const firstNodeGroup = page.locator('#svgCanvas g.node').first();
    const circle = firstNodeGroup.locator('circle');
    // Read initial cx, cy
    const initialCx = await circle.getAttribute('cx');
    const initialCy = await circle.getAttribute('cy');

    // Get bounding box of node group to perform drag with page.mouse
    const box = await firstNodeGroup.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return; // defensive: if bounding box null, test cannot proceed

    // Perform drag: move mouse to center of the node, press, move by an offset, release
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // move by 60 px to the right and 30 px down
    await page.mouse.move(startX + 60, startY + 30, { steps: 6 });
    await page.mouse.up();

    // After dragging, read new cx, cy attributes
    const newCx = await circle.getAttribute('cx');
    const newCy = await circle.getAttribute('cy');

    // Expect the coordinates to have changed (string values)
    expect(newCx).not.toBe(initialCx);
    expect(newCy).not.toBe(initialCy);

    // Diagnostics
    expect(pageErrors.length).toBe(0);
    const errors6 = consoleMessages.filter(m => m.type === 'error');
    expect(errors.length).toBe(0);
  });

  test('Edge cases: clicking Start with empty graph shows alert (handled by dialog) and no crash', async ({ page }) => {
    // This test will clear the graph and then click Initialize Prim to trigger the alert.
    const { consoleMessages, pageErrors } = await attachDiagnostics(page);

    // Click Clear button to remove graph
    await page.click('#clearBtn');

    // Intercept the alert dialog triggered by initializePrim when no nodes exist
    let dialogMessage = null;
    page.once('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept(); // dismiss the alert
    });

    // Click Start (should alert "Create a graph first.")
    await page.click('#startBtn');

    // Assert that an alert dialog appeared with the expected text
    expect(dialogMessage).toContain('Create a graph first.');

    // After dismissing, ensure no page errors happened
    expect(pageErrors.length).toBe(0);
    const errors7 = consoleMessages.filter(m => m.type === 'error');
    expect(errors.length).toBe(0);
  });
});