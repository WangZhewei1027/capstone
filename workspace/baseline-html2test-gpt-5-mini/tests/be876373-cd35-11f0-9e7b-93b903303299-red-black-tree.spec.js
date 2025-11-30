import { test, expect } from '@playwright/test';

// Test file: be876373-cd35-11f0-9e7b-93b903303299-red-black-tree.spec.js
// Target URL:
const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be876373-cd35-11f0-9e7b-93b903303299.html';

// Page object encapsulating key UI interactions and selectors for the Red-Black Tree demo
class RBDemoPage {
  constructor(page) {
    this.page = page;
    this.header = page.locator('header h1');
    this.valueInput = page.locator('#valueInput');
    this.insertBtn = page.locator('#insertBtn');
    this.randomBtn = page.locator('#randomBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.prevBtn = page.locator('#prevStep');
    this.nextBtn = page.locator('#nextStep');
    this.playPauseBtn = page.locator('#playPause');
    this.speedInput = page.locator('#speed');
    this.stepsPanel = page.locator('#stepsPanel');
    this.stepDesc = page.locator('#stepDesc');
    this.svgRoot = page.locator('#svgRoot');
    this.treeSize = page.locator('#treeSize');
    this.propsStatus = page.locator('#propsStatus');
    this.stepItems = page.locator('.stepItem');
    this.activeStepItem = page.locator('.stepItem.active');
  }

  // Insert a value using the input and Insert button
  async insertValue(val) {
    await this.valueInput.fill(String(val));
    await this.insertBtn.click();
  }

  // Insert a value by simulating Enter key on the input
  async insertValueByEnter(val) {
    await this.valueInput.fill(String(val));
    await this.valueInput.press('Enter');
  }

  // Click random insert
  async insertRandom() {
    await this.randomBtn.click();
  }

  // Clear the tree
  async clear() {
    await this.clearBtn.click();
  }

  // Click prev/next/play controls
  async clickPrev() { await this.prevBtn.click(); }
  async clickNext() { await this.nextBtn.click(); }
  async clickPlayPause() { await this.playPauseBtn.click(); }

  // Read the SVG node labels (text elements) as an array of strings
  async getSvgNodeLabels() {
    // Select text nodes inside svg that correspond to node labels (class nodeLabel)
    return await this.svgRoot.locator('text.nodeLabel').allTextContents();
  }

  // Read first (or only) circle fill color attribute
  async getFirstNodeFill() {
    const circle = this.svgRoot.locator('circle').first();
    return await circle.getAttribute('fill');
  }

  // Count step items
  async stepCount() {
    return await this.stepItems.count();
  }

  // Get current active step index (1-based from label "N. description")
  async activeStepIndex() {
    const txt = await this.activeStepItem.textContent();
    if (!txt) return null;
    const m = txt.trim().match(/^(\d+)\./);
    return m ? Number(m[1]) : null;
  }
}

test.describe('Interactive Red-Black Tree — Insertion Visualizer', () => {
  // We capture console messages and page errors to assert the page runs cleanly.
  let consoleMessages = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages and page errors
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      // store the Error object for assertions later
      pageErrors.push(err);
    });

    // Navigate to the app page
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    // After each test we expect there are no uncaught page errors (ReferenceError/SyntaxError/TypeError etc.)
    // This assertion documents whether runtime errors occurred during the test.
    expect(pageErrors.length, `Expected no page errors, but found: ${pageErrors.map(e => String(e)).join(' | ')}`).toBe(0);
  });

  test('Initial page load displays header, initial snapshot and empty tree state', async ({ page }) => {
    const app = new RBDemoPage(page);

    // Verify header text is present
    await expect(app.header).toHaveText('Red-Black Tree — Interactive Insertion Visualizer');

    // Initial step should have been created: steps panel should contain at least one item
    await expect(app.stepsPanel).toBeVisible();
    const initialSteps = await app.stepCount();
    expect(initialSteps).toBeGreaterThanOrEqual(1);

    // The initial step description should indicate "Initial empty tree"
    await expect(app.stepDesc).toHaveText('Initial empty tree');

    // SVG should indicate an empty tree message
    await expect(app.svgRoot).toBeVisible();
    // Look for the Empty tree text node inside the svg
    const emptyText = app.svgRoot.locator('text', { hasText: 'Empty tree' });
    await expect(emptyText).toBeVisible();

    // Tree size should be 0 and propsStatus should indicate tree is empty
    await expect(app.treeSize).toHaveText('0');
    await expect(app.propsStatus).toContainText('Tree is empty');

    // No uncaught page errors produced during initial load
    expect(pageErrors.length).toBe(0);
  });

  test('Inserting a value via Insert button creates steps, updates tree size and renders node in SVG', async ({ page }) => {
    const app1 = new RBDemoPage(page);

    // Insert the value 10 using the input + Insert button
    await app.insertValue(10);

    // After insertion, there should be multiple steps recorded (at least 2-3)
    const stepsAfter = await app.stepCount();
    expect(stepsAfter).toBeGreaterThanOrEqual(2);

    // The final step description should state insertion complete for 10
    await expect(app.stepDesc).toHaveText(/Insertion of 10 complete\.?/);

    // The SVG should now render a node label "10"
    const labels = await app.getSvgNodeLabels();
    expect(labels).toContain('10');

    // The displayed tree size should have incremented to "1"
    await expect(app.treeSize).toHaveText('1');

    // Final node (root) should be colored black (fill '#111827') per implementation ensuring root black
    const fill = await app.getFirstNodeFill();
    expect(fill).toBe('#111827');

    // The propsStatus should indicate properties are satisfied for a single-node tree
    await expect(app.propsStatus).toContainText('All Red-Black properties satisfied');

    // No uncaught page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Inserting a duplicate value does not increase node count and records an appropriate step', async ({ page }) => {
    const app2 = new RBDemoPage(page);

    // Insert a value 42
    await app.insertValue(42);
    await expect(app.treeSize).toHaveText('1');

    // Insert the same value again
    await app.insertValue(42);

    // The last step description should indicate the value already exists — snapshot added
    await expect(app.stepDesc).toContainText(/already exists/);

    // Tree size should remain 1
    await expect(app.treeSize).toHaveText('1');

    // No uncaught page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Keyboard Enter on input triggers insertion (Enter key support)', async ({ page }) => {
    const app3 = new RBDemoPage(page);

    // Clear any existing tree to have deterministic behavior
    await app.clear();
    await expect(app.treeSize).toHaveText('0');

    // Insert via Enter key
    await app.insertValueByEnter(7);

    // Final step should indicate insertion complete
    await expect(app.stepDesc).toHaveText(/Insertion of 7 complete\.?/);

    // Tree size should be 1
    await expect(app.treeSize).toHaveText('1');

    // No uncaught page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Prev and Next buttons navigate recorded steps and update active step highlight', async ({ page }) => {
    const app4 = new RBDemoPage(page);

    // Clear and insert a few values to ensure multiple steps exist
    await app.clear();
    await app.insertValue(15);
    await app.insertValue(10);
    await app.insertValue(20);

    // Ensure there are at least 3 step items
    const totalSteps = await app.stepCount();
    expect(totalSteps).toBeGreaterThanOrEqual(3);

    // Active step index should equal the last step number initially
    const activeInitial = await app.activeStepIndex();
    expect(activeInitial).toBeGreaterThanOrEqual(1);
    expect(activeInitial).toBe(totalSteps);

    // Click Prev to go back one step
    await app.clickPrev();

    const activeAfterPrev = await app.activeStepIndex();
    expect(activeAfterPrev).toBe(activeInitial - 1);

    // Click Next to go forward again
    await app.clickNext();

    const activeAfterNext = await app.activeStepIndex();
    expect(activeAfterNext).toBe(activeInitial);

    // Programmatic click on a step item should jump to that step
    // Click the first step item
    const firstStep = app.stepItems.nth(0);
    await firstStep.click();
    const activeNow = await app.activeStepIndex();
    expect(activeNow).toBe(1);

    // No uncaught page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Play/Pause toggles playback UI and respects speed control (basic toggle behavior)', async ({ page }) => {
    const app5 = new RBDemoPage(page);

    // Ensure some steps exist; insert a value if necessary
    await app.clear();
    await app.insertValue(3);
    await app.insertValue(4);

    // Set speed to a small value to reduce waiting time
    await app.speedInput.fill('200');

    // Click Play — button text should switch to "Pause"
    await app.clickPlayPause();
    await expect(app.playPauseBtn).toHaveText('Pause');

    // Wait briefly to let the player advance at least one step
    await page.waitForTimeout(350);

    // Click Play/Pause again to stop
    await app.clickPlayPause();
    await expect(app.playPauseBtn).toHaveText('Play');

    // No uncaught page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Random insert adds node and updates tree size and steps', async ({ page }) => {
    const app6 = new RBDemoPage(page);

    // Clear first
    await app.clear();
    await expect(app.treeSize).toHaveText('0');

    // Click Insert random
    await app.insertRandom();

    // After random insertion, the tree size should be > 0 and steps list should have at least one step beyond initial
    const ts = await app.treeSize.textContent();
    const numeric = Number(ts);
    expect(numeric).toBeGreaterThanOrEqual(1);

    const stepsNow = await app.stepCount();
    expect(stepsNow).toBeGreaterThanOrEqual(2);

    // No uncaught page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Clear button empties the tree, resets steps and shows empty tree message', async ({ page }) => {
    const app7 = new RBDemoPage(page);

    // Ensure tree has content by inserting a value
    await app.insertValue(77);
    await expect(app.treeSize).toHaveText('1');

    // Click clear
    await app.clear();

    // Tree size back to 0
    await expect(app.treeSize).toHaveText('0');

    // Steps panel should be empty (no stepItems)
    const count = await app.stepCount();
    // After clear the implementation sets stepsPanel.innerHTML = '' and stepIndex = -1
    // The initial snapshot is re-rendered in renderCurrentStep; however the code calls snapshot('Initial empty tree') only at initialization.
    // Here, the stepsPanel should be empty after clear and renderCurrentStep will show no steps (so count should be 0).
    expect(count).toBe(0);

    // SVG should display the empty tree text again
    const emptyText1 = app.svgRoot.locator('text', { hasText: 'Empty tree' });
    await expect(emptyText).toBeVisible();

    // No uncaught page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Alert is shown when attempting to insert with empty input (dialog handling)', async ({ page }) => {
    const app8 = new RBDemoPage(page);

    // Ensure input is empty
    await app.valueInput.fill('');

    // Prepare to capture dialog
    let dialogMessage = null;
    page.once('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Click Insert — should trigger alert
    await app.insertBtn.click();

    // Wait briefly to ensure dialog handler ran
    await page.waitForTimeout(100);

    expect(dialogMessage).toBe('Please enter an integer value to insert.');

    // No uncaught page errors
    expect(pageErrors.length).toBe(0);
  });
});