import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da11baf-cd2f-11f0-a440-159d7b77af86.html';

// Helper constants for expected colors in RGB
const COLOR_A = [255, 87, 51]; // '#FF5733'
const COLOR_B = [51, 255, 87]; // '#33FF57'
const COLOR_WHITE = [255, 255, 255]; // canvas background '#fff'

// Small tolerance for potential anti-aliasing or subpixel rendering
const COLOR_TOLERANCE = 25;

function colorMatches(actual, expected, tolerance = COLOR_TOLERANCE) {
  // actual is [r,g,b,a]
  for (let i = 0; i < 3; i++) {
    if (Math.abs(actual[i] - expected[i]) > tolerance) return false;
  }
  return true;
}

// Page Object encapsulating interactions with the KNN page
class KNNPage {
  constructor(page) {
    this.page = page;
    this.canvasSelector = '#knnCanvas';
    this.kInputSelector = '#kValue';
    this.addPointBtnSelector = '#addPoint';
  }

  // Click the canvas at coordinates (x, y) relative to the canvas top-left
  async clickCanvas(x, y) {
    // Playwright's position option is relative to the element.
    await this.page.click(this.canvasSelector, { position: { x, y } });
  }

  // Read pixel color at (x, y) from the canvas as [r,g,b,a]
  async getCanvasPixel(x, y) {
    return await this.page.evaluate(({ x, y, canvasSelector }) => {
      const canvas = document.querySelector(canvasSelector);
      const ctx = canvas.getContext('2d');
      // Ensure integer coordinates
      const xi = Math.round(x);
      const yi = Math.round(y);
      const data = ctx.getImageData(xi, yi, 1, 1).data;
      return [data[0], data[1], data[2], data[3]];
    }, { x, y, canvasSelector: this.canvasSelector });
  }

  // Set the K value via the number input
  async setK(value) {
    const kInput = this.page.locator(this.kInputSelector);
    // Use fill to change value and then blur to ensure change is applied
    await kInput.fill(String(value));
    await kInput.dispatchEvent('blur');
  }

  // Click the "Add Point" button
  async clickAddPointButton() {
    await this.page.click(this.addPointBtnSelector);
  }

  // Get the value of K input as number
  async getKValue() {
    return await this.page.$eval(this.kInputSelector, el => parseInt(el.value, 10));
  }
}

test.describe('K-Nearest Neighbors (KNN) Visualization - E2E', () => {
  let pageErrors = [];
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    // Reset error collectors
    pageErrors = [];
    consoleErrors = [];

    // Observe page errors (uncaught exceptions in the page)
    page.on('pageerror', (err) => {
      // Collect Error objects for assertions
      pageErrors.push(err);
    });

    // Observe console messages, capturing error-level console output
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg);
      }
    });

    // Navigate to the app page
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async ({ page }) => {
    // After each test ensure we did not receive fatal JS errors like ReferenceError, SyntaxError, TypeError
    // Collect names of any page errors
    const errorNames = pageErrors.map(e => e && e.name ? e.name : 'UnknownError');
    // Assert that none of the critical error types occurred
    expect(errorNames).not.toContain('ReferenceError');
    expect(errorNames).not.toContain('SyntaxError');
    expect(errorNames).not.toContain('TypeError');

    // Also assert no console.error messages were emitted
    // Provide their text if the assertion fails for debugging
    const consoleErrorTexts = consoleErrors.map(m => m.text());
    expect(consoleErrorTexts, `Unexpected console.error messages: ${consoleErrorTexts.join(' | ')}`).toEqual([]);
  });

  // Test initial page load and default state of the UI and canvas
  test('Initial load: header, controls, and default drawing are present', async ({ page }) => {
    const knn = new KNNPage(page);

    // Verify header text is correct and visible
    const header = page.locator('h1');
    await expect(header).toHaveText('K-Nearest Neighbors (KNN) Demonstration');

    // Verify canvas is present and visible
    const canvas = page.locator(knn.canvasSelector);
    await expect(canvas).toBeVisible();

    // Verify K input exists and defaults to 3
    const kValue = await knn.getKValue();
    expect(kValue).toBe(3);

    // Verify Add Point button exists
    await expect(page.locator(knn.addPointBtnSelector)).toBeVisible();

    // Verify that at least one known data point for class A is drawn by sampling a known coordinate (50,100)
    // We sample the exact coordinates used in the data array from the implementation
    const pixelAtA = await knn.getCanvasPixel(50, 100);
    expect(colorMatches(pixelAtA, COLOR_A)).toBeTruthy();

    // Verify that at least one known data point for class B is drawn by sampling a known coordinate (200,150)
    const pixelAtB = await knn.getCanvasPixel(200, 150);
    expect(colorMatches(pixelAtB, COLOR_B)).toBeTruthy();
  });

  // Test that clicking the canvas predicts and draws a new point with the expected class for default k=3
  test('Clicking the canvas adds a new predicted point (default K=3) and draws the predicted class color', async ({ page }) => {
    const knn = new KNNPage(page);

    // Choose a coordinate near an existing B cluster to expect class B prediction.
    // Coordinates chosen near point { x: 200, y: 150, class: 'B' }
    const clickX = 210;
    const clickY = 155;

    // Click canvas to add new point
    await knn.clickCanvas(clickX, clickY);

    // Read pixel at the clicked coordinate to verify new point color
    const pixel = await knn.getCanvasPixel(clickX, clickY);

    // Assert the new point's pixel matches class B color within tolerance
    expect(colorMatches(pixel, COLOR_B)).toBeTruthy();
  });

  // Test that changing K influences prediction: K=1 should choose nearest single neighbor's class
  test('Changing K to 1 predicts the nearest neighbor class when clicking', async ({ page }) => {
    const knn = new KNNPage(page);

    // Set K to 1
    await knn.setK(1);
    const currentK = await knn.getKValue();
    expect(currentK).toBe(1);

    // Click very close to a known class A point (50,100)
    const clickX = 52;
    const clickY = 99;

    await knn.clickCanvas(clickX, clickY);

    // Pixel at clicked location should match class A color
    const pixel = await knn.getCanvasPixel(clickX, clickY);
    expect(colorMatches(pixel, COLOR_A)).toBeTruthy();
  });

  // Test edge case: K larger than dataset size (e.g., K=100) - the implementation uses all points and tie-breaker should produce B
  test('Large K (greater than dataset) uses all neighbors and follows tie-breaking behavior', async ({ page }) => {
    const knn = new KNNPage(page);

    // Set K to a very large number
    await knn.setK(100);
    const currentK = await knn.getKValue();
    expect(currentK).toBe(100);

    // Click at an arbitrary location (e.g., center region)
    const clickX = 300;
    const clickY = 200;
    await knn.clickCanvas(clickX, clickY);

    // For the provided dataset, counts of classes are equal (3 and 3), and the implementation's tie-break logic should favor 'B'
    const pixel = await knn.getCanvasPixel(clickX, clickY);
    expect(colorMatches(pixel, COLOR_B)).toBeTruthy();
  });

  // Test Add Point button behavior: clicking Add Point simply redraws without adding a new point unexpectedly
  test('Clicking "Add Point" button triggers redraw but does not add unexpected points', async ({ page }) => {
    const knn = new KNNPage(page);

    // Choose a spot that should be background white initially, e.g., near top-left corner 10,10
    const sampleX = 10;
    const sampleY = 10;
    const initialPixel = await knn.getCanvasPixel(sampleX, sampleY);
    expect(colorMatches(initialPixel, COLOR_WHITE, 10)).toBeTruthy();

    // Click the Add Point button (which in the current implementation just calls draw())
    await knn.clickAddPointButton();

    // Ensure the pixel at the same location remains white after redraw
    const afterPixel = await knn.getCanvasPixel(sampleX, sampleY);
    expect(colorMatches(afterPixel, COLOR_WHITE, 10)).toBeTruthy();
  });

  // Accessibility and UI state checks
  test('UI elements are accessible and keyboard-focusable', async ({ page }) => {
    const knn = new KNNPage(page);

    // Focus the K input via keyboard tabbing and change value using keyboard
    await page.keyboard.press('Tab'); // likely focuses the first focusable element (K input)
    const focused = await page.evaluate(() => document.activeElement && document.activeElement.id);
    // Ensure something is focused and it is one of our controls (kValue or addPoint)
    expect(['kValue', 'addPoint']).toContain(focused);

    // If kValue is focused, update it via keyboard numbers
    if (focused === 'kValue') {
      // Clear and type '2'
      await page.keyboard.press('Control+a');
      await page.keyboard.type('2');
      // blur to apply change
      await page.keyboard.press('Tab');
      const kVal = await knn.getKValue();
      expect(kVal).toBe(2);
    } else {
      // If addPoint is focused, press Enter to activate it and ensure no errors occur
      await page.keyboard.press('Enter');
      // No DOM change expected, but ensure no page errors were emitted up to this point
      expect(pageErrors.length).toBe(0);
    }
  });
});