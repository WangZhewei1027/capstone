import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d585471-d1d8-11f0-bbda-359f3f96b638.html';

// Simple page object for the KNN demo page encapsulating common interactions
class KNNPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.kInput = '#kInput';
    this.setKButton = '#setK';
    this.kValue = '#kValue';
    this.canvas = '#canvas';
    this.header = 'h1';
    this.description = 'p';
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async getHeaderText() {
    return this.page.textContent(this.header);
  }

  async getFirstParagraphText() {
    // the first <p> explains the usage; the second shows current K; we get the first one
    const paras = await this.page.$$('p');
    if (paras.length === 0) return '';
    return paras[0].textContent();
  }

  async getKValueText() {
    return (await this.page.textContent(this.kValue)).trim();
  }

  async getKInputValue() {
    return await this.page.$eval(this.kInput, el => el.value);
  }

  async setK(value) {
    await this.page.fill(this.kInput, String(value));
    await this.page.click(this.setKButton);
  }

  async clickCanvasAt(x, y) {
    // click at a coordinate relative to the canvas top-left
    const el = await this.page.$(this.canvas);
    if (!el) throw new Error('Canvas element not found');
    const box = await el.boundingBox();
    if (!box) throw new Error('Canvas bounding box not available');
    await this.page.mouse.click(box.x + x, box.y + y);
  }

  async getCanvasAttributes() {
    return this.page.$eval(this.canvas, el => ({
      width: el.getAttribute('width'),
      height: el.getAttribute('height')
    }));
  }

  // convenience to read the in-page points array (if present)
  async getPointsLength() {
    return this.page.evaluate(() => {
      // Do not create or modify globals; only read if exists
      try {
        return window.points ? window.points.length : null;
      } catch (e) {
        return null;
      }
    });
  }
}

test.describe('K-Nearest Neighbors (KNN) Demo - UI and interactions', () => {
  // Basic render tests and setup
  test('renders initial UI elements and content', async ({ page }) => {
    const app = new KNNPage(page);
    await app.goto();

    // Validate the main header is present
    const header = await app.getHeaderText();
    expect(header).toContain('K-Nearest Neighbors (KNN) Demo');

    // Validate the first paragraph (instruction) is present
    const firstPara = await app.getFirstParagraphText();
    expect(firstPara).toContain('Click anywhere in the canvas to add a point');

    // Validate default K value is shown as 3
    const kValueText = await app.getKValueText();
    expect(kValueText).toBe('3');

    // Validate input has default value 3
    const kInputVal = await app.getKInputValue();
    expect(kInputVal).toBe('3');

    // Validate canvas exists and has expected attributes
    const canvasAttrs = await app.getCanvasAttributes();
    expect(canvasAttrs.width).toBe('600');
    expect(canvasAttrs.height).toBe('400');
  });

  test.describe('Set K button behaviors', () => {
    test('updates K value when Set K is clicked with a valid number', async ({ page }) => {
      const app1 = new KNNPage(page);
      await app.goto();

      // Change K to 5 and click Set K
      await app.setK(5);

      // The visible kValue should update to 5
      const kValueText1 = await app.getKValueText();
      expect(kValueText).toBe('5');
    });

    test('edge case: non-numeric input for K results in NaN displayed', async ({ page }) => {
      const app2 = new KNNPage(page);
      await app.goto();

      // Enter non-numeric value and click Set K
      await page.fill('#kInput', 'abc');
      await page.click('#setK');

      // parseInt('abc') -> NaN -> innerText should be "NaN"
      const kValueText2 = await app.getKValueText();
      // We assert that the app reflected the parsed value as a string (likely 'NaN')
      expect(kValueText).toBe('NaN');
    });

    test('edge case: zero is accepted and displayed', async ({ page }) => {
      const app3 = new KNNPage(page);
      await app.goto();

      // Set K to 0 and click Set K
      await app.setK(0);

      // The visible kValue should reflect 0
      const kValueText3 = await app.getKValueText();
      expect(kValueText).toBe('0');
    });
  });

  test.describe('Canvas click and classification transitions', () => {
    // Note: The application implementation classifies a new point using existing points.
    // When there are no existing points, classifyPoint returns null and the code uses that null
    // to index into colors array. The app may therefore throw a runtime error during the first click.
    //
    // Per instructions: do not patch the app; observe page errors and assert that they occur.
    test('clicking canvas (first click) triggers a classification attempt and a pageerror is observed', async ({ page }) => {
      const app4 = new KNNPage(page);
      await app.goto();

      // Prepare to capture a page error emitted by the page during the click.
      // We intentionally wait for a 'pageerror' event since the implementation may throw.
      const waitForError = page.waitForEvent('pageerror');

      // Click near the center of the canvas
      // Using a modest offset to stay safely inside the canvas element
      await app.clickCanvasAt(100, 50);

      // Wait for the page error to be emitted by the page runtime
      const error = await waitForError;

      // Assert that an error was indeed captured and has a message
      expect(error).toBeTruthy();
      expect(typeof error.message).toBe('string');
      expect(error.message.length).toBeGreaterThan(0);

      // After the error, check whether the in-page points array was modified.
      // Because the classification failed prior to pushing, points length is expected to be 0.
      const pointsLength = await app.getPointsLength();
      // We expect either 0 or null (in case the variable is not readable), but not >0
      if (pointsLength !== null) {
        expect(pointsLength).toBe(0);
      }
    });

    test('clicking canvas again triggers classification attempt and emits another pageerror', async ({ page }) => {
      const app5 = new KNNPage(page);
      await app.goto();

      // First click: ensure the app error occurs (as above)
      const firstErrorPromise = page.waitForEvent('pageerror');
      await app.clickCanvasAt(120, 60);
      const firstError = await firstErrorPromise;
      expect(firstError).toBeTruthy();

      // Second click: Expect the same failure mode to repeat (transition S1 -> S1 in FSM).
      const secondErrorPromise = page.waitForEvent('pageerror');
      await app.clickCanvasAt(140, 80);
      const secondError = await secondErrorPromise;
      expect(secondError).toBeTruthy();

      // Ensure both errors have messages
      expect(typeof firstError.message).toBe('string');
      expect(firstError.message.length).toBeGreaterThan(0);
      expect(typeof secondError.message).toBe('string');
      expect(secondError.message.length).toBeGreaterThan(0);
    });

    test('observes that an attempted classification without prior points leads to no canvas-drawn points', async ({ page }) => {
      const app6 = new KNNPage(page);
      await app.goto();

      // Click canvas and wait for the pageerror
      const errP = page.waitForEvent('pageerror');
      await app.clickCanvasAt(50, 50);
      await errP;

      // Read the points array length; it should be 0 since classification likely prevented push
      const pointsLength1 = await app.getPointsLength();
      if (pointsLength !== null) {
        expect(pointsLength).toBe(0);
      }

      // Additionally, canvas pixel data can be probed to ensure no obvious drawing changes.
      // We ask the page to read a single pixel from the canvas center and return RGBA.
      // This does not modify globals; it only reads the canvas content.
      const pixel = await page.evaluate(() => {
        const c = document.getElementById('canvas');
        const ctx = c.getContext('2d');
        // read a center pixel
        const x = Math.floor(c.width / 2);
        const y = Math.floor(c.height / 2);
        try {
          const data = ctx.getImageData(x, y, 1, 1).data;
          return Array.from(data);
        } catch (e) {
          // If getImageData is blocked by CORS or other constraints, return null
          return null;
        }
      });

      // If we could read pixel data, assert it's an array of length 4
      if (pixel !== null) {
        expect(Array.isArray(pixel)).toBe(true);
        expect(pixel.length).toBe(4);
        // We don't assert exact color, only that a valid RGBA array was returned.
        pixel.forEach(channel => expect(typeof channel).toBe('number'));
      }
    });
  });
});