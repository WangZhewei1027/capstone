import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f658c3-d5a1-11f0-80b9-e1f86cea383f.html';

// Page Object for the Deque page to encapsulate common selectors and actions
class DequePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.dequeSizeInput = page.locator('#deque-size');
    this.createBtn = page.locator('#create-deque-btn');
    this.addBtn = page.locator('#add-element-btn');
    this.removeBtn = page.locator('#remove-element-btn');
    this.displayBtn = page.locator('#display-deque-btn');
    this.dequeDiv = page.locator('#deque');
    this.elementsDiv = page.locator('#elements'); // In the HTML this is a div (buggy)
  }

  // Helper to click create button
  async clickCreate() {
    await this.createBtn.click();
  }

  // Helper to click add element button
  async clickAdd() {
    await this.addBtn.click();
  }

  // Helper to click remove element button
  async clickRemove() {
    await this.removeBtn.click();
  }

  // Helper to click display button
  async clickDisplay() {
    await this.displayBtn.click();
  }

  // Get display button text
  async getDisplayText() {
    return (await this.displayBtn.textContent())?.trim();
  }

  // Get whether a button is disabled via aria/disabled
  async isDisabled(locator) {
    return await locator.isDisabled();
  }
}

test.describe('Deque Implementation (interactive app) - UI and script behavior', () => {
  let consoleMessages = [];
  let pageErrors = [];

  // Setup: navigate to the page and collect console/page errors for each test
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages (including errors logged by the page)
    page.on('console', (msg) => {
      // capture text and type for debugging assertions
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture uncaught runtime errors and syntax errors
    page.on('pageerror', (err) => {
      // err is an Error object; push message for assertions
      pageErrors.push(err);
    });

    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  });

  test.afterEach(async ({ page }) => {
    // Allow a brief moment for any late console/page errors to surface
    await page.waitForTimeout(50);
  });

  test('Initial load: static elements are present and default button states are correct', async ({ page }) => {
    // Purpose: Verify that static DOM is rendered as authored even if the script fails.
    const app = new DequePage(page);

    // Check heading and descriptive text exist
    await expect(page.locator('h2')).toHaveText('Deque Implementation');
    await expect(page.locator('p')).toContainText('Deque is a data structure');

    // Verify presence of the deque size input and that it is required
    await expect(app.dequeSizeInput).toBeVisible();
    // The input should exist and be enabled for text input
    expect(await app.dequeSizeInput.isEnabled()).toBe(true);

    // Verify button elements exist and have the expected initial disabled states from the HTML
    // create-deque-btn should be enabled by default
    expect(await app.isDisabled(app.createBtn)).toBe(false);

    // add/remove/display buttons are disabled in the HTML markup
    expect(await app.isDisabled(app.addBtn)).toBe(true);
    expect(await app.isDisabled(app.removeBtn)).toBe(true);
    expect(await app.isDisabled(app.displayBtn)).toBe(true);

    // Verify the display button's initial label text (static DOM)
    const displayText = await app.getDisplayText();
    expect(displayText).toBe('Display Deque');

    // #deque and #elements containers should be present in DOM
    await expect(app.dequeDiv).toBeVisible();
    await expect(app.elementsDiv).toBeVisible();

    // Confirm #elements is a DIV (the implementation incorrectly expects it to be an input)
    const tagName = await app.elementsDiv.evaluate((el) => el.tagName);
    expect(tagName).toBe('DIV');
  });

  test('Script parsing/runtime causes page error(s) — assert errors are reported', async ({ page }) => {
    // Purpose: The page's script has naming collisions and other issues.
    // We must observe and assert that the runtime emits errors (SyntaxError/ReferenceError/etc).
    // pageErrors collects uncaught errors emitted during page load.

    // Allow a short time for page errors to be emitted
    await page.waitForTimeout(100);

    // We expect at least one page error due to the buggy script (duplicate identifier or other runtime issues)
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);

    // Check that at least one error message references function/identifier issues commonly present in this page
    const messages = pageErrors.map((e) => String(e.message));
    const joined = messages.join(' | ').toLowerCase();

    // The error is likely about duplicate declaration of 'createDeque' or 'Identifier'
    expect(
      joined.includes('createdeque') ||
        joined.includes('identifier') ||
        joined.includes('already been declared') ||
        joined.includes('syntaxerror') ||
        joined.includes('duplicate')
    ).toBeTruthy();

    // Also assert console captured an error-level message (some environments surface syntax parse errors to console)
    const hasConsoleError = consoleMessages.some((m) => m.type === 'error' || m.type === 'warning' || /error/i.test(m.text));
    expect(hasConsoleError || pageErrors.length > 0).toBeTruthy();
  });

  test('Interactions do not enable or change UI state because script likely failed to attach handlers', async ({ page }) => {
    // Purpose: Because of script failure, event handlers are not attached; verify clicking buttons has no effect
    const app1 = new DequePage(page);

    // Attempt to click create btn (should be enabled)
    await app.clickCreate();

    // Wait briefly to allow any side-effects (if script had attached handlers)
    await page.waitForTimeout(100);

    // The add/remove/display buttons should remain disabled (script didn't run to enable them)
    expect(await app.isDisabled(app.addBtn)).toBe(true);
    expect(await app.isDisabled(app.removeBtn)).toBe(true);
    expect(await app.isDisabled(app.displayBtn)).toBe(true);

    // The display button text should remain unchanged (script did not change it)
    const displayText1 = await app.getDisplayText();
    expect(displayText).toBe('Display Deque');

    // Clicking disabled buttons should not throw and should not change the DOM
    // Ensure clicking does not populate the #deque container
    await app.clickAdd(); // this is disabled; will do nothing
    await app.clickRemove();
    await app.clickDisplay();

    // Assert #deque is still empty (no text content)
    const dequeContent = await app.dequeDiv.textContent();
    expect((dequeContent || '').trim()).toBe('');
  });

  test('Edge-case validation: the page expects #elements to be an input but it is a div — assert the mismatch', async ({ page }) => {
    // Purpose: Explicitly check that the script's assumptions about DOM types are incorrect.
    const app2 = new DequePage(page);

    // #elements is a DIV element (so .value will be undefined in the page script)
    const tagName1 = await app.elementsDiv.evaluate((el) => el.tagName1);
    expect(tagName).toBe('DIV');

    // Verify that the property 'value' is not present/usable on the DIV as an input would be
    const hasValueProperty = await app.elementsDiv.evaluate((el) => Object.prototype.hasOwnProperty.call(el, 'value') || 'value' in el);
    // DOM element might have a 'value' property (for some elements), but here it's a generic DIV - value will be undefined
    const value = await app.elementsDiv.evaluate((el) => el.value);
    expect(value === undefined || value === null || value === '').toBeTruthy();

    // Attempting to perform add/remove operations (which require an input) cannot work when #elements is a div.
    // Because the page script did not run properly, we also assert that no DOM content was created in #elements area.
    const elementsHtml = await app.elementsDiv.innerHTML();
    expect((elementsHtml || '').trim()).toBe('');
  });
});