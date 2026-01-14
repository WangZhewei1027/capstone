import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f60aa0-d5a1-11f0-80b9-e1f86cea383f.html';

test.describe('Array Demo - 90f60aa0-d5a1-11f0-80b9-e1f86cea383f', () => {
  // Shared holders for console and page errors collected per test
  test.beforeEach(async ({ page }) => {
    // Navigate to the app before each test
    await page.goto(APP_URL);
  });

  // Test initial page load and default state
  test('Initial load: page elements are present and default state is correct', async ({ page }) => {
    // Ensure main heading is visible and correct
    await expect(page.locator('h1')).toHaveText('Array Demo');

    // The #array-length element exists and initially shows "0"
    const arrayLengthSpan = page.locator('#array-length');
    await expect(arrayLengthSpan).toHaveText('0');

    // Buttons are visible and enabled
    await expect(page.locator('#generate-array-button')).toBeVisible();
    await expect(page.locator('#clear-array-button')).toBeVisible();

    // The array list container exists and has no child elements initially
    const arrayItems = page.locator('#array-list div');
    await expect(arrayItems).toHaveCount(0);
  });

  // Test behavior when Generate Array is clicked without entering a numeric value
  test('Edge case: Click Generate Array without providing a numeric length', async ({ page }) => {
    // Capture console messages and page errors for inspection
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', (err) => pageErrors.push(err));

    // Click generate when array-length is the span without a "value"
    await page.click('#generate-array-button');

    // Because the implementation reads .value from a span, parseInt(undefined) => NaN,
    // so generateArray will create zero elements. Assert no elements were added.
    await expect(page.locator('#array-list div')).toHaveCount(0);

    // There should be no uncaught page errors (the code does not throw), assert that
    expect(pageErrors.length).toBe(0);

    // Console messages may include benign logs; ensure none are errors
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test generating an array after setting a numeric value on the #array-length element
  test('Generate Array with numeric length: elements are created, styled, and clickable', async ({ page }) => {
    // Collect any page errors
    const pageErrors1 = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    // Simulate a user entering a length. The app incorrectly binds to a span,
    // but it reads the element.value, so we set that property directly to simulate input.
    await page.evaluate(() => {
      const el = document.getElementById('array-length');
      // Set a value property so the page script will read it when generating.
      el.value = '5';
    });

    // Prepare to capture dialog (alert) that will be shown when clicking a generated element
    let dialogMessage = null;
    page.on('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Click the generate button to create elements
    await page.click('#generate-array-button');

    // Expect 5 child divs to be present in #array-list
    const items = page.locator('#array-list div');
    await expect(items).toHaveCount(5);

    // Verify each created element has the inline styles that the implementation sets
    for (let i = 0; i < 5; i++) {
      const item = items.nth(i);
      // The implementation sets element.style properties inline; verify some known values.
      const styleInfo = await item.evaluate((node) => {
        return {
          text: node.textContent,
          background: node.style.background,
          width: node.style.width,
          height: node.style.height,
          position: node.style.position,
          left: node.style.left,
          top: node.style.top,
          border: node.style.border
        };
      });
      // The background was set to 'lightgray' inline
      expect(styleInfo.background).toBe('lightgray');
      expect(styleInfo.width).toBe('50px');
      expect(styleInfo.height).toBe('20px');
      expect(styleInfo.position).toBe('absolute');
      // left and top are set to '10px' in the code
      expect(styleInfo.left).toBe('10px');
      expect(styleInfo.top).toBe('10px');

      // Each element's text should be a string representing a number
      expect(styleInfo.text).toMatch(/^\d+$/);
    }

    // Click the first generated element and assert that an alert with "Element: <num>" appears
    await items.first().click();
    // Wait briefly to ensure dialog handler ran
    await page.waitForTimeout(50);
    expect(dialogMessage).not.toBeNull();
    expect(dialogMessage).toMatch(/^Element: \d+$/);

    // Ensure there were no uncaught page errors during generation
    expect(pageErrors.length).toBe(0);
  });

  // Test that Clear Array triggers generateArray with arrayLength set to 0
  // and observe the real behavior given the implementation (it does not remove existing items)
  test('Clear Array button: updates internal state but does not remove already appended elements (observed behavior)', async ({ page }) => {
    // Prepare page: set value to 3 and generate elements
    await page.evaluate(() => { document.getElementById('array-length').value = '3'; });
    await page.click('#generate-array-button');

    const itemsBefore = await page.locator('#array-list div').count();
    expect(itemsBefore).toBe(3);

    // Click clear button; implementation sets arrayLength=0 and calls generateArray(),
    // but generateArray does not clear the container, so we expect the existing elements to remain.
    await page.click('#clear-array-button');

    // Because generateArray will not add elements when arrayLength is 0, the count should remain unchanged.
    const itemsAfter = await page.locator('#array-list div').count();
    expect(itemsAfter).toBe(itemsBefore);

    // Confirm that no uncaught exceptions occurred as a result of clear action
    const pageErrors2 = [];
    page.on('pageerror', (err) => pageErrors.push(err));
    // give a moment for any potential errors to surface
    await page.waitForTimeout(50);
    expect(pageErrors.length).toBe(0);
  });

  // Test repeated generation appends elements (no clearing) and elements overlap due to absolute positioning
  test('Multiple generations append elements and share identical positioning (expected given implementation)', async ({ page }) => {
    // Start with a known state: generate 2 elements
    await page.evaluate(() => { document.getElementById('array-length').value = '2'; });
    await page.click('#generate-array-button');

    const firstCount = await page.locator('#array-list div').count();
    expect(firstCount).toBe(2);

    // Generate 2 more by setting value and clicking again; because code doesn't clear container, count increases
    await page.evaluate(() => { document.getElementById('array-length').value = '2'; });
    await page.click('#generate-array-button');

    const secondCount = await page.locator('#array-list div').count();
    expect(secondCount).toBe(4);

    // Check that the top/left positions are identical for two different elements (they overlap due to code)
    const firstPos = await page.locator('#array-list div').nth(0).evaluate(node => ({ left: node.style.left, top: node.style.top }));
    const thirdPos = await page.locator('#array-list div').nth(2).evaluate(node => ({ left: node.style.left, top: node.style.top }));
    expect(firstPos.left).toBe(thirdPos.left);
    expect(firstPos.top).toBe(thirdPos.top);
  });
});