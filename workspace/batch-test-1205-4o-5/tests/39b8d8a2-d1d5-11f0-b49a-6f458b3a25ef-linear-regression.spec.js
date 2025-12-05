import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b8d8a2-d1d5-11f0-b49a-6f458b3a25ef.html';

test.describe('Linear Regression Demo (Application ID: 39b8d8a2-d1d5-11f0-b49a-6f458b3a25ef)', () => {
  // Containers for console messages and page errors collected per test
  let consoleMessages;
  let pageErrors;

  // Helper: compute linear regression (mirrors algorithm in page script)
  function computeRegression(points) {
    const n = points.length;
    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
    const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
  }

  test.beforeEach(async ({ page }) => {
    // Initialize collectors
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages and page errors for assertions later
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the application page
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // After each test ensure that no unhandled page errors were thrown
    // and no console.error messages were emitted during the test.
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Initial load: page elements are present and equation is empty', async ({ page }) => {
    // Purpose: Verify initial page load, DOM structure and default state.
    const title = page.locator('h1');
    await expect(title).toHaveText('Linear Regression Demo');

    const instructions = page.locator('p').first();
    await expect(instructions).toContainText('Click to add data points');

    const canvas = page.locator('#canvas');
    await expect(canvas).toBeVisible();

    const equation = page.locator('#equation');
    // initially no equation text because less than 2 points
    await expect(equation).toHaveText('', { timeout: 1000 });
  });

  test('Single click: adding one point should not produce an equation', async ({ page }) => {
    // Purpose: Ensure that with only one data point, the equation remains empty.
    const canvas1 = page.locator('#canvas1');

    // Click once at element coordinates (100, 100)
    await canvas.click({ position: { x: 100, y: 100 } });

    // Allow drawing to occur
    await page.waitForTimeout(100);

    const equation1 = page.locator('#equation1');
    await expect(equation).toHaveText('', { timeout: 1000 });

    // Also verify that no page errors were thrown during the click/draw
    expect(pageErrors.length).toBe(0);
  });

  test('Two clicks: drawing regression line and equation text updates correctly', async ({ page }) => {
    // Purpose: Verify that after two clicks the regression is computed and equation text appears.
    const canvas2 = page.locator('#canvas2');

    // Determine canvas dimensions from the page (should be 600x400 per HTML)
    const { width: canvasWidth, height: canvasHeight } = await canvas.evaluate((el) => {
      return { width: el.width, height: el.height };
    });

    // Choose two element coordinates for clicks
    const clickPositions = [
      { x: 100, y: 120 }, // element-relative coordinates
      { x: 400, y: 220 }
    ];

    // Perform clicks on the canvas at the chosen positions
    for (const pos of clickPositions) {
      await canvas.click({ position: pos });
      await page.waitForTimeout(50); // small delay to allow event handling/drawing
    }

    // Compute expected stored points as done by the application:
    // stored.x = event.clientX - rect.left  (=> pos.x)
    // stored.y = canvas.height - (event.clientY - rect.top) (=> canvasHeight - pos.y)
    const storedPoints = clickPositions.map(p => ({ x: p.x, y: canvasHeight - p.y }));

    // Compute expected regression using same formula as application
    const { slope, intercept } = computeRegression(storedPoints);

    // Build expected equation string with two decimals as used in app (.toFixed(2))
    const expectedEquation = `y = ${slope.toFixed(2)}x + ${intercept.toFixed(2)}`;

    // Wait until the equation element updates to non-empty
    const equation2 = page.locator('#equation2');
    await expect(equation).toHaveText(expectedEquation, { timeout: 2000 });

    // Additional check: ensure the equation text exactly matches expected formatting
    const actualText = await equation.textContent();
    expect(actualText.trim()).toBe(expectedEquation);
  });

  test('Adding a third point updates the regression equation correctly', async ({ page }) => {
    // Purpose: Validate that adding more data updates the regression line and equation text.
    const canvas3 = page.locator('#canvas3');

    // Get canvas dimensions from the page
    const { width: canvasWidth, height: canvasHeight } = await canvas.evaluate((el) => {
      return { width: el.width, height: el.height };
    });

    // Click three distinct points
    const clickPositions1 = [
      { x: 50, y: 300 },
      { x: 300, y: 150 },
      { x: 500, y: 80 }
    ];

    for (const pos of clickPositions) {
      await canvas.click({ position: pos });
      await page.waitForTimeout(60);
    }

    // Compute stored points
    const storedPoints1 = clickPositions.map(p => ({ x: p.x, y: canvasHeight - p.y }));

    const { slope, intercept } = computeRegression(storedPoints);
    const expectedEquation1 = `y = ${slope.toFixed(2)}x + ${intercept.toFixed(2)}`;

    const equation3 = page.locator('#equation3');
    await expect(equation).toHaveText(expectedEquation, { timeout: 2000 });

    // Confirm the content is exactly the expected equation string
    const actualText1 = await equation.textContent();
    expect(actualText.trim()).toBe(expectedEquation);
  });

  test('Edge case: clicking multiple points with same x coordinate should not crash the page', async ({ page }) => {
    // Purpose: Ensure the app handles (or at least does not crash on) near-vertical distributions.
    const canvas4 = page.locator('#canvas4');

    // Use three clicks with the same x value but different y values
    const clickPositions2 = [
      { x: 250, y: 50 },
      { x: 250, y: 200 },
      { x: 250, y: 350 }
    ];

    for (const pos of clickPositions) {
      await canvas.click({ position: pos });
      await page.waitForTimeout(50);
    }

    // The algorithm may produce NaN or Infinity for slope/intercept; we only assert:
    // - The page did not throw uncaught exceptions (pageErrors is empty)
    // - The equation element contains some text (either NaN/Infinity formatted by toFixed or numeric)
    const equation4 = page.locator('#equation4');
    // Wait briefly to allow updates; if algorithm produced NaN/Infinity, toFixed may still produce a string
    await page.waitForTimeout(200);

    const text = await equation.textContent();
    // Accept that equation may be empty if regression couldn't be computed, but ensure no uncaught errors
    expect(pageErrors.length).toBe(0);

    // If there are at least two points, the app attempts to set equation text. Validate the element exists and is visible.
    await expect(equation).toBeVisible();
    // If text is not empty, it should match pattern "y = Xx + Y"
    if (text && text.trim().length > 0) {
      expect(text.trim()).toMatch(/^y = .*x \+ .*$/);
    }
  });
});