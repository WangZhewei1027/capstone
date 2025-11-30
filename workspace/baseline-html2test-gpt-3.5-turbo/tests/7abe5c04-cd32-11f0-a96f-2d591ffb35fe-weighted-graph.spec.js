import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abe5c04-cd32-11f0-a96f-2d591ffb35fe.html';

test.describe('Weighted Graph Visualization (7abe5c04-cd32-11f0-a96f-2d591ffb35fe)', () => {
  let consoleErrors = [];
  let pageErrors = [];

  // Helper: install listeners to capture console errors and page errors
  async function attachErrorListeners(page) {
    consoleErrors = [];
    pageErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', err => {
      pageErrors.push(String(err));
    });
  }

  // Helper: get canvas bounding box and provide function to move mouse to canvas-relative coords
  async function getCanvasBox(page) {
    const canvas = await page.$('#graphCanvas');
    expect(canvas).not.toBeNull();
    const box = await canvas.boundingBox();
    // boundingBox can be null in rare cases if element not visible; assert it's present
    expect(box).toBeTruthy();
    return box;
  }

  // Helper: move mouse to (cx, cy) relative to canvas (CSS pixels)
  async function moveMouseToCanvasPoint(page, cx, cy) {
    const box1 = await getCanvasBox(page);
    // compute absolute coordinates for mouse
    const absX = box.x + cx;
    const absY = box.y + cy;
    await page.mouse.move(absX, absY);
  }

  // Helper: click (down/up) at canvas point
  async function clickCanvasPoint(page, cx, cy) {
    const box2 = await getCanvasBox(page);
    const absX1 = box.x + cx;
    const absY1 = box.y + cy;
    await page.mouse.click(absX, absY);
  }

  test.beforeEach(async ({ page }) => {
    await attachErrorListeners(page);
    await page.goto(APP_URL);
    // wait for canvas element to be present and graph to draw initially
    await page.waitForSelector('#graphCanvas');
  });

  test.afterEach(async () => {
    // Assert there were no unexpected console errors or page errors during the test
    // Collecting these allows us to surface runtime exceptions that happen naturally.
    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Page errors: ${pageErrors.join(' | ')}`).toBe(0);
  });

  test('Initial page load shows expected static elements and default state', async ({ page }) => {
    // Verify title and instructions are present and correct
    await expect(page.locator('h1')).toHaveText('Weighted Graph Visualization');
    await expect(page.locator('#instructions')).toContainText('Drag nodes to reposition them. Hover over edges to see their weights.');

    // canvas exists
    const canvas1 = page.locator('#graphCanvas');
    await expect(canvas).toBeVisible();

    // info element exists and is empty initially
    const info = page.locator('#info');
    await expect(info).toBeVisible();
    await expect(info).toHaveText(''); // info should be empty before any hover

    // verify the canvas has non-zero bounding box
    const box3 = await getCanvasBox(page);
    expect(box.width).toBeGreaterThan(10);
    expect(box.height).toBeGreaterThan(10);
  });

  test('Hovering an edge displays its weight in the info area, and moving away clears it', async ({ page }) => {
    // The sample graph defines node 0 at (150,150) and node 1 at (350,120)
    // Edge midpoint is at ((150+350)/2, (150+120)/2) = (250, 135)
    const edgeMidX = 250;
    const edgeMidY = 135;

    // Move mouse to the edge midpoint to trigger hover detection
    await moveMouseToCanvasPoint(page, edgeMidX, edgeMidY);

    // The script updates #info when hovering an edge. Wait for expected text.
    const info1 = page.locator('#info1');
    await expect(info).toHaveText('Edge weight (Node 0 ↔ Node 1): 5');

    // Move mouse away to a far location (top-left corner of canvas) and ensure info clears
    await moveMouseToCanvasPoint(page, 10, 10);
    // after moving away, info should become empty
    await expect(info).toHaveText('');
  });

  test('Dragging a node updates edge hover region (drag node 0 by a delta, then hover new midpoint)', async ({ page }) => {
    // Original positions:
    // node0: (150,150)
    // node1: (350,120)
    // original midpoint: (250, 135)
    const node0Orig = { x: 150, y: 150 };
    const node1 = { x: 350, y: 120 };
    const origMid = { x: (node0Orig.x + node1.x) / 2, y: (node0Orig.y + node1.y) / 2 };

    // We'll drag node 0 by dx=50, dy=30 -> new node0: (200,180)
    const dx = 50;
    const dy = 30;
    const node0New = { x: node0Orig.x + dx, y: node0Orig.y + dy };

    // Expected new midpoint:
    const newMid = { x: (node0New.x + node1.x) / 2, y: (node0New.y + node1.y) / 2 };

    // Perform mousedown at node0 original position (click inside the node circle)
    // Use a point slightly offset to be safely within node radius (nodeRadius=15)
    await page.mouse.move((await getCanvasBox(page)).x + node0Orig.x, (await getCanvasBox(page)).y + node0Orig.y);
    await page.mouse.down({ button: 'left' });

    // Drag to new position (relative to canvas)
    // We need to perform mouse.move with absolute coordinates
    const box4 = await getCanvasBox(page);
    await page.mouse.move(box.x + node0New.x, box.y + node0New.y, { steps: 5 });

    // Release mouse to finish drag
    await page.mouse.up({ button: 'left' });

    // After dragging, hovering the original midpoint should no longer show the edge weight (edge moved)
    await moveMouseToCanvasPoint(page, origMid.x, origMid.y);
    const info2 = page.locator('#info2');
    // allow a small timeout for any redraw logic
    await expect(info).toHaveText('');

    // Hover the new midpoint; it should show the same edge weight
    await moveMouseToCanvasPoint(page, newMid.x, newMid.y);
    await expect(info).toHaveText('Edge weight (Node 0 ↔ Node 1): 5');
  });

  test('Canvas resize (viewport change) triggers redraw without runtime errors', async ({ page }) => {
    // Capture initial canvas box
    const initialBox = await getCanvasBox(page);

    // Change viewport size to trigger window resize event and the canvas resize handler
    const currentViewport = page.viewportSize() || { width: 800, height: 600 };
    const newViewport = { width: Math.max(320, currentViewport.width - 100), height: Math.max(320, currentViewport.height - 100) };
    await page.setViewportSize(newViewport);

    // Give the page a moment to handle resize and redraw
    await page.waitForTimeout(250);

    // After resize, canvas bounding box should reflect new layout (width/height might change)
    const resizedBox = await getCanvasBox(page);
    // The canvas width and height should be positive and the size may change
    expect(resizedBox.width).toBeGreaterThan(0);
    expect(resizedBox.height).toBeGreaterThan(0);

    // Also ensure hovering an edge still works after resize: hover midpoint of edge 1-2
    // Node1: (350,120) Node2: (300,300) -> midpoint (325,210)
    await moveMouseToCanvasPoint(page, 325, 210);
    const info3 = page.locator('#info3');
    // Edge weight for edge (1,2) is 3
    await expect(info).toHaveText('Edge weight (Node 1 ↔ Node 2): 3');
  });

  test('Rapid mouse movements and leaving canvas clear hover state and do not cause errors', async ({ page }) => {
    const box5 = await getCanvasBox(page);

    // Rapidly move across several points including edges
    const path = [
      { x: 50, y: 50 },
      { x: 150, y: 150 }, // near node 0
      { x: 250, y: 135 }, // near edge 0-1
      { x: 350, y: 120 }, // near node1
      { x: box.width - 5, y: box.height - 5 } // corner
    ];

    for (const p of path) {
      await page.mouse.move(box.x + p.x, box.y + p.y);
      await page.waitForTimeout(50);
    }

    // Move the mouse out of the canvas to trigger mouseleave behavior
    await page.mouse.move(box.x + box.width + 50, box.y + box.height + 50);
    await page.waitForTimeout(100);

    // Info must be cleared after mouseleave
    const info4 = page.locator('#info4');
    await expect(info).toHaveText('');
  });
});