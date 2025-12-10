import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e091ce0-d5a0-11f0-8040-510e90b1f3a7.html';

test.describe('Array Visualization (6e091ce0-d5a0-11f0-8040-510e90b1f3a7)', () => {
  // Collect console messages and page errors for each test run
  let consoleMessages = [];
  let pageErrors = [];

  // Helper to get the visible value (text node) of an array element at index
  const getElementValueAt = async (page, index) => {
    const locator = page.locator('.array-element').nth(index);
    return await locator.evaluate(el => {
      // The element structure: text node (value) then a span for index
      // Return the first text node's trimmed content
      const firstTextNode = Array.from(el.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
      return firstTextNode ? firstTextNode.textContent.trim() : '';
    });
  };

  // Helper to get operationInfo text
  const getOperationInfo = async (page) => {
    return await page.locator('#operationInfo').textContent();
  };

  test.beforeEach(async ({ page }) => {
    // reset collectors
    consoleMessages = [];
    pageErrors = [];

    // Observe console messages and page errors
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      pageErrors.push(String(err && err.message ? err.message : err));
    });

    // Navigate to the app and ensure the main container loaded
    await page.goto(APP_URL);
    await expect(page).toHaveURL(APP_URL);
    await page.waitForSelector('#arrayContainer');
  });

  test('Initial load: default array rendered with 5 elements and initial operation info', async ({ page }) => {
    // Verify there are 5 array elements on initial render
    const elements = page.locator('.array-element');
    await expect(elements).toHaveCount(5);

    // Verify the values in order are 10,20,30,40,50 by reading the text node content
    const expected = ['10', '20', '30', '40', '50'];
    for (let i = 0; i < expected.length; i++) {
      const val = await getElementValueAt(page, i);
      expect(val).toBe(expected[i]);
    }

    // Verify operationInfo initial message
    const opInfo = (await getOperationInfo(page)).trim();
    expect(opInfo).toBe('Array initialized with values: 10, 20, 30, 40, 50');

    // Ensure no page errors were emitted and no console error messages
    expect(pageErrors).toEqual([]);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors).toEqual([]);
  });

  test('Push: clicking "Push" adds element to end, highlights it, and updates operation info', async ({ page }) => {
    // Fill input and click Push
    const input = page.locator('#elementInput');
    await input.fill('Grape');
    await page.locator('#pushBtn').click();

    // Expect element count increased to 6
    const elems = page.locator('.array-element');
    await expect(elems).toHaveCount(6);

    // Verify last element value is "Grape"
    const lastVal = await getElementValueAt(page, 5);
    expect(lastVal).toBe('Grape');

    // The last element should have the 'highlight' class immediately after clicking
    const lastElement = elems.nth(5);
    await expect(lastElement).toHaveClass(/highlight/);

    // Operation info should reflect the push with quotes
    const opInfo = (await getOperationInfo(page)).trim();
    expect(opInfo).toBe('Pushed "Grape" to the end of the array');

    // After the animation timeout (~1s) the highlight should be removed
    await page.waitForTimeout(1100);
    await expect(lastElement).not.toHaveClass(/highlight/);

    // Ensure no runtime page errors
    expect(pageErrors).toEqual([]);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors).toEqual([]);
  });

  test('Pop: clicking "Pop" removes last element and updates operation info; popping empty array shows message', async ({ page }) => {
    const elems = page.locator('.array-element');

    // Pop once: should remove "50" (initial last)
    await page.locator('#popBtn').click();
    await expect(elems).toHaveCount(4);
    const opInfo1 = (await getOperationInfo(page)).trim();
    expect(opInfo1).toBe('Popped "50" from the end of the array');

    // Pop remaining 4 items to empty the array
    for (let i = 0; i < 4; i++) {
      await page.locator('#popBtn').click();
    }
    await expect(elems).toHaveCount(0);

    // Pop on empty array: should not throw, but update info to indicate it's empty
    await page.locator('#popBtn').click();
    const opInfo2 = (await getOperationInfo(page)).trim();
    expect(opInfo2).toBe('Array is empty, nothing to pop');

    // Ensure no runtime page errors
    expect(pageErrors).toEqual([]);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors).toEqual([]);
  });

  test('Unshift: clicking "Unshift" adds element to start, highlights it, and updates operation info', async ({ page }) => {
    const input = page.locator('#elementInput');
    await input.fill('StartVal');
    await page.locator('#unshiftBtn').click();

    // Expect count increased
    const elems = page.locator('.array-element');
    await expect(elems).toHaveCount(6);

    // Verify first element is the newly unshifted value
    const firstVal = await getElementValueAt(page, 0);
    expect(firstVal).toBe('StartVal');

    // First element should be highlighted initially
    await expect(elems.nth(0)).toHaveClass(/highlight/);

    // Operation info message
    const opInfo = (await getOperationInfo(page)).trim();
    expect(opInfo).toBe('Added "StartVal" to the beginning of the array');

    // Highlight should be removed after animation
    await page.waitForTimeout(1100);
    await expect(elems.nth(0)).not.toHaveClass(/highlight/);

    // Ensure no runtime page errors
    expect(pageErrors).toEqual([]);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors).toEqual([]);
  });

  test('Shift: clicking "Shift" removes first element and updates operation info; shifting empty array shows message', async ({ page }) => {
    const elems = page.locator('.array-element');

    // Shift once: should remove the first element (10)
    await page.locator('#shiftBtn').click();
    await expect(elems).toHaveCount(4);
    const opInfo1 = (await getOperationInfo(page)).trim();
    expect(opInfo1).toBe('Removed "10" from the beginning of the array');

    // Shift remaining 4 items to empty
    for (let i = 0; i < 4; i++) {
      await page.locator('#shiftBtn').click();
    }
    await expect(elems).toHaveCount(0);

    // Shift on empty array produces info message
    await page.locator('#shiftBtn').click();
    const opInfo2 = (await getOperationInfo(page)).trim();
    expect(opInfo2).toBe('Array is empty, nothing to shift');

    // Ensure no runtime page errors
    expect(pageErrors).toEqual([]);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors).toEqual([]);
  });

  test('Reverse: clicking "Reverse" inverts array order and updates operation info', async ({ page }) => {
    // Read current last value before reversing
    const lastBefore = await getElementValueAt(page, 4);
    await page.locator('#reverseBtn').click();

    // After reverse, the first element should equal previous last
    const firstAfter = await getElementValueAt(page, 0);
    expect(firstAfter).toBe(lastBefore);

    // Operation info message
    const opInfo = (await getOperationInfo(page)).trim();
    expect(opInfo).toBe('Reversed the array');

    // Ensure no runtime page errors
    expect(pageErrors).toEqual([]);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors).toEqual([]);
  });

  test('Reset: modifies array then resets to initial values and updates operation info', async ({ page }) => {
    // Make changes: unshift and push
    await page.locator('#elementInput').fill('X');
    await page.locator('#unshiftBtn').click();
    await page.locator('#elementInput').fill('Y');
    await page.locator('#pushBtn').click();

    // Verify changed count (should be 7 now: initial 5 + unshift + push)
    const elems = page.locator('.array-element');
    await expect(elems).toHaveCount(7);

    // Click reset
    await page.locator('#resetBtn').click();

    // Expect count back to initial 5 and values reset to 10..50
    await expect(elems).toHaveCount(5);
    const expected = ['10', '20', '30', '40', '50'];
    for (let i = 0; i < expected.length; i++) {
      const val = await getElementValueAt(page, i);
      expect(val).toBe(expected[i]);
    }

    // Operation info after reset
    const opInfo = (await getOperationInfo(page)).trim();
    expect(opInfo).toBe('Reset the array to initial values');

    // Ensure no runtime page errors
    expect(pageErrors).toEqual([]);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors).toEqual([]);
  });

  test('Pressing Enter in input triggers push (keyboard interaction)', async ({ page }) => {
    // Fill input and press Enter -> should behave like Push
    await page.locator('#elementInput').fill('HelloEnter');
    await page.locator('#elementInput').press('Enter');

    // New element appended
    const elems = page.locator('.array-element');
    await expect(elems).toHaveCount(6);
    const lastVal = await getElementValueAt(page, 5);
    expect(lastVal).toBe('HelloEnter');

    // Operation info updated correctly
    const opInfo = (await getOperationInfo(page)).trim();
    expect(opInfo).toBe('Pushed "HelloEnter" to the end of the array');

    // Ensure no runtime page errors
    expect(pageErrors).toEqual([]);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors).toEqual([]);
  });

  test('Accessibility & DOM sanity: index labels exist and are correct for each element', async ({ page }) => {
    const elems = page.locator('.array-element');
    const count = await elems.count();
    // Ensure each element has an index span with "Index x"
    for (let i = 0; i < count; i++) {
      const indexText = await elems.nth(i).locator('.element-index').textContent();
      expect(indexText.trim()).toBe(`Index ${i}`);
    }

    // Ensure array container is visible
    await expect(page.locator('#arrayContainer')).toBeVisible();

    // Ensure no runtime page errors
    expect(pageErrors).toEqual([]);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors).toEqual([]);
  });

  test('Runtime: verify no uncaught page errors or console error messages during interactions', async ({ page }) => {
    // Perform a few interactions rapidly
    await page.locator('#elementInput').fill('A');
    await page.locator('#pushBtn').click();
    await page.locator('#popBtn').click();
    await page.locator('#reverseBtn').click();
    await page.locator('#unshiftBtn').click();
    await page.locator('#shiftBtn').click();
    await page.locator('#resetBtn').click();

    // Give a short time to surface any async errors
    await page.waitForTimeout(500);

    // Assert no page errors and no console errors were recorded
    expect(pageErrors).toEqual([]);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors).toEqual([]);
  });
});