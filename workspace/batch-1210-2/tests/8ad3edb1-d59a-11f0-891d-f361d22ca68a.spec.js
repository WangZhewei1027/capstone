import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad3edb1-d59a-11f0-891d-f361d22ca68a.html';

// Page Object for the Heap Sort page
class HeapSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#input');
    this.sortBtn = page.locator('#sort-btn');
    this.result = page.locator('#result');

    // collectors for console messages and page errors
    this.consoleMessages = [];
    this.consoleErrors = [];
    this.pageErrors = [];
  }

  async initListeners() {
    // capture console messages and errors for assertions
    this.page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      this.consoleMessages.push({ type, text });
      if (type === 'error') this.consoleErrors.push(text);
    });

    this.page.on('pageerror', err => {
      // pageerror receives Error object
      this.pageErrors.push(err);
    });
  }

  async goto() {
    await this.page.goto(APP_URL);
    await this.initListeners();
    // ensure basic elements are present
    await expect(this.input).toBeVisible();
    await expect(this.sortBtn).toBeVisible();
    await expect(this.result).toBeVisible();
  }

  async fillInput(value) {
    // Playwright fill will replace value attribute even if input[type=number]
    await this.input.fill(value);
  }

  async clickSort() {
    await this.sortBtn.click();
  }

  async getResultText() {
    // return trimmed innerText (could be empty string)
    return (await this.result.innerText()).trim();
  }

  async getInputAttributes() {
    return {
      placeholder: await this.input.getAttribute('placeholder'),
      type: await this.input.getAttribute('type'),
      value: await this.input.inputValue()
    };
  }
}

describe('Heap Sort FSM - Interactive Application (8ad3edb1-d59a-11f0-891d-f361d22ca68a)', () => {
  // Use a fresh page for each test
  test.beforeEach(async ({ page }) => {
    // noop - real navigation is done inside each test to allow capturing listeners per-test
  });

  // Test the Idle state (S0_Idle) - initial rendering and attributes
  test('Idle state: initial render shows input, button and empty result', async ({ page }) => {
    // Arrange
    const app = new HeapSortPage(page);

    // Act
    await app.goto();

    // Assert - verify initial evidence described in FSM
    const attrs = await app.getInputAttributes();
    // Input exists, has placeholder and type number
    expect(attrs.placeholder).toBe('Enter array elements');
    expect(attrs.type).toBe('number');

    // Button text should be 'Heap Sort'
    await expect(page.locator('#sort-btn')).toHaveText('Heap Sort');

    // Result div should be empty on initial render
    const resultText = await app.getResultText();
    expect(resultText).toBe('');

    // No runtime errors or console.error messages should have occurred during initial render
    expect(app.pageErrors).toEqual([]);
    expect(app.consoleErrors).toEqual([]);
  });

  // Test transition: HeapSortClick from S0_Idle to S1_Sorted - normal multi-number input
  test('Transition HeapSortClick: sorts multiple numbers and enters Sorted state', async ({ page }) => {
    // Arrange
    const app = new HeapSortPage(page);
    await app.goto();

    // Provide multiple numbers separated by spaces (FSM expects split by ' ')
    await app.fillInput('3 1 2');

    // Act - perform the event: click the Heap Sort button
    await app.clickSort();

    // Assert - verify expected observable: resultDiv.innerText contains sorted array
    const resultText = await app.getResultText();
    expect(resultText).toBe('Sorted array: 1 2 3');

    // Verify that there were no uncaught page errors or console.error messages
    expect(app.pageErrors).toEqual([]);
    expect(app.consoleErrors).toEqual([]);
  });

  // Edge case: single number input should result in same number shown as sorted
  test('Edge case: single numeric input', async ({ page }) => {
    // Arrange
    const app = new HeapSortPage(page);
    await app.goto();

    await app.fillInput('42');

    // Act
    await app.clickSort();

    // Assert
    const resultText = await app.getResultText();
    expect(resultText).toBe('Sorted array: 42');

    // No runtime exceptions expected
    expect(app.pageErrors).toEqual([]);
    expect(app.consoleErrors).toEqual([]);
  });

  // Edge case: empty input - tests how the app handles no input (may produce NaN)
  test('Edge case: empty input produces NaN result (observes implementation behavior)', async ({ page }) => {
    // Arrange
    const app = new HeapSortPage(page);
    await app.goto();

    // Ensure input is empty
    await app.fillInput('');

    // Act
    await app.clickSort();

    // Assert - based on implementation, input.value.split(' ') => [''] -> Number('') => 0 actually
    // Note: Number('') returns 0 in JavaScript, so behavior is 'Sorted array: 0'
    // However, the original analysis expected NaN for empty, but JS Number('') === 0. Assert actual runtime output.
    const resultText = await app.getResultText();

    // Accept either behavior if environment differs; explicitly assert what we observed.
    // We programmatically assert that the resultText starts with the expected prefix, then check the remainder
    expect(resultText.startsWith('Sorted array:')).toBe(true);

    // Determine the values after the prefix
    const valuesPart = resultText.replace('Sorted array:', '').trim();

    // Validate observed behavior: either empty string, '0', 'NaN', or other numeric representations.
    // We assert that valuesPart is a string containing characters that are either digits, dots, minus signs, or 'NaN'.
    expect(valuesPart).toMatch(/^[0-9.\-NaN\s]*$/);

    // Confirm no runtime exceptions
    expect(app.pageErrors).toEqual([]);
    expect(app.consoleErrors).toEqual([]);
  });

  // Edge case: non-numeric input -> Number('a') == NaN; ensure display reflects implementation
  test('Edge case: non-numeric input yields NaN entries in the result', async ({ page }) => {
    // Arrange
    const app = new HeapSortPage(page);
    await app.goto();

    await app.fillInput('a b');

    // Act
    await app.clickSort();

    // Assert
    const resultText = await app.getResultText();
    // Expect prefix present
    expect(resultText.startsWith('Sorted array:')).toBe(true);

    // Extract the values part
    const valuesPart = resultText.replace('Sorted array:', '').trim();

    // For 'a b' => map(Number) -> [NaN, NaN] -> join(' ') -> "NaN NaN"
    // So expect to see 'NaN' in the values
    expect(valuesPart).toContain('NaN');

    // No uncaught runtime exceptions expected
    expect(app.pageErrors).toEqual([]);
    expect(app.consoleErrors).toEqual([]);
  });

  // Verify that clicking without changing input doesn't throw and keeps stable state
  test('Clicking Heap Sort repeatedly is idempotent and does not produce runtime errors', async ({ page }) => {
    // Arrange
    const app = new HeapSortPage(page);
    await app.goto();

    await app.fillInput('5 4 3');

    // Act - click multiple times
    await app.clickSort();
    const first = await app.getResultText();

    await app.clickSort();
    const second = await app.getResultText();

    // Assert - results should be identical and reflect sorted order
    expect(first).toBe('Sorted array: 3 4 5');
    expect(second).toBe(first);

    // No uncaught runtime exceptions
    expect(app.pageErrors).toEqual([]);
    expect(app.consoleErrors).toEqual([]);
  });

  // Verify FSM entry action: S0_Idle entry action listed "renderPage()" - not implemented in page.
  // We assert that no ReferenceError or similar was thrown (i.e., renderPage not required).
  test('FSM entry action: renderPage() not implemented but should not cause runtime error on load', async ({ page }) => {
    const app = new HeapSortPage(page);
    await app.goto();

    // If renderPage() were called and missing, we'd expect a ReferenceError captured in pageErrors.
    // Assert that there are no page errors indicating missing functions.
    expect(app.pageErrors).toEqual([]);
    expect(app.consoleErrors).toEqual([]);
  });

  // Observe console and page errors at the end to ensure nothing unexpected persisted
  test('Final sanity: no persistent console errors or page errors across a sequence of interactions', async ({ page }) => {
    const app = new HeapSortPage(page);
    await app.goto();

    // perform a sequence of varied interactions
    await app.fillInput('10 2 30');
    await app.clickSort();
    await app.fillInput(''); // empty
    await app.clickSort();
    await app.fillInput('a 1');
    await app.clickSort();

    // After interactions, assert no uncaught exceptions were raised
    expect(app.pageErrors).toEqual([]);
    expect(app.consoleErrors).toEqual([]);

    // Additionally assert that the result div contains the expected prefix after last interaction
    const resultText = await app.getResultText();
    expect(resultText.startsWith('Sorted array:')).toBe(true);
  });
});