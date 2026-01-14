import { test, expect } from '@playwright/test';

// Page Object for the Array Demo application
class ArrayDemoPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad155a0-d59a-11f0-891d-f361d22ca68a.html';
    this.input = page.locator('#array-input');
    this.addBtn = page.locator('#add-btn');
    this.clearBtn = page.locator('#clear-btn');
    this.output = page.locator('#output');
  }

  async goto() {
    await this.page.goto(this.url, { waitUntil: 'load' });
    // Ensure main UI controls are present before proceeding
    await expect(this.input).toBeVisible();
    await expect(this.addBtn).toBeVisible();
    await expect(this.clearBtn).toBeVisible();
    await expect(this.output).toBeVisible();
  }

  async fillInput(text) {
    await this.input.fill(text);
  }

  async clickAdd() {
    await this.addBtn.click();
  }

  async clickClear() {
    await this.clearBtn.click();
  }

  async getOutputText() {
    return (await this.output.innerText()).trim();
  }

  async getInputValue() {
    return await this.input.inputValue();
  }

  // Read the in-page array variable (if present). We do not modify it.
  async readInternalArray() {
    return await this.page.evaluate(() => {
      try {
        // return array if defined, otherwise undefined
        return typeof array !== 'undefined' ? array : undefined;
      } catch (e) {
        return { __error__: e.message };
      }
    });
  }
}

test.describe('Array Demo FSM - 8ad155a0-d59a-11f0-891d-f361d22ca68a', () => {
  let pageErrors = [];
  let consoleErrors = [];
  let pageObj;

  test.beforeEach(async ({ page }) => {
    // Collect console error messages and page errors for each test
    pageErrors = [];
    consoleErrors = [];

    page.on('pageerror', (err) => {
      // store the actual Error object message for assertions
      pageErrors.push(err);
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    pageObj = new ArrayDemoPage(page);
    await pageObj.goto();
  });

  test.afterEach(async () => {
    // After each test assert that there were no unexpected console errors or page errors.
    // The application is expected to run without runtime exceptions in normal operation.
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test.describe('Idle State (S0_Idle)', () => {
    test('Initial load shows controls and empty output (Idle state)', async () => {
      // Validate UI elements existence and initial state as per FSM Idle evidence
      await expect(pageObj.input).toBeVisible();
      await expect(pageObj.addBtn).toBeVisible();
      await expect(pageObj.clearBtn).toBeVisible();

      // Output should be empty on initial render (no explicit renderPage called in HTML)
      const outputText = await pageObj.getOutputText();
      expect(outputText).toBe('', 'Output should be empty at Idle state');

      // The script initializes an internal array variable to [1,2,3,4,5]; verify internal state without modifying it
      const internalArray = await pageObj.readInternalArray();
      // If the page defined 'array' correctly it should be the initial array as per implementation
      expect(internalArray).toEqual([1, 2, 3, 4, 5]);
    });
  });

  test.describe('AddElements Event and S1_ArrayFilled State', () => {
    test('AddElements transition with valid numeric input updates output (Array Filled)', async () => {
      // This test validates the transition S0_Idle -> S1_ArrayFilled via AddElements
      // Fill input with comma separated numbers and click Add
      await pageObj.fillInput('10, 20, 30');
      await expect(pageObj.getInputValue()).resolves.toBe('10, 20, 30');

      await pageObj.clickAdd();

      // After clicking Add, output should show the joined array as text
      const out = await pageObj.getOutputText();
      expect(out).toBe('Array: 10, 20, 30');
    });

    test('AddElements with empty input shows guidance message', async () => {
      // Edge case: user clicks Add with no input -> should show "Please enter elements..."
      await pageObj.fillInput('');
      await pageObj.clickAdd();

      const out = await pageObj.getOutputText();
      expect(out).toBe('Please enter elements separated by comma and space.');
    });

    test('AddElements with non-numeric tokens results in NaN entries', async () => {
      // The implementation uses map(Number) which will produce NaN for non-numeric tokens
      await pageObj.fillInput('a, b');
      await pageObj.clickAdd();

      const out = await pageObj.getOutputText();
      // Expect NaN values to be present as produced by Number('a') -> NaN
      expect(out).toBe('Array: NaN, NaN');
    });

    test('AddElements handles varied spacing around commas', async () => {
      // Input with inconsistent spacing should still be split on comma then Number()
      await pageObj.fillInput(' 1,2 , 3 ');
      await pageObj.clickAdd();

      const out = await pageObj.getOutputText();
      // Numbers should be parsed and joined correctly
      expect(out).toBe('Array: 1, 2, 3');
    });

    test('After filling array, internal array variable reflects new values', async () => {
      // Fill with numbers and ensure the page's internal `array` was updated accordingly
      await pageObj.fillInput('7,8,9');
      await pageObj.clickAdd();

      const out = await pageObj.getOutputText();
      expect(out).toBe('Array: 7, 8, 9');

      const internalArray = await pageObj.readInternalArray();
      expect(internalArray).toEqual([7, 8, 9]);
    });
  });

  test.describe('ClearArray Event and S2_ArrayCleared State', () => {
    test('ClearArray transition from Idle clears array', async () => {
      // When clear is clicked from idle, array should be cleared and output show 'Array cleared.'
      await pageObj.clickClear();

      const out = await pageObj.getOutputText();
      expect(out).toBe('Array cleared.');

      // internal array should be an empty array as per implementation
      const internalArray = await pageObj.readInternalArray();
      expect(internalArray).toEqual([]);
    });

    test('ClearArray transition from ArrayFilled clears array', async () => {
      // First add elements to move to ArrayFilled
      await pageObj.fillInput('100,200');
      await pageObj.clickAdd();

      let out = await pageObj.getOutputText();
      expect(out).toBe('Array: 100, 200');

      // Now click clear to transition to ArrayCleared
      await pageObj.clickClear();

      out = await pageObj.getOutputText();
      expect(out).toBe('Array cleared.');

      // internal array should be cleared
      const internalArray = await pageObj.readInternalArray();
      expect(internalArray).toEqual([]);
    });
  });

  test.describe('Error and Edge Case Observations', () => {
    test('No runtime ReferenceError / SyntaxError / TypeError should be thrown during normal interactions', async ({ page }) => {
      // This test exercises multiple operations while recording any runtime page errors.
      const localPageObj = new ArrayDemoPage(page);

      // Setup listeners specifically for this test
      const localPageErrors = [];
      const localConsoleErrors = [];
      page.on('pageerror', (err) => localPageErrors.push(err));
      page.on('console', (msg) => {
        if (msg.type() === 'error') localConsoleErrors.push({ text: msg.text(), location: msg.location() });
      });

      await localPageObj.fillInput('5,6,7');
      await localPageObj.clickAdd();
      await localPageObj.clickClear();
      await localPageObj.clickClear(); // repeated clears should not throw
      await localPageObj.fillInput('x, 1');
      await localPageObj.clickAdd();

      // After exercising interactions, assert that there were no page errors or console errors
      expect(localPageErrors.length).toBe(0);
      expect(localConsoleErrors.length).toBe(0);
    });

    test('Attempt to read non-existent globals does not modify page or throw when executed from tests', async () => {
      // We will attempt to access a non-existent global variable via evaluate, which should throw inside page context if referenced directly.
      // We will instead test that reading a guarded property returns undefined rather than causing page-wide exceptions.
      const result = await pageObj.page.evaluate(() => {
        // Do not reference undeclared identifiers directly; test for absence gracefully
        return typeof nonExistentGlobal === 'undefined';
      });
      expect(result).toBe(true);
    });
  });
});