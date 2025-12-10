import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b7ee42-d1d5-11f0-b49a-6f458b3a25ef.html';

test.describe('Linear Search Demonstration - 39b7ee42-d1d5-11f0-b49a-6f458b3a25ef', () => {
  // Arrays to collect console error messages and page errors for each test
  let consoleErrors;
  let pageErrors;

  // Attach listeners before each test to capture console and page errors
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages of type 'error'
    page.on('console', msg => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      } catch (e) {
        // ignore handler errors
      }
    });

    // Capture page runtime errors (unhandled exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    // Navigate to the application page
    await page.goto(APP_URL);
  });

  // Test initial page load and default state
  test('Initial load: inputs, button and result area are present and empty', async ({ page }) => {
    // Ensure main elements are present
    const arrayInput = page.locator('#arrayInput');
    const searchInput = page.locator('#searchInput');
    const button = page.locator('button');
    const result = page.locator('#result');

    // Inputs and button should be visible
    await expect(arrayInput).toBeVisible();
    await expect(searchInput).toBeVisible();
    await expect(button).toBeVisible();

    // Result area should be empty on initial load
    await expect(result).toHaveText('');

    // The search button should have the onclick attribute wired to performLinearSearch
    const onclickAttr = await button.getAttribute('onclick');
    expect(onclickAttr).toBe('performLinearSearch()');

    // No console errors or page errors should have occurred during load
    expect(consoleErrors, 'Console error messages should be empty on load').toEqual([]);
    expect(pageErrors, 'Page errors should be empty on load').toEqual([]);
  });

  // Test a successful search scenario where the number exists in the array
  test('Search finds an existing number and displays correct index', async ({ page }) => {
    const arrayInput1 = page.locator('#arrayInput1');
    const searchInput1 = page.locator('#searchInput1');
    const button1 = page.locator('button1');
    const result1 = page.locator('#result1');

    // Provide array and search value
    await arrayInput.fill('4, 2, 7, 1, 3');
    await searchInput.fill('3');

    // Click the Search button
    await button.click();

    // Expect the result div to show the found message with the correct index (4)
    await expect(result).toContainText('Number');
    await expect(result).toContainText('found at index');
    await expect(result).toHaveText(/Number\s+<strong>3<\/strong>\s+found at index\s+<strong>4<\/strong>\./);

    // No console or page errors should have occurred during this interaction
    expect(consoleErrors, 'No console errors should occur during a successful search').toEqual([]);
    expect(pageErrors, 'No page errors should occur during a successful search').toEqual([]);
  });

  // Test the 'not found' scenario
  test('Search for a missing number displays "not found" message', async ({ page }) => {
    const arrayInput2 = page.locator('#arrayInput2');
    const searchInput2 = page.locator('#searchInput2');
    const button2 = page.locator('button2');
    const result2 = page.locator('#result2');

    // Provide array and a search value that is not in the array
    await arrayInput.fill('10,20,30');
    await searchInput.fill('5');

    // Click the Search button
    await button.click();

    // Expect the result div to show the not found message
    await expect(result).toContainText('not found in the array');
    await expect(result).toHaveText(/Number\s+<strong>5<\/strong>\s+not found in the array\./);

    // No console or page errors should have occurred during this interaction
    expect(consoleErrors, 'No console errors should occur when search returns not found').toEqual([]);
    expect(pageErrors, 'No page errors should occur when search returns not found').toEqual([]);
  });

  // Test handling of whitespace and non-numeric items in the input array
  test('Handles whitespace and non-numeric array items: still finds numeric values', async ({ page }) => {
    const arrayInput3 = page.locator('#arrayInput3');
    const searchInput3 = page.locator('#searchInput3');
    const button3 = page.locator('button3');
    const result3 = page.locator('#result3');

    // Array includes whitespace and a non-numeric token 'xyz'
    await arrayInput.fill(' 10 , 20, xyz, 30 ');
    await searchInput.fill('30');

    // Click the Search button
    await button.click();

    // The code parses numbers using parseInt; non-numeric tokens become NaN and are ignored for equality;
    // Expect the valid numeric value 30 to be found at index 3
    await expect(result).toHaveText(/Number\s+<strong>30<\/strong>\s+found at index\s+<strong>3<\/strong>\./);

    // Ensure no runtime errors occurred
    expect(consoleErrors, 'No console errors should occur when array contains non-numeric tokens').toEqual([]);
    expect(pageErrors, 'No page errors should occur when array contains non-numeric tokens').toEqual([]);
  });

  // Test behavior when the array input is empty and when the search input is empty
  test('Edge cases: empty array input and empty search input produce expected messages', async ({ page }) => {
    const arrayInput4 = page.locator('#arrayInput4');
    const searchInput4 = page.locator('#searchInput4');
    const button4 = page.locator('button4');
    const result4 = page.locator('#result4');

    // Case A: empty array, provided search value -> should show not found (NaN behavior internally)
    await arrayInput.fill('');
    await searchInput.fill('3');
    await button.click();
    await expect(result).toContainText('not found');

    // Case B: array provided but empty search input (parsed as NaN)
    await arrayInput.fill('1,2,3');
    await searchInput.fill(''); // parseInt('') -> NaN
    await button.click();
    // The displayed search value will be 'NaN' inside the message because parseInt('') === NaN
    await expect(result).toContainText('Number <strong>NaN</strong>');
    await expect(result).toContainText('not found');

    // Ensure no runtime errors occurred for edge cases
    expect(consoleErrors, 'No console errors should occur for empty inputs edge cases').toEqual([]);
    expect(pageErrors, 'No page errors should occur for empty inputs edge cases').toEqual([]);
  });

  // Test repeated clicks and idempotency of the search operation
  test('Repeated searches produce consistent results and DOM updates', async ({ page }) => {
    const arrayInput5 = page.locator('#arrayInput5');
    const searchInput5 = page.locator('#searchInput5');
    const button5 = page.locator('button5');
    const result5 = page.locator('#result5');

    await arrayInput.fill('5,6,7,8');
    await searchInput.fill('7');

    // First click
    await button.click();
    await expect(result).toHaveText(/found at index\s+<strong>2<\/strong>\./);

    // Change search to another existing number and click again
    await searchInput.fill('5');
    await button.click();
    await expect(result).toHaveText(/found at index\s+<strong>0<\/strong>\./);

    // Repeat the same search twice quickly to ensure stability
    await searchInput.fill('8');
    await button.click();
    await button.click();
    await expect(result).toHaveText(/found at index\s+<strong>3<\/strong>\./);

    // Ensure no runtime errors occurred throughout repeated interactions
    expect(consoleErrors, 'No console errors should occur during repeated interactions').toEqual([]);
    expect(pageErrors, 'No page errors should occur during repeated interactions').toEqual([]);
  });

  // Test simple accessibility and semantics checks where relevant
  test('Accessibility and semantic checks: inputs have placeholders and result is in DOM', async ({ page }) => {
    const arrayInput6 = page.locator('#arrayInput6');
    const searchInput6 = page.locator('#searchInput6');
    const result6 = page.locator('#result6');

    // Placeholders should guide the user as in the markup
    await expect(arrayInput).toHaveAttribute('placeholder', 'e.g. 4, 2, 7, 1, 3');
    await expect(searchInput).toHaveAttribute('placeholder', 'e.g. 3');

    // Ensure result region exists and is a div (semantic container for dynamic content)
    await expect(result).toBeVisible();

    // No console or page errors
    expect(consoleErrors, 'No console errors should occur for accessibility checks').toEqual([]);
    expect(pageErrors, 'No page errors should occur for accessibility checks').toEqual([]);
  });
});