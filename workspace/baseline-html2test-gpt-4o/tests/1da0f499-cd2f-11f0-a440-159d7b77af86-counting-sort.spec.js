import { test, expect } from '@playwright/test';

// Test file for Counting Sort Visualization
// Application URL:
// http://127.0.0.1:5500/workspace/html2test/html/1da0f499-cd2f-11f0-a440-159d7b77af86.html

// Page object encapsulating interactions and queries for the counting sort page.
class CountingSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/html2test/html/1da0f499-cd2f-11f0-a440-159d7b77af86.html';
    this.inputSelector = '#arrayInput';
    this.sortButtonSelector = 'button:has-text("Sort")';
    this.displayInputSelector = '#displayInputArray';
    this.displayCountSelector = '#displayCountArray';
    this.displayOutputSelector = '#displayOutputArray';
    this.arrayItemSelector = '.array-item';
  }

  async goto() {
    await this.page.goto(this.url);
  }

  // Fill the input field with a given string.
  async fillInput(value) {
    await this.page.fill(this.inputSelector, value);
  }

  // Click the sort button.
  async clickSort() {
    await this.page.click(this.sortButtonSelector);
  }

  // Return texts of .array-item elements inside a given container selector.
  async getArrayItemsText(containerSelector) {
    const els = await this.page.$$(containerSelector + ' ' + this.arrayItemSelector);
    const texts = [];
    for (const el of els) {
      texts.push((await el.textContent()).trim());
    }
    return texts;
  }

  async getInputArrayItems() {
    return this.getArrayItemsText(this.displayInputSelector);
  }

  async getCountArrayItems() {
    return this.getArrayItemsText(this.displayCountSelector);
  }

  async getOutputArrayItems() {
    return this.getArrayItemsText(this.displayOutputSelector);
  }
}

test.describe('Counting Sort Visualization - End-to-End', () => {
  // Per-test page and page object
  test.beforeEach(async ({ page }) => {
    // Nothing global to setup beyond navigation in individual tests
  });

  // Test initial load and default state of the page.
  test('Initial page load shows inputs and empty visualization areas', async ({ page }) => {
    const ui = new CountingSortPage(page);
    await ui.goto();

    // Basic checks: title, input and button presence
    await expect(page).toHaveTitle(/Counting Sort Visualization/);
    await expect(page.locator(ui.inputSelector)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sort' })).toBeVisible();

    // Visualization containers exist and are empty (no .array-item children)
    const inputItems = await ui.getInputArrayItems();
    const countItems = await ui.getCountArrayItems();
    const outputItems = await ui.getOutputArrayItems();

    // On initial load the display areas should not contain array items
    expect(inputItems.length).toBe(0);
    expect(countItems.length).toBe(0);
    expect(outputItems.length).toBe(0);
  });

  test.describe('Functional sorting behavior', () => {
    // Test sorting with a representative valid dataset and verify DOM updates
    test('Sorts a mixed numeric array and updates Input, Count and Output displays', async ({ page }) => {
      const ui = new CountingSortPage(page);

      // Capture page errors and console messages to assert that no runtime error happens for valid input
      const pageErrors = [];
      page.on('pageerror', e => pageErrors.push(e));
      const consoleMessages = [];
      page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));

      await ui.goto();

      // Provide a sample array with duplicates and different values
      const inputString = '4,2,2,8,3,3,1';
      await ui.fillInput(inputString);

      // Click the Sort button and wait for DOM updates to appear.
      await ui.clickSort();

      // Verify the input display shows each original value in order
      const displayedInput = await ui.getInputArrayItems();
      expect(displayedInput).toEqual(['4', '2', '2', '8', '3', '3', '1']);

      // Compute expected count-array (starting indices) and expected sorted output
      // For input: [4,2,2,8,3,3,1] min=1 max=8 => indices 1..8 mapped to 0..7
      const expectedCountArray = ['0', '1', '3', '5', '6', '6', '6', '6']; // as strings because DOM text nodes are strings
      const expectedOutputArray = ['1', '2', '2', '3', '3', '4', '8'];

      // Wait for output items to be rendered (basic synchronization)
      const outputItems = await ui.getOutputArrayItems();
      expect(outputItems.length).toBe(expectedOutputArray.length);
      expect(outputItems).toEqual(expectedOutputArray);

      // The count array is displayed before the output is constructed in the code;
      // ensure it matches the expected prefix-start indices
      const displayedCount = await ui.getCountArrayItems();
      // The code displays countArray values as numbers in .array-item; compare to expected strings
      expect(displayedCount).toEqual(expectedCountArray);

      // Ensure no page errors were emitted for this valid input
      expect(pageErrors.length).toBe(0);

      // Console messages are optional; at minimum ensure no console 'error' entries were emitted
      const consoleErrorCount = consoleMessages.filter(m => m.type === 'error').length;
      expect(consoleErrorCount).toBe(0);
    });

    test('Handles extra whitespace and sorts correctly', async ({ page }) => {
      const ui = new CountingSortPage(page);
      await ui.goto();

      // Input with spaces and irregular formatting should still produce a correct sorted output
      await ui.fillInput(' 5 , 3,  4 ,5 ');
      await ui.clickSort();

      const displayedInput = await ui.getInputArrayItems();
      // map(Number) will convert the trimmed pieces to numbers; displayed input shows as text of numbers or NaN
      // For these valid numeric substrings we expect numeric text representations
      expect(displayedInput).toEqual(['5', '3', '4', '5']);

      // Expected sorted array: [3,4,5,5]
      const output = await ui.getOutputArrayItems();
      expect(output).toEqual(['3', '4', '5', '5']);
    });
  });

  test.describe('Edge cases and runtime errors (observing natural errors without modifying page)', () => {
    // This test intentionally triggers the runtime error that occurs when input cannot be parsed to numbers
    // The page implementation will attempt operations like Math.max(...inputArray) and new Array(NaN)
    // which may produce an unhandled exception. We must observe that pageerror occurs naturally.
    test('Empty input (or malformed numeric input) triggers a runtime page error (invalid array length)', async ({ page }) => {
      const ui = new CountingSortPage(page);
      await ui.goto();

      // Wait for a pageerror event when clicking Sort with an empty input.
      // The page's JavaScript will create inputArray = [''] -> map(Number) => [NaN]
      // Math.max(...inputArray) -> NaN, then new Array(max - min + 1) -> new Array(NaN) may throw.
      const [error] = await Promise.all([
        page.waitForEvent('pageerror'),
        (async () => {
          // Ensure input is empty and click Sort
          await ui.fillInput(''); // deliberate empty string to provoke error
          await ui.clickSort();
        })(),
      ]);

      // Assert that an error object was emitted and has a message indicating an invalid array length
      expect(error).toBeTruthy();
      // Message content can vary across engines but we expect it to mention 'Invalid' or 'length' or 'NaN'
      const msg = error.message || String(error);
      expect(msg.toLowerCase()).toMatch(/invalid|length|nan/);
    });

    test('Non-numeric entries produce a runtime error (natural pageerror observed)', async ({ page }) => {
      const ui = new CountingSortPage(page);
      await ui.goto();

      // Provide clearly non-numeric input to provoke the same invalid-array-length behavior
      const [error] = await Promise.all([
        page.waitForEvent('pageerror'),
        (async () => {
          await ui.fillInput('a,b,c');
          await ui.clickSort();
        })(),
      ]);

      expect(error).toBeTruthy();
      const msg = error.message || String(error);
      expect(msg.toLowerCase()).toMatch(/invalid|length|nan/);
    });
  });

  test.describe('Accessibility and controls', () => {
    test('Sort button is reachable by role and has expected label', async ({ page }) => {
      const ui = new CountingSortPage(page);
      await ui.goto();

      // Using Playwright's role query to find the button ensures accessibility semantics are present
      const button = page.getByRole('button', { name: 'Sort' });
      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();

      // Click via role-based locator to ensure the same behavior
      await ui.fillInput('2,1');
      await button.click();

      // Check sorted output
      const output = await ui.getOutputArrayItems();
      expect(output).toEqual(['1', '2']);
    });
  });
});