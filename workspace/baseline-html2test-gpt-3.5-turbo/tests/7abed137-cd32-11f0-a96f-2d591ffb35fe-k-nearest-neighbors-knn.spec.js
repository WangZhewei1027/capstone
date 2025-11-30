import { test, expect } from '@playwright/test';

const URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abed137-cd32-11f0-a96f-2d591ffb35fe.html';

// Page Object Model for the KNN demo page
class KNNPage {
  constructor(page) {
    this.page = page;
    this.canvas = page.locator('#knnCanvas');
    this.classSelector = page.locator('#classSelector');
    this.kInput = page.locator('#kInput');
    this.clearBtn = page.locator('#clearBtn');
    this.resetClassifyBtn = page.locator('#resetClassifyBtn');
    this.info = page.locator('#info');
  }

  // Add a training point by left-clicking on the canvas at (x,y)
  async addTrainingPoint(x, y) {
    await this.page.click('#knnCanvas', { position: { x, y }, button: 'left' });
  }

  // Classify a point by right-clicking on the canvas at (x,y)
  async classifyPoint(x, y) {
    await this.page.click('#knnCanvas', { position: { x, y }, button: 'right' });
  }

  async selectClass(value) {
    await this.classSelector.selectOption(value);
  }

  async setK(value) {
    await this.kInput.fill(String(value));
    // Dispatch change so the page picks up the new K value
    await this.kInput.dispatchEvent('change');
  }

  async clickClear() {
    await this.clearBtn.click();
  }

  async clickResetClassify() {
    await this.resetClassifyBtn.click();
  }

  async getInfoText() {
    return await this.info.innerText();
  }

  async getNeighborCountInInfo() {
    // Count <li> items inside #info which correspond to neighbors list
    return await this.page.locator('#info li').count();
  }

  async getKValue() {
    return await this.kInput.inputValue();
  }

  async isResetDisabled() {
    return await this.resetClassifyBtn.isDisabled();
  }

  async getClassSelectorValue() {
    return await this.classSelector.inputValue();
  }
}

test.describe('K-Nearest Neighbors (KNN) Interactive Demo - Full E2E', () => {
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console 'error' messages emitted by the page
    page.on('console', msg => {
      // We only collect console messages of type 'error' for assertion
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the demo page and wait for load
    await page.goto(URL, { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    // After each test ensure no console errors or uncaught page errors were emitted.
    // This helps detect runtime errors like ReferenceError/SyntaxError/TypeError that
    // may occur during page execution.
    expect(pageErrors, 'No uncaught page errors should have occurred').toHaveLength(0);
    expect(consoleErrors, 'No console.error messages should have been logged').toHaveLength(0);
  });

  test('Initial page load displays expected controls and default state', async ({ page }) => {
    // Verify initial UI elements and default state
    const p = new KNNPage(page);

    // Title and descriptive text exist
    await expect(page).toHaveTitle(/K-Nearest Neighbors/i);

    // Default class selection is 'red'
    expect(await p.getClassSelectorValue()).toBe('red');

    // Default K value is 3
    expect(await p.getKValue()).toBe('3');

    // Reset classified button should be disabled initially
    expect(await p.isResetDisabled()).toBe(true);

    // Info div should contain the instruction text when no classified point exists
    const infoText = await p.getInfoText();
    expect(infoText).toMatch(/Click on the canvas to add points/i);

    // Canvas is visible
    await expect(page.locator('#knnCanvas')).toBeVisible();
  });

  test('Adding training points and classifying a nearby point yields expected predicted class and neighbor list', async ({ page }) => {
    // This test adds training points (two red, one blue) and classifies near red points
    const p1 = new KNNPage(page);

    // Add two red points (default)
    await p.addTrainingPoint(100, 100);
    await p.addTrainingPoint(120, 110);

    // Switch to blue class and add one blue point
    await p.selectClass('blue');
    await p.addTrainingPoint(300, 300);

    // Ensure class selector reflects change
    expect(await p.getClassSelectorValue()).toBe('blue');

    // Right-click close to red points to classify
    await p.classifyPoint(110, 105);

    // After classification, info should show Predicted Class and the predicted label 'red'
    const infoText1 = await p.getInfoText();
    expect(infoText).toMatch(/Predicted Class:/i);
    // Predicted class should be red given our points and classification position
    expect(infoText.toLowerCase()).toContain('red');

    // The neighbor list should show K=3 neighbors (default)
    expect(infoText).toContain('K=3');

    // There should be 3 neighbor <li> items
    const neighborCount = await p.getNeighborCountInInfo();
    expect(neighborCount).toBe(3);

    // Reset classified point button should now be enabled
    expect(await p.isResetDisabled()).toBe(false);
  });

  test('Changing K while a point is classified reclassifies with new K and updates UI', async ({ page }) => {
    // Add 3 points (two red near each other, one blue far away), classify, then change K
    const p2 = new KNNPage(page);

    // Add two red points
    await p.selectClass('red');
    await p.addTrainingPoint(80, 80);
    await p.addTrainingPoint(110, 90);

    // Add one blue point
    await p.selectClass('blue');
    await p.addTrainingPoint(400, 300);

    // Classify near the red cluster
    await p.classifyPoint(100, 85);

    // Sanity: predicted should be red (K default 3)
    let infoText2 = await p.getInfoText();
    expect(infoText.toLowerCase()).toContain('predicted class');
    expect(infoText.toLowerCase()).toContain('red');

    // Change K to 1 (should reclassify using the single nearest neighbor)
    await p.setK(1);

    // Wait for UI to update
    infoText = await p.getInfoText();
    expect(infoText).toContain('K=1');

    // Neighbor count should now be 1
    const neighborCount1 = await p.getNeighborCountInInfo();
    expect(neighborCount).toBe(1);

    // The predicted class for K=1 should reflect the nearest single neighbor. Given our setup, still likely 'red'
    expect(infoText.toLowerCase()).toContain('red');
  });

  test('Right-click classification with no training points shows alert and does not classify', async ({ page }) => {
    // Edge case: classify when there are no training points should bring up an alert dialog
    const p3 = new KNNPage(page);

    // Ensure there are no points by clicking clear
    await p.clickClear();

    // Prepare to capture the dialog message
    page.once('dialog', async dialog => {
      try {
        expect(dialog.type()).toBe('alert');
        expect(dialog.message()).toBe('Please add some training points before classification.');
      } finally {
        await dialog.accept();
      }
    });

    // Attempt right-click classification; should trigger the dialog
    await p.classifyPoint(200, 200);

    // After handling dialog, info text should remain the default instruction
    const infoText3 = await p.getInfoText();
    expect(infoText).toMatch(/Click on the canvas to add points/i);
  });

  test('Invalid K (e.g., 0) triggers validation alert on classification', async ({ page }) => {
    // Add a training point, set K to invalid value (0), and attempt to classify -> should alert
    const p4 = new KNNPage(page);

    // Add a single red point
    await p.selectClass('red');
    await p.addTrainingPoint(50, 50);

    // Set K to 0 (invalid)
    await p.kInput.fill('0');

    // Expect an alert about invalid K when classifying
    page.once('dialog', async dialog => {
      try {
        expect(dialog.type()).toBe('alert');
        expect(dialog.message()).toBe('Please enter a valid K (>=1).');
      } finally {
        await dialog.accept();
      }
    });

    // Attempt to classify via right-click
    await p.classifyPoint(60, 60);

    // After handling alert, there should be no classified point (info returns to default if classification didn't happen)
    const infoText4 = await p.getInfoText();
    // It may either remain default instruction or still show classification if code handled it differently,
    // but per implementation it should show the alert and not classify.
    expect(infoText.toLowerCase()).toMatch(/click on the canvas to add points|please add some training points/i);
  });

  test('K greater than number of training points is reduced to dataset size during classification', async ({ page }) => {
    // Add two points then set K to a larger value and classify; K input should be updated to the number of points
    const p5 = new KNNPage(page);

    // Add two training points
    await p.selectClass('red');
    await p.addTrainingPoint(150, 150);
    await p.selectClass('blue');
    await p.addTrainingPoint(350, 150);

    // Set K to 5 (greater than number of training points)
    await p.kInput.fill('5');

    // Perform classification; the right-click handler should clamp k to points.length (2) and update the input
    await p.classifyPoint(200, 160);

    // After classification, the kInput value should have been adjusted to '2'
    const kVal = await p.getKValue();
    expect(Number(kVal)).toBe(2);

    // Info should reflect K=2 in the neighbors section
    const infoText5 = await p.getInfoText();
    expect(infoText).toContain('K=2');

    // There should be 2 neighbors listed
    const neighborCount2 = await p.getNeighborCountInInfo();
    expect(neighborCount).toBe(2);
  });

  test('Clear All Points resets the canvas and UI state; reset classified cancels classification', async ({ page }) => {
    const p6 = new KNNPage(page);

    // Add points and classify
    await p.selectClass('red');
    await p.addTrainingPoint(60, 200);
    await p.selectClass('blue');
    await p.addTrainingPoint(250, 220);
    await p.classifyPoint(70, 205);

    // Ensure classified state exists
    let infoText6 = await p.getInfoText();
    expect(infoText.toLowerCase()).toContain('predicted class');

    // Use resetClassifyBtn to remove classified point only
    await p.clickResetClassify();
    infoText = await p.getInfoText();
    expect(infoText).toMatch(/Click on the canvas to add points/i);
    expect(await p.isResetDisabled()).toBe(true);

    // Re-classify and then clear all points
    await p.classifyPoint(70, 205);
    expect(await p.isResetDisabled()).toBe(false);

    // Click clear all points
    await p.clickClear();
    // After clearing, info should return to default, and reset button disabled
    const afterClearText = await p.getInfoText();
    expect(afterClearText).toMatch(/Click on the canvas to add points/i);
    expect(await p.isResetDisabled()).toBe(true);
  });
});