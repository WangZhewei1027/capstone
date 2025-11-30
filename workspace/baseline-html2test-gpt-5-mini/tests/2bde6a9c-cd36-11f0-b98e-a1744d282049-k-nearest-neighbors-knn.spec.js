import { test, expect } from '@playwright/test';

test.describe('K-Nearest Neighbors (KNN) Interactive Demo', () => {
  const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde6a9c-cd36-11f0-b98e-a1744d282049.html';

  // Simple page object for interacting with the demo
  class KNNPage {
    constructor(page) {
      this.page = page;
      this.canvas = page.locator('#knnCanvas');
      this.class0Btn = page.locator('#class0');
      this.class1Btn = page.locator('#class1');
      this.eraserBtn = page.locator('#eraser');
      this.kRange = page.locator('#kRange');
      this.kValue = page.locator('#kValue');
      this.metricSelect = page.locator('#metric');
      this.toggleBoundaryBtn = page.locator('#toggleBoundary');
      this.toggleWeightedBtn = page.locator('#toggleWeighted');
      this.randomDataBtn = page.locator('#randomData');
      this.clearBtn = page.locator('#clearBtn');
      this.seedBtn = page.locator('#seedBtn');
      this.explainBtn = page.locator('#explainBtn');
      this.prediction = page.locator('#prediction');
      this.prob = page.locator('#prob');
      this.neighbors = page.locator('#neighbors');
      this.looContainer = page.locator('#looContainer');
    }

    // Click on canvas at element-relative coordinates (x,y)
    async clickCanvas(x, y, opts = {}) {
      await this.canvas.click({ position: { x, y }, ...opts });
    }

    // Right-click on canvas at coordinates
    async rightClickCanvas(x, y) {
      await this.canvas.click({ position: { x, y }, button: 'right' });
    }

    // Double click canvas at coordinates
    async dblclickCanvas(x, y) {
      await this.canvas.dblclick({ position: { x, y } });
    }

    // Set range input value by dispatching an input event via DOM
    async setKValue(val) {
      await this.page.$eval('#kRange', (el, v) => {
        el.value = String(v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, val);
    }

    // Change metric select value
    async setMetric(val) {
      await this.page.selectOption('#metric', val);
      // ensure change event processed
      await this.page.waitForTimeout(50);
    }

    // Click a control and wait a little to allow redraws
    async clickAndWait(locator) {
      await locator.click();
      await this.page.waitForTimeout(50);
    }

    // Get the number of points from the exposed window.points array
    async getPointsCount() {
      return await this.page.evaluate(() => window.points && window.points.length ? window.points.length : 0);
    }

    // Get prediction text
    async getPredictionText() {
      return (await this.prediction.textContent())?.trim();
    }

    // Get probability text
    async getProbText() {
      return (await this.prob.textContent())?.trim();
    }

    // Read looContainer text
    async getLooText() {
      return (await this.looContainer.textContent())?.trim();
    }
  }

  // Keep console messages and page errors for assertions
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    await page.goto(APP_URL);
    // Wait briefly for initial draw and UI initialization
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(150);
  });

  test.afterEach(async ({ page }) => {
    // Safety small delay to let any async errors surface
    await page.waitForTimeout(20);

    // Assert that no uncaught page errors occurred during the test
    // and that no console messages indicate ReferenceError/SyntaxError/TypeError
    const errorTypesFound = consoleMessages
      .map(m => m.text)
      .filter(t => /ReferenceError|SyntaxError|TypeError/.test(t));

    // Provide helpful diagnostics if assertions fail by printing logs
    if (pageErrors.length > 0 || errorTypesFound.length > 0) {
      // Attach the collected console messages for debugging
      // (Avoid throwing here to let the explicit assertions below fail with details)
    }

    expect(pageErrors.length, `Expected no uncaught page errors, got: ${pageErrors.length}`).toBe(0);
    expect(errorTypesFound.length, `Expected no console ReferenceError/SyntaxError/TypeError messages, got: ${errorTypesFound.length}\nConsole: ${JSON.stringify(consoleMessages, null, 2)}`).toBe(0);
  });

  test.describe('Initial load and default UI state', () => {
    test('page loads and shows initial controls and default K', async ({ page }) => {
      // Verify basic page elements and default values on load
      const knn = new KNNPage(page);

      // Title exists and contains KNN text
      const title = await page.locator('h1').textContent();
      expect(title).toContain('K-Nearest Neighbors');

      // Default K value shown as 3
      expect(await knn.kValue.textContent()).toBe('3');

      // Class A button should be primary (initial selection)
      const class0HasPrimary = await knn.class0Btn.getAttribute('class');
      expect(class0HasPrimary).toContain('primary');

      // Prediction should be present (not empty placeholder)
      const pred = await knn.getPredictionText();
      expect(pred).toBeTruthy();

      // Neighbors list should have items (initial sample dataset added on init)
      const neighborsCount = await page.evaluate(() => document.getElementById('neighbors').children.length);
      expect(neighborsCount).toBeGreaterThan(0);

      // Leave-one-out container should show accuracy text when dataset >=2
      const loo = await knn.getLooText();
      expect(loo).toMatch(/Leave-one-out accuracy|Need at least 2 points/);
    });
  });

  test.describe('Control interactions and data flow', () => {
    test('adding points by selecting class and clicking canvas increases points count', async ({ page }) => {
      // Switch to Class B, click canvas to add a point, expect points count to increase
      const knn1 = new KNNPage(page);
      const before = await knn.getPointsCount();
      await knn.class1Btn.click();
      // Click somewhere near center of canvas
      await knn.clickCanvas(120, 120);
      await page.waitForTimeout(50);
      const after = await knn.getPointsCount();
      expect(after).toBeGreaterThan(before);
      // Verify neighbors panel updated (has at least one child)
      const neighborChildren = await page.evaluate(() => document.getElementById('neighbors').children.length);
      expect(neighborChildren).toBeGreaterThan(0);
    });

    test('eraser mode deletes a nearby point with right click', async ({ page }) => {
      // Add a point deliberately then switch to eraser and right-click to remove it
      const knn2 = new KNNPage(page);

      // Ensure a known point is added at a specific position
      await knn.class0Btn.click();
      await knn.clickCanvas(300, 300);
      await page.waitForTimeout(50);
      const countAfterAdd = await knn.getPointsCount();
      expect(countAfterAdd).toBeGreaterThan(0);

      // Switch to eraser mode
      await knn.eraserBtn.click();
      // Right-click near the previously added coordinate
      await knn.rightClickCanvas(300, 300);
      await page.waitForTimeout(50);
      const countAfterErase = await knn.getPointsCount();
      // Expect the number decreased (or at least not increased)
      expect(countAfterErase).toBeLessThanOrEqual(countAfterAdd - 1);
    });

    test('kRange slider updates K value and UI reflects change', async ({ page }) => {
      const knn3 = new KNNPage(page);
      // Change K to 7 via DOM manipulation and check the displayed kValue text updates
      await knn.setKValue(7);
      await page.waitForTimeout(30);
      expect(await knn.kValue.textContent()).toBe('7');

      // Changing K should update prediction/probability content (string present)
      const probText = await knn.getProbText();
      expect(probText).toBeTruthy();
    });

    test('metric select changes value (euclidean -> manhattan) and no errors thrown', async ({ page }) => {
      const knn4 = new KNNPage(page);
      // Change metric to manhattan
      await knn.setMetric('manhattan');
      expect(await knn.metricSelect.inputValue()).toBe('manhattan');

      // Ensure prediction text still present
      const p = await knn.getPredictionText();
      expect(p).toBeTruthy();
    });

    test('toggle weighted updates button label and probability format', async ({ page }) => {
      const knn5 = new KNNPage(page);
      // Click to toggle weighted on
      await knn.toggleWeightedBtn.click();
      await page.waitForTimeout(30);
      const label = await knn.toggleWeightedBtn.textContent();
      expect(label).toContain('On');

      // Probability should be in percent format when a prediction exists
      const prob = await knn.getProbText();
      // When a prediction exists, prob should end with '%' (or be '—')
      expect(prob === '—' || /%$/.test(prob)).toBeTruthy();
    });

    test('random data populates many points and updates UI', async ({ page }) => {
      const knn6 = new KNNPage(page);
      await knn.randomDataBtn.click();
      // Wait for generation and redraw
      await page.waitForTimeout(200);
      const pts = await knn.getPointsCount();
      // randomData generates 40 pairs => 80 points
      expect(pts).toBeGreaterThanOrEqual(80);
      // neighbors list should show items
      const neighborChildren1 = await page.evaluate(() => document.getElementById('neighbors').children.length);
      expect(neighborChildren).toBeGreaterThan(0);
    });

    test('seed button loads stylish example dataset (expected 120 points)', async ({ page }) => {
      const knn7 = new KNNPage(page);
      await knn.seedBtn.click();
      await page.waitForTimeout(120);
      const pts1 = await knn.getPointsCount();
      // seedBtn creates 60 + 60 = 120 points
      expect(pts).toBeGreaterThanOrEqual(120);
    });

    test('clear button removes all points and leaves LOO message about needing 2 points', async ({ page }) => {
      const knn8 = new KNNPage(page);
      // Ensure there are some points first
      const before1 = await knn.getPointsCount();
      expect(before).toBeGreaterThanOrEqual(0);

      // Click clear
      await knn.clearBtn.click();
      await page.waitForTimeout(50);
      const pts2 = await knn.getPointsCount();
      expect(pts).toBe(0);

      // LOO container should display the muted message about needing at least 2 points
      const looText = await knn.getLooText();
      expect(looText).toMatch(/Need at least 2 points/);
    });
  });

  test.describe('Canvas interactions and query behavior', () => {
    test('double-clicking canvas moves query point and updates prediction', async ({ page }) => {
      const knn9 = new KNNPage(page);

      // Record initial prediction
      const beforePred = await knn.getPredictionText();

      // Double click canvas to set query near top-left
      await knn.dblclickCanvas(60, 60);
      await page.waitForTimeout(80);

      const afterPred = await knn.getPredictionText();
      // Prediction can change or remain same depending on data; ensure UI updated (non-empty)
      expect(afterPred).toBeTruthy();
      // At minimum, ensure the prediction text is a string and changed OR remained but still valid
      expect(typeof afterPred).toBe('string');
    });

    test('explain button triggers an alert dialog with help text', async ({ page }) => {
      const knn10 = new KNNPage(page);
      // Capture dialog
      let dialogMessage = null;
      page.once('dialog', async dialog => {
        dialogMessage = dialog.message();
        await dialog.accept();
      });

      // Click the explain button which triggers alert
      await knn.explainBtn.click();
      // Allow dialog handler to run
      await page.waitForTimeout(50);

      expect(dialogMessage).toBeTruthy();
      expect(dialogMessage).toContain('How KNN works');
    });
  });

  test.describe('Edge cases and robustness', () => {
    test('setting K larger than dataset clamps K without throwing', async ({ page }) => {
      const knn11 = new KNNPage(page);
      // Clear dataset to create edge condition (0 points)
      await knn.clearBtn.click();
      await page.waitForTimeout(30);

      // Set K to a large value programmatically
      await knn.setKValue(25);
      // No uncaught exceptions should occur; prediction should show '—' since no points
      const pred1 = await knn.getPredictionText();
      expect(pred).toBe('—');

      // Now add a single point and set K to bigger than dataset (1) and ensure no errors
      await knn.class0Btn.click();
      await knn.clickCanvas(200, 200);
      await page.waitForTimeout(50);
      await knn.setKValue(25);
      // Prediction should exist when at least one point exists
      const pred2 = await knn.getPredictionText();
      expect(pred2).toBeTruthy();
    });

    test('no unexpected ReferenceError/SyntaxError/TypeError messages appear in console during interactions', async ({ page }) => {
      // Perform a variety of interactions to exercise code paths
      const knn12 = new KNNPage(page);

      // Toggle boundary, weighted, random data, then clear
      await knn.toggleBoundaryBtn.click();
      await knn.toggleWeightedBtn.click();
      await knn.randomDataBtn.click();
      await page.waitForTimeout(120);
      await knn.clearBtn.click();
      await page.waitForTimeout(40);

      // Inspect captured console messages for error-like terms
      const errorLike = consoleMessages.filter(m => /ReferenceError|SyntaxError|TypeError/.test(m.text));

      // Assert none found
      expect(errorLike.length).toBe(0);
    });
  });

});