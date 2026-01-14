import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8af3bf-d59e-11f0-89ab-2f71529652ac.html';

test.describe('K-Nearest Neighbors (KNN) Demo - E2E', () => {
  // Arrays to collect runtime console messages and page errors for each test run
  let consoleMessages = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    // Reset collectors
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect uncaught page errors (ReferenceError, TypeError, etc.)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the application page
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // Intentionally assert no uncaught page errors were produced during the test.
    // This verifies the page runs without runtime exceptions like ReferenceError/TypeError/SyntaxError.
    expect(pageErrors, 'No uncaught page errors should occur').toHaveLength(0);
  });

  test('Initial page load: UI elements are visible and in expected default state', async ({ page }) => {
    // Verify the title and main elements are present
    await expect(page.locator('h1')).toHaveText('K-Nearest Neighbors (KNN) Demo');

    // Canvas should exist and have expected attributes
    const canvas = page.locator('#canvas');
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAttribute('width', '500');
    await expect(canvas).toHaveAttribute('height', '500');

    // Buttons should be visible and labeled correctly
    const addBtn = page.locator('#addPoint');
    const classifyBtn = page.locator('#classifyPoint');
    await expect(addBtn).toBeVisible();
    await expect(addBtn).toHaveText('Add Random Point');
    await expect(classifyBtn).toBeVisible();
    await expect(classifyBtn).toHaveText('Classify New Point');

    // Output div should be present and initially empty
    const output = page.locator('#output');
    await expect(output).toBeVisible();
    await expect(output).toHaveText('');

    // Confirm there were no console errors on load (collect and assert)
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length, 'No console.error messages on load').toBe(0);
  });

  test('Clicking "Add Random Point" updates the canvas drawing', async ({ page }) => {
    // Purpose: verify that clicking the Add Random Point button results in visible canvas changes.
    const canvas1 = page.locator('#canvas1');

    // Get initial canvas data URL
    const beforeDataUrl = await page.evaluate((sel) => {
      const c = document.querySelector(sel);
      return c.toDataURL();
    }, '#canvas');

    // Click the add point button
    await page.click('#addPoint');

    // Wait briefly for drawing operations to complete
    await page.waitForTimeout(150);

    // Get canvas data URL after clicking
    const afterDataUrl = await page.evaluate((sel) => {
      const c1 = document.querySelector(sel);
      return c.toDataURL();
    }, '#canvas');

    // The canvas bitmap should change after adding a point
    expect(beforeDataUrl, 'Canvas should have changed after adding a point').not.toBe(afterDataUrl);

    // Clicking again should further change the canvas
    const secondBefore = afterDataUrl;
    await page.click('#addPoint');
    await page.waitForTimeout(150);
    const secondAfter = await page.evaluate((sel) => document.querySelector(sel).toDataURL(), '#canvas');
    expect(secondBefore, 'Canvas should change after adding another point').not.toBe(secondAfter);
  });

  test('Clicking "Classify New Point" when no points exist classifies as "B" (tie/default behavior) and updates output', async ({ page }) => {
    // Purpose: verify classification behavior when there are zero existing points.
    // With no points, findNeighbors returns [], determineLabel resolves to 'B' (tie-breaker).
    const output1 = page.locator('#output1');

    // Ensure no points have been added by not clicking addPoint
    await expect(output).toHaveText('');

    // Capture canvas state before classification
    const before = await page.evaluate((sel) => document.querySelector(sel).toDataURL(), '#canvas');

    // Click classify button
    await page.click('#classifyPoint');

    // Wait briefly for drawing and DOM updates
    await page.waitForTimeout(150);

    // Output should be updated with classification result and coordinates
    const text = await output.innerText();
    expect(text).toMatch(/Classified point at \(\d+\.\d{2}, \s*\d+\.\d{2}\) as "([AB])"/);

    // Since no neighbors, algorithm returns 'B' due to count.A > count.B ? 'A' : 'B'
    expect(text).toContain('as "B"');

    // Canvas should have changed due to drawing the new classified point
    const after = await page.evaluate((sel) => document.querySelector(sel).toDataURL(), '#canvas');
    expect(before).not.toBe(after);
  });

  test('Adding points then classifying updates output and canvas, repeated classifications produce updated output', async ({ page }) => {
    // Purpose: test data flow: add a few random points (to create neighbors), then classify new points
    const output2 = page.locator('#output2');

    // Ensure starting fresh: capture initial canvas
    const initialCanvas = await page.evaluate((sel) => document.querySelector(sel).toDataURL(), '#canvas');

    // Add 5 random points to populate the dataset
    for (let i = 0; i < 5; i++) {
      await page.click('#addPoint');
      await page.waitForTimeout(100);
    }

    // After adding points, the canvas should be different from the initial
    const populatedCanvas = await page.evaluate((sel) => document.querySelector(sel).toDataURL(), '#canvas');
    expect(populatedCanvas).not.toBe(initialCanvas);

    // Click classify and verify output includes A or B and coordinates
    await page.click('#classifyPoint');
    await page.waitForTimeout(150);
    let text1 = await output.innerText();
    expect(text).toMatch(/Classified point at \(\d+\.\d{2}, \s*\d+\.\d{2}\) as "([AB])"/);

    // Save current output and canvas, then classify again to ensure it updates
    const firstClassification = text;
    const canvasAfterFirst = await page.evaluate((sel) => document.querySelector(sel).toDataURL(), '#canvas');

    // Classify again
    await page.click('#classifyPoint');
    await page.waitForTimeout(150);
    text = await output.innerText();

    // Output should change (either coordinates or label may change)
    expect(text).not.toBe(''); // ensure something present
    const canvasAfterSecond = await page.evaluate((sel) => document.querySelector(sel).toDataURL(), '#canvas');

    // At least canvas should reflect the newly drawn classification point(s)
    expect(canvasAfterSecond).not.toBe(canvasAfterFirst);
  });

  test('Accessibility and visibility checks: buttons are reachable and output is updated for screen readers', async ({ page }) => {
    // Purpose: ensure elements are visible and have accessible text (basic accessibility checks)
    const addBtn1 = page.locator('#addPoint');
    const classifyBtn1 = page.locator('#classifyPoint');
    const output3 = page.locator('#output3');

    // Buttons should be enabled and visible
    await expect(addBtn).toBeEnabled();
    await expect(classifyBtn).toBeEnabled();

    // Use keyboard to focus and activate the add button
    await addBtn.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);

    // After keyboard activation, canvas should change relative to a fresh canvas snapshot
    const canvasAfterKeyboard = await page.evaluate((sel) => document.querySelector(sel).toDataURL(), '#canvas');
    expect(canvasAfterKeyboard.length).toBeGreaterThan(0);

    // The output element is intended to show classification results; ensure it's present for assistive tech
    await expect(output).toBeVisible();
    // Trigger classification to populate it
    await classifyBtn.focus();
    await page.keyboard.press(' ');
    await page.waitForTimeout(150);
    const outText = await output.textContent();
    expect(outText).toMatch(/Classified point at \(/);
  });

  test('Console and runtime error monitoring: ensure no console.error and no uncaught page errors during interactions', async ({ page }) => {
    // Purpose: explicitly exercise interactions while monitoring console and page errors.
    // Click a sequence of operations
    await page.click('#addPoint');
    await page.waitForTimeout(80);
    await page.click('#addPoint');
    await page.waitForTimeout(80);
    await page.click('#classifyPoint');
    await page.waitForTimeout(120);

    // After interactions, assert there were no uncaught page errors
    expect(pageErrors.length, 'There should be no uncaught page errors during interactions').toBe(0);

    // Also ensure there are no console.error messages emitted
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, 'No console.error messages should have been logged').toBe(0);

    // For debugging purposes (not failing), ensure there is at least some console activity (info/log) during ops
    const infoLike = consoleMessages.filter(m => m.type === 'log' || m.type === 'info' || m.type === 'debug');
    // It's acceptable if empty, but assert the consoleMessages array exists and is an array
    expect(Array.isArray(consoleMessages)).toBe(true);
  });
});