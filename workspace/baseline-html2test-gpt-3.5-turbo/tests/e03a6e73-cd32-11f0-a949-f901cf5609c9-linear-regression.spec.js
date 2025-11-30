import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e03a6e73-cd32-11f0-a949-f901cf5609c9.html';

// Constants mirrored from the page to reproduce mapping/regression logic in tests
const WIDTH = 700;
const HEIGHT = 400;
const margin = 40;

// Utility: replicate canvasToData mapping from the page script
function canvasToData(cx, cy, xMin, xMax, yMin, yMax) {
  const x = xMin + ((cx - margin) / (WIDTH - 2 * margin)) * (xMax - xMin);
  const y = yMin + ((HEIGHT - margin - cy) / (HEIGHT - 2 * margin)) * (yMax - yMin);
  return { x, y };
}

// Utility: replicate data range expansion and mapping used by the page when converting canvas click -> data point
function computeDataPointForClick(existingPoints, clickCx, clickCy) {
  // existingPoints: array of { x, y } that are already on the page (data coords)
  let xMin = 0, xMax = 10, yMin = 0, yMax = 10;
  if (existingPoints.length) {
    const xs = existingPoints.map(p => p.x);
    const ys = existingPoints.map(p => p.y);
    xMin = Math.min(...xs);
    xMax = Math.max(...xs);
    yMin = Math.min(...ys);
    yMax = Math.max(...ys);
    let xRange = xMax - xMin || 1;
    let yRange = yMax - yMin || 1;
    xMin -= 0.1 * xRange;
    xMax += 0.1 * xRange;
    yMin -= 0.1 * yRange;
    yMax += 0.1 * yRange;
  }
  return canvasToData(clickCx, clickCy, xMin, xMax, yMin, yMax);
}

// Utility: replicate linearRegression from the page script
function linearRegression(points) {
  const n = points.length;
  if (n === 0) return null;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;
  const denominator = sumXX - sumX * meanX;
  if (denominator === 0) {
    return { m: 0, b: meanY };
  }
  const m = (sumXY - sumX * meanY) / denominator;
  const b = meanY - m * meanX;
  return { m, b };
}

// Utility: replicate R2 computation
function computeR2(points, m, b) {
  let meanY1 = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  let ssTot = 0;
  let ssRes = 0;
  for (const p of points) {
    let yPred = m * p.x + b;
    ssTot += (p.y - meanY) ** 2;
    ssRes += (p.y - yPred) ** 2;
  }
  if (ssTot === 0) return 1;
  return 1 - ssRes / ssTot;
}

test.describe('Interactive Linear Regression Demo - e03a6e73-cd32-11f0-a949-f901cf5609c9', () => {
  // Collect console errors and page errors to assert no unexpected runtime errors occur.
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Listen for console.error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Listen for uncaught exceptions on the page
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Navigate to the application
    await page.goto(APP_URL);
    // Wait for the main container to be visible to ensure page finished initial rendering
    await expect(page.locator('#container')).toBeVisible();
  });

  test.afterEach(async () => {
    // After each test assert that no console errors or page errors occurred.
    // This ensures we observed and asserted on runtime issues if any exist.
    expect(consoleErrors, `Console errors were emitted: ${JSON.stringify(consoleErrors, null, 2)}`).toHaveLength(0);
    expect(pageErrors, `Page errors were emitted: ${JSON.stringify(pageErrors, null, 2)}`).toHaveLength(0);
  });

  test('Initial load shows expected default UI elements and state', async ({ page }) => {
    // Verify instructions, canvas, equation placeholder, info area, and clear button are present and correct.
    await expect(page.locator('h1')).toHaveText('Interactive Linear Regression Demo');
    await expect(page.locator('#instructions')).toContainText('Click on the canvas to add data points');
    await expect(page.locator('#plot')).toBeVisible();
    await expect(page.locator('#equation')).toHaveText('y = ?x + ?');
    await expect(page.locator('#info')).toHaveText('');
    await expect(page.locator('#clearBtn')).toBeVisible();
  });

  test('Clicking the canvas adds a single point and updates equation and R² accordingly', async ({ page }) => {
    // Click in the center of the canvas; the page mapping should map this to data point (5,5)
    const canvas = page.locator('#plot');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas bounding box not available');

    // Compute relative click coordinates corresponding to the center of the canvas element
    const clickCx = Math.round(box.width / 2);
    const clickCy = Math.round(box.height / 2);

    // Before clicking, verify equation is default placeholder
    await expect(page.locator('#equation')).toHaveText('y = ?x + ?');

    // Click the canvas at center
    await canvas.click({ position: { x: clickCx, y: clickCy } });

    // Reconstruct expected data point and regression result using the same logic as the page
    const simulatedPoints = [];
    const firstPoint = computeDataPointForClick(simulatedPoints, clickCx, clickCy);
    simulatedPoints.push(firstPoint);
    const reg = linearRegression(simulatedPoints);
    expect(reg).not.toBeNull();
    // Page formats slope and intercept to 3 decimal places
    const expectedEquation = `y = ${reg.m.toFixed(3)}x + ${reg.b.toFixed(3)}`;
    const r2 = computeR2(simulatedPoints, reg.m, reg.b);

    // Assert the DOM updated to show numeric equation and R²
    await expect(page.locator('#equation')).toHaveText(expectedEquation);
    await expect(page.locator('#info')).toHaveText(`R² (coefficient of determination): ${r2.toFixed(4)}`);
  });

  test('Adding a second distinct point updates the regression line (equation becomes numeric and R² reflects fit)', async ({ page }) => {
    const canvas1 = page.locator('#plot');
    const box1 = await canvas.boundingBox();
    if (!box) throw new Error('Canvas bounding box not available');

    // Choose two different canvas positions
    const click1 = { x: Math.round(box.width * 0.5), y: Math.round(box.height * 0.5) }; // center
    const click2 = { x: Math.round(box.width * 0.8), y: Math.round(box.height * 0.25) }; // upper-right-ish

    // Simulate expected data points and regression using the same logic as the page's event handler
    const simulatedPoints1 = [];

    // Click 1
    await canvas.click({ position: click1 });
    const p1 = computeDataPointForClick(simulatedPoints, click1.x, click1.y);
    simulatedPoints.push(p1);

    // Click 2
    await canvas.click({ position: click2 });
    const p2 = computeDataPointForClick(simulatedPoints, click2.x, click2.y);
    simulatedPoints.push(p2);

    // Compute expected regression parameters
    const reg1 = linearRegression(simulatedPoints);
    expect(reg).not.toBeNull();
    const expectedEquation1 = `y = ${reg.m.toFixed(3)}x + ${reg.b.toFixed(3)}`;
    const r21 = computeR2(simulatedPoints, reg.m, reg.b);

    // Assert equation and R² text updated accordingly
    await expect(page.locator('#equation')).toHaveText(expectedEquation);
    await expect(page.locator('#info')).toHaveText(`R² (coefficient of determination): ${r2.toFixed(4)}`);
  });

  test('Points with (effectively) identical x values trigger horizontal slope fallback (m = 0) and correct intercept', async ({ page }) => {
    // This test verifies the branch where denominator === 0 in regression, returning m=0 and b=meanY.
    const canvas2 = page.locator('#plot');
    const box2 = await canvas.boundingBox();
    if (!box) throw new Error('Canvas bounding box not available');

    // Clear any existing points first to have deterministic mapping behavior
    await page.locator('#clearBtn').click();
    await expect(page.locator('#equation')).toHaveText('y = ?x + ?');

    // We'll click twice at the same canvas x coordinate but different y coordinates
    const commonCx = Math.round(box.width * 0.5); // center x
    const clickA = { x: commonCx, y: Math.round(box.height * 0.45) };
    const clickB = { x: commonCx, y: Math.round(box.height * 0.15) };

    const simulatedPoints2 = [];

    // First click
    await canvas.click({ position: clickA });
    const p11 = computeDataPointForClick(simulatedPoints, clickA.x, clickA.y);
    simulatedPoints.push(p1);

    // Second click (uses range expanded from first point)
    await canvas.click({ position: clickB });
    const p21 = computeDataPointForClick(simulatedPoints, clickB.x, clickB.y);
    simulatedPoints.push(p2);

    // Now compute regression; because both x should be effectively equal, slope should be 0
    const reg2 = linearRegression(simulatedPoints);
    expect(reg).not.toBeNull();

    // Assert slope is zero (within floating point tolerance) and intercept equals meanY
    expect(Math.abs(reg.m)).toBeLessThan(1e-9); // effectively zero
    const expectedIntercept = (p1.y + p2.y) / 2;
    // Page shows intercept formatted to 3 decimal places
    const expectedEquation2 = `y = ${reg.m.toFixed(3)}x + ${reg.b.toFixed(3)}`;
    await expect(page.locator('#equation')).toHaveText(expectedEquation);

    // Validate the numerical intercept equals the expected mean to 3 decimals
    expect(Number(reg.b.toFixed(3))).toBeCloseTo(Number(expectedIntercept.toFixed(3)), 3);
  });

  test('Clear button resets the plot and UI to the default placeholder state', async ({ page }) => {
    const canvas3 = page.locator('#plot');
    const box3 = await canvas.boundingBox();
    if (!box) throw new Error('Canvas bounding box not available');

    // Add a point to alter state
    await canvas.click({ position: { x: Math.round(box.width * 0.3), y: Math.round(box.height * 0.4) } });
    await expect(page.locator('#equation')).not.toHaveText('y = ?x + ?');

    // Click Clear Points and verify reset
    await page.locator('#clearBtn').click();
    await expect(page.locator('#equation')).toHaveText('y = ?x + ?');
    await expect(page.locator('#info')).toHaveText('');
  });

});