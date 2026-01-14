import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b7bb44-d5a1-11f0-9c7a-cdf1d7a06e11.html';

// Page Object for the K-Means Clustering app
class KMeansPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#input');
    this.startButton = page.locator('#start');
    this.showButton = page.locator('#show');
    this.graph = page.locator('#graph');
    this.h1 = page.locator('h1');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async getTitle() {
    return this.page.title();
  }

  async getHeaderText() {
    return this.h1.textContent();
  }

  async getInputValue() {
    return this.input.inputValue();
  }

  async setInputValue(value) {
    await this.input.fill(String(value));
  }

  async clickStart() {
    await this.startButton.click();
  }

  async clickShow() {
    await this.showButton.click();
  }

  async graphInnerHTML() {
    return this.page.locator('#graph').innerHTML();
  }

  async graphVisible() {
    return this.graph.isVisible();
  }

  async graphComputedStyle(property) {
    return this.page.evaluate(
      (selector, prop) => {
        const el = document.querySelector(selector);
        return el ? window.getComputedStyle(el)[prop] : null;
      },
      '#graph',
      property
    );
  }
}

test.describe('K-Means Clustering App (11b7bb44-d5a1-11f0-9c7a-cdf1d7a06e11)', () => {
  // Use a fresh page for each test
  test.beforeEach(async ({ page }) => {
    // Navigate to the page exactly as-is
    await page.goto(APP_URL);
  });

  // Test initial page load and default state
  test('Page loads with expected UI elements and default state', async ({ page }) => {
    const app = new KMeansPage(page);

    // Verify page title and header
    await expect(await app.getTitle()).resolves.toBeDefined();
    expect(await app.getHeaderText()).toMatch(/K-Means Clustering/i);

    // Verify interactive elements exist
    await expect(app.input).toBeVisible();
    await expect(app.startButton).toBeVisible();
    await expect(app.showButton).toBeVisible();
    await expect(app.graph).toBeVisible();

    // Input should be empty by default
    const inputVal = await app.getInputValue();
    expect(inputVal).toBe('');

    // Graph is a div in the HTML; check computed style (should have border)
    const borderStyle = await app.graphComputedStyle('borderTopStyle');
    expect(borderStyle).toBeTruthy();

    // Graph inner HTML should be empty initially (no drawing succeeded yet)
    const inner = await app.graphInnerHTML();
    expect(inner).toBe('');
  });

  // Test that clicking the Start button clears the input and does not throw an error
  test('Clicking Start clears the input field and attempts to generate data', async ({ page }) => {
    const app1 = new KMeansPage(page);

    // Type a number into the input (this does not modify the script's internal `inputNumber` variable,
    // because the page reads the input value only on initial load).
    await app.setInputValue(3);
    expect(await app.getInputValue()).toBe('3');

    // Set up a listener to collect page errors (if any) during the Start click
    const errors = [];
    page.on('pageerror', (err) => {
      errors.push(err);
    });

    // Click Start - according to the implementation, this will clear the input value and call generateData(inputNumber)
    // where `inputNumber` was determined at load time (likely NaN). generateData will therefore not run its loop.
    await app.clickStart();

    // After clicking Start, the input should be cleared by the script
    expect(await app.getInputValue()).toBe('');

    // No unhandled page errors are expected from clicking Start in the given implementation
    // (generateData with NaN causes no loop iterations rather than throwing).
    // Allow a short pause to see if any asynchronous errors appear
    await page.waitForTimeout(200);
    expect(errors.length).toBe(0);
  });

  // Test that clicking Show triggers the drawing routine and results in a runtime error due to incorrect canvas usage
  test('Clicking Show triggers drawGraph and results in a TypeError due to using a DIV as canvas (expected failure)', async ({ page }) => {
    const app2 = new KMeansPage(page);

    // Ensure input is empty by default (so internal inputNumber is NaN)
    expect(await app.getInputValue()).toBe('');

    // Prepare to capture any alert/dialogs (the app may alert when inputNumber <= 0, but because inputNumber is NaN,
    // the comparison (NaN <= 0) is false and the alert is not expected).
    const dialogs = [];
    page.on('dialog', (d) => {
      dialogs.push(d.message());
      // Dismiss if any unexpectedly appears to avoid blocking the test
      d.dismiss().catch(() => {});
    });

    // Wait for the unhandled exception to be emitted; clicking Show should call drawGraph which attempts
    // to call canvas methods on a DIV and throw a TypeError (e.g., "ctx.clearRect is not a function").
    const [pageError] = await Promise.all([
      page.waitForEvent('pageerror'),
      app.clickShow()
    ]);

    // Assert that a page error occurred and is a TypeError
    expect(pageError).toBeTruthy();
    // The message is implementation dependent, but we expect it to reference the incorrect method usage
    const msg = String(pageError.message || pageError);
    // Lowercase it for flexible matching
    const lower = msg.toLowerCase();
    // It should mention clearRect or is not a function or similar
    expect(
      lower.includes('clearrect') ||
      lower.includes('is not a function') ||
      lower.includes('cannot read properties of') ||
      lower.includes('cannot read property')
    ).toBeTruthy();

    // There should be no alert dialog, as explained above
    expect(dialogs.length).toBe(0);

    // The graph div should remain unchanged (no successful drawing into an actual canvas)
    const innerAfter = await app.graphInnerHTML();
    expect(innerAfter).toBe('');
  });

  // Test edge case behavior: attempt to set the input before clicking Show and verify the application still errors
  test('Setting input value before clicking Show does not prevent the runtime error (inputNumber is read only at load)', async ({ page }) => {
    const app3 = new KMeansPage(page);

    // Set input to a positive integer
    await app.setInputValue(5);
    expect(await app.getInputValue()).toBe('5');

    // The page's internal `inputNumber` was computed at load time and won't reflect this change.
    // Clicking Show should still attempt drawGraph and lead to the same TypeError.
    const [pageError] = await Promise.all([
      page.waitForEvent('pageerror'),
      app.clickShow()
    ]);

    expect(pageError).toBeTruthy();
    const lower1 = String(pageError.message || pageError).toLowerCase();
    expect(
      lower.includes('clearrect') ||
      lower.includes('is not a function') ||
      lower.includes('cannot read properties of') ||
      lower.includes('cannot read property')
    ).toBeTruthy();

    // Graph content still unchanged
    expect(await app.graphInnerHTML()).toBe('');
  });

  // Accessibility and UI assertions: buttons have accessible names and input has type number
  test('Accessibility and attributes: buttons are present and input type is number', async ({ page }) => {
    const app4 = new KMeansPage(page);

    // Buttons should have accessible names (text content)
    await expect(app.startButton).toHaveText(/Start Clustering/i);
    await expect(app.showButton).toHaveText(/Show Graph/i);

    // Input should be of type number according to the HTML
    const inputType = await page.evaluate(() => document.querySelector('#input').getAttribute('type'));
    expect(inputType).toBe('number');
  });
});