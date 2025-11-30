import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d2d6d2-cd33-11f0-bdf9-b3d97e91273d.html';

// Test file: 20d2d6d2-cd33-11f0-bdf9-b3d97e91273d-k-nearest-neighbors-knn.spec.js
// This suite validates the interactive KNN visualization application.
// It focuses on user interactions, DOM updates, control behaviors, and observing console/page errors.

test.describe('K-Nearest Neighbors (KNN) Visualization - E2E', () => {
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    // Reset collectors
    consoleErrors = [];
    pageErrors = [];

    // Collect console error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Collect unhandled page errors
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the application page
    await page.goto(APP_URL);
    // Ensure the page loaded by waiting for a key element
    await expect(page.locator('#knnCanvas')).toBeVisible();
  });

  test.afterEach(async () => {
    // Basic sanity: ensure our collectors are arrays (helps debug if handlers not attached)
    expect(Array.isArray(consoleErrors)).toBe(true);
    expect(Array.isArray(pageErrors)).toBe(true);
  });

  test('Initial load - default UI state and accessibility', async ({ page }) => {
    // Verify page title is present
    await expect(page.locator('h1')).toHaveText('K-Nearest Neighbors (KNN) Demonstration');

    // Verify default k value is 3
    const kInput = page.locator('#kInput');
    await expect(kInput).toHaveValue('3');

    // Verify info box shows the initial instruction text
    const info = page.locator('#info');
    await expect(info).toBeVisible();
    await expect(info).toContainText('Click on canvas to add data points or query points');

    // Verify default class radio selection is 'A'
    const classARadio = page.locator('input[name="classSelect"][value="A"]');
    await expect(classARadio).toBeChecked();

    // Canvas accessibility: has aria-label
    const canvas = page.locator('#knnCanvas');
    await expect(canvas).toHaveAttribute('aria-label', 'KNN plot area');

    // Buttons exist and are visible
    await expect(page.locator('#clearDataBtn')).toBeVisible();
    await expect(page.locator('#clearQueryBtn')).toBeVisible();
    await expect(page.locator('#resetAllBtn')).toBeVisible();
  });

  test('Add data points (left click) updates info and respects selected class', async ({ page }) => {
    const canvas1 = page.locator('#knnCanvas');
    const info1 = page.locator('#info1');

    // Click on canvas to add a data point for default class A
    await canvas.click({ position: { x: 100, y: 80 } });
    await expect(info).toContainText('Added DATA point for class A');

    // Change selected class to B and add another data point
    await page.locator('input[name="classSelect"][value="B"]').click();
    await expect(page.locator('input[name="classSelect"][value="B"]')).toBeChecked();
    await canvas.click({ position: { x: 180, y: 120 } });
    await expect(info).toContainText('Added DATA point for class B');
  });

  test('Add query points with Shift+Click and info updates (no data and with data)', async ({ page }) => {
    const canvas2 = page.locator('#knnCanvas');
    const info2 = page.locator('#info2');

    // Ensure fresh state by clicking Reset All
    await page.locator('#resetAllBtn').click();
    await expect(info).toContainText('Reset all points and k.');

    // Shift+Click should add a query point even when there are no data points
    await canvas.click({ modifiers: ['Shift'], position: { x: 250, y: 140 } });
    await expect(info).toContainText('Added QUERY point');

    // Add a data point and then add another query to ensure classification path is exercised
    await page.locator('input[name="classSelect"][value="A"]').click();
    await canvas.click({ position: { x: 260, y: 150 } }); // data point A
    await expect(info).toContainText('Added DATA point for class A');

    // Add a query point which should trigger classification (internally)
    await canvas.click({ modifiers: ['Shift'], position: { x: 255, y: 145 } });
    await expect(info).toContainText('Added QUERY point');
  });

  test('k input is constrained based on number of data points', async ({ page }) => {
    const canvas3 = page.locator('#knnCanvas');
    const kInput1 = page.locator('#kInput1');
    const info3 = page.locator('#info3');

    // Reset to ensure no data
    await page.locator('#resetAllBtn').click();
    await expect(info).toContainText('Reset all points and k.');
    await expect(kInput).toHaveValue('3'); // default restored

    // Add a single data point
    await canvas.click({ position: { x: 100, y: 60 } });
    await expect(info).toContainText('Added DATA point');

    // Try to set k to 10 - handler should cap it to maxK = dataPoints.length = 1
    await kInput.fill('10');
    // Trigger input event (fill triggers it), wait for JS to react
    await page.waitForTimeout(100); // small wait for event handlers to run
    await expect(kInput).toHaveValue('1');

    // Add another data point
    await canvas.click({ position: { x: 120, y: 80 } });
    await expect(info).toContainText('Added DATA point');

    // Now attempt to set k to 5; should cap to 2 (number of data points)
    await kInput.fill('5');
    await page.waitForTimeout(100);
    await expect(kInput).toHaveValue('2');
  });

  test('Clear buttons and reset behave as expected', async ({ page }) => {
    const canvas4 = page.locator('#knnCanvas');
    const info4 = page.locator('#info4');

    // Add data and query points
    await page.locator('input[name="classSelect"][value="A"]').click();
    await canvas.click({ position: { x: 50, y: 50 } }); // data
    await canvas.click({ modifiers: ['Shift'], position: { x: 60, y: 60 } }); // query

    // Clear query points
    await page.locator('#clearQueryBtn').click();
    await expect(info).toContainText('Cleared all query points');

    // Clear data points
    await page.locator('#clearDataBtn').click();
    await expect(info).toContainText('Cleared all data points');

    // Add a data point and then Reset All
    await canvas.click({ position: { x: 130, y: 130 } });
    await expect(info).toContainText('Added DATA point');
    await page.locator('#resetAllBtn').click();
    await expect(info).toContainText('Reset all points and k.');

    // After reset, k input should be back to 3
    await expect(page.locator('#kInput')).toHaveValue('3');
  });

  test('Observe console errors and page errors while interacting', async ({ page }) => {
    const canvas5 = page.locator('#knnCanvas');
    const info5 = page.locator('#info5');

    // Interact with the app to potentially surface runtime issues
    await canvas.click({ position: { x: 200, y: 200 } }); // add data
    await canvas.click({ modifiers: ['Shift'], position: { x: 210, y: 210 } }); // add query
    await page.locator('#clearDataBtn').click();
    await page.locator('#clearQueryBtn').click();
    await page.locator('#resetAllBtn').click();

    // Small wait to ensure any asynchronous console messages surface
    await page.waitForTimeout(200);

    // Validate that consoleErrors and pageErrors are arrays (collected)
    expect(Array.isArray(consoleErrors)).toBe(true);
    expect(Array.isArray(pageErrors)).toBe(true);

    // Assert that there were no uncaught page errors (e.g., ReferenceError/SyntaxError/TypeError)
    // If any occurred, fail the test and include the first error message for debugging.
    if (pageErrors.length > 0) {
      // Fail with a useful message
      const first = pageErrors[0];
      throw new Error(`Unhandled page error(s) detected: ${first && first.message ? first.message : String(first)}`);
    }

    // Also assert there are no console 'error' messages.
    if (consoleErrors.length > 0) {
      const first1 = consoleErrors[0];
      throw new Error(`Console error(s) detected: ${first.text || JSON.stringify(first)}`);
    }

    // If none occurred, assert info box is still showing expected content
    await expect(info).toBeVisible();
  });
});