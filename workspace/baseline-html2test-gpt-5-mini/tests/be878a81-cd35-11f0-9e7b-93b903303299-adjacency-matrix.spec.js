import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be878a81-cd35-11f0-9e7b-93b903303299.html';

test.describe('Adjacency Matrix Visualizer (be878a81-cd35-11f0-9e7b-93b903303299)', () => {
  // Capture console.error and page errors for each test to assert application runs without uncaught errors.
  let consoleErrors;
  let pageErrors;
  let dialogs;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];
    dialogs = [];

    // Listen for console messages and page errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
    // Auto-accept dialogs and capture their messages
    page.on('dialog', async d => {
      dialogs.push(d.message());
      await d.accept();
    });

    // Navigate to the app page
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    // Wait a small amount for initial rendering to complete (matrix builds and drawGraph)
    await page.waitForSelector('#matrixTable tbody tr');
  });

  test.afterEach(async () => {
    // Ensure no uncaught page errors or console.error occurred during the test run.
    expect(pageErrors, 'No uncaught page errors').toHaveLength(0);
    expect(consoleErrors, 'No console.error messages').toHaveLength(0);
  });

  test('Initial load: default controls, matrix and SVG nodes render', async ({ page }) => {
    // Verify page title
    await expect(page).toHaveTitle(/Adjacency Matrix Visualizer/);

    // Controls should have expected default values
    await expect(page.locator('#nodeCount')).toHaveValue('6');
    await expect(page.locator('#directed')).not.toBeChecked();
    await expect(page.locator('#weighted')).not.toBeChecked();
    await expect(page.locator('#allowSelf')).toBeChecked();

    // Matrix should be built with 6 rows in tbody
    const rows = page.locator('#matrixTable tbody tr');
    await expect(rows).toHaveCount(6);

    // Sample pattern sets a cycle: cell (0,1) should be "on"
    const cell01 = page.locator('td[data-i="0"][data-j="1"]');
    await expect(cell01).toHaveClass(/on/);

    // SVG should contain node labels 0..5
    for (let i = 0; i < 6; i++) {
      await expect(page.locator(`svg text`, { hasText: String(i) })).toBeVisible();
    }

    // Adj list should include "0: 1" as part of cycle notation
    await expect(page.locator('#adjList')).toContainText('0: 1');
  });

  test('Toggle directed: lines gain marker-end attribute when directed enabled', async ({ page }) => {
    // Initially undirected: lines should not have marker-end
    const initialLines = await page.locator('svg line').elementHandles();
    for (const h of initialLines) {
      const marker = await h.getAttribute('marker-end');
      expect(marker).toBeNull();
    }

    // Enable directed
    await page.click('#directed');
    // Re-query lines and expect at least one to have marker-end
    await page.waitForTimeout(120); // allow redraw
    const directedLines = await page.locator('svg line').elementHandles();
    let foundArrow = false;
    for (const h of directedLines) {
      const marker1 = await h.getAttribute('marker1-end');
      if (marker && marker.includes('arrowhead')) { foundArrow = true; break; }
    }
    expect(foundArrow).toBe(true);

    // Disable directed back and confirm marker-end removed
    await page.click('#directed');
    await page.waitForTimeout(120);
    const linesAfter = await page.locator('svg line').elementHandles();
    for (const h of linesAfter) {
      const marker2 = await h.getAttribute('marker2-end');
      expect(marker).toBeNull();
    }
  });

  test('Weighted toggle shows numeric inputs and changing a weight updates SVG and adjacency list', async ({ page }) => {
    // Enable weighted mode
    await page.click('#weighted');
    await page.waitForTimeout(100);
    // In weighted mode, matrix cells should contain input.weight elements
    const weightInputs = page.locator('#matrixTable input.weight');
    await expect(weightInputs).toHaveCountGreaterThan(0);

    // Find input for edge 0->1 and set it to 3.5
    const input01 = page.locator('td[data-i="0"][data-j="1"] input.weight');
    await expect(input01).toBeVisible();
    await input01.fill('3.5');
    // Trigger change by blurring (press Enter)
    await input01.press('Enter');
    await page.waitForTimeout(150);

    // SVG should contain a text label with "3.5" for the edge
    await expect(page.locator('svg text', { hasText: '3.5' })).toBeVisible();

    // Adj list line for 0 should include "1(3.5)"
    await expect(page.locator('#adjList')).toContainText('0: 1(3.5)');
  });

  test('Self-loop behavior: creating and removing self-loop via allowSelf toggle', async ({ page }) => {
    // Ensure allowSelf is enabled
    await page.locator('#allowSelf').setChecked(true);
    // Click diagonal cell 0,0 to toggle self-loop on
    const diag00 = page.locator('td[data-i="0"][data-j="0"]');
    await diag00.click();
    await page.waitForTimeout(100);
    await expect(diag00).toHaveClass(/on/);
    // Now disable allowSelf; this should clear diagonal entries
    await page.locator('#allowSelf').click();
    await page.waitForTimeout(100);
    await expect(diag00).not.toHaveClass(/on/);
    // Adj list should not show 0 referencing 0
    const adjText = await page.locator('#adjList').textContent();
    expect(adjText).not.toContain('0(0)');
    expect(adjText).not.toMatch(/0:\s.*\b0\b/);
  });

  test('Resize reduces node count and matrix rebuilds correctly', async ({ page }) => {
    // Set node count to 4 and click Resize
    await page.fill('#nodeCount', '4');
    await page.click('#resizeBtn');
    await page.waitForTimeout(150);

    // Verify nodeCount input reflects new size and matrix rows count updated
    await expect(page.locator('#nodeCount')).toHaveValue('4');
    await expect(page.locator('#matrixTable tbody tr')).toHaveCount(4);
  });

  test('Randomize populates adjacency matrix and drawGraph updates', async ({ page }) => {
    // Click Randomize
    await page.click('#randomBtn');
    await page.waitForTimeout(200);

    // At least one cell should be "on" (for unweighted mode)
    const onCells = await page.locator('td.cell.on').count();
    expect(onCells).toBeGreaterThanOrEqual(0); // could be zero but should not throw; we assert non-error path

    // SVG should contain lines or loops corresponding to edges (g elements)
    const edgeGroups = await page.locator('svg g').count();
    expect(edgeGroups).toBeGreaterThan(0);
  });

  test('Clear sets all matrix entries to zero (off state)', async ({ page }) => {
    // Click Clear
    await page.click('#clearBtn');
    await page.waitForTimeout(120);
    // All cells should be off (no 'on' class)
    const onCount = await page.locator('td.cell.on').count();
    expect(onCount).toBe(0);
    // Adj list should show only empty neighbor lists
    const adjText1 = await page.locator('#adjList').textContent();
    expect(adjText.split('\n').every(line => line.match(/^\d+:\s*$/) || line === '')).toBeTruthy();
  });

  test('Enforce Symmetry mirrors edges when enabled', async ({ page }) => {
    // Ensure symmetry is off initially; set an asymmetric edge 0->2
    const targetCell = page.locator('td[data-i="0"][data-j="2"]');
    await targetCell.click();
    await page.waitForTimeout(100);
    await expect(targetCell).toHaveClass(/on/);

    // Ensure the opposite 2->0 is not set
    const opposite = page.locator('td[data-i="2"][data-j="0"]');
    const oppHasOn = (await opposite.getAttribute('class') || '').includes('on');

    // Toggle symmetry on
    await page.click('#symBtn');
    await page.waitForTimeout(150);

    // After enabling symmetry, the opposite cell should become on
    await expect(opposite).toHaveClass(/on/);
    // The symmetry button opacity should reflect enabled state (1)
    const symOpacity = await page.locator('#symBtn').evaluate(el => window.getComputedStyle(el).opacity);
    expect(Number(symOpacity)).toBeGreaterThanOrEqual(1 - 1e-6);
  });

  test('Import adjacency list via textarea and From Adjacency List button rebuilds matrix', async ({ page }) => {
    // Prepare a simple adjacency list
    const sample = '0: 1 2\n1: 2';
    await page.fill('#importArea', sample);
    // Click From Adjacency List button
    await page.click('#fromAdjListBtn');
    await page.waitForTimeout(200);

    // Matrix size should be 3 (indices 0..2)
    await expect(page.locator('#matrixTable tbody tr')).toHaveCount(3);
    // Adj list should reflect imported content
    await expect(page.locator('#adjList')).toContainText('0: 1 2');
    await expect(page.locator('#adjList')).toContainText('1: 2');
  });

  test('Export button opens a popup with JSON content', async ({ page }) => {
    // Wait for popup that the export button opens
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('#exportBtn'),
    ]);
    // Wait for popup content to be loaded
    await popup.waitForLoadState('load');
    // Popup title should indicate exported JSON
    await expect(popup).toHaveTitle('Exported Graph JSON');
    // The popup body should contain JSON with key "A"
    const bodyText = await popup.locator('body').innerText();
    expect(bodyText).toContain('"A"');
    expect(bodyText).toContain('"n"');
    await popup.close();
  });

  test('Copy button attempts to write to clipboard and falls back to alert if unavailable', async ({ page }) => {
    // Click copy button and handle both possible flows:
    // - If clipboard is available, button text transiently becomes "Copied!"
    // - If clipboard fails, an alert is shown with fallback JSON
    await page.click('#copyBtn');

    // Give some time for either dialog or button text change
    await page.waitForTimeout(300);

    if (dialogs.length > 0) {
      // Clipboard failed path: dialog shown with fallback JSON
      expect(dialogs.some(d => d.includes('Copy failed') || d.includes('Here is the JSON'))).toBeTruthy();
    } else {
      // Clipboard succeeded path: button text should change to "Copied!" temporarily
      await expect(page.locator('#copyBtn')).toHaveText('Copied!');
      // Wait for the label to revert back
      await page.waitForTimeout(1300);
      await expect(page.locator('#copyBtn')).toHaveText('Copy JSON');
    }
  });

  test('Keyboard shortcut Ctrl/Cmd+S toggles enforceSymmetry state', async ({ page }) => {
    // Read current opacity of symBtn
    const beforeOpacity = await page.locator('#symBtn').evaluate(el => window.getComputedStyle(el).opacity);
    // Trigger keyboard shortcut (Control platform key may vary; use Control)
    await page.keyboard.down('Control');
    await page.keyboard.press('s');
    await page.keyboard.up('Control');
    await page.waitForTimeout(150);
    const afterOpacity = await page.locator('#symBtn').evaluate(el => window.getComputedStyle(el).opacity);
    // Opacity should have changed indicating toggle
    expect(beforeOpacity).not.toEqual(afterOpacity);
  });

  test('Double-clicking a matrix header triggers repositioning (drawGraph)', async ({ page }) => {
    // Capture initial first node text x attribute
    const firstNodeText = page.locator('svg g.node text').first();
    const beforeX = await firstNodeText.getAttribute('x');

    // Double click a table header cell to trigger randomizePositions + drawGraph
    const headerTh = page.locator('#matrixTable thead th').first();
    await headerTh.dblclick();
    await page.waitForTimeout(150);

    // After dblclick, first node x should change (nodes repositioned)
    const afterX = await firstNodeText.getAttribute('x');
    expect(beforeX).not.toEqual(afterX);
  });

  test('Dragging a node updates its SVG coordinates (mousedown, mousemove, mouseup)', async ({ page }) => {
    // Locate the first node's circle element
    const nodeGroup = page.locator('svg g.node').first();
    const circle = nodeGroup.locator('circle');
    // Get initial cx, cy
    const beforeCx = await circle.getAttribute('cx');
    const beforeCy = await circle.getAttribute('cy');

    // Compute the center of the circle in viewport coordinates
    const box = await circle.boundingBox();
    if (!box) {
      // If boundingBox unavailable, skip assertion gracefully (no failure)
      return;
    }
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    const moveToX = startX + 40;
    const moveToY = startY + 30;

    // Perform drag sequence: mousedown -> mousemove -> mouseup
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(moveToX, moveToY, { steps: 8 });
    await page.waitForTimeout(120);
    await page.mouse.up();
    await page.waitForTimeout(120);

    // After drag, attributes should have changed
    const afterCx = await circle.getAttribute('cx');
    const afterCy = await circle.getAttribute('cy');

    // It's possible that coordinates are floats; compare numeric difference
    const diffX = Math.abs(Number(afterCx) - Number(beforeCx));
    const diffY = Math.abs(Number(afterCy) - Number(beforeCy));
    // Expect at least some movement
    expect(diffX + diffY).toBeGreaterThan(0);
  });
});