import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9eadfd-cd2f-11f0-a735-f5f9b4634e99.html';

test.describe('Radix Sort Demonstration - End-to-end', () => {
  // Set a somewhat generous timeout for slower CI machines
  test.setTimeout(30_000);

  // Shared selectors used by multiple tests
  const selectors = {
    input: '#arrayInput',
    sortButton: 'button:has-text("Sort")',
    result: '#result',
    highlight: '#result .highlight',
  };

  // Helper to collect console errors and page errors for assertions
  async function collectRuntimeIssues(page, capture) {
    page.on('pageerror', (err) => {
      capture.pageErrors.push(err);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        capture.consoleErrors.push(msg);
      }
      capture.consoleMessages.push(msg);
    });
  }

  // Before each test, navigate to the page and ensure the DOM is ready.
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  });

  // Test initial page load and default state
  test('Initial load: input and Sort button visible, result area empty', async ({ page }) => {
    // Purpose: Verify the page initial state contains the expected interactive elements
    // and that there's no pre-filled result content.
    const pageCapture = { pageErrors: [], consoleErrors: [], consoleMessages: [] };
    await collectRuntimeIssues(page, pageCapture);

    const input = page.locator(selectors.input);
    const sortButton = page.locator(selectors.sortButton);
    const result = page.locator(selectors.result);
    const highlight = page.locator(selectors.highlight);

    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', /e\.g\./);
    await expect(sortButton).toBeVisible();
    await expect(sortButton).toHaveText('Sort');

    // The result area should be empty on initial load
    await expect(result).toBeVisible();
    await expect(result).toHaveText('', { timeout: 1000 });

    // No runtime page errors should have occurred during load
    expect(pageCapture.pageErrors.length).toBe(0);
    // Also assert there were no console error messages emitted
    expect(pageCapture.consoleErrors.length).toBe(0);
    // There should be no highlighted result initially
    await expect(highlight).toHaveCount(0);
  });

  // Test the main happy path with a known example array
  test('Sorting valid comma-separated integers displays correctly sorted array', async ({ page }) => {
    // Purpose: Enter a valid set of integers and verify the algorithm sorts them
    // and the result is displayed inside the highlighted span.
    const pageCapture = { pageErrors: [], consoleErrors: [], consoleMessages: [] };
    await collectRuntimeIssues(page, pageCapture);

    const input = page.locator(selectors.input);
    const sortButton = page.locator(selectors.sortButton);
    const result = page.locator(selectors.result);
    const highlight = page.locator(selectors.highlight);

    const raw = '170, 45, 75, 90, 802, 24, 2, 66';
    const expected = '2, 24, 45, 66, 75, 90, 170, 802';

    await input.fill(raw);
    await sortButton.click();

    // The result area should update to contain the sorted array and a highlight span
    await expect(result).toContainText('Sorted array:');
    await expect(highlight).toBeVisible();
    await expect(highlight).toHaveText(expected);

    // Confirm the highlighted element is styled by the CSS class 'highlight'
    const highlightClass = await page.locator(selectors.highlight).getAttribute('class');
    expect(highlightClass).toMatch(/highlight/);

    // No runtime errors should have been thrown during sorting
    expect(pageCapture.pageErrors.length).toBe(0);
    expect(pageCapture.consoleErrors.length).toBe(0);
  });

  // Test input with extra commas and empty tokens -> should trigger alert
  test('Input with empty tokens triggers validation alert and does not display result', async ({ page }) => {
    // Purpose: Ensure invalid inputs (empty token) are detected and the user is alerted.
    const input = page.locator(selectors.input);
    const sortButton = page.locator(selectors.sortButton);
    const result = page.locator(selectors.result);

    const invalidInput = '3, 1,2,,4';

    // Listen for the alert dialog and assert the message
    const dialogPromise = page.waitForEvent('dialog');
    await input.fill(invalidInput);
    await sortButton.click();

    const dialog = await dialogPromise;
    // The app uses alert('Please enter valid integers separated by commas.');
    expect(dialog.message()).toBe('Please enter valid integers separated by commas.');
    await dialog.accept();

    // Result should not contain a "Sorted array" message after invalid input
    await expect(result).not.toContainText('Sorted array:');
  });

  // Test non-numeric input triggers the same alert
  test('Non-numeric input triggers validation alert', async ({ page }) => {
    // Purpose: Verify that alphabetic or otherwise non-numeric tokens cause validation and an alert.
    const input = page.locator(selectors.input);
    const sortButton = page.locator(selectors.sortButton);
    const result = page.locator(selectors.result);

    const invalidInput = 'a, b, c';

    const dialogPromise = page.waitForEvent('dialog');
    await input.fill(invalidInput);
    await sortButton.click();

    const dialog = await dialogPromise;
    expect(dialog.message()).toBe('Please enter valid integers separated by commas.');
    await dialog.accept();

    await expect(result).not.toContainText('Sorted array:');
  });

  // Test duplicates and zeros handling
  test('Handles zeros and duplicate values correctly', async ({ page }) => {
    // Purpose: Ensure arrays with duplicates and zeros are processed as expected.
    const input = page.locator(selectors.input);
    const sortButton = page.locator(selectors.sortButton);
    const highlight = page.locator(selectors.highlight);

    const raw = '0, 0, 0, 5, 5';
    const expected = '0, 0, 0, 5, 5';

    await input.fill(raw);
    await sortButton.click();

    await expect(highlight).toBeVisible();
    await expect(highlight).toHaveText(expected);
  });

  // Edge case: Negative numbers - demonstrate algorithm limitation
  test('Negative numbers: application produces output but does not match numeric ascending order (demonstrates limitation)', async ({ page }) => {
    // Purpose: Radix sort implementation is not designed for negative numbers.
    // This test documents the behavior: a result is produced, but it should not match
    // a correct numeric ascending sort performed by JS comparator.
    const input = page.locator(selectors.input);
    const sortButton = page.locator(selectors.sortButton);
    const highlight = page.locator(selectors.highlight);

    const rawArray = [-3, -1, -2];
    const raw = rawArray.join(', ');
    const expectedSorted = rawArray.slice().sort((a, b) => a - b); // [-3, -2, -1]
    const expectedSortedStr = expectedSorted.join(', ');

    await input.fill(raw);
    await sortButton.click();

    // There should be a displayed result (the app will attempt to sort)
    await expect(highlight).toBeVisible();
    const displayed = await highlight.innerText();
    // The displayed result is a string of numbers; split and parse to numbers for comparison
    const displayedNumbers = displayed.split(',').map(s => Number(s.trim()));

    // We assert two things:
    // 1) The app produced a result (the highlight contains some content)
    expect(displayedNumbers.length).toBe(rawArray.length);

    // 2) The produced result does not equal the correct numeric ascending order,
    // documenting the limitation of the current implementation handling negatives.
    const isEqual = displayedNumbers.every((v, i) => v === expectedSorted[i]);
    expect(isEqual).toBe(false);
  });

  // Observing runtime console errors across multiple operations
  test('No unexpected runtime exceptions during multiple operations', async ({ page }) => {
    // Purpose: Run several operations in a row and assert that no page errors occur.
    const pageCapture = { pageErrors: [], consoleErrors: [], consoleMessages: [] };
    await collectRuntimeIssues(page, pageCapture);

    const input = page.locator(selectors.input);
    const sortButton = page.locator(selectors.sortButton);
    const highlight = page.locator(selectors.highlight);

    // First valid sort
    await input.fill('10,5,2,8');
    await sortButton.click();
    await expect(highlight).toHaveText('2, 5, 8, 10');

    // Then invalid input to trigger alert
    const dialogPromise = page.waitForEvent('dialog');
    await input.fill('10, foo, 2');
    await sortButton.click();
    const dialog = await dialogPromise;
    expect(dialog.message()).toBe('Please enter valid integers separated by commas.');
    await dialog.accept();

    // Then another valid sort
    await input.fill('1,3,2');
    await sortButton.click();
    await expect(highlight).toHaveText('1, 2, 3');

    // Assert there were no runtime page errors during these interactions
    expect(pageCapture.pageErrors.length).toBe(0);
    expect(pageCapture.consoleErrors.length).toBe(0);
  });
});