import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d288a3-cd33-11f0-bdf9-b3d97e91273d.html';

test.describe('Graph Visualization (Directed / Undirected) - 20d288a3-cd33-11f0-bdf9-b3d97e91273d', () => {
  // Collect console messages and page errors during each test run
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    page.on('console', msg => {
      try {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
      } catch (e) {
        consoleMessages.push({ type: 'unknown', text: String(msg) });
      }
    });

    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    await page.goto(APP_URL);
    // Wait briefly to allow initial script to draw the canvas and log instructions
    await page.waitForTimeout(100);
  });

  // Helper: get bounding box for canvas and compute absolute coordinates
  async function getCanvasBox(page) {
    const canvas = page.locator('#graphCanvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas bounding box not available');
    return box;
  }

  // Helper: read pixel RGBA at canvas-relative coordinates (integers)
  async function getCanvasPixelRGBA(page, relX, relY) {
    return await page.evaluate(({ x, y }) => {
      const canvas1 = document.getElementById('graphCanvas');
      const ctx = canvas.getContext('2d');
      const data = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
      return [data[0], data[1], data[2], data[3]];
    }, { x: relX, y: relY });
  }

  // Helper: check whether pixel resembles white background (allowing full opaque white)
  function isWhiteRGBA(rgba) {
    const [r, g, b, a] = rgba;
    return r === 255 && g === 255 && b === 255 && a === 255;
  }

  test('Initial load: UI elements are present and default state is undirected', async ({ page }) => {
    // Verify header and controls exist
    await expect(page.locator('header')).toHaveText('Graph Visualization (Directed / Undirected)');
    await expect(page.locator('#graphType')).toBeVisible();
    await expect(page.locator('#randomGraphBtn')).toBeVisible();
    await expect(page.locator('#clearBtn')).toBeVisible();
    await expect(page.locator('#legend')).toContainText('Instructions:');

    // Default selected graph type should be 'undirected'
    const selectedValue = await page.locator('#graphType').inputValue();
    expect(selectedValue).toBe('undirected');

    // Ensure no uncaught errors occurred during load
    expect(pageErrors.length).toBe(0);

    // Ensure console contains the startup instructions logged by the app
    const foundInstructionLog = consoleMessages.some(m => m.text.includes('Graph Visualization Instructions'));
    expect(foundInstructionLog).toBeTruthy();
  });

  test('Clicking on canvas adds a node (pixel color changes at click location)', async ({ page }) => {
    // Choose a point within the canvas to add a node
    const box1 = await getCanvasBox(page);
    const relX = 120;
    const relY = 120;
    const absX = box.x + relX;
    const absY = box.y + relY;

    // Ensure canvas is initially blank at that position (white background)
    let pixelBefore = await getCanvasPixelRGBA(page, relX, relY);
    expect(isWhiteRGBA(pixelBefore)).toBe(true);

    // Click to add node
    await page.mouse.click(absX, absY, { button: 'left' });
    // Allow drawing to complete
    await page.waitForTimeout(100);

    const pixelAfter = await getCanvasPixelRGBA(page, relX, relY);
    // Node fill color is #00aaff => approximately (0,170,255) and opaque
    expect(pixelAfter[3]).toBe(255); // opaque
    // Not white anymore
    expect(isWhiteRGBA(pixelAfter)).toBe(false);
    // Blue-ish: red component small
    expect(pixelAfter[0]).toBeLessThan(50);
    expect(pixelAfter[1]).toBeGreaterThan(100);
    expect(pixelAfter[2]).toBeGreaterThan(150);
  });

  test('Dragging a node moves its drawing on the canvas', async ({ page }) => {
    const box2 = await getCanvasBox(page);
    const startX = 200;
    const startY = 150;
    const absStartX = box.x + startX;
    const absStartY = box.y + startY;

    // Add a node at start position
    await page.mouse.click(absStartX, absStartY, { button: 'left' });
    await page.waitForTimeout(100);

    // Confirm node present at start position
    const pixelAtStart = await getCanvasPixelRGBA(page, startX, startY);
    expect(isWhiteRGBA(pixelAtStart)).toBe(false);

    // Drag node by 80px right and 40px down
    const absEndX = absStartX + 80;
    const absEndY = absStartY + 40;
    await page.mouse.move(absStartX, absStartY);
    await page.mouse.down();
    await page.waitForTimeout(20);
    await page.mouse.move(absEndX, absEndY, { steps: 10 });
    await page.waitForTimeout(20);
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Original spot should be background (no longer blue)
    const pixelOldSpot = await getCanvasPixelRGBA(page, startX, startY);
    expect(isWhiteRGBA(pixelOldSpot)).toBe(true);

    // New spot should have node color
    const newRelX = startX + 80;
    const newRelY = startY + 40;
    const pixelNewSpot = await getCanvasPixelRGBA(page, newRelX, newRelY);
    expect(isWhiteRGBA(pixelNewSpot)).toBe(false);
    // Blue-ish node color
    expect(pixelNewSpot[0]).toBeLessThan(80);
    expect(pixelNewSpot[1]).toBeGreaterThan(80);
    expect(pixelNewSpot[2]).toBeGreaterThan(120);
  });

  test('Right-click on a node starts edge-adding mode (orange line), right-clicking another node creates an undirected edge', async ({ page }) => {
    const box3 = await getCanvasBox(page);
    const nodeA = { x: 100, y: 300 };
    const nodeB = { x: 280, y: 300 };

    // Add two nodes
    await page.mouse.click(box.x + nodeA.x, box.y + nodeA.y, { button: 'left' });
    await page.waitForTimeout(80);
    await page.mouse.click(box.x + nodeB.x, box.y + nodeB.y, { button: 'left' });
    await page.waitForTimeout(100);

    // Right-click nodeA to start adding an edge
    await page.mouse.click(box.x + nodeA.x, box.y + nodeA.y, { button: 'right' });
    await page.waitForTimeout(50);

    // Move mouse somewhere between A and B to see the orange guiding line (should draw in orange)
    const midX = Math.floor((nodeA.x + nodeB.x) / 2);
    const midY = Math.floor((nodeA.y + nodeB.y) / 2);
    await page.mouse.move(box.x + midX, box.y + midY);
    await page.waitForTimeout(80);

    // The guide line should paint orange at some pixel along line; pick a point slightly offset from A towards mid
    const guideTestX = Math.floor(nodeA.x + (midX - nodeA.x) * 0.4);
    const guideTestY = Math.floor(nodeA.y + (midY - nodeA.y) * 0.4);
    const guidePixel = await getCanvasPixelRGBA(page, guideTestX, guideTestY);
    // Orange = (255,165,0) approx; check that red is dominant and green moderate
    expect(guidePixel[3]).toBe(255);
    expect(guidePixel[0]).toBeGreaterThan(200);
    expect(guidePixel[1]).toBeGreaterThan(100);
    expect(guidePixel[2]).toBeLessThan(100);

    // Now right-click nodeB to finish adding the edge (undirected)
    await page.mouse.click(box.x + nodeB.x, box.y + nodeB.y, { button: 'right' });
    await page.waitForTimeout(120);

    // Check a pixel roughly at midpoint to detect the edge line (undirected edges are dark #222)
    const edgeMidPixel = await getCanvasPixelRGBA(page, midX, midY);
    // Dark line implies low RGB values
    expect(edgeMidPixel[0]).toBeLessThan(80);
    expect(edgeMidPixel[1]).toBeLessThan(80);
    expect(edgeMidPixel[2]).toBeLessThan(80);
    expect(edgeMidPixel[3]).toBe(255);
  });

  test('Double-clicking a node removes it and connected edges', async ({ page }) => {
    const box4 = await getCanvasBox(page);
    const a = { x: 360, y: 120 };
    const b = { x: 460, y: 120 };

    // Add two nodes
    await page.mouse.click(box.x + a.x, box.y + a.y, { button: 'left' });
    await page.waitForTimeout(50);
    await page.mouse.click(box.x + b.x, box.y + b.y, { button: 'left' });
    await page.waitForTimeout(80);

    // Create edge between them via right clicks
    await page.mouse.click(box.x + a.x, box.y + a.y, { button: 'right' });
    await page.waitForTimeout(30);
    await page.mouse.click(box.x + b.x, box.y + b.y, { button: 'right' });
    await page.waitForTimeout(120);

    // Confirm edge present at midpoint
    const midX1 = Math.floor((a.x + b.x) / 2);
    const midY1 = Math.floor((a.y + b.y) / 2);
    let pixelEdgeBefore = await getCanvasPixelRGBA(page, midX, midY);
    expect(pixelEdgeBefore[0]).toBeLessThan(80);

    // Double click node a to remove it (and edges)
    await page.mouse.dblclick(box.x + a.x, box.y + a.y);
    await page.waitForTimeout(150);

    // The pixel where node A was should now be white
    const pixelAAfter = await getCanvasPixelRGBA(page, a.x, a.y);
    expect(isWhiteRGBA(pixelAAfter)).toBe(true);

    // The midpoint pixel where edge was should also be cleared (white background)
    const pixelEdgeAfter = await getCanvasPixelRGBA(page, midX, midY);
    // It may not be perfectly white if other drawing overlaps, but we expect it to be white given only this edge
    expect(isWhiteRGBA(pixelEdgeAfter)).toBe(true);
  });

  test('Clear Graph button resets canvas to blank', async ({ page }) => {
    const box5 = await getCanvasBox(page);
    const pos = { x: 220, y: 420 };

    // Add a node to ensure canvas is non-empty
    await page.mouse.click(box.x + pos.x, box.y + pos.y, { button: 'left' });
    await page.waitForTimeout(80);
    const pixelNonBlank = await getCanvasPixelRGBA(page, pos.x, pos.y);
    expect(isWhiteRGBA(pixelNonBlank)).toBe(false);

    // Click clear button
    await page.click('#clearBtn');
    await page.waitForTimeout(120);

    // Pixel should be white again
    const pixelAfterClear = await getCanvasPixelRGBA(page, pos.x, pos.y);
    expect(isWhiteRGBA(pixelAfterClear)).toBe(true);
  });

  test('Generate Random Graph populates the canvas and respects graph type changes', async ({ page }) => {
    // Set graph type to directed, then generate
    await page.selectOption('#graphType', 'directed');
    await page.click('#randomGraphBtn');
    await page.waitForTimeout(200);

    // Ensure canvas has non-white pixels somewhere - sample a grid of points to detect drawing
    const box6 = await getCanvasBox(page);
    let foundNonWhite = false;
    for (let ry = 60; ry < box.height; ry += 80) {
      for (let rx = 60; rx < box.width; rx += 120) {
        const pixel = await getCanvasPixelRGBA(page, rx, ry);
        if (!isWhiteRGBA(pixel)) {
          foundNonWhite = true;
          break;
        }
      }
      if (foundNonWhite) break;
    }
    expect(foundNonWhite).toBe(true);

    // Switch to undirected and generate again; ensure it also draws something and no exceptions thrown
    await page.selectOption('#graphType', 'undirected');
    await page.click('#randomGraphBtn');
    await page.waitForTimeout(200);

    // Again sample points to ensure canvas not blank
    foundNonWhite = false;
    for (let ry = 60; ry < box.height; ry += 80) {
      for (let rx = 60; rx < box.width; rx += 120) {
        const pixel1 = await getCanvasPixelRGBA(page, rx, ry);
        if (!isWhiteRGBA(pixel)) {
          foundNonWhite = true;
          break;
        }
      }
      if (foundNonWhite) break;
    }
    expect(foundNonWhite).toBe(true);

    // Assert there were no uncaught page errors during these operations
    expect(pageErrors.length).toBe(0);
  });

  test('Console contains startup message and no uncaught errors were emitted', async ({ page }) => {
    // The initial console logging was captured in beforeEach
    const instructionEntry = consoleMessages.find(m => m.text.includes('Graph Visualization Instructions'));
    expect(instructionEntry).toBeTruthy();

    // Ensure no page errors occurred (let runtime errors appear naturally if any)
    expect(pageErrors.length).toBe(0);
  });

  test.afterEach(async ({ page }) => {
    // Final assertion to ensure that no unexpected runtime errors were thrown in the page during tests
    expect(pageErrors.length).toBe(0);
  });
});