import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/088924ca-d59e-11f0-b3ae-79d1ce7b5503.html';

// Page Object for the KNN demo page
class KNNPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.canvas = page.locator('#canvas');
    this.kInput = page.locator('#kValue');
    this.classifyBtn = page.locator('#classifyBtn');
  }

  // Navigate to the page and wait for full load
  async goto() {
    await this.page.goto(APP_URL);
    await this.page.waitForLoadState('load');
  }

  // Get the current value of the K input (as string)
  async getKValue() {
    return await this.kInput.evaluate((el) => el.value);
  }

  // Set the K input to a given numeric value
  async setKValue(value) {
    await this.kInput.fill(String(value));
  }

  // Click the canvas at coordinates relative to the canvas top-left
  async clickCanvasAt(x, y) {
    // Use locator.click with position to click at the specified coordinates inside the canvas
    await this.canvas.click({ position: { x, y } });
  }

  // Retrieve the RGBA color of a specific pixel on the canvas
  async getCanvasPixel(x, y) {
    return await this.page.evaluate(
      (_x, _y) => {
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        const d = ctx.getImageData(_x, _y, 1, 1).data;
        return { r: d[0], g: d[1], b: d[2], a: d[3] };
      },
      x,
      y
    );
  }

  // Read the global userPoint variable from the page (if set)
  async getUserPoint() {
    return await this.page.evaluate(() => {
      // We only read, not modify anything
      return window.userPoint || null;
    });
  }

  // Click the classify button and wait for the alert dialog, returning the dialog object
  async clickClassifyAndWaitDialog() {
    const [dialog] = await Promise.all([
      this.page.waitForEvent('dialog'),
      this.classifyBtn.click()
    ]);
    return dialog;
  }

  // Click the classify button and wait for a pageerror event (used for edge-case testing)
  async clickClassifyAndWaitPageError() {
    const pageErrorPromise = this.page.waitForEvent('pageerror');
    await this.classifyBtn.click();
    return pageErrorPromise;
  }
}

test.describe('K-Nearest Neighbors (KNN) Demonstration - Interactive tests', () => {
  // Reusable page object reference
  /** @type {KNNPage} */
  let knn;

  // Before each test navigate to the page and create the page object
  test.beforeEach(async ({ page }) => {
    knn = new KNNPage(page);
    await knn.goto();
  });

  // Test initial page load and default state of interactive elements
  test('Initial load: page elements present and default values', async ({ page }) => {
    // Verify title and presence of controls
    await expect(page.locator('h1')).toHaveText(/K-Nearest Neighbors/i);
    await expect(knn.canvas).toBeVisible();
    await expect(knn.kInput).toBeVisible();
    await expect(knn.classifyBtn).toBeVisible();

    // Default K should be "3" as declared in the HTML
    const kValue = await knn.getKValue();
    expect(kValue).toBe('3');
  });

  // Test that the canvas has colored data points drawn (blue for 'A' and red for 'B')
  test('Canvas draws data points with expected colors', async () => {
    // Data points from the HTML:
    // A: { x: 50, y: 150 } -> blue
    // B: { x: 300, y: 300 } -> red
    // We'll sample a pixel at each coordinate and assert dominant channel
    const bluePoint = await knn.getCanvasPixel(50, 150);
    // Blue point should have blue channel greater than red and green
    expect(bluePoint.b).toBeGreaterThan(bluePoint.r);
    expect(bluePoint.b).toBeGreaterThan(bluePoint.g);

    const redPoint = await knn.getCanvasPixel(300, 300);
    // Red point should have red channel greater than green and blue
    expect(redPoint.r).toBeGreaterThan(redPoint.g);
    expect(redPoint.r).toBeGreaterThan(redPoint.b);
  });

  // Test clicking canvas places user point (green) and sets window.userPoint
  test('Clicking canvas places a green user point and sets userPoint', async ({ page }) => {
    // Click near the first 'A' point (50,150). Use a slight offset within the drawn circle
    const clickX = 60;
    const clickY = 155;
    await knn.clickCanvasAt(clickX, clickY);

    // Read window.userPoint set by the page's click handler
    const userPoint = await knn.getUserPoint();
    expect(userPoint).not.toBeNull();
    // Coordinates should be approximately the clicked location
    expect(Math.abs(userPoint.x - clickX)).toBeLessThanOrEqual(2);
    expect(Math.abs(userPoint.y - clickY)).toBeLessThanOrEqual(2);

    // The user point is drawn in green. Check the pixel at the clicked coordinate for dominant green channel.
    const pixel = await knn.getCanvasPixel(Math.round(userPoint.x), Math.round(userPoint.y));
    expect(pixel.g).toBeGreaterThan(pixel.r);
    expect(pixel.g).toBeGreaterThan(pixel.b);
  });

  // Test classification flow: selecting a point and pressing "Classify Point" shows an alert with expected label
  test('Classify selected point shows alert with the predicted label (A)', async ({ page }) => {
    // Click near an 'A' data point to create a userPoint that should be classified as 'A'
    await knn.clickCanvasAt(60, 155);

    // Intercept the alert dialog triggered by classify; assert it contains 'A'
    const dialog = await knn.clickClassifyAndWaitDialog();
    try {
      // The app shows: "The classified label for the point is: <LABEL>"
      const message = dialog.message();
      expect(message).toMatch(/classified label for the point is: .*A/);
    } finally {
      // Dismiss the dialog to not block subsequent operations
      await dialog.dismiss();
    }

    // Ensure no page errors occurred during this normal classification
    // Wait briefly to allow any async errors to surface
    let pageErrorOccurred = false;
    page.on('pageerror', () => {
      pageErrorOccurred = true;
    });
    // small grace period
    await page.waitForTimeout(50);
    expect(pageErrorOccurred).toBe(false);
  });

  // Edge case: Clicking classify without selecting a point should surface a runtime error (reduce on empty)
  test('Clicking classify without selecting a point triggers a runtime page error', async ({ page }) => {
    // Ensure no user point set initially
    const userPoint1 = await knn.getUserPoint();
    expect(userPoint).toBeNull();

    // Wait for the pageerror event which should be raised due to reduce on empty counts inside classifyPoint
    const pageError = await knn.clickClassifyAndWaitPageError();
    expect(pageError).toBeDefined();
    // The error should be a TypeError regarding reduce of empty array or similar
    const msg = pageError.message || String(pageError);
    expect(msg.toLowerCase()).toMatch(/reduce|empty|typeerror/);
  });

  // Test that changing K changes classification result when selecting a point near B
  test('Changing K value changes classification; selecting B region yields B', async ({ page }) => {
    // Click near a 'B' cluster (300,300 region)
    await knn.clickCanvasAt(310, 310);

    // Set K to 1 and classify -> nearest neighbor label should be 'B'
    await knn.setKValue(1);
    let dialog1 = await knn.clickClassifyAndWaitDialog();
    try {
      const message1 = dialog.message1();
      expect(message).toMatch(/classified label for the point is: .*B/);
    } finally {
      await dialog.dismiss();
    }

    // Set K to 5 (larger neighborhood) and classify -> still expected to be 'B' given cluster composition
    await knn.setKValue(5);
    dialog = await knn.clickClassifyAndWaitDialog();
    try {
      const message2 = dialog.message2();
      expect(message).toMatch(/classified label for the point is: .*B/);
    } finally {
      await dialog.dismiss();
    }
  });

  // Accessibility and visibility check: ensure controls are focusable and operable via keyboard
  test('Controls are focusable and operable via keyboard', async ({ page }) => {
    // Focus the K input using keyboard navigation
    await page.keyboard.press('Tab'); // should focus something, often the body -> next tab to input/button
    // Try to focus the K input directly
    await knn.kInput.focus();
    await expect(knn.kInput).toBeFocused();

    // Modify K using keyboard and then trigger classify via keyboard (Enter)
    await knn.kInput.fill('2');
    // Focus the classify button and press Enter to activate
    await knn.classifyBtn.focus();
    await expect(knn.classifyBtn).toBeFocused();

    // If no userPoint, this will raise a pageerror (as previously tested). We assert that pressing Enter triggers either a dialog or an error.
    // We'll observe both possible events and assert that at least one happens.
    const dialogPromise = page.waitForEvent('dialog').catch(() => null);
    const errorPromise = page.waitForEvent('pageerror').catch(() => null);

    await page.keyboard.press('Enter');

    const [dialogOrNull, errorOrNull] = await Promise.all([dialogPromise, errorPromise]);
    expect(dialogOrNull || errorOrNull).toBeTruthy();
    if (dialogOrNull) {
      // If a dialog appeared, dismiss it
      await dialogOrNull.dismiss();
    }
  });
});