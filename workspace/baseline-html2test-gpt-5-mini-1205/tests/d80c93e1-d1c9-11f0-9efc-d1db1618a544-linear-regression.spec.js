import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80c93e1-d1c9-11f0-9efc-d1db1618a544.html';

// Page object encapsulating common interactions with the demo
class LinearRegressionApp {
  constructor(page) {
    this.page = page;
    // Controls
    this.numPoints = page.locator('#numPoints');
    this.numPointsVal = page.locator('#numPointsVal');
    this.trueSlope = page.locator('#trueSlope');
    this.trueSlopeVal = page.locator('#trueSlopeVal');
    this.trueIntercept = page.locator('#trueIntercept');
    this.trueInterceptVal = page.locator('#trueInterceptVal');
    this.noise = page.locator('#noise');
    this.noiseVal = page.locator('#noiseVal');

    this.randBtn = page.locator('#randBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.undoBtn = page.locator('#undoBtn');

    this.fitClosed = page.locator('#fitClosed');
    this.fitGD = page.locator('#fitGD');
    this.startStopGD = page.locator('#startStopGD');
    this.stepGD = page.locator('#stepGD');

    this.lr = page.locator('#lr');
    this.lrVal = page.locator('#lrVal');
    this.epochs = page.locator('#epochs');
    this.epochsVal = page.locator('#epochsVal');

    this.showResiduals = page.locator('#showResiduals');

    this.statSlope = page.locator('#statSlope');
    this.statIntercept = page.locator('#statIntercept');
    this.statMSE = page.locator('#statMSE');
    this.statR2 = page.locator('#statR2');

    this.plot = page.locator('#plot');
    this.lossCanvas = page.locator('#loss');
  }

  // Add a point by clicking at canvas coordinates relative to bounding box (px)
  async clickPlotAtOffset(offsetX, offsetY) {
    const box = await this.plot.boundingBox();
    if (!box) throw new Error('Plot bounding box not available');
    const x = Math.floor(box.x + offsetX);
    const y = Math.floor(box.y + offsetY);
    await this.page.mouse.click(x, y);
    // small wait to let UI update
    await this.page.waitForTimeout(50);
  }

  // Drag from a start point (canvas coords) to end point (canvas coords)
  async dragOnPlot(startOffsetX, startOffsetY, endOffsetX, endOffsetY) {
    const box = await this.plot.boundingBox();
    if (!box) throw new Error('Plot bounding box not available');
    const sx = Math.floor(box.x + startOffsetX);
    const sy = Math.floor(box.y + startOffsetY);
    const ex = Math.floor(box.x + endOffsetX);
    const ey = Math.floor(box.y + endOffsetY);
    await this.page.mouse.move(sx, sy);
    await this.page.mouse.down();
    // move in small steps to ensure mousemove handlers run
    await this.page.mouse.move((sx + ex) / 2, (sy + ey) / 2);
    await this.page.mouse.move(ex, ey);
    await this.page.mouse.up();
    await this.page.waitForTimeout(80);
  }

  async getStatTexts() {
    return {
      slope: (await this.statSlope.textContent())?.trim(),
      intercept: (await this.statIntercept.textContent())?.trim(),
      mse: (await this.statMSE.textContent())?.trim(),
      r2: (await this.statR2.textContent())?.trim(),
    };
  }
}

// Group related tests
test.describe('Interactive Linear Regression Demo (d80c93e1...)', () => {
  let pageErrors = [];
  let consoleErrors = [];
  let app;

  // Setup: navigate and attach listeners to capture errors and console
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];

    page.on('pageerror', (err) => {
      // Capture uncaught exceptions (ReferenceError, TypeError, SyntaxError, etc.)
      pageErrors.push(err);
    });

    page.on('console', (msg) => {
      // Capture console.error messages too
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(APP_URL);
    app = new LinearRegressionApp(page);

    // Ensure main UI elements are present before running tests
    await expect(app.plot).toBeVisible();
    await expect(app.randBtn).toBeVisible();
    await expect(app.clearBtn).toBeVisible();
  });

  // Teardown: assert that there are no fatal page errors (ReferenceError, SyntaxError, TypeError)
  test.afterEach(async () => {
    // Fail the test if any page error of typical JS error names occurred
    const critical = pageErrors.filter(err => {
      const name = err && err.name ? err.name : '';
      return name === 'ReferenceError' || name === 'SyntaxError' || name === 'TypeError';
    });
    expect(critical.length, `Unexpected page errors: ${pageErrors.map(e => e.stack || e.message).join('\n')}`).toBe(0);

    // Also assert that there were no console.error messages emitted (helps catch runtime problems)
    expect(consoleErrors.length, `console.error calls were made: ${consoleErrors.join('\n')}`).toBe(0);
  });

  // Test initial load and default state
  test('Initial load: controls present and default state initialized', async () => {
    // Purpose: verify the page loads and initial controls show expected default values
    await expect(app.numPointsVal).toHaveText('25');
    await expect(app.trueSlopeVal).toHaveText('0.8');
    await expect(app.noiseVal).toHaveText('8');
    // stats should be initialized (initial script generates random data and fits closed form)
    const stats = await app.getStatTexts();
    // Expect slope/intercept/MSE to not be the placeholder '—'
    expect(stats.slope).not.toBe('—');
    expect(stats.intercept).not.toBe('—');
    expect(stats.mse).not.toBe('—');
    // R^2 may be a number or '—' if degenerate, but check element exists
    await expect(app.statR2).toBeVisible();
  });

  // Test random data generation updates UI
  test('Generate Random Data updates stats and uses numPoints value', async () => {
    // Purpose: change the numPoints slider, generate data, and ensure stats update
    await app.numPoints.evaluate((el) => { el.value = '10'; el.dispatchEvent(new Event('input')); });
    await expect(app.numPointsVal).toHaveText('10');

    // Click generate and verify stats reflect a dataset (slope/intercept should be numeric)
    await app.randBtn.click();
    await app.page.waitForTimeout(120);
    const stats = await app.getStatTexts();
    expect(stats.slope).not.toBe('—');
    expect(stats.intercept).not.toBe('—');
    expect(stats.mse).not.toBe('—');
  });

  // Test clear and undo behavior
  test('Clear points removes data and Undo restores it', async () => {
    // Ensure dataset exists
    await app.randBtn.click();
    await app.page.waitForTimeout(80);
    const before = await app.getStatTexts();
    expect(before.slope).not.toBe('—');

    // Clear points: stats should revert to placeholders
    await app.clearBtn.click();
    await app.page.waitForTimeout(80);
    const cleared = await app.getStatTexts();
    expect(cleared.slope).toBe('—');
    expect(cleared.intercept).toBe('—');
    expect(cleared.mse).toBe('—');

    // Undo should restore previous dataset and stats
    await app.undoBtn.click();
    await app.page.waitForTimeout(80);
    const afterUndo = await app.getStatTexts();
    expect(afterUndo.slope).not.toBe('—');
    expect(afterUndo.intercept).not.toBe('—');
  });

  // Test adding points by clicking the plot and dragging them
  test('Add points by clicking the plot and drag to move them', async () => {
    // Clear any existing points first
    await app.clearBtn.click();
    await app.page.waitForTimeout(50);
    let stats = await app.getStatTexts();
    expect(stats.slope).toBe('—');

    // Click twice on plot at controlled offsets to add two points
    // Use offsets within canvas (percentage of width/height)
    const box = await app.plot.boundingBox();
    if (!box) throw new Error('Plot not available');
    const w = Math.max(200, box.width);
    const h = Math.max(100, box.height);
    // Click around left-bottom and right-top to create a visible slope
    await app.clickPlotAtOffset(w * 0.25, h * 0.8);
    await app.clickPlotAtOffset(w * 0.75, h * 0.2);

    // Now stats should be computed (>= 2 points)
    stats = await app.getStatTexts();
    expect(stats.slope).not.toBe('—');
    expect(stats.intercept).not.toBe('—');

    // Record previous intercept to verify dragging changes the model
    const prevIntercept = stats.intercept;

    // Drag the first point to a new location to change the fitted line
    // We'll drag near the first point location (approx at 25% width, 80% height)
    await app.dragOnPlot(w * 0.25, h * 0.8, w * 0.25, h * 0.6);
    const afterDrag = await app.getStatTexts();
    expect(afterDrag.intercept).not.toBeUndefined();
    // Intercept should differ from previous after moving a point (most likely)
    if (prevIntercept !== '—' && afterDrag.intercept !== '—') {
      expect(afterDrag.intercept).not.toBe(prevIntercept);
    }
  });

  // Fit closed form: behavior with insufficient and sufficient points
  test('Fit (Closed form) requires >=2 points and computes slope/intercept', async () => {
    // Ensure cleared state
    await app.clearBtn.click();
    await app.page.waitForTimeout(50);

    // With no points, clicking fitClosed should do nothing (placeholders remain)
    await app.fitClosed.click();
    await app.page.waitForTimeout(50);
    let stats = await app.getStatTexts();
    expect(stats.slope).toBe('—');

    // Add two points and then click fitClosed
    const box = await app.plot.boundingBox();
    if (!box) throw new Error('Plot bounding box missing');
    const w = box.width, h = box.height;
    await app.clickPlotAtOffset(w * 0.3, h * 0.7);
    await app.clickPlotAtOffset(w * 0.7, h * 0.3);
    // Now perform closed form fit
    await app.fitClosed.click();
    await app.page.waitForTimeout(80);
    stats = await app.getStatTexts();
    expect(stats.slope).not.toBe('—');
    expect(stats.intercept).not.toBe('—');
  });

  // Gradient descent step and start/stop behavior
  test('Gradient Descent: stepGD updates model and Start/Stop toggles properly', async () => {
    // Ensure there is at least one point (generate if absent)
    await app.clearBtn.click();
    await app.page.waitForTimeout(30);
    // Add single point so stepGD is allowed
    const box = await app.plot.boundingBox();
    if (!box) throw new Error('Plot bounding box missing');
    const w = box.width, h = box.height;
    await app.clickPlotAtOffset(w * 0.5, h * 0.5);

    // Record MSE before step
    const before = await app.getStatTexts();
    // Step GD: performs a single gradient step and updates stats
    await app.stepGD.click();
    await app.page.waitForTimeout(80);
    const afterStep = await app.getStatTexts();
    // After a gradient descent step, MSE should be numeric (not '—'), and likely changed
    expect(afterStep.mse).not.toBe('—');
    // If before had a value, it should be a different string or different numeric value
    if (before.mse !== '—') {
      expect(afterStep.mse).not.toBe(before.mse);
    }

    // Start GD toggles text to Stop GD and then back to Start GD when clicked again
    const startText = await app.startStopGD.textContent();
    expect(startText?.trim()).toBe('Start GD');
    // Start it (should start animation loop). Because the page will animate, we only toggle then stop quickly.
    await app.startStopGD.click();
    await app.page.waitForTimeout(120);
    const midText = await app.startStopGD.textContent();
    // If no points, it might remain Start GD; we ensured a point exists so expect toggled
    expect(midText?.trim()).toBe('Stop GD');
    // Stop it
    await app.startStopGD.click();
    await app.page.waitForTimeout(80);
    const finalText = await app.startStopGD.textContent();
    expect(finalText?.trim()).toBe('Start GD');
  });

  // UI control interactions (sliders and checkbox)
  test('Sliders and checkbox update their visible values and states', async () => {
    // Change learning rate slider and verify label updates
    await app.lr.evaluate((el) => { el.value = '0.1'; el.dispatchEvent(new Event('input')); });
    await expect(app.lrVal).toHaveText('0.100');

    // Change epochs slider and verify label updates
    await app.epochs.evaluate((el) => { el.value = '50'; el.dispatchEvent(new Event('input')); });
    await expect(app.epochsVal).toHaveText('50');

    // Toggle residuals checkbox and verify checked state changes
    const initialChecked = await app.showResiduals.isChecked();
    await app.showResiduals.click();
    const toggled = await app.showResiduals.isChecked();
    expect(toggled).toBe(!initialChecked);
    // Toggle back
    await app.showResiduals.click();
    const toggledBack = await app.showResiduals.isChecked();
    expect(toggledBack).toBe(initialChecked);
  });

  // Edge-case: clicking Fit (Gradient Descent) when there are zero points should be inert
  test('Fit (Gradient Descent) is inert with zero points', async () => {
    // Clear all points
    await app.clearBtn.click();
    await app.page.waitForTimeout(50);
    // Click Fit (Gradient Descent) - should not throw and should not modify stats
    await app.fitGD.click();
    await app.page.waitForTimeout(80);
    const stats = await app.getStatTexts();
    // Stats remain placeholders
    expect(stats.slope).toBe('—');
    expect(stats.mse).toBe('—');
  });
});