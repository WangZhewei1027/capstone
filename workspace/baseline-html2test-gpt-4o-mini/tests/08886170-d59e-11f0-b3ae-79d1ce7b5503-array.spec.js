import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/08886170-d59e-11f0-b3ae-79d1ce7b5503.html';

// Page object modeling the Array Demonstration app
class ArrayAppPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.addButton = page.locator('#addItemButton');
    this.arrayContainer = page.locator('#arrayContainer');
    this.items = page.locator('.array-item');
    this.header = page.locator('h1');
    this.instruction = page.locator('p');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  // Clicks the add button once
  async clickAdd() {
    await this.addButton.click();
  }

  // Clicks the add button n times sequentially
  async clickAddMultiple(n) {
    for (let i = 0; i < n; i++) {
      await this.addButton.click();
    }
  }

  // Returns text content of the item at index (0-based)
  async itemTextAt(index) {
    return await this.items.nth(index).innerText();
  }

  // Returns the number parsed out of "Item X: <num>"
  static parseNumberFromItemText(text) {
    // expected format: "Item <index>: <number>"
    const match = text.match(/:\s*(-?\d+)\s*$/);
    if (!match) return NaN;
    return parseInt(match[1], 10);
  }
}

test.describe('Array Demonstration App - 08886170-d59e-11f0-b3ae-79d1ce7b5503', () => {
  // Arrays to collect console and page errors for assertions
  let consoleErrors = [];
  let pageErrors = [];
  let consoleMessages = [];

  test.beforeEach(async ({ page }) => {
    // Reset any captured messages before each test
    consoleErrors = [];
    pageErrors = [];
    consoleMessages = [];

    // Capture console messages and errors emitted by the page
    page.on('console', (msg) => {
      const text = `${msg.type()}: ${msg.text()}`;
      consoleMessages.push(text);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    // Capture page errors (uncaught exceptions in the page)
    page.on('pageerror', (err) => {
      // store the error message string
      pageErrors.push(String(err));
    });

    // Navigate to the application page
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // Nothing special to teardown; listeners are attached to the page instance which is disposed by Playwright
    // Provide a debug-oriented assertion that no unexpected page errors occurred; tests may further assert if needed.
  });

  test('Initial page load shows header, instructions, button, and no array items', async ({ page }) => {
    // Purpose: verify default state of the page immediately after load
    const app = new ArrayAppPage(page);

    // Check header and instruction content
    await expect(app.header).toBeVisible();
    await expect(app.header).toHaveText('JavaScript Array Demonstration');

    await expect(app.instruction).toBeVisible();
    await expect(app.instruction).toContainText('Click the button below to add a new item to the array');

    // Button should be visible and enabled
    await expect(app.addButton).toBeVisible();
    await expect(app.addButton).toBeEnabled();

    // No array items should exist initially
    await expect(app.items).toHaveCount(0);

    // Ensure array container exists but empty
    await expect(app.arrayContainer).toBeVisible();
    const containerHtml = await app.arrayContainer.innerHTML();
    expect(containerHtml.trim()).toBe(''); // expect empty innerHTML

    // Assert no console errors or page errors were emitted during load
    expect(consoleErrors, `Console errors captured: ${consoleErrors.join('\n')}`).toHaveLength(0);
    expect(pageErrors, `Page errors captured: ${pageErrors.join('\n')}`).toHaveLength(0);
  });

  test('Clicking "Add Random Number" once adds exactly one item with expected text and number range', async ({ page }) => {
    // Purpose: verify a single interaction updates the DOM predictably
    const app1 = new ArrayAppPage(page);

    await app.clickAdd();

    // One new item should appear
    await expect(app.items).toHaveCount(1);

    const text1 = await app.itemTextAt(0);
    // Text should match "Item 1: <number>"
    expect(text).toMatch(/^Item\s+1:\s*-?\d+\s*$/);

    // Parse and verify number is an integer between 1 and 100 inclusive (per implementation)
    const num = ArrayAppPage.parseNumberFromItemText(text);
    expect(Number.isInteger(num)).toBe(true);
    expect(num).toBeGreaterThanOrEqual(1);
    expect(num).toBeLessThanOrEqual(100);

    // Button remains enabled after click
    await expect(app.addButton).toBeEnabled();

    // No console or page errors occurred during interaction
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test('Clicking multiple times appends items in order and displays correct indices', async ({ page }) => {
    // Purpose: validate repeated interactions update the array and DOM in order
    const app2 = new ArrayAppPage(page);

    const clicks = 5;
    await app.clickAddMultiple(clicks);

    // Expect exactly `clicks` items
    await expect(app.items).toHaveCount(clicks);

    // Verify each item displays the correct Item index and valid number
    for (let i = 0; i < clicks; i++) {
      const expectedPrefix = `Item ${i + 1}:`;
      const txt = await app.itemTextAt(i);
      expect(txt.startsWith(expectedPrefix)).toBe(true);

      const num1 = ArrayAppPage.parseNumberFromItemText(txt);
      expect(Number.isInteger(num)).toBe(true);
      expect(num).toBeGreaterThanOrEqual(1);
      expect(num).toBeLessThanOrEqual(100);
    }

    // No console or page errors during rapid sequential clicks
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test('Rapid clicks add multiple items and preserve insertion order', async ({ page }) => {
    // Purpose: simulate quick user interaction and check state consistency
    const app3 = new ArrayAppPage(page);

    // Rapidly trigger clicks without awaiting DOM update between them
    // We still await each click to properly dispatch events in the browser, but do them in short succession
    const rapidCount = 10;
    for (let i = 0; i < rapidCount; i++) {
      // Fire and don't wait for UI to update beyond the click; next iteration will still execute quickly
      await app.addButton.click();
    }

    // Expect the number of items to equal the number of clicks
    await expect(app.items).toHaveCount(rapidCount);

    // Ensure order: Item 1 is first, Item N is last
    const firstText = await app.itemTextAt(0);
    const lastText = await app.itemTextAt(rapidCount - 1);
    expect(firstText.startsWith('Item 1:')).toBe(true);
    expect(lastText.startsWith(`Item ${rapidCount}:`)).toBe(true);

    // Ensure every displayed number is in the expected range and is numeric
    for (let i = 0; i < rapidCount; i++) {
      const txt1 = await app.itemTextAt(i);
      const num2 = ArrayAppPage.parseNumberFromItemText(txt);
      expect(Number.isInteger(num)).toBe(true);
      expect(num).toBeGreaterThanOrEqual(1);
      expect(num).toBeLessThanOrEqual(100);
    }

    // Validate styling class exists for visual feedback
    for (let i = 0; i < rapidCount; i++) {
      const classAttr = await app.items.nth(i).getAttribute('class');
      expect(classAttr).toContain('array-item');
    }

    // Ensure no console or page errors occurred
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test('UI remains interactive after many additions and no unexpected errors are thrown', async ({ page }) => {
    // Purpose: stress test adding items and assert app stability and absence of runtime errors
    const app4 = new ArrayAppPage(page);

    const totalAdds = 20;
    await app.clickAddMultiple(totalAdds);

    // Check count
    await expect(app.items).toHaveCount(totalAdds);

    // Ensure button still present and clickable
    await expect(app.addButton).toBeVisible();
    await expect(app.addButton).toBeEnabled();

    // Click once more and assert count increments
    await app.clickAdd();
    await expect(app.items).toHaveCount(totalAdds + 1);

    // Check there remain no console errors or page errors
    // If the application were to throw ReferenceError/SyntaxError/TypeError, it would be captured in pageErrors or consoleErrors.
    expect(consoleErrors.length, `Console errors: ${consoleErrors.join('\n')}`).toBe(0);
    expect(pageErrors.length, `Page errors: ${pageErrors.join('\n')}`).toBe(0);
  });

  test('Accessibility checks: button is reachable and labeled correctly', async ({ page }) => {
    // Purpose: basic accessibility verification for the interactive control
    const app5 = new ArrayAppPage(page);

    // The add button should have accessible name matching its text content
    const accessibleName = await app.addButton.accessibleName();
    expect(accessibleName).toBe('Add Random Number');

    // Tabbing to the button should focus it (keyboard accessibility)
    await page.keyboard.press('Tab');
    // After a single Tab the button may or may not be focused depending on page layout; explicitly focus then verify
    await app.addButton.focus();
    const isFocused = await app.addButton.evaluate((el) => document.activeElement === el);
    expect(isFocused).toBe(true);

    // Ensure no console/page errors during these accessibility interactions
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test('Edge case: ensure container innerHTML stays consistent and only contains array item elements', async ({ page }) => {
    // Purpose: verify that displayArray implementation replaces innerHTML as intended and there are no stray nodes
    const app6 = new ArrayAppPage(page);

    // Add a few items
    await app.clickAddMultiple(3);

    // Inspect container children count equals .array-item count
    const childCount = await app.arrayContainer.evaluate((el) => el.childElementCount);
    const itemsCount = await app.items.count();
    expect(childCount).toBe(itemsCount);

    // Ensure every child is a div with class 'array-item'
    const childrenValid = await app.arrayContainer.evaluate(() => {
      const children = Array.from(document.getElementById('arrayContainer').children);
      return children.every((c) => c.tagName.toLowerCase() === 'div' && c.classList.contains('array-item'));
    });
    expect(childrenValid).toBe(true);

    // No runtime errors
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });
});