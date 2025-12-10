import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d571bf0-d1d8-11f0-bbda-359f3f96b638.html';

// Page Object for the Linear Search page
class LinearSearchPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.numberList = page.locator('#numberList');
    this.searchNumber = page.locator('#searchNumber');
    this.searchButton = page.locator('#searchButton');
    this.result = page.locator('#result');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async fillNumberList(value) {
    await this.numberList.fill(value);
  }

  async fillSearchNumber(value) {
    await this.searchNumber.fill(value);
  }

  async clickSearch() {
    await this.searchButton.click();
  }

  async getResultText() {
    return (await this.result.textContent()) || '';
  }

  async expectPlaceholders() {
    await expect(this.numberList).toHaveAttribute('placeholder', 'e.g. 4, 2, 5, 1, 3');
    await expect(this.searchNumber).toHaveAttribute('placeholder', 'e.g. 3');
  }
}

test.describe('Linear Search Demonstration - FSM and UI tests', () => {
  // Collect console errors and page errors to assert none occur during tests.
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages
    page.on('console', msg => {
      // Record only error-level console messages (these indicate runtime errors)
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location()
        });
      }
    });

    // Capture unhandled page errors
    page.on('pageerror', error => {
      pageErrors.push({
        message: error.message,
        stack: error.stack
      });
    });
  });

  test.afterEach(async () => {
    // After each test, assert there were no uncaught console errors or page errors.
    // This validates that the page's JavaScript executed without raising runtime exceptions.
    expect(consoleErrors, `Console errors were logged: ${JSON.stringify(consoleErrors, null, 2)}`).toHaveLength(0);
    expect(pageErrors, `Page errors were thrown: ${JSON.stringify(pageErrors, null, 2)}`).toHaveLength(0);
  });

  test('S0_Idle: initial render shows inputs, button and empty result', async ({ page }) => {
    // This test validates the initial Idle state (S0_Idle) UI elements per FSM evidence:
    // - #numberList input exists with placeholder
    // - #searchNumber input exists with placeholder
    // - #searchButton exists
    // - #result is empty
    const app = new LinearSearchPage(page);
    await app.goto();

    // Check elements are visible
    await expect(app.numberList).toBeVisible();
    await expect(app.searchNumber).toBeVisible();
    await expect(app.searchButton).toBeVisible();
    await expect(app.result).toBeVisible();

    // Check placeholders match expected evidence in FSM
    await app.expectPlaceholders();

    // Result area should be empty on initial render
    const initialResult = await app.getResultText();
    expect(initialResult.trim()).toBe('');
  });

  test('Transition S0_Idle -> S1_Searching -> S2_Result: successful search returns found index', async ({ page }) => {
    // This test validates the searching transition and the final Result state when the searched number is present.
    // It corresponds to the guard: numbersInput.trim() !== '' && !isNaN(searchValue)
    const app1 = new LinearSearchPage(page);
    await app.goto();

    // Provide a comma-separated list and a search value that exists
    await app.fillNumberList('4, 2, 5, 1, 3');
    await app.fillSearchNumber('3');

    // Click Search to trigger the transition (SearchClick event)
    await app.clickSearch();

    // Verify the result text matches the expected found message and index (index of 3 is 4)
    const resultText = (await app.getResultText()).trim();
    expect(resultText).toBe('The number 3 was found at index 4.');
  });

  test('Transition S1_Searching -> S2_Result: successful search handles whitespace and parsing', async ({ page }) => {
    // Validate parsing robustness: spaces, extra commas and duplicate numbers.
    const app2 = new LinearSearchPage(page);
    await app.goto();

    await app.fillNumberList(' 7 , 7,  2,10 ');
    await app.fillSearchNumber('7');
    await app.clickSearch();

    // Should find the first 7 at index 0
    const resultText1 = (await app.getResultText()).trim();
    expect(resultText).toBe('The number 7 was found at index 0.');
  });

  test('Transition S1_Searching -> S2_Result: not found result message', async ({ page }) => {
    // Validate the branch where the number is not present - still S2_Result final type (result shown)
    const app3 = new LinearSearchPage(page);
    await app.goto();

    await app.fillNumberList('1,2,3,4');
    await app.fillSearchNumber('9');
    await app.clickSearch();

    const resultText2 = (await app.getResultText()).trim();
    expect(resultText).toBe('The number 9 was not found in the list.');
  });

  test('Transition S1_Searching -> S3_Error: empty number list triggers error message', async ({ page }) => {
    // This test validates the Error final state when numbersInput.trim() === ''
    const app4 = new LinearSearchPage(page);
    await app.goto();

    // Leave number list empty and provide a valid search number
    await app.fillNumberList('   ');
    await app.fillSearchNumber('3');
    await app.clickSearch();

    const resultText3 = (await app.getResultText()).trim();
    expect(resultText).toBe('Please enter valid numbers.');
  });

  test('Transition S1_Searching -> S3_Error: non-numeric search input triggers error message', async ({ page }) => {
    // Validate guard isNaN(searchValue) branch when searchNumber is invalid
    const app5 = new LinearSearchPage(page);
    await app.goto();

    await app.fillNumberList('1,2,3');
    await app.fillSearchNumber('abc');
    await app.clickSearch();

    const resultText4 = (await app.getResultText()).trim();
    expect(resultText).toBe('Please enter valid numbers.');
  });

  test('Sequential searches: previous result is replaced and multiple transitions work', async ({ page }) => {
    // Validate that multiple clicks / searches update the result element consistently
    const app6 = new LinearSearchPage(page);
    await app.goto();

    await app.fillNumberList('10,20,30,20');
    await app.fillSearchNumber('20');
    await app.clickSearch();

    let resultText5 = (await app.getResultText()).trim();
    // First occurrence of 20 is at index 1
    expect(resultText).toBe('The number 20 was found at index 1.');

    // Now search for a value not present
    await app.fillSearchNumber('99');
    await app.clickSearch();
    resultText = (await app.getResultText()).trim();
    expect(resultText).toBe('The number 99 was not found in the list.');

    // Now provide invalid input to trigger error state
    await app.fillNumberList('');
    await app.fillSearchNumber('');
    await app.clickSearch();
    resultText = (await app.getResultText()).trim();
    expect(resultText).toBe('Please enter valid numbers.');
  });

  test('Event wiring: clicking search button triggers click handler (evidence detection)', async ({ page }) => {
    // This test asserts the presence of the click handler indirectly by checking that clicking the button produces a result change.
    // It is evidence for the FSM event SearchClick wiring described in the model.
    const app7 = new LinearSearchPage(page);
    await app.goto();

    await app.fillNumberList('5,6,7');
    await app.fillSearchNumber('6');

    // Before click, result should be empty
    expect((await app.getResultText()).trim()).toBe('');

    // Click
    await app.clickSearch();

    // After click, result updates, indicating the click handler executed
    const resultText6 = (await app.getResultText()).trim();
    expect(resultText).toBe('The number 6 was found at index 1.');
  });

  test('Edge case: list with non-numeric entries leads to parseInt producing NaN elements but still functions for valid searches', async ({ page }) => {
    // This test checks behavior when the list contains some non-numeric items.
    // The implementation uses parseInt during array mapping, which may produce NaN for some entries.
    // A valid numeric search may still succeed if present.
    const app8 = new LinearSearchPage(page);
    await app.goto();

    await app.fillNumberList('3, foo, 4, bar, 5');
    await app.fillSearchNumber('5');
    await app.clickSearch();

    // Expect to find 5 at the appropriate index (index counting includes NaNs)
    const resultText7 = (await app.getResultText()).trim();
    // Array after parseInt => [3, NaN, 4, NaN, 5] => 5 at index 4
    expect(resultText).toBe('The number 5 was found at index 4.');
  });

  test('UI integrity: button styles and hover does not throw runtime errors (visual/DOM checks)', async ({ page }) => {
    // This test inspects some style properties and simulates hover to ensure no runtime errors occur.
    const app9 = new LinearSearchPage(page);
    await app.goto();

    // Get computed background color of the button (depends on browser but should be defined)
    const bgColor = await page.evaluate(() => {
      const btn = document.getElementById('searchButton');
      return window.getComputedStyle(btn).backgroundColor;
    });

    expect(typeof bgColor).toBe('string');
    expect(bgColor.length).toBeGreaterThan(0);

    // Simulate hover - Playwright will dispatch mouse events; ensure no errors captured by pageerror handlers
    await app.searchButton.hover();

    // No explicit DOM change expected, but previous afterEach will assert no console/page errors occurred.
  });
});