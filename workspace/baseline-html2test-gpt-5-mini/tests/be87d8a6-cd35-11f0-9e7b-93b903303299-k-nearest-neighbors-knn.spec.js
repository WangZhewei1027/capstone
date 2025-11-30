import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be87d8a6-cd35-11f0-9e7b-93b903303299.html';

// Page object for interacting with the KNN demo
class KNNPage {
  constructor(page) {
    this.page = page;
    // selectors
    this.canvasSel = '#canvas';
    this.modeSel = '#mode';
    this.classSelectSel = '#classSelect';
    this.addClassBtnSel = '#addClassBtn';
    this.legendSel = '#legend';
    this.kRangeSel = '#kRange';
    this.kValSel = '#kVal';
    this.resRangeSel = '#resolution';
    this.resValSel = '#resVal';
    this.metricSel = '#metric';
    this.weightedSel = '#weighted';
    this.showNeighborsSel = '#showNeighbors';
    this.clearBtnSel = '#clearBtn';
    this.undoBtnSel = '#undoBtn';
    this.randomBtnSel = '#randomBtn';
    this.gridBtnSel = '#gridBtn';
    this.showBoundBtnSel = '#showBoundBtn';
    this.queryInfoSel = '#queryInfo';
    this.predictionSel = '#prediction';
    this.neighborsInfoSel = '#neighborsInfo';
  }

  // Wait for the app to be ready
  async waitForReady() {
    await this.page.waitForSelector(this.canvasSel);
    await this.page.waitForSelector(this.classSelectSel);
    // ensure initial DOM values are rendered
    await this.page.waitForSelector(this.kValSel);
    await this.page.waitForSelector(this.resValSel);
  }

  // click the canvas at coordinates relative to top-left of canvas
  // x,y are in canvas coordinate space (0..width, 0..height)
  async clickCanvasAt(x, y) {
    const canvas = await this.page.$(this.canvasSel);
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas bounding box not found');
    const clickX = box.x + x;
    const clickY = box.y + y;
    await this.page.mouse.click(clickX, clickY);
  }

  // change mode select
  async setMode(modeValue) {
    await this.page.selectOption(this.modeSel, modeValue);
  }

  // select a class by visible index (0-based) or id value
  async selectClassByIndex(idx) {
    const options = await this.page.$$(this.classSelectSel + ' option');
    if (idx < 0 || idx >= options.length) throw new Error('classSelect index out of range');
    const value = await options[idx].getAttribute('value');
    await this.page.selectOption(this.classSelectSel, value);
  }

  async getClassOptionsCount() {
    return this.page.$$eval(this.classSelectSel + ' option', opts => opts.length);
  }

  async getLegendItemCount() {
    return this.page.$$eval(this.legendSel + ' .legend-item', items => items.length);
  }

  async getKValText() {
    return this.page.$eval(this.kValSel, el => el.textContent.trim());
  }

  async setKRange(value) {
    await this.page.fill(this.kRangeSel, String(value));
    // fire input event manually via evaluation to ensure listeners fire (some browsers ignore fill for range)
    await this.page.$eval(this.kRangeSel, (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, String(value));
  }

  async getResValText() {
    return this.page.$eval(this.resValSel, el => el.textContent.trim());
  }

  async setResolution(value) {
    await this.page.fill(this.resRangeSel, String(value));
    await this.page.$eval(this.resRangeSel, (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, String(value));
  }

  async toggleWeighted(checked) {
    const isChecked = await this.page.$eval(this.weightedSel, el => el.checked);
    if (isChecked !== checked) {
      await this.page.click(this.weightedSel);
    }
  }

  async changeMetric(metricValue) {
    await this.page.selectOption(this.metricSel, metricValue);
  }

  async clickButton(selector) {
    await this.page.click(selector);
  }

  async getQueryInfoText() {
    return this.page.$eval(this.queryInfoSel, el => el.textContent.trim());
  }

  async getPredictionText() {
    return this.page.$eval(this.predictionSel, el => el.textContent.trim());
  }

  async getNeighborsInfoText() {
    return this.page.$eval(this.neighborsInfoSel, el => el.textContent);
  }

  // Click "Add class" button and handle two prompt dialogs (name & color)
  async addClassViaPrompts(name, color) {
    // prepare a dialog handler that responds to the two prompts in order
    let call = 0;
    this.page.once('dialog', async dialog => {
      // first dialog: New class label
      await dialog.accept(name);
      call++;
      // attach handler for second prompt
      this.page.once('dialog', async dialog2 => {
        await dialog2.accept(color);
        call++;
      });
    });
    await this.page.click(this.addClassBtnSel);
    // wait briefly to allow DOM update
    await this.page.waitForTimeout(200);
    // ensure both prompts were handled (call == 2) - cannot directly assert here, caller will observe new option
  }
}

test.describe('K-Nearest Neighbors (KNN) Interactive Demo - End-to-End', () => {
  test.beforeEach(async ({ page }) => {
    // capture console messages and page errors for assertions in tests
    page.context()._consoleMessages = [];
    page.context()._pageErrors = [];

    page.on('console', msg => {
      // store console messages for later inspection
      page.context()._consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      page.context()._pageErrors.push(err);
    });

    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async ({ page }) => {
    // after each test we assert there were no runtime page errors thrown
    const pageErrors = page.context()._pageErrors || [];
    expect(pageErrors).toHaveLength(0);
    // also ensure there are no console messages of type 'error' coming from the page
    const consoleErrors = (page.context()._consoleMessages || []).filter(m => m.type === 'error' || m.type === 'warning');
    expect(consoleErrors).toHaveLength(0);
  });

  test('Initial load: UI elements and default state are present', async ({ page }) => {
    // Purpose: verify initial DOM and default values on page load
    const app = new KNNPage(page);
    await app.waitForReady();

    // Check heading exists and text content
    const heading = await page.$('h1');
    expect(heading).not.toBeNull();
    const headingText = await heading.textContent();
    expect(headingText).toContain('K-Nearest Neighbors (KNN)');

    // Canvas should be present with expected dimensions
    const canvas1 = await page.$('#canvas1');
    expect(canvas).not.toBeNull();
    const box1 = await canvas.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(700); // roughly 760 px
    expect(box.height).toBeGreaterThanOrEqual(400); // roughly 500 px

    // Default classes: the HTML script adds two initial classes
    const classCount = await app.getClassOptionsCount();
    expect(classCount).toBeGreaterThanOrEqual(2);

    // legend items reflect classes
    const legendCount = await app.getLegendItemCount();
    expect(legendCount).toBeGreaterThanOrEqual(2);

    // default K value is shown and matches the range default (5)
    const kVal = await app.getKValText();
    expect(kVal).toBe('5');

    // default resolution shown
    const resVal = await app.getResValText();
    expect(resVal).toBe('8');

    // Query & prediction initial state
    const qText = await app.getQueryInfoText();
    expect(qText).toBe('none');
    const predText = await app.getPredictionText();
    expect(predText).toBe('—');
  });

  test('Add a point and classify at same location yields that class prediction', async ({ page }) => {
    // Purpose: verify adding a point (Add mode) and classifying at same coords returns that class
    const app1 = new KNNPage(page);
    await app.waitForReady();

    // Ensure in 'add' mode (default)
    await app.setMode('add');

    // Select first class (index 0)
    await app.selectClassByIndex(0);

    // Add a point at canvas coordinates (100, 100)
    await app.clickCanvasAt(100, 100);

    // Switch to classify mode and click at same location
    await app.setMode('classify');
    await app.clickCanvasAt(100, 100);

    // After classification, prediction text should be the class label of the chosen class
    // Get the first legend label text to compare
    const firstLegendLabel = await page.$eval('#legend .legend-item div:nth-child(2)', el => el.textContent.trim());
    const prediction = await app.getPredictionText();
    expect(prediction).toBe(firstLegendLabel);

    // neighborsInfo should contain text about neighbors distances or votes
    const neighborsInfo = await app.getNeighborsInfoText();
    expect(neighborsInfo).toMatch(/Neighbors distances|Votes/);
  });

  test('Erase nearest point removes the point and classification returns no data', async ({ page }) => {
    // Purpose: verify erase mode removes nearest point, causing no-data prediction
    const app2 = new KNNPage(page);
    await app.waitForReady();

    // Ensure Add mode, add a point near (150,150)
    await app.setMode('add');
    await app.selectClassByIndex(0);
    await app.clickCanvasAt(150, 150);

    // Now erase: switch to erase mode and click roughly same spot
    await app.setMode('erase');
    await app.clickCanvasAt(152, 148);

    // Switch to classify mode and query at same spot -> should report 'no data'
    await app.setMode('classify');
    await app.clickCanvasAt(150, 150);

    const prediction1 = await app.getPredictionText();
    // If there are no points remaining the script sets prediction to 'no data'
    expect(prediction).toBe('no data');
  });

  test('Clear all and undo restore points via UI actions', async ({ page }) => {
    // Purpose: ensure clear and undo operate as intended
    const app3 = new KNNPage(page);
    await app.waitForReady();

    // Add a point at (200,200)
    await app.setMode('add');
    await app.selectClassByIndex(0);
    await app.clickCanvasAt(200, 200);

    // Add another point at (220,220)
    await app.clickCanvasAt(220, 220);

    // Clear all
    await app.clickButton(app.clearBtnSel);

    // After clearing, classifying at previous location should show 'no data'
    await app.setMode('classify');
    await app.clickCanvasAt(200, 200);
    let prediction2 = await app.getPredictionText();
    expect(prediction).toBe('no data');

    // Undo should restore points
    await app.clickButton(app.undoBtnSel);

    // Classify at same location should now yield a class label (not 'no data' or '—')
    await app.clickCanvasAt(200, 200);
    prediction = await app.getPredictionText();
    expect(prediction).not.toBe('no data');
    expect(prediction).not.toBe('—');
  });

  test('K slider updates k value display and recompute boundary button triggers re-render', async ({ page }) => {
    // Purpose: verify K slider UI updates and boundary recompute button triggers app handlers without errors
    const app4 = new KNNPage(page);
    await app.waitForReady();

    // Change K to 7 and ensure displayed value updates
    await app.setKRange(7);
    // wait briefly for throttled handlers to settle
    await page.waitForTimeout(200);
    let kVal1 = await app.getKValText();
    expect(kVal).toBe('7');

    // Change resolution and ensure displayed value updates
    await app.setResolution(12);
    await page.waitForTimeout(200);
    let resVal1 = await app.getResValText();
    expect(resVal).toBe('12');

    // Click Recompute boundary button; we assert it runs without throwing page errors (handled in afterEach)
    await app.clickButton(app.showBoundBtnSel);
    // give the page a moment to recompute
    await page.waitForTimeout(200);
  });

  test('Toggle distance-weighted and change metric reflect in controls', async ({ page }) => {
    // Purpose: verify toggles and selects reflect user changes
    const app5 = new KNNPage(page);
    await app.waitForReady();

    // Toggle weighted on
    await app.toggleWeighted(true);
    const weightedChecked = await page.$eval(app.weightedSel, el => el.checked);
    expect(weightedChecked).toBeTruthy();

    // Change metric to manhattan
    await app.changeMetric('manhattan');
    const metricVal = await page.$eval(app.metricSel, el => el.value);
    expect(metricVal).toBe('manhattan');

    // Change metric back to euclidean
    await app.changeMetric('euclidean');
    const metricVal2 = await page.$eval(app.metricSel, el => el.value);
    expect(metricVal2).toBe('euclidean');
  });

  test('Add class via prompts updates class select and legend', async ({ page }) => {
    // Purpose: test the Add class flow which uses prompt dialogs, and ensure the UI updates
    const app6 = new KNNPage(page);
    await app.waitForReady();

    const initialCount = await app.getClassOptionsCount();
    const initialLegend = await app.getLegendItemCount();

    // Prepare to handle two prompt dialogs: name then color
    let dialogCalls = 0;
    page.once('dialog', async dialog => {
      // first prompt: name
      expect(dialog.message()).toContain('New class label');
      await dialog.accept('TestClassX');
      dialogCalls++;
      page.once('dialog', async dialog2 => {
        // second prompt: color
        expect(dialog2.message()).toContain('Color');
        await dialog2.accept('#123456');
        dialogCalls++;
      });
    });

    // Click the add class button
    await page.click(app.addClassBtnSel);

    // wait a short time for DOM update
    await page.waitForTimeout(300);

    const newCount = await app.getClassOptionsCount();
    const newLegend = await app.getLegendItemCount();

    expect(newCount).toBe(initialCount + 1);
    expect(newLegend).toBe(initialLegend + 1);

    // ensure at least one dialog sequence occurred
    expect(dialogCalls).toBeGreaterThanOrEqual(1);
  });

  test('Generate quick grid demo and perform classification on different regions', async ({ page }) => {
    // Purpose: ensure quick demo generates points and classification returns some label
    const app7 = new KNNPage(page);
    await app.waitForReady();

    // Click quick demo (grid)
    await app.clickButton(app.gridBtnSel);

    // Wait for DOM updates and drawing
    await page.waitForTimeout(300);

    // Switch to classify and query on left side (x ~ 80)
    await app.setMode('classify');
    await app.clickCanvasAt(80, 250);
    const predLeft = await app.getPredictionText();
    expect(predLeft).not.toBe('no data');
    expect(predLeft).not.toBe('—');

    // Query on right side (x ~ 680)
    await app.clickCanvasAt(680, 250);
    const predRight = await app.getPredictionText();
    expect(predRight).not.toBe('no data');
    expect(predRight).not.toBe('—');

    // It's plausible left and right predictions differ in a quick demo; at least ensure they both return labels
    expect(predLeft.length).toBeGreaterThan(0);
    expect(predRight.length).toBeGreaterThan(0);
  });

  test('Random clusters button populates points and the page remains error-free', async ({ page }) => {
    // Purpose: clicking Random clusters should populate points and not throw errors
    const app8 = new KNNPage(page);
    await app.waitForReady();

    // Click random clusters
    await app.clickButton(app.randomBtnSel);

    // Wait for generation and rendering
    await page.waitForTimeout(400);

    // Switch to classify and query somewhere to ensure there is some data
    await app.setMode('classify');
    await app.clickCanvasAt(320, 240);
    const pred = await app.getPredictionText();
    // Since random generation uses at least some clusters, classification should not be 'no data'
    expect(pred).not.toBe('no data');
  });

  test('Keyboard shortcut (Ctrl/Cmd+Z) triggers undo action', async ({ page, browserName }) => {
    // Purpose: ensure keyboard undo shortcut is handled by the page
    const app9 = new KNNPage(page);
    await app.waitForReady();

    // Add a point at (300,300)
    await app.setMode('add');
    await app.selectClassByIndex(0);
    await app.clickCanvasAt(300, 300);

    // Verify classification at that spot yields a label
    await app.setMode('classify');
    await app.clickCanvasAt(300, 300);
    let pred1 = await app.getPredictionText();
    expect(pred).not.toBe('no data');
    expect(pred).not.toBe('—');

    // Undo via keyboard: Ctrl+Z on Windows/Linux, Meta+Z on Mac
    const isMac = process.platform === 'darwin';
    if (isMac) {
      await page.keyboard.down('Meta');
      await page.keyboard.press('KeyZ');
      await page.keyboard.up('Meta');
    } else {
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyZ');
      await page.keyboard.up('Control');
    }

    // Wait briefly for undo to take effect
    await page.waitForTimeout(200);

    // Classify again at same spot -> should be 'no data' because we undid the add
    await app.clickCanvasAt(300, 300);
    pred = await app.getPredictionText();
    expect(pred).toBe('no data');
  });
});