import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b6b5c1-d1d5-11f0-b49a-6f458b3a25ef.html';

test.describe('Set Operations Demo - 39b6b5c1-d1d5-11f0-b49a-6f458b3a25ef', () => {
  // Arrays to collect console messages and page errors for each test
  let consoleMessages;
  let pageErrors;
  let consoleHandler;
  let pageErrorHandler;

  test.beforeEach(async ({ page }) => {
    // initialize collectors
    consoleMessages = [];
    pageErrors = [];

    // Attach listeners to capture console logs and uncaught page errors.
    consoleHandler = msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    };
    pageErrorHandler = error => {
      pageErrors.push(error);
    };

    page.on('console', consoleHandler);
    page.on('pageerror', pageErrorHandler);

    // Navigate to the application page exactly as-is
    await page.goto(APP_URL);
    // Wait for the main content to be present
    await expect(page.locator('h1', { hasText: 'Set Operations Demo' })).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    // Assert there were no uncaught page errors
    expect(pageErrors.length, `No uncaught page errors; found: ${pageErrors.map(e => String(e)).join('; ')}`).toBe(0);

    // Assert there were no console.error messages
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, `No console.error messages; found: ${consoleErrors.map(m => m.text).join('; ')}`).toBe(0);

    // Clean up listeners to avoid leaking between tests
    page.off('console', consoleHandler);
    page.off('pageerror', pageErrorHandler);
  });

  // Page object functions to interact with the UI
  const pageObjects = {
    async setALocator(page) { return page.locator('#setA'); },
    async setBLocator(page) { return page.locator('#setB'); },
    async buttonLocator(page) { return page.getByRole('button', { name: 'Perform Set Operations' }); },
    async resultLocator(page) { return page.locator('#result'); },
    // Helper to perform the click after filling values
    async perform(page, aValue, bValue) {
      const setA = page.locator('#setA');
      const setB = page.locator('#setB');
      const btn = page.getByRole('button', { name: 'Perform Set Operations' });

      await setA.fill(aValue);
      await setB.fill(bValue);
      await btn.click();
      // wait for result to be updated
      await expect(page.locator('#result')).toBeVisible();
    }
  };

  test('Initial page load: inputs, button and empty result are present', async ({ page }) => {
    // Verify the input fields and button exist and are visible with correct placeholders
    const setA1 = page.locator('#setA1');
    const setB1 = page.locator('#setB1');
    const btn1 = page.getByRole('button', { name: 'Perform Set Operations' });
    const result = page.locator('#result');

    await expect(setA).toBeVisible();
    await expect(setB).toBeVisible();
    await expect(btn).toBeVisible();

    // Placeholders should match those in the implementation
    await expect(setA).toHaveAttribute('placeholder', 'e.g., 1, 2, 3, 4');
    await expect(setB).toHaveAttribute('placeholder', 'e.g., 3, 4, 5, 6');

    // On initial load, result should be empty (no visible content)
    const resultText = (await result.textContent())?.trim() ?? '';
    // Expect that result area does not contain the Union label initially
    expect(resultText).toBe('');
  });

  test('Performs set operations correctly for numeric-like string inputs', async ({ page }) => {
    // Provide A = "1, 2, 3, 4" and B = "3, 4, 5, 6"
    await pageObjects.perform(page, '1, 2, 3, 4', '3, 4, 5, 6');

    const result1 = page.locator('#result1');
    const text = (await result.textContent()) ?? '';

    // Check that each section label is present
    expect(text).toContain('Union:');
    expect(text).toContain('Intersection:');
    expect(text).toContain('Difference (A - B):');

    // Verify expected set outputs: union should preserve order and deduplicate
    // Expected union: "1, 2, 3, 4, 5, 6"
    expect(text).toContain('Union: 1, 2, 3, 4, 5, 6');

    // Expected intersection: "3, 4"
    expect(text).toContain('Intersection: 3, 4');

    // Expected difference (A - B): "1, 2"
    expect(text).toContain('Difference (A - B): 1, 2');
  });

  test('Handles duplicate elements and trimming of whitespace', async ({ page }) => {
    // A contains duplicates and whitespace; B overlaps
    await pageObjects.perform(page, ' a,  a , b ', 'b, c');

    const text1 = (await page.locator('#result').textContent()) ?? '';

    // Union should deduplicate and preserve order of first appearance: a, b, c
    expect(text).toContain('Union: a, b, c');

    // Intersection should be 'b'
    expect(text).toContain('Intersection: b');

    // Difference A - B should contain 'a' only (duplicates removed)
    // Since a appears twice in input but Set holds it once, expected 'a'
    expect(text).toContain('Difference (A - B): a');
  });

  test('Edge case: both inputs empty produce empty entries (empty string elements)', async ({ page }) => {
    // Fill both inputs with empty strings (clear them) and click
    await pageObjects.perform(page, '', '');

    const result2 = page.locator('#result2');
    const html = (await result.innerHTML()) ?? '';
    const text2 = (await result.textContent()) ?? '';

    // The implementation will split '' into [''] and create a Set with an empty string element,
    // leading to an empty string when joined. We assert that labels exist and that the values are empty strings.
    expect(text).toContain('Union:');
    expect(text).toContain('Intersection:');
    expect(text).toContain('Difference (A - B):');

    // The Union line should essentially show nothing after the label (possibly just whitespace)
    // Ensure that the union line does not contain non-whitespace characters after 'Union:'
    const unionLineMatch = html.match(/<p><strong>Union:<\/strong>([\s\S]*?)<\/p>/);
    if (unionLineMatch) {
      const unionContent = unionLineMatch[1].replace(/<\/?[^>]+(>|$)/g, '').trim();
      // unionContent should be an empty string (or whitespace), assert trimmed is empty
      expect(unionContent).toBe('');
    } else {
      // If HTML structure is different, fall back to text check that no digits/letters appear after 'Union:'
      expect(text).toMatch(/Union:\s*$/m);
    }
  });

  test('Handles non-numeric and special character elements, including empty elements from extra commas', async ({ page }) => {
    // Provide inputs with empty entries (double comma) and special chars
    await pageObjects.perform(page, 'x,,y,!', ',y,!');

    const text3 = (await page.locator('#result').textContent()) ?? '';

    // Expect union to include 'x', '', 'y', '!' (empty string element caused by double comma)
    // The empty element will appear as an empty slot when joined; check that 'x' and 'y' and '!' present
    expect(text).toContain('Union:');
    expect(text).toContain('x');
    expect(text).toContain('y');
    expect(text).toContain('!');

    // Intersection should include 'y' and '!' because they appear in both
    expect(text).toContain('Intersection: y, !');

    // Difference A - B should include 'x' and possibly the empty entry depending on parsing
    expect(text).toContain('Difference (A - B):');
    expect(text).toContain('x');
  });

  test('Button is accessible and triggers the operation (accessibility check)', async ({ page }) => {
    // Verify the button can be found by role and has the expected accessible name
    const btn2 = page.getByRole('button', { name: 'Perform Set Operations' });
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();

    // Use keyboard to focus and activate the button after filling values
    await page.locator('#setA').fill('1,2');
    await page.locator('#setB').fill('2,3');

    // Focus the button and press Enter to activate (accessibility interaction)
    await btn.focus();
    await btn.press('Enter');

    // Verify result updated as with a click
    const text4 = (await page.locator('#result').textContent()) ?? '';
    expect(text).toContain('Union: 1, 2, 3');
    expect(text).toContain('Intersection: 2');
    expect(text).toContain('Difference (A - B): 1');
  });
});