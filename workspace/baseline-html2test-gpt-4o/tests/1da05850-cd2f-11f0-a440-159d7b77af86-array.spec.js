import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da05850-cd2f-11f0-a440-159d7b77af86.html';

test.describe('Array example application (1da05850-cd2f-11f0-a440-159d7b77af86)', () => {
  // Containers for console and page errors captured during each test run.
  let consoleMessages = [];
  let pageErrors = [];

  // Set up listeners before each test to capture console messages and page errors that occur
  // during navigation and interaction. We attach listeners early to ensure we catch errors
  // thrown during initial script execution.
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    page.on('console', msg => {
      // Capture all console messages for later assertions
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    page.on('pageerror', error => {
      // Capture uncaught exceptions reported by the page
      pageErrors.push(error);
    });

    // Navigate to the page and wait for it to load completely.
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  // Tear down listeners after each test to avoid cross-test contamination.
  test.afterEach(async ({ page }) => {
    // Remove listeners by replacing them with no-ops (Playwright doesn't provide direct removal here).
    // This ensures subsequent tests start with fresh handlers created in beforeEach.
    page.removeAllListeners?.('console');
    page.removeAllListeners?.('pageerror');
  });

  test('Initial page load displays header and description', async ({ page }) => {
    // Verify the main heading exists and contains expected text.
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText('JavaScript Array Example');

    // Verify the descriptive paragraph exists.
    const paragraph = page.locator('p');
    await expect(paragraph).toBeVisible();
    await expect(paragraph).toContainText('demonstration of a JavaScript array');
  });

  test('Displays the final modified array with correct items and order', async ({ page }) => {
    // The script performs: start ['Apple','Banana','Orange']
    // push('Mango') -> ['Apple','Banana','Orange','Mango']
    // shift() -> ['Banana','Orange','Mango']
    // unshift('Strawberry') -> ['Strawberry','Banana','Orange','Mango']
    //
    // Expect 4 list items in that exact order.

    const list = page.locator('#array-list');
    await expect(list).toBeVisible();

    const items = list.locator('li');
    await expect(items).toHaveCount(4);

    // Assert the exact order and content of each list item
    await expect(items.nth(0)).toHaveText('Strawberry');
    await expect(items.nth(1)).toHaveText('Banana');
    await expect(items.nth(2)).toHaveText('Orange');
    await expect(items.nth(3)).toHaveText('Mango');

    // Also assert that each list item is visible
    for (let i = 0; i < 4; i++) {
      await expect(items.nth(i)).toBeVisible();
    }
  });

  test('There are no interactive controls (buttons, inputs, selects, or forms) present', async ({ page }) => {
    // Analyze the DOM for interactive elements. This application has no
    // buttons, inputs, selects, or forms according to the provided HTML.
    await expect(page.locator('button')).toHaveCount(0);
    await expect(page.locator('input')).toHaveCount(0);
    await expect(page.locator('select')).toHaveCount(0);
    await expect(page.locator('textarea')).toHaveCount(0);
    await expect(page.locator('form')).toHaveCount(0);

    // Ensure no clickable controls are present (input[type="button"], etc.)
    await expect(page.locator('input[type="button"], input[type="submit"], button')).toHaveCount(0);
  });

  test('List content remains stable when interacting with non-interactive items (no side effects)', async ({ page }) => {
    // Attempt to click each list item to verify that clicking does not alter content.
    const items = page.locator('#array-list > li');
    const count = await items.count();

    for (let i = 0; i < count; i++) {
      const beforeText = await items.nth(i).innerText();
      await items.nth(i).click();
      // After clicking a non-interactive LI, content should remain identical.
      const afterText = await items.nth(i).innerText();
      expect(afterText).toBe(beforeText);
    }

    // Re-assert the full expected array after these interactions
    await expect(items).toHaveCount(4);
    await expect(items.nth(0)).toHaveText('Strawberry');
    await expect(items.nth(1)).toHaveText('Banana');
    await expect(items.nth(2)).toHaveText('Orange');
    await expect(items.nth(3)).toHaveText('Mango');
  });

  test('No runtime errors or exception-level console messages occurred during load', async ({ page }) => {
    // Check that page-level errors (uncaught exceptions) are absent.
    await expect(pageErrors.length).toBe(0);

    // Filter console error-type messages
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    // Assert there are no console errors
    await expect(consoleErrors.length).toBe(0);

    // Ensure none of the console texts mention common JS error names.
    const errorNameRegex = /(ReferenceError|SyntaxError|TypeError)/i;
    const messagesContainingErrorNames = consoleMessages.filter(m => errorNameRegex.test(m.text));
    await expect(messagesContainingErrorNames.length).toBe(0);
  });

  test('Accessibility basic checks: list has semantic markup and items are readable', async ({ page }) => {
    // Confirm the list uses a semantic ul element and each item is a list item.
    const ul = page.locator('ul#array-list');
    await expect(ul).toBeVisible();
    await expect(ul).toHaveAttribute('id', 'array-list');

    const listItems = ul.locator('li');
    await expect(listItems).toHaveCount(4);

    // Ensure each list item has non-empty text (readable content)
    for (let i = 0; i < await listItems.count(); i++) {
      const text = (await listItems.nth(i).innerText()).trim();
      await expect(text.length).toBeGreaterThan(0);
    }
  });

  test('Edge case verification: modifying DOM locally does not produce page errors', async ({ page }) => {
    // This test simulates DOM changes that a user script might perform,
    // but per the constraints we do not alter global definitions. We only
    // perform safe DOM operations via Playwright to ensure no exceptions are thrown.
    // Append a harmless element and remove it, checking no page errors were reported.
    await page.evaluate(() => {
      const temp = document.createElement('div');
      temp.id = 'temp-playwright-test';
      temp.textContent = 'temporary';
      document.body.appendChild(temp);
      // remove it
      const found = document.getElementById('temp-playwright-test');
      if (found) found.remove();
    });

    // Ensure no page errors resulted from these DOM manipulations.
    await expect(pageErrors.length).toBe(0);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    await expect(consoleErrors.length).toBe(0);
  });
});