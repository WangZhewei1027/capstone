import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-qwen1-5/html/3cca9d72-d5af-11f0-852d-73feb043b9f3.html';

// Simple Page Object for the Recursion page
class RecursionPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  getHeading() {
    return this.page.getByRole('heading', { level: 1, name: 'Recursion' });
  }

  getParagraph() {
    return this.page.locator('p');
  }

  async countElements(selector) {
    return (await this.page.$$(selector)).length;
  }
}

test.describe('Recursion page - static content and console verification', () => {
  let pageErrors = [];
  let consoleMessages = [];

  test.beforeEach(async ({ page }) => {
    // Collect any page errors
    pageErrors = [];
    page.on('pageerror', (err) => {
      // Collect stack / message for assertions
      pageErrors.push(err);
    });

    // Collect console messages
    consoleMessages = [];
    page.on('console', (msg) => {
      // store text and type for later inspection
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Navigate to the application under test
    const recursionPage = new RecursionPage(page);
    await recursionPage.goto();
  });

  test.afterEach(async () => {
    // cleanup arrays (redundant between tests, but explicit)
    pageErrors = [];
    consoleMessages = [];
  });

  test('Initial page load shows expected heading and description', async ({ page }) => {
    // Verify static content: H1 "Recursion" and paragraph describing recursion
    const p = page.locator('p');
    const h1 = page.getByRole('heading', { level: 1 });

    await expect(h1).toBeVisible();
    await expect(h1).toHaveText('Recursion');

    await expect(p).toBeVisible();
    await expect(p).toContainText('recursion', { ignoreCase: true });

    // Ensure the document title is as expected
    await expect(page).toHaveTitle(/Recursion/i);
  });

  test('There are no interactive controls (buttons, inputs, selects, forms) on the page', async ({ page }) => {
    // Identify interactive elements - the page implementation does not include any
    const buttons = await page.$$('button');
    const inputs = await page.$$('input');
    const selects = await page.$$('select');
    const textareas = await page.$$('textarea');
    const forms = await page.$$('form');

    // Assert that none of these exist (counts are zero)
    expect(buttons.length).toBe(0);
    expect(inputs.length).toBe(0);
    expect(selects.length).toBe(0);
    expect(textareas.length).toBe(0);
    expect(forms.length).toBe(0);
  });

  test('Console output includes expected computed value from inline script', async ({ page }) => {
    // The page's inline script logs the result of 3 + 2 * 1 which is "5"
    // Wait a short while to ensure console events are captured
    await page.waitForTimeout(100);

    // Find a console message of type 'log' that contains "5"
    const hasFive = consoleMessages.some(
      (m) => m.type === 'log' && m.text.trim() === '5'
    );

    expect(hasFive).toBe(true);
  });

  test('No uncaught page errors during load', async ({ page }) => {
    // Give the page a beat to surface any async errors
    await page.waitForTimeout(100);

    // Assert that no page errors were emitted
    expect(pageErrors.length).toBe(0);
  });

  test('Clicking non-interactive elements does not change content or produce errors', async ({ page }) => {
    const recursionPage = new RecursionPage(page);

    // Capture original texts
    const heading = recursionPage.getHeading();
    const paragraph = recursionPage.getParagraph();

    const originalHeadingText = await heading.textContent();
    const originalParagraphText = await paragraph.textContent();

    // Click the heading and the body to simulate user interaction where no interactive controls exist
    await heading.click();
    await page.click('body');

    // Wait briefly for any event handlers (none expected)
    await page.waitForTimeout(100);

    // Verify content unchanged
    await expect(recursionPage.getHeading()).toHaveText(originalHeadingText || 'Recursion');
    await expect(recursionPage.getParagraph()).toHaveText(originalParagraphText || /recursion/i);

    // Verify no new page errors produced by clicks
    expect(pageErrors.length).toBe(0);
  });

  test('Accessibility check: heading is discoverable via role', async ({ page }) => {
    // Use Playwright's accessibility queries: heading role should find the H1
    const heading = page.getByRole('heading', { name: 'Recursion' });
    await expect(heading).toBeVisible();
  });

  test('Edge case: attempting to locate and interact with a non-existent form should be a no-op', async ({ page }) => {
    // There is no form on the page; ensure selecting it returns null and no exception thrown
    const formHandle = await page.$('form');
    expect(formHandle).toBeNull();

    // Attempt to submit a non-existent form via evaluate should not be performed.
    // We assert that trying to query a non-existent element returns null rather than throwing.
    // (Do not call page.evaluate to interact with missing elements — we must not inject or patch.)
  });
});