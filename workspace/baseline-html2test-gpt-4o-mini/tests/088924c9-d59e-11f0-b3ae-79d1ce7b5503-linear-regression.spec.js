import { test, expect } from '@playwright/test';

// Page Object for the Linear Regression Demo page
class LinearRegressionPage {
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/088924c9-d59e-11f0-b3ae-79d1ce7b5503.html';
    this.input = page.locator('#xValue');
    this.addButton = page.locator('button', { hasText: 'Add Point' });
    this.canvas = page.locator('#linearRegressionCanvas');
    this.equation = page.locator('#equation');
    this.title = page.locator('h1');
    this.label = page.locator('label[for="xValue"]');
  }

  // Navigate to the page
  async goto() {
    await this.page.goto(this.url);
  }

  // Fill the x input and click the Add Point button
  async addPoint(xValue) {
    // If xValue is undefined we intentionally do not fill the input to test empty behavior
    if (typeof xValue !== 'undefined') {
      await this.input.fill(String(xValue));
    } else {
      await this.input.fill(''); // ensure empty string
    }
    await this.addButton.click();
  }

  // Retrieve equation text shown on the page
  async getEquationText() {
    return (await this.equation.textContent())?.trim() ?? '';
  }

  // Get the canvas data URL for pixel-change checks
  async getCanvasDataURL() {
    return await this.page.evaluate(() => {
      const c = document.getElementById('linearRegressionCanvas');
      return c.toDataURL();
    });
  }

  // Read the global points array defined by the page script
  async getPointsArray() {
    return await this.page.evaluate(() => {
      // points is declared in the page as a top-level const; return a shallow copy
      return window.points ? window.points.slice() : null;
    });
  }
}

test.describe('Linear Regression Demo - 088924c9-d59e-11f0-b3ae-79d1ce7b5503', () => {

  // Test initial page load and default state
  test('Initial load shows heading, labeled input, add button, canvas, and empty equation', async ({ page }) => {
    // Capture console errors and page errors that might occur during load
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    const lr = new LinearRegressionPage(page);
    await lr.goto();

    // Verify visible elements and content
    await expect(lr.title).toHaveText('Linear Regression Demo');
    await expect(lr.label).toHaveText(/Enter X value/i);
    await expect(lr.input).toBeVisible();
    await expect(lr.addButton).toBeVisible();
    await expect(lr.canvas).toBeVisible();

    // On initial load the equation should be empty (no regression computed yet)
    const eqText = await lr.getEquationText();
    expect(eqText).toBe('', 'Expected equation element to be empty on initial load');

    // Assert that no console errors or page errors occurred during load
    expect(pageErrors).toEqual([], `Expected no page errors during load but found: ${pageErrors.join('; ')}`);
    expect(consoleErrors).toEqual([], `Expected no console errors during load but found: ${consoleErrors.join('; ')}`);
  });

  // Test adding a single point: regression uses fallback when fewer than 2 points
  test('Adding a single point updates equation to "y = 0.00x + 0.00" and canvas changes', async ({ page }) => {
    const consoleErrors1 = [];
    const pageErrors1 = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    const lr1 = new LinearRegressionPage(page);
    await lr.goto();

    // Capture canvas before adding a point
    const beforeDataURL = await lr.getCanvasDataURL();

    // Add a single point with x = 5
    await lr.addPoint(5);

    // After adding one point, calculation returns slope=0 and intercept=0 per implementation when n<2
    const eqText1 = await lr.getEquationText();
    expect(eqText).toBe('y = 0.00x + 0.00', 'Expected single-point regression to fall back to zeros');

    // Ensure canvas has been redrawn (data URL should change after drawing)
    const afterDataURL = await lr.getCanvasDataURL();
    expect(afterDataURL).not.toBe(beforeDataURL);

    // Also assert the global points array has exactly 1 element with x equal to 5
    const points = await lr.getPointsArray();
    expect(points).not.toBeNull();
    expect(points.length).toBeGreaterThanOrEqual(1);
    expect(points[points.length - 1].x).toBe(5);

    // No console or page errors expected
    expect(pageErrors).toEqual([], `Page errors occurred: ${pageErrors.join('; ')}`);
    expect(consoleErrors).toEqual([], `Console errors occurred: ${consoleErrors.join('; ')}`);
  });

  // Test adding two points: equation updates to a numeric slope/intercept and canvas changes
  test('Adding two points updates equation format and canvas reflects drawing', async ({ page }) => {
    const consoleErrors2 = [];
    const pageErrors2 = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    const lr2 = new LinearRegressionPage(page);
    await lr.goto();

    // Reset input and ensure canvas snapshot baseline
    const baseline = await lr.getCanvasDataURL();

    // Add two points with distinct X values
    await lr.addPoint(10);
    // Wait briefly to ensure the first rendering completes (DOM updates are synchronous here, but be defensive)
    await page.waitForTimeout(50);
    await lr.addPoint(20);
    await page.waitForTimeout(50);

    // Equation should update; it is formatted with two decimal places
    const eqText2 = await lr.getEquationText();
    // Validate format: y = <num.xx>x + <num.xx> (intercept may be negative, which will appear as "+ -X.XX")
    const eqPattern = /^y = [-+]?\d+\.\d{2}x \+ [-+]?\d+\.\d{2}$/;
    expect(eqPattern.test(eqText)).toBeTruthy();

    // Ensure canvas changed from baseline after two draws
    const after = await lr.getCanvasDataURL();
    expect(after).not.toBe(baseline);

    // Ensure there are at least two points recorded globally
    const points1 = await lr.getPointsArray();
    expect(points.length).toBeGreaterThanOrEqual(2);

    // No console or page errors expected
    expect(pageErrors).toEqual([], `Page errors occurred: ${pageErrors.join('; ')}`);
    expect(consoleErrors).toEqual([], `Console errors occurred: ${consoleErrors.join('; ')}`);
  });

  // Test edge case: empty input (should be treated as Number('') === 0 based on implementation)
  test('Empty input is treated as 0 and a point is added with x = 0', async ({ page }) => {
    const consoleErrors3 = [];
    const pageErrors3 = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    const lr3 = new LinearRegressionPage(page);
    await lr.goto();

    // Ensure input is empty then click Add Point
    await lr.input.fill('');
    await lr.addButton.click();

    // When adding with empty input, x should be coerced to 0 by Number('')
    const points2 = await lr.getPointsArray();
    expect(points.length).toBeGreaterThanOrEqual(1);
    const last = points[points.length - 1];
    expect(last.x).toBe(0);

    // For a single point the equation will be the zero-default
    const eqText3 = await lr.getEquationText();
    expect(eqText).toBe('y = 0.00x + 0.00');

    // No console or page errors expected
    expect(pageErrors).toEqual([], `Page errors occurred: ${pageErrors.join('; ')}`);
    expect(consoleErrors).toEqual([], `Console errors occurred: ${consoleErrors.join('; ')}`);
  });

  // Accessibility and label association check + ensure no runtime errors during interactions
  test('Label is associated with input and interactions produce no runtime errors', async ({ page }) => {
    // Collect console and page errors that might occur during the entire flow of this test
    const consoleErrors4 = [];
    const pageErrors4 = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    const lr4 = new LinearRegressionPage(page);
    await lr.goto();

    // Check that label is correctly associated with the input via for/id
    const labelFor = await page.locator('label[for="xValue"]').getAttribute('for');
    expect(labelFor).toBe('xValue');

    // Use keyboard accessibility to focus input and add a point via keyboard (Enter triggers nothing; use click)
    await lr.input.focus();
    await lr.input.fill('15');
    await lr.addButton.click();

    // Verify equation updates (single point yields zero coefficients)
    const eqText4 = await lr.getEquationText();
    expect(eqText.length).toBeGreaterThan(0);

    // Ensure no captured runtime errors
    expect(pageErrors).toEqual([], `Page errors occurred during accessibility interaction: ${pageErrors.join('; ')}`);
    expect(consoleErrors).toEqual([], `Console errors occurred during accessibility interaction: ${consoleErrors.join('; ')}`);
  });

});