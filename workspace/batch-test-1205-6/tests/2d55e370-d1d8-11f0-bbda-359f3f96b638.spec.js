import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d55e370-d1d8-11f0-bbda-359f3f96b638.html';

// Page object for the Set Example application
class SetPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#numberInput');
    this.addButton = page.locator('#addButton');
    this.clearButton = page.locator('#clearButton');
    this.setDisplay = page.locator('#setDisplay');
    this.result = page.locator('#result');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for the basic elements to be present
    await Promise.all([
      this.input.waitFor({ state: 'visible' }),
      this.addButton.waitFor({ state: 'visible' }),
      this.clearButton.waitFor({ state: 'visible' }),
      this.setDisplay.waitFor({ state: 'visible' }),
    ]);
  }

  async addNumbers(text) {
    await this.input.fill(text);
    await this.addButton.click();
    // allow DOM updates
    await this.page.waitForTimeout(50);
  }

  async clearSet() {
    await this.clearButton.click();
    // allow DOM updates
    await this.page.waitForTimeout(50);
  }

  async getDisplayText() {
    // Use textContent to preserve empty string if that's what's set
    const txt = await this.setDisplay.textContent();
    return txt;
  }

  async getInputValue() {
    return await this.input.inputValue();
  }

  async isResultVisible() {
    return await this.result.isVisible();
  }
}

test.describe('Set Example FSM tests (Application ID: 2d55e370-d1d8-11f0-bbda-359f3f96b638)', () => {
  let pageErrors = [];
  let consoleErrors = [];

  // Setup: each test gets a fresh page and error collectors
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];

    // Collect uncaught page errors (ReferenceError, TypeError, etc.)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Collect console messages, specifically capture error-level logs
    page.on('console', (msg) => {
      // store all console messages of type 'error' for assertions
      if (msg.type() === 'error') {
        consoleErrors.push(msg);
      }
    });
  });

  // Teardown assertions that no unexpected runtime errors were emitted.
  // This runs after each test to ensure the page didn't produce errors.
  test.afterEach(async () => {
    // Assert there were no uncaught page errors
    expect(pageErrors.length, `Expected no uncaught page errors, but got: ${pageErrors.map(e => String(e)).join('; ')}`).toBe(0);
    // Assert there were no console.error messages
    expect(consoleErrors.length, `Expected no console.error messages, but got ${consoleErrors.length}`).toBe(0);
  });

  test.describe('State S0_Idle initial UI and components', () => {
    test('Initial state Idle: input, buttons, and initial set display present', async ({ page }) => {
      // Validate initial UI elements and that the app loads without runtime errors
      const app = new SetPage(page);
      await app.goto();

      // Check that controls are visible and interactive
      expect(await app.isResultVisible(), 'Result container should be visible').toBe(true);
      expect(await app.getInputValue(), 'Input should be empty initially').toBe('');
      const setText = await app.getDisplayText();
      // The HTML initially sets setDisplay to "[]"
      expect(setText, 'Initial set display should show "[]" as provided in HTML').toBe('[]');
    });
  });

  test.describe('AddToSet event and transitions (S0_Idle -> S1_SetUpdated, S1_SetUpdated -> S1_SetUpdated)', () => {
    test('Add a single number transitions to Set Updated and displays that number', async ({ page }) => {
      // This validates the AddToSet event from Idle -> SetUpdated
      const app1 = new SetPage(page);
      await app.goto();

      await app.addNumbers('5');

      // After adding, the set should display the single number "5"
      const setText1 = await app.getDisplayText();
      expect(setText, 'Set should display the single added number').toBe('5');

      // The input should be cleared after adding
      expect(await app.getInputValue(), 'Input should be cleared after adding').toBe('');
    });

    test('Add multiple comma-separated numbers (with duplicates) results in unique sorted display', async ({ page }) => {
      // This validates multiple numbers being parsed, duplicates ignored, and sorted order
      const app2 = new SetPage(page);
      await app.goto();

      // Add a batch with duplicates and out-of-order values
      await app.addNumbers('3,1,2,2,3');

      // Expect sorted unique numbers with comma + space separation per implementation
      const setText2 = await app.getDisplayText();
      expect(setText, 'Set should contain unique sorted numbers "1, 2, 3"').toBe('1, 2, 3');

      // Add more numbers while in S1_SetUpdated to ensure repeated AddToSet keeps updating correctly
      await app.addNumbers('0,5');
      const updated = await app.getDisplayText();
      expect(updated, 'After adding 0 and 5 the set should update and remain sorted').toBe('0, 1, 2, 3, 5');
    });

    test('Adding non-numeric values are ignored and do not cause runtime errors', async ({ page }) => {
      // This validates that invalid inputs do not get added and do not crash the app
      const app3 = new SetPage(page);
      await app.goto();

      // Start from clean state
      await app.addNumbers('10,20');
      expect(await app.getDisplayText()).toBe('10, 20');

      // Attempt to add non-numeric and whitespace-only tokens
      await app.addNumbers('abc,  , 30, NaN, 40.5');

      // Implementation uses Number(...) and isNaN check; 'NaN' -> Number('NaN') is NaN and ignored
      // So expected final set should include 10,20,30,40.5 sorted numerically
      const expected = '10, 20, 30, 40.5';
      expect(await app.getDisplayText(), 'Non-numeric tokens should be ignored; numeric tokens added').toBe(expected);
    });

    test('Adding empty input does nothing and does not throw', async ({ page }) => {
      // Edge case: the user clicks Add with an empty input
      const app4 = new SetPage(page);
      await app.goto();

      // Ensure starting with an empty set (clear first)
      await app.clearSet();
      expect(await app.getDisplayText(), 'After clearing, empty set should display empty string (per implementation)').toBe('');

      // Click add with empty input
      await app.addNumbers('');
      // No change expected and no errors thrown
      expect(await app.getDisplayText(), 'Empty add should not change set display').toBe('');
    });
  });

  test.describe('ClearSet event and transitions (S1_SetUpdated -> S1_SetUpdated and S0_Idle -> S0_Idle)', () => {
    test('Clear set clears all items and updates display (returns to Idle visual state)', async ({ page }) => {
      // This validates ClearSet event behavior in both Idle and SetUpdated states
      const app5 = new SetPage(page);
      await app.goto();

      // Add some numbers first
      await app.addNumbers('7,2,9');
      expect(await app.getDisplayText()).toBe('2, 7, 9');

      // Clear the set
      await app.clearSet();

      // Per the implementation, updateSetDisplay sets textContent to join(...) which produces an empty string when the set is empty
      const afterClear = await app.getDisplayText();
      expect(afterClear, 'After clearing the set the display should be empty string ("" in DOM)').toBe('');

      // Now test clearing again while already empty (Idle -> Idle)
      await app.clearSet(); // should be a no-op without error
      expect(await app.getDisplayText(), 'Clearing an already empty set should remain empty string').toBe('');
    });
  });

  test.describe('Edge cases and additional behaviors', () => {
    test('Negative and large numbers are handled and sorted numerically', async ({ page }) => {
      const app6 = new SetPage(page);
      await app.goto();

      await app.clearSet();
      await app.addNumbers('-1, 1000000, 5, -10');

      // Numeric sort should put negatives first, then positives ascending
      expect(await app.getDisplayText(), 'Numbers should be sorted numerically including negatives and large numbers').toBe('-10, -1, 5, 1000000');
    });

    test('State transitions: multiple sequential adds and clears behave predictably', async ({ page }) => {
      const app7 = new SetPage(page);
      await app.goto();

      // Add some numbers
      await app.addNumbers('4,2');
      expect(await app.getDisplayText()).toBe('2, 4');

      // Add more (transition S1 -> S1)
      await app.addNumbers('3');
      expect(await app.getDisplayText()).toBe('2, 3, 4');

      // Clear (S1 -> S1 but results in empty)
      await app.clearSet();
      expect(await app.getDisplayText()).toBe('');

      // Add again from empty (S0 -> S1)
      await app.addNumbers('1');
      expect(await app.getDisplayText()).toBe('1');
    });
  });
});