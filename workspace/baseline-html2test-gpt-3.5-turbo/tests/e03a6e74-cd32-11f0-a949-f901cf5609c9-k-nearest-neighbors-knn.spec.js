import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e03a6e74-cd32-11f0-a949-f901cf5609c9.html';

test.describe('K-Nearest Neighbors (KNN) Interactive Demo - e03a6e74...', () => {
  // Arrays to collect console messages and page errors for each test run
  let consoleMessages = [];
  let pageErrors = [];

  // Helper page object functions to interact with the demo
  const selectors = {
    info: '#info',
    classA: '#classA',
    classB: '#classB',
    clear: '#clear',
    kInput: '#kInput',
    canvas: '#canvas',
    classifyBtn: '#classifyBtn',
    resetBtn: '#resetBtn'
  };

  // Click on the canvas at coordinates relative to its top-left
  async function clickCanvasAt(page, x, y) {
    const canvas = page.locator(selectors.canvas);
    await canvas.click({ position: { x, y } });
  }

  // Read the info text content
  async function getInfoText(page) {
    return await page.locator(selectors.info).innerText();
  }

  // Read computed style property of an element
  async function getComputedStyleProperty(page, selector, property) {
    return await page.locator(selector).evaluate((el, prop) => {
      return window.getComputedStyle(el).getPropertyValue(prop);
    }, property);
  }

  test.beforeEach(async ({ page }) => {
    // Reset collectors
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages (log/warn/error)
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the demo page
    await page.goto(BASE_URL);
    // Ensure page loaded main elements
    await expect(page.locator(selectors.canvas)).toBeVisible();
    await expect(page.locator(selectors.info)).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    // Final sanity checks per test: ensure no unexpected uncaught page errors
    // and no console messages of type 'error'.
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors, 'No console.error messages should have been emitted').toHaveLength(0);
    expect(pageErrors, 'No uncaught page errors should have occurred').toHaveLength(0);
  });

  test('Initial load: UI elements present, defaults set, and Class A active', async ({ page }) => {
    // Verify title and informational text are present
    const header = await page.locator('h1').innerText();
    expect(header).toContain('K-Nearest Neighbors');

    const infoText = await getInfoText(page);
    expect(infoText).toContain('Click on the canvas to add training points');

    // Default class should be A: classA opacity = 1, classB opacity = 0.5
    const opacityA = await getComputedStyleProperty(page, selectors.classA, 'opacity');
    const opacityB = await getComputedStyleProperty(page, selectors.classB, 'opacity');
    expect(opacityA.trim()).toBe('1');
    expect(opacityB.trim()).toBe('0.5');

    // K input default value should be 3
    const kValue = await page.locator(selectors.kInput).inputValue();
    expect(kValue).toBe('3');

    // classify button visible, reset button hidden at start
    await expect(page.locator(selectors.classifyBtn)).toBeVisible();
    await expect(page.locator(selectors.resetBtn)).not.toBeVisible();
  });

  test('Adding training points updates info text and respects current selected class', async ({ page }) => {
    // Click canvas to add point as default Class A
    await clickCanvasAt(page, 100, 80);
    let info = await getInfoText(page);
    expect(info).toMatch(/Added point to Class A\. Total points: 1/);

    // Click Class B to change current class
    await page.locator(selectors.classB).click();
    info = await getInfoText(page);
    expect(info).toContain('Current class to add: Class B');

    // Add a Class B point
    await clickCanvasAt(page, 200, 120);
    info = await getInfoText(page);
    expect(info).toMatch(/Added point to Class B\. Total points: 2/);

    // Toggle back to Class A and add another point
    await page.locator(selectors.classA).click();
    info = await getInfoText(page);
    expect(info).toContain('Current class to add: Class A');

    await clickCanvasAt(page, 120, 150);
    info = await getInfoText(page);
    expect(info).toMatch(/Added point to Class A\. Total points: 3/);
  });

  test('Clear Data button removes training points and updates UI', async ({ page }) => {
    // Add two points first
    await clickCanvasAt(page, 50, 50);
    await page.locator(selectors.classB).click();
    await clickCanvasAt(page, 60, 60);

    // Now click Clear Data
    await page.locator(selectors.clear).click();
    const info1 = await getInfoText(page);
    expect(info).toBe('All training data cleared.');

    // After clearing, classification should not be possible (classify button still visible)
    await expect(page.locator(selectors.classifyBtn)).toBeVisible();

    // K input should still be enabled (not disabled)
    await expect(page.locator(selectors.kInput)).toBeEnabled();
  });

  test('Cannot enter classify mode when there are no training points (edge case)', async ({ page }) => {
    // Ensure no points by clicking Clear
    await page.locator(selectors.clear).click();

    // Attempt to enter classify mode
    await page.locator(selectors.classifyBtn).click();
    const info2 = await getInfoText(page);
    expect(info).toBe('Add training points first before classification!');

    // classify button should remain visible and reset hidden
    await expect(page.locator(selectors.classifyBtn)).toBeVisible();
    await expect(page.locator(selectors.resetBtn)).not.toBeVisible();
  });

  test('Enter classify mode, classify a clicked point, neighbors highlighted, and reset works', async ({ page }) => {
    // Create a small dataset: two Class A near left, one Class B on right
    await page.locator(selectors.classA).click();
    await clickCanvasAt(page, 80, 100);   // A1
    await clickCanvasAt(page, 100, 110);  // A2
    await page.locator(selectors.classB).click();
    await clickCanvasAt(page, 400, 120);  // B1

    // Enter classify mode
    await page.locator(selectors.classifyBtn).click();

    // After entering classify mode, UI should change: classify hidden, reset visible, inputs disabled
    await expect(page.locator(selectors.classifyBtn)).not.toBeVisible();
    await expect(page.locator(selectors.resetBtn)).toBeVisible();
    await expect(page.locator(selectors.classA)).toBeDisabled();
    await expect(page.locator(selectors.classB)).toBeDisabled();
    await expect(page.locator(selectors.clear)).toBeDisabled();
    await expect(page.locator(selectors.kInput)).toBeDisabled();

    // Info should instruct to click on canvas to classify
    let info3 = await getInfoText(page);
    expect(info).toContain('Click anywhere on the canvas to classify a new point.');

    // Set K to 3 (default) explicitly and click near the left cluster to be classified as A
    await page.locator(selectors.kInput).evaluate((el) => { el.value = '3'; });
    await clickCanvasAt(page, 90, 105);
    info = await getInfoText(page);

    // Because the clicked point is near the two Class A points and one Class B, K=3 -> majority A
    expect(info).toMatch(/Classified point as Class A\. \(K = 3\)/);

    // Reset to editing mode
    await page.locator(selectors.resetBtn).click();
    info = await getInfoText(page);
    expect(info).toContain('Back to editing mode. Current class to add:');

    // After reset, controls should be enabled again
    await expect(page.locator(selectors.classA)).toBeEnabled();
    await expect(page.locator(selectors.classB)).toBeEnabled();
    await expect(page.locator(selectors.clear)).toBeEnabled();
    await expect(page.locator(selectors.kInput)).toBeEnabled();
    await expect(page.locator(selectors.classifyBtn)).toBeVisible();
    await expect(page.locator(selectors.resetBtn)).not.toBeVisible();
  });

  test('K input larger than dataset size is capped to dataset length during classification', async ({ page }) => {
    // Clear any data
    await page.locator(selectors.clear).click();

    // Add exactly 2 points (1 A and 1 B)
    await page.locator(selectors.classA).click();
    await clickCanvasAt(page, 50, 50);
    await page.locator(selectors.classB).click();
    await clickCanvasAt(page, 200, 50);

    // Set K to a value larger than the number of training points (e.g., 10)
    await page.locator(selectors.kInput).fill('10');

    // Enter classify mode
    await page.locator(selectors.classifyBtn).click();

    // Click somewhere to classify; internal logic should cap k to dataPoints.length (2)
    await clickCanvasAt(page, 125, 60);
    const info4 = await getInfoText(page);

    // The message should show K = 2 because there are only 2 training points
    expect(info).toMatch(/K = 2/);

    // Reset back to editing
    await page.locator(selectors.resetBtn).click();
  });

  test('UI remains stable after multiple classify/reset cycles and no console errors occur', async ({ page }) => {
    // Add some points
    await page.locator(selectors.classA).click();
    await clickCanvasAt(page, 60, 200);
    await clickCanvasAt(page, 80, 220);
    await page.locator(selectors.classB).click();
    await clickCanvasAt(page, 500, 200);

    // Perform classify and reset multiple times to ensure UI stability
    for (let i = 0; i < 3; i++) {
      await page.locator(selectors.classifyBtn).click();
      await clickCanvasAt(page, 150 + 10 * i, 150 + 5 * i);
      const info5 = await getInfoText(page);
      expect(info).toContain('Classified point as Class');
      await page.locator(selectors.resetBtn).click();
      const postInfo = await getInfoText(page);
      expect(postInfo).toContain('Back to editing mode.');
    }

    // Verify no console.error messages were emitted during these interactions
    const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});