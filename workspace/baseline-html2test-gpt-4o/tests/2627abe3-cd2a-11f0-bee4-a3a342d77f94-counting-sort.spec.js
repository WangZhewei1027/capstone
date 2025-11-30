import { test, expect } from '@playwright/test';

// Page Object for the Counting Sort page
class CountingSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url =
      'http://127.0.0.1:5500/workspace/html2test/html/2627abe3-cd2a-11f0-bee4-a3a342d77f94.html';
    this.inputSelector = '#inputArray';
    this.buttonSelector = 'button'; // single button on the page
    this.outputSelector = '#array';
    this.headingSelector = 'h1';
  }

  // Navigate to the page
  async goto() {
    await this.page.goto(this.url);
  }

  // Set the input value
  async setInput(value) {
    await this.page.fill(this.inputSelector, value);
  }

  // Click the sort button
  async clickSort() {
    await this.page.click(this.buttonSelector);
  }

  // Get the output text
  async getOutputText() {
    const el = await this.page.$(this.outputSelector);
    if (!el) return null;
    return (await el.innerText()).trim();
  }

  // Get heading text
  async getHeadingText() {
    return (await this.page.textContent(this.headingSelector)).trim();
  }

  // Clear input
  async clearInput() {
    await this.page.fill(this.inputSelector, '');
  }
}

test.describe('Counting Sort Demonstration - UI and behavior', () => {
  // Arrays to capture console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Initialize capture arrays
    consoleMessages = [];
    pageErrors = [];

    // Listen to console messages
    page.on('console', (msg) => {
      // store the whole message object for later inspection
      consoleMessages.push(msg);
    });

    // Listen for page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to app
    const countingPage = new CountingSortPage(page);
    await countingPage.goto();
  });

  test.afterEach(async ({ page }) => {
    // Extra check: ensure no unexpected navigation happened (basic sanity)
    // Not asserting here as it's just cleanup hook — main assertions are in tests
    await page.waitForLoadState('domcontentloaded');
  });

  test('Initial page load shows heading, input and empty output', async ({ page }) => {
    // Purpose: Verify initial state of the page on load
    const p = new CountingSortPage(page);

    // Heading should be present and correct
    const heading = await p.getHeadingText();
    expect(heading).toBe('Counting Sort Demonstration');

    // Input should be visible and empty by default
    const inputValue = await page.inputValue(p.inputSelector);
    expect(inputValue).toBe('');

    // Output paragraph should exist and be empty string initially
    const outputText = await p.getOutputText();
    expect(outputText).toBe(''); // empty on initial load

    // Ensure there are no runtime page errors or console errors on initial load
    const consoleErrors = consoleMessages.filter((m) => m.type() === 'error');
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Clicking Sort with empty input shows a helpful prompt', async ({ page }) => {
    // Purpose: Verify error handling when no input is provided
    const p = new CountingSortPage(page);

    // Ensure input is empty
    await p.clearInput();

    // Click the Sort button
    await p.clickSort();

    // Expect output to instruct user to enter numbers
    const output = await p.getOutputText();
    expect(output).toBe('Please enter some numbers!');

    // Assert no unexpected JS errors were thrown during the interaction
    const consoleErrors = consoleMessages.filter((m) => m.type() === 'error');
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Non-numeric input displays invalid input message', async ({ page }) => {
    // Purpose: Input with only non-numeric values should be handled gracefully
    const p = new CountingSortPage(page);

    // Provide purely non-numeric values
    await p.setInput('a, b, foo, bar');

    // Click sort
    await p.clickSort();

    // Expect invalid input message
    const output = await p.getOutputText();
    expect(output).toBe('Invalid input! Please enter numbers only.');

    // Ensure no JS errors or console errors occurred
    const consoleErrors = consoleMessages.filter((m) => m.type() === 'error');
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Mixed valid and invalid entries filters invalid and sorts remaining numbers', async ({ page }) => {
    // Purpose: Ensure that non-numeric tokens are filtered out and valid numbers are sorted
    const p = new CountingSortPage(page);

    // Mixed input - includes a non-number "foo" that should be filtered out
    await p.setInput('4, 2, foo, 3');

    // Click sort
    await p.clickSort();

    // Expect sorted remaining numbers (2,3,4)
    const output = await p.getOutputText();
    expect(output).toBe('Sorted Array: 2, 3, 4');

    // No JS console errors or uncaught exceptions should have happened
    const consoleErrors = consoleMessages.filter((m) => m.type() === 'error');
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Sorting a typical array yields the expected sorted output', async ({ page }) => {
    // Purpose: Validate core functionality with example from UI placeholder
    const p = new CountingSortPage(page);

    // Example input from placeholder
    await p.setInput('4, 2, 2, 8, 3, 3, 1');

    // Click the sort button
    await p.clickSort();

    // Expect correctly sorted array
    const output = await p.getOutputText();
    expect(output).toBe('Sorted Array: 1, 2, 2, 3, 3, 4, 8');

    // Confirm no runtime errors
    const consoleErrors = consoleMessages.filter((m) => m.type() === 'error');
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Sorting handles negative numbers and ranges correctly', async ({ page }) => {
    // Purpose: Verify counting sort implementation handles negative minimums and constructs range properly
    const p = new CountingSortPage(page);

    // Input includes negative and positive values
    await p.setInput('-2, -5, 0, 3');

    await p.clickSort();

    // Expect sorted ascending sequence
    const output = await p.getOutputText();
    expect(output).toBe('Sorted Array: -5, -2, 0, 3');

    // No errors expected
    const consoleErrors = consoleMessages.filter((m) => m.type() === 'error');
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Whitespace around numbers is tolerated and still sorts correctly', async ({ page }) => {
    // Purpose: Ensure trimming/number conversion tolerates extra whitespace
    const p = new CountingSortPage(page);

    // Intentionally include varied whitespace
    await p.setInput('  10 ,\t2,3  ,  2 ');

    await p.clickSort();

    const output = await p.getOutputText();
    // Converted and sorted: 2,2,3,10
    expect(output).toBe('Sorted Array: 2, 2, 3, 10');

    // Confirm no console errors or uncaught exceptions
    const consoleErrors = consoleMessages.filter((m) => m.type() === 'error');
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Repeated interactions update the output element predictably', async ({ page }) => {
    // Purpose: Ensure multiple sorts in the same session update DOM consistently
    const p = new CountingSortPage(page);

    // First sort
    await p.setInput('3,1,2');
    await p.clickSort();
    expect(await p.getOutputText()).toBe('Sorted Array: 1, 2, 3');

    // Second sort with different input
    await p.setInput('5,4');
    await p.clickSort();
    expect(await p.getOutputText()).toBe('Sorted Array: 4, 5');

    // Third, empty input should show the empty-input message
    await p.clearInput();
    await p.clickSort();
    expect(await p.getOutputText()).toBe('Please enter some numbers!');

    // No runtime errors over repeated interactions
    const consoleErrors = consoleMessages.filter((m) => m.type() === 'error');
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });
});