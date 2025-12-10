import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd78d4a-d59e-11f0-ae0b-570552a0b645.html';

// Utility helper to set range input value and dispatch input event in-page
async function setRangeValue(page, selector, value) {
  await page.locator(selector).evaluate((el, v) => {
    el.value = String(v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

test.describe('K-Nearest Neighbors (KNN) Visualization - dfd78d4a-d59e-11f0-ae0b-570552a0b645', () => {
  let pageErrors = [];
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    // Reset error collectors before each test
    pageErrors = [];
    consoleErrors = [];

    // Listen for runtime page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      // collect message for assertions later
      pageErrors.push(err && err.message ? err.message : String(err));
    });

    // Listen for console messages and capture error-level console outputs
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to the application page
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    // Assert that there were no uncaught page errors or console.error messages during the test
    expect(pageErrors, `Expected no uncaught page errors, but found: ${pageErrors.join(' | ')}`).toEqual([]);
    expect(consoleErrors, `Expected no console.error messages, but found: ${consoleErrors.join(' | ')}`).toEqual([]);
  });

  // Test initial load and default state
  test('loads the page and displays default controls and values', async ({ page }) => {
    // Verify title and header exist
    await expect(page.locator('h1')).toHaveText(/K-Nearest Neighbors/i);

    // Verify sliders and displays show default values
    await expect(page.locator('#kValueDisplay')).toHaveText('3');
    await expect(page.locator('#testXDisplay')).toHaveText('250');
    await expect(page.locator('#testYDisplay')).toHaveText('250');

    // Verify buttons exist
    await expect(page.locator('#classA')).toBeVisible();
    await expect(page.locator('#classB')).toBeVisible();
    await expect(page.locator('#clear')).toBeVisible();
    await expect(page.locator('#classify')).toBeVisible();
    await expect(page.locator('#autoClassify')).toBeVisible();

    // Result div should be empty initially
    const resultText = await page.locator('#result').innerText();
    expect(resultText.trim()).toBe('');
    
    // Canvas should exist with correct size
    const canvas = page.locator('#knnCanvas');
    await expect(canvas).toBeVisible();
    const canvasSize = await canvas.evaluate((c) => ({ width: c.width, height: c.height }));
    expect(canvasSize).toEqual({ width: 500, height: 500 });
  });

  // Test switching current class buttons updates styles as expected
  test('switching current class updates button styles to indicate selection', async ({ page }) => {
    // Click Class B and verify its background style changed to the selected color
    await page.locator('#classB').click();

    // Evaluate computed background color for the buttons
    const styles = await page.evaluate(() => {
      const a = document.getElementById('classA');
      const b = document.getElementById('classB');
      const aStyle = window.getComputedStyle(a).backgroundColor;
      const bStyle = window.getComputedStyle(b).backgroundColor;
      return { aStyle, bStyle };
    });

    // When Class B selected, pressed color '#45a049' should be applied to Class B
    // computed rgb for '#45a049' is 'rgb(69, 160, 73)' in most browsers
    expect(styles.bStyle).toMatch(/rgb\(69,\s*160,\s*73\)|#45a049/i);
    // Class A should not have the pressed color when B is selected
    expect(styles.aStyle).not.toMatch(/rgb\(69,\s*160,\s*73\)|#45a049/i);

    // Now click Class A and verify it becomes selected
    await page.locator('#classA').click();
    const styles2 = await page.evaluate(() => {
      const a = document.getElementById('classA');
      const b = document.getElementById('classB');
      return { aStyle: window.getComputedStyle(a).backgroundColor, bStyle: window.getComputedStyle(b).backgroundColor };
    });
    expect(styles2.aStyle).toMatch(/rgb\(69,\s*160,\s*73\)|#45a049/i);
    expect(styles2.bStyle).not.toMatch(/rgb\(69,\s*160,\s*73\)|#45a049/i);
  });

  // Test adding points by clicking on the canvas and classification behavior
  test('adding points on canvas and classifying test point produces expected prediction and votes', async ({ page }) => {
    const canvas = page.locator('#knnCanvas');

    // Ensure we start with clear state
    await page.locator('#clear').click();
    await expect(page.locator('#result')).toHaveText('');

    // Set current class to Class A and add two nearby points around (250,250)
    await page.locator('#classA').click();
    // Click at (240, 250)
    await canvas.click({ position: { x: 240, y: 250 } });
    // Click at (260, 250)
    await canvas.click({ position: { x: 260, y: 250 } });

    // Set current class to Class B and add one farther point
    await page.locator('#classB').click();
    // Click at (400, 400)
    await canvas.click({ position: { x: 400, y: 400 } });

    // Set K value to 3 explicitly (default is 3, but set to be explicit)
    await setRangeValue(page, '#kValue', 3);
    await expect(page.locator('#kValueDisplay')).toHaveText('3');

    // Ensure test point remains at center 250,250
    await expect(page.locator('#testXDisplay')).toHaveText('250');
    await expect(page.locator('#testYDisplay')).toHaveText('250');

    // Click the classify button to classify the test point
    await page.locator('#classify').click();

    // The expected outcome is Class A (2 votes vs 1 vote)
    const resultHtml = await page.locator('#result').innerHTML();
    expect(resultHtml).toContain('Predicted Class');
    expect(resultHtml).toContain('Class A');
    expect(resultHtml).toContain('Votes: Class A = 2, Class B = 1');
  });

  // Test classification with insufficient points displays a helpful message
  test('classify with insufficient points shows a "Need at least K points" message', async ({ page }) => {
    // Clear any points
    await page.locator('#clear').click();

    // Set K to 3
    await setRangeValue(page, '#kValue', 3);
    await expect(page.locator('#kValueDisplay')).toHaveText('3');

    // Click classify - should show need at least 3 points message
    await page.locator('#classify').click();

    const text = await page.locator('#result').innerText();
    expect(text).toContain('Need at least 3 points to classify with K=3');
  });

  // Test autoClassify draws the decision boundary background onto the canvas (verify canvas content changes)
  test('autoClassifyEntireSpace draws onto the canvas (canvas has image data)', async ({ page }) => {
    const canvasHandle = await page.locator('#knnCanvas');

    // Start from clear
    await page.locator('#clear').click();

    // Add a couple of points for each class so auto-classify can run
    await page.locator('#classA').click();
    await canvasHandle.click({ position: { x: 100, y: 100 } });
    await canvasHandle.click({ position: { x: 120, y: 110 } });

    await page.locator('#classB').click();
    await canvasHandle.click({ position: { x: 400, y: 400 } });
    await canvasHandle.click({ position: { x: 380, y: 420 } });

    // Ensure we have K small enough
    await setRangeValue(page, '#kValue', 3);
    await expect(page.locator('#kValueDisplay')).toHaveText('3');

    // Call autoClassify and then get canvas data URL
    await page.locator('#autoClassify').click();

    // Use the canvas toDataURL to ensure something was drawn
    const dataUrl = await page.evaluate(() => {
      const c = document.getElementById('knnCanvas');
      try {
        return c.toDataURL();
      } catch (e) {
        return `error:${String(e)}`;
      }
    });

    // Basic validation: dataUrl starts with data:image/png;base64,
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    // Ensure length is more than a trivial amount
    expect(dataUrl.length).toBeGreaterThan(2000);
  });

  // Test clear button removes points and clears result, and subsequent actions reflect cleared state
  test('clear button removes points and clears previous classification results', async ({ page }) => {
    const canvas = page.locator('#knnCanvas');

    // Add a point to ensure there is something to clear
    await page.locator('#classA').click();
    await canvas.click({ position: { x: 50, y: 50 } });

    // Set K small and try classify -> should require at least K points (we have 1)
    await setRangeValue(page, '#kValue', 2);
    await page.locator('#classify').click();
    let txt = await page.locator('#result').innerText();
    expect(txt).toContain('Need at least 2 points to classify with K=2');

    // Now clear points
    await page.locator('#clear').click();

    // After clearing, result should be empty
    const postClear = await page.locator('#result').innerText();
    expect(postClear.trim()).toBe('');

    // Attempt autoClassify after clear should result in "need at least K points" message
    await setRangeValue(page, '#kValue', 1);
    await page.locator('#autoClassify').click();

    const afterAuto = await page.locator('#result').innerText();
    // autoClassify sets result only in error case; here error message should be displayed due to insufficient points
    expect(afterAuto).toContain('Need at least 1 points') || expect(afterAuto).toContain('Need at least 1 points to classify with K=1');
  });

  // Accessibility and DOM consistency checks
  test('interactive controls are reachable and have appropriate attributes', async ({ page }) => {
    // Ensure inputs have appropriate min/max attributes
    const kAttrs = await page.locator('#kValue').evaluate((el) => ({ min: el.min, max: el.max, value: el.value }));
    expect(kAttrs).toEqual({ min: '1', max: '15', value: '3' });

    const xAttrs = await page.locator('#testX').evaluate((el) => ({ min: el.min, max: el.max, value: el.value }));
    expect(xAttrs).toEqual({ min: '0', max: '500', value: '250' });

    const yAttrs = await page.locator('#testY').evaluate((el) => ({ min: el.min, max: el.max, value: el.value }));
    expect(yAttrs).toEqual({ min: '0', max: '500', value: '250' });

    // Buttons should be enabled
    await expect(page.locator('#classA')).toBeEnabled();
    await expect(page.locator('#classB')).toBeEnabled();
    await expect(page.locator('#clear')).toBeEnabled();
    await expect(page.locator('#classify')).toBeEnabled();
    await expect(page.locator('#autoClassify')).toBeEnabled();
  });
});