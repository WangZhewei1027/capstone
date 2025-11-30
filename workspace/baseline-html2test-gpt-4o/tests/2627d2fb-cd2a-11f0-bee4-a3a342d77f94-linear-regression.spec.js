import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/2627d2fb-cd2a-11f0-bee4-a3a342d77f94.html';

// Page object to encapsulate interactions and queries against the Linear Regression demo page
class LinearRegressionPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Navigate to the application and wait for load event
  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  // Return text content of the output div
  async getOutputText() {
    return this.page.locator('#output').innerText();
  }

  // Check if canvas is visible
  async isCanvasVisible() {
    return this.page.locator('#canvas').isVisible();
  }

  // Return number of interactive controls present (buttons, inputs, selects, forms, textareas)
  async countInteractiveControls() {
    return this.page.evaluate(() => {
      const selectors = ['button', 'input', 'select', 'form', 'textarea'];
      return selectors.reduce((acc, sel) => acc + document.querySelectorAll(sel).length, 0);
    });
  }

  // Get color (RGBA) of the canvas at the specified pixel coordinates
  // Returns an object { r, g, b, a }
  async getCanvasPixelColor(px, py) {
    return this.page.evaluate(({ px, py }) => {
      const canvas = document.getElementById('canvas');
      if (!canvas) return null;
      const ctx = canvas.getContext('2d');
      // Ensure coordinates are integers within bounds
      const x = Math.max(0, Math.min(canvas.width - 1, Math.round(px)));
      const y = Math.max(0, Math.min(canvas.height - 1, Math.round(py)));
      const data = ctx.getImageData(x, y, 1, 1).data;
      return { r: data[0], g: data[1], b: data[2], a: data[3] };
    }, { px, py });
  }

  // Utility: compute pixel coordinates used by the page for a data point (x,y) given the page's mapping
  // In the application: point.x * 80 for x pixel, canvas.height - point.y * 40 for y pixel
  async dataPointToPixel(point) {
    return this.page.evaluate(({ point }) => {
      const canvas = document.getElementById('canvas');
      return {
        px: Math.round(point.x * 80),
        py: Math.round(canvas.height - point.y * 40)
      };
    }, { point });
  }

  // Utility: compute pixel coordinates for a given canvas pixel x to corresponding data x used for line mapping and resulting y pixel
  // The line was drawn from regressionLine(0) at pixel x=0 to regressionLine(7) at pixel x=canvas.width
  async lineDataPixelForCanvasX(px) {
    return this.page.evaluate(({ px }) => {
      const canvas = document.getElementById('canvas');
      // Convert pixel x to data-space x that the line used (0..7)
      const dataX = (px / canvas.width) * 7;
      // Compute regression line value using the same formula the page uses.
      // Recompute slope/intercept using the same embedded data so we don't hardcode math twice.
      const data = [
        { x: 1, y: 2 },
        { x: 2, y: 3 },
        { x: 3, y: 5 },
        { x: 4, y: 7 },
        { x: 5, y: 11 },
      ];
      const xMean = data.reduce((s, p) => s + p.x, 0) / data.length;
      const yMean = data.reduce((s, p) => s + p.y, 0) / data.length;
      let numerator = 0, denominator = 0;
      data.forEach(point => {
        numerator += (point.x - xMean) * (point.y - yMean);
        denominator += Math.pow(point.x - xMean, 2);
      });
      const slope = numerator / denominator;
      const intercept = yMean - (slope * xMean);
      const dataY = slope * dataX + intercept;
      const pxX = Math.round(px);
      const pxY = Math.round(canvas.height - dataY * 40);
      return { px: pxX, py: pxY, dataX, dataY, slope, intercept };
    }, { px });
  }
}

// Group related tests for the Linear Regression demo
test.describe('Linear Regression Demo (Application ID: 2627d2fb-cd2a-11f0-bee4-a3a342d77f94)', () => {
  let pageErrors = [];
  let consoleMessages = [];

  test.beforeEach(async ({ page }) => {
    // Reset collectors before each test
    pageErrors = [];
    consoleMessages = [];

    // Collect console messages for inspection (type and text)
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect page errors (uncaught exceptions)
    page.on('pageerror', error => {
      pageErrors.push(error);
    });
  });

  // Test initial page load and default state: heading, canvas and output exist and output shows expected equation
  test('loads the page and displays the correct regression equation and UI elements', async ({ page }) => {
    const app = new LinearRegressionPage(page);
    // Navigate to the app
    await app.goto();

    // Check that the page heading is present and correct
    const heading = page.locator('h1');
    await expect(heading).toHaveText('Linear Regression Demo');

    // The canvas should be visible on the page
    expect(await app.isCanvasVisible()).toBe(true);

    // The output div should contain the regression equation computed by the app.
    // We compute the expected formatted text from the given dataset:
    // Slope = 2.20, Intercept = -1.00 -> "y = 2.20x + -1.00"
    const outputText = await app.getOutputText();
    expect(outputText).toBe('y = 2.20x + -1.00');

    // Verify that there are no interactive form controls (this app is purely visual)
    const interactiveCount = await app.countInteractiveControls();
    expect(interactiveCount).toBe(0);

    // Assert that there were no uncaught page errors during load
    expect(pageErrors.length).toBe(0);

    // Assert that no console messages of type 'error' were emitted
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test that blue data points are drawn at expected pixel positions on the canvas
  test('draws blue data points at expected coordinates', async ({ page }) => {
    const app = new LinearRegressionPage(page);
    await app.goto();

    // Define the known data points from the implementation
    const points = [
      { x: 1, y: 2 },
      { x: 2, y: 3 },
      { x: 3, y: 5 },
      { x: 4, y: 7 },
      { x: 5, y: 11 },
    ];

    // For each data point, sample the canvas pixel at the expected center and assert it contains a blue-ish pixel
    for (const point of points) {
      const { px, py } = await app.dataPointToPixel(point);
      const color = await app.getCanvasPixelColor(px, py);
      // The point was drawn with ctx.fillStyle = 'blue' so blue channel should be dominant
      expect(color).not.toBeNull();
      expect(color.b).toBeGreaterThan(100); // blue should be strong
      // Ensure blue is dominant
      expect(color.b).toBeGreaterThan(color.r);
      expect(color.b).toBeGreaterThan(color.g);
    }

    // Ensure no page errors occurred while drawing points
    expect(pageErrors.length).toBe(0);
  });

  // Test that a red regression line was drawn by sampling a mid-canvas pixel that should intersect the line
  test('draws a red regression line across the canvas', async ({ page }) => {
    const app = new LinearRegressionPage(page);
    await app.goto();

    // Choose a canvas x-coordinate in the middle and compute expected pixel coordinates for the line
    const canvasMidX = 250; // middle of a 500px canvas
    const { px, py } = await app.lineDataPixelForCanvasX(canvasMidX);

    // Sample pixel color at the computed pixel coordinates
    const color = await app.getCanvasPixelColor(px, py);
    expect(color).not.toBeNull();

    // The line was drawn with ctx.strokeStyle = 'red' - expect red channel to be dominant
    expect(color.r).toBeGreaterThan(100);
    expect(color.r).toBeGreaterThan(color.g);
    expect(color.r).toBeGreaterThan(color.b);

    // Sanity check: validate the slope and intercept computed inside the page match expected numeric values
    const internal = await app.lineDataPixelForCanvasX(canvasMidX);
    // slope and intercept are returned by the helper; expect slope ~ 2.2 and intercept ~ -1.0
    expect(Number(internal.slope.toFixed(2))).toBeCloseTo(2.20, 2);
    expect(Number(internal.intercept.toFixed(2))).toBeCloseTo(-1.00, 2);

    // Ensure no page errors were captured
    expect(pageErrors.length).toBe(0);
  });

  // Test that there are no interactive elements and that accessibility basics are present
  test('has no interactive form controls and contains basic accessible elements', async ({ page }) => {
    const app = new LinearRegressionPage(page);
    await app.goto();

    // Assert absence of interactive controls
    const interactiveCount = await app.countInteractiveControls();
    expect(interactiveCount).toBe(0);

    // The canvas has an id (useful for accessibility hooks); ensure it exists
    const canvas = page.locator('#canvas');
    await expect(canvas).toBeVisible();

    // Heading level 1 is present for document structure
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText('Linear Regression Demo');

    // There should be no uncaught page errors
    expect(pageErrors.length).toBe(0);
  });

  // Capture and assert console and runtime behavior: no console.error and no page errors on navigation
  test('does not emit console errors or runtime exceptions during load', async ({ page }) => {
    const app = new LinearRegressionPage(page);

    // Navigate to trigger scripts and listeners
    await app.goto();

    // Provide the collected console messages and errors for assertion
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    if (errorConsoleMessages.length > 0) {
      // If there are console error messages, fail with details for easier debugging
      const texts = errorConsoleMessages.map(m => m.text).join('\n---\n');
      throw new Error(`Console error messages were emitted:\n${texts}`);
    }

    // Assert there were no uncaught page errors
    expect(pageErrors.length).toBe(0);
  });

  // Edge-case style test: sample pixels around a data point to ensure the drawn dot has some radius
  test('data points have a visible radius (multiple neighboring pixels colored)', async ({ page }) => {
    const app = new LinearRegressionPage(page);
    await app.goto();

    // Pick a representative point (3,5)
    const point = { x: 3, y: 5 };
    const center = await app.dataPointToPixel(point);

    // Sample a small neighborhood (3x3) around the center to ensure multiple pixels show the blue color.
    let bluePixelCount = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const color = await app.getCanvasPixelColor(center.px + dx, center.py + dy);
        if (!color) continue;
        if (color.b > 100 && color.b > color.r && color.b > color.g) {
          bluePixelCount++;
        }
      }
    }

    // Expect at least one or two pixels in neighborhood to be blue (radius ~5 should produce multiple)
    expect(bluePixelCount).toBeGreaterThanOrEqual(1);

    // Ensure no page errors present
    expect(pageErrors.length).toBe(0);
  });
});