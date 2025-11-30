import { test, expect } from '@playwright/test';

// Test file: 2627d2fc-cd2a-11f0-bee4-a3a342d77f94-k-nearest-neighbors-knn.spec.js
// Purpose: End-to-end tests for the K-Nearest Neighbors (KNN) demo application.
// These tests:
//  - Load the page as-is (no modifications).
//  - Observe console messages and page errors (and assert their presence/absence).
//  - Interact with the canvas to add points and verify visual feedback (pixel color checks).
//  - Verify initial rendering of known points by sampling pixel colors.
//  - Use a small page object to encapsulate interactions with the canvas.

class KNNPage {
  constructor(page) {
    this.page = page;
    this.canvasSelector = '#knnCanvas';
    this.infoSelector = '#info';
    this.titleSelector = 'h1';
    // containers for observed logs/errors
    this.consoleMessages = [];
    this.pageErrors = [];
  }

  // Navigate to the page and attach listeners for console and page errors
  async goto(url) {
    // Attach listeners before navigation to capture any early logs/errors
    this.page.on('console', (msg) => {
      this.consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
    });
    this.page.on('pageerror', (err) => {
      // pageerror is for uncaught exceptions
      this.pageErrors.push(String(err));
    });
    await this.page.goto(url);
  }

  // Return visible text of the title
  async getTitleText() {
    return this.page.textContent(this.titleSelector);
  }

  // Return info paragraph text
  async getInfoText() {
    return this.page.textContent(this.infoSelector);
  }

  // Return canvas size (width/height attributes)
  async getCanvasSize() {
    return this.page.evaluate((sel) => {
      const c = document.querySelector(sel);
      return { width: c.width, height: c.height };
    }, this.canvasSelector);
  }

  // Click on the canvas at coordinates (x, y) relative to the top-left of canvas element
  async clickCanvasAt(x, y) {
    // Playwright's click with position uses top-left of element as origin
    await this.page.click(this.canvasSelector, { position: { x, y } });
    // Give the page a short moment to perform drawing operations
    await this.page.waitForTimeout(50);
  }

  // Read a single pixel's RGBA value from the canvas at integer coordinates (x, y)
  // Returns [r, g, b, a]
  async getCanvasPixelRGBA(x, y) {
    return this.page.evaluate(
      ({ sel, x, y }) => {
        const canvas = document.querySelector(sel);
        const ctx = canvas.getContext('2d');
        // Ensure coordinates are integers and within bounds
        const ix = Math.round(x);
        const iy = Math.round(y);
        try {
          const imageData = ctx.getImageData(ix, iy, 1, 1).data;
          return [imageData[0], imageData[1], imageData[2], imageData[3]];
        } catch (err) {
          // If reading pixel fails (e.g., security), return sentinel
          return ['ERR', String(err)];
        }
      },
      { sel: this.canvasSelector, x, y }
    );
  }

  // Helper: checks whether an RGBA color roughly matches an expected color using thresholds
  // expected: { r, g, b, a?, name? }
  colorMatches(actualRGBA, expected, tolerance = 50) {
    if (!Array.isArray(actualRGBA) || actualRGBA.length < 3) return false;
    const [r, g, b] = actualRGBA;
    return (
      Math.abs(r - expected.r) <= tolerance &&
      Math.abs(g - expected.g) <= tolerance &&
      Math.abs(b - expected.b) <= tolerance
    );
  }
}

const APP_URL =
  'http://127.0.0.1:5500/workspace/html2test/html/2627d2fc-cd2a-11f0-bee4-a3a342d77f94.html';

test.describe('K-Nearest Neighbors (KNN) Demo - visual and interaction tests', () => {
  let knn;

  test.beforeEach(async ({ page }) => {
    knn = new KNNPage(page);
    // Navigate to the app page and attach console/pageerror listeners
    await knn.goto(APP_URL);
  });

  test.afterEach(async () => {
    // nothing to teardown explicitly; listeners are bound to the page and will be cleaned up by Playwright
  });

  test('Initial page load: title, info, and canvas present with expected size', async () => {
    // Verify the page title text is visible and correct
    const title = await knn.getTitleText();
    expect(title).toBeTruthy();
    expect(title).toContain('K-Nearest Neighbors');

    // Verify info paragraph exists and contains usage instructions
    const infoText = await knn.getInfoText();
    expect(infoText).toBeTruthy();
    expect(infoText).toContain('Click to add a new point');

    // Verify canvas dimensions are as defined in the HTML (attributes width/height)
    const size = await knn.getCanvasSize();
    expect(size).toEqual({ width: 400, height: 400 });

    // Assert there are no uncaught page errors on load
    expect(knn.pageErrors.length).toBe(0);

    // There should be some console logs or none depending on the page; ensure we captured an array
    expect(Array.isArray(knn.consoleMessages)).toBe(true);
  });

  test('Initial render: known seeded points are drawn on the canvas (sampling pixel colors)', async () => {
    // The HTML defines 4 initial points at known coordinates:
    // { x: 50, y: 60, label: 'A' } -> blue
    // { x: 200, y: 250, label: 'A' } -> blue
    // { x: 150, y: 50, label: 'B' } -> red
    // { x: 300, y: 300, label: 'B' } -> red
    // We'll sample the canvas at those coordinates and expect blue/red pixels.

    // Helper expected colors for 'blue' and 'red' CSS names used in canvas fillStyle
    const expectedBlue = { r: 0, g: 0, b: 255 };
    const expectedRed = { r: 255, g: 0, b: 0 };

    // Sample coordinates (center of circles)
    const samples = [
      { x: 50, y: 60, expected: expectedBlue, label: 'A (blue) at 50,60' },
      { x: 200, y: 250, expected: expectedBlue, label: 'A (blue) at 200,250' },
      { x: 150, y: 50, expected: expectedRed, label: 'B (red) at 150,50' },
      { x: 300, y: 300, expected: expectedRed, label: 'B (red) at 300,300' },
    ];

    for (const sample of samples) {
      const rgba = await knn.getCanvasPixelRGBA(sample.x, sample.y);
      // Ensure we successfully read the pixel
      expect(Array.isArray(rgba)).toBe(true);
      // Check approximate color match (allowing tolerance)
      const match = knn.colorMatches(rgba, sample.expected, 80); // fairly generous tolerance
      expect(match).toBe(
        true,
        `Expected ${sample.label} to be roughly ${JSON.stringify(sample.expected)}, got ${rgba}`
      );
    }
  });

  test('Click near an A cluster: new point is drawn with lightblue (classification A)', async () => {
    // Click close to the first A point (50,60). New point should be classified as 'A'
    // The script draws classified point with 'lightblue' for A.
    // Use coordinates slightly offset from the existing A to avoid sampling exactly the existing pixel.
    const clickX = 60;
    const clickY = 70;

    // Ensure pixel at the click location is not already the lightblue color (precondition)
    const before = await knn.getCanvasPixelRGBA(clickX, clickY);
    // If the pixel already matches lightblue, that's okay; we proceed and still check after state changed.
    await knn.clickCanvasAt(clickX, clickY);

    // lightblue RGB approx (173,216,230)
    const expectedLightBlue = { r: 173, g: 216, b: 230 };
    const after = await knn.getCanvasPixelRGBA(clickX, clickY);
    const matches = knn.colorMatches(after, expectedLightBlue, 70);
    expect(matches).toBe(
      true,
      `After clicking near A cluster, expected a lightblue pixel near (${clickX},${clickY}), got ${after}`
    );
  });

  test('Click near a B cluster: new point is drawn with pink (classification B)', async () => {
    // Click near the B cluster at (300,300). New point should be classified as 'B'
    // The script draws classified point with 'pink' for B.
    const clickX = 295;
    const clickY = 295;

    await knn.clickCanvasAt(clickX, clickY);

    // pink RGB approx (255,192,203)
    const expectedPink = { r: 255, g: 192, b: 203 };
    const after = await knn.getCanvasPixelRGBA(clickX, clickY);
    const matches = knn.colorMatches(after, expectedPink, 70);
    expect(matches).toBe(
      true,
      `After clicking near B cluster, expected a pink pixel near (${clickX},${clickY}), got ${after}`
    );
  });

  test('Multiple sequential clicks update the canvas visually (several new classified points)', async () => {
    // Click three different locations and ensure the canvas shows distinct colored classified points.
    const clicks = [
      { x: 55, y: 65 }, // near A -> lightblue
      { x: 310, y: 305 }, // near B -> pink
      { x: 180, y: 120 }, // depending on nearest neighbors could be A or B; we verify canvas changed
    ];

    // Capture pre-click samples
    const beforeSamples = [];
    for (const c of clicks) {
      beforeSamples.push(await knn.getCanvasPixelRGBA(c.x, c.y));
    }

    // Perform clicks
    for (const c of clicks) {
      await knn.clickCanvasAt(c.x, c.y);
    }

    // Validate that at least one of the clicked pixels changed from its pre-click value
    let changedCount = 0;
    for (let i = 0; i < clicks.length; i++) {
      const after = await knn.getCanvasPixelRGBA(clicks[i].x, clicks[i].y);
      const before = beforeSamples[i];
      // Simple comparison of RGBA arrays
      const same =
        Array.isArray(before) &&
        Array.isArray(after) &&
        before[0] === after[0] &&
        before[1] === after[1] &&
        before[2] === after[2] &&
        before[3] === after[3];

      if (!same) changedCount++;
    }

    expect(changedCount).toBeGreaterThan(0);
  });

  test('No unexpected runtime errors were thrown during interactions', async () => {
    // Interact a bit and then assert that there were no uncaught page errors.
    await knn.clickCanvasAt(100, 100);
    await knn.clickCanvasAt(250, 250);

    // Wait a short time to capture any asynchronous errors
    await knn.page.waitForTimeout(100);

    // Assert there are no uncaught page errors
    expect(knn.pageErrors.length).toBe(
      0,
      `Expected no uncaught page errors, but found: ${JSON.stringify(knn.pageErrors)}`
    );

    // Inspect console messages for error-level logs (type === 'error')
    const errorMessages = knn.consoleMessages.filter((m) => m.type === 'error');
    // Depending on environment there might be none; assert none to ensure clean runtime
    expect(errorMessages.length).toBe(
      0,
      `Expected no console.error messages, but found: ${JSON.stringify(errorMessages)}`
    );
  });

  test('Accessibility: canvas has an accessible role in markup? (basic check for presence)', async () => {
    // This app uses a canvas element. Verify the canvas is present and focusable attributes are reasonable.
    const canvasVisible = await knn.page.isVisible(knn.canvasSelector);
    expect(canvasVisible).toBe(true);

    // The canvas should be reachable in the DOM and have width/height attributes
    const size = await knn.getCanvasSize();
    expect(size.width).toBeGreaterThan(0);
    expect(size.height).toBeGreaterThan(0);
  });
});