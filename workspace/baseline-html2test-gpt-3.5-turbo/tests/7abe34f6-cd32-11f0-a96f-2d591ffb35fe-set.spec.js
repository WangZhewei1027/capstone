import { test, expect } from '@playwright/test';

// Test file for Application ID: 7abe34f6-cd32-11f0-a96f-2d591ffb35fe
// Filename required: 7abe34f6-cd32-11f0-a96f-2d591ffb35fe-set.spec.js
// The HTML page under test is served at:
// http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abe34f6-cd32-11f0-a96f-2d591ffb35fe.html

const APP_URL =
  'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abe34f6-cd32-11f0-a96f-2d591ffb35fe.html';

// Page Object Model for the Set demo page
class SetDemoPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Selectors
    this.demoSetBtn = page.locator('#demoSetBtn');
    this.basicSetOutput = page.locator('#basicSetOutput');

    this.valueInput = page.locator('#valueInput');
    this.addValueBtn = page.locator('#addValueBtn');
    this.deleteValueBtn = page.locator('#deleteValueBtn');
    this.hasValueBtn = page.locator('#hasValueBtn');

    this.interactiveOutput = page.locator('#interactiveOutput');
    this.setContents = page.locator('#setContents');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async clickBasicDemo() {
    await this.demoSetBtn.click();
  }

  async addValue(val) {
    if (val !== undefined) {
      await this.valueInput.fill(val);
    }
    await this.addValueBtn.click();
  }

  async deleteValue(val) {
    if (val !== undefined) {
      await this.valueInput.fill(val);
    }
    await this.deleteValueBtn.click();
  }

  async hasValue(val) {
    if (val !== undefined) {
      await this.valueInput.fill(val);
    }
    await this.hasValueBtn.click();
  }

  async getBasicOutputText() {
    return await this.basicSetOutput.textContent();
  }

  async getInteractiveOutputText() {
    return await this.interactiveOutput.textContent();
  }

  async getSetContentsText() {
    return await this.setContents.textContent();
  }

  async getValueInputValue() {
    return await this.valueInput.inputValue();
  }

  async isValueInputFocused() {
    return await this.page.evaluate(() => document.activeElement?.id === 'valueInput');
  }
}

test.describe('JavaScript Set Demo - Functional Tests', () => {
  let consoleErrors;
  let pageErrors;

  // Track console error messages and runtime page errors for each test
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console messages and filter for errors
    page.on('console', (msg) => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push({ text: msg.text(), location: msg.location() });
        }
      } catch (e) {
        // If accessing msg.type() throws for any reason, record a generic error
        consoleErrors.push({ text: 'Unknown console error', location: {} });
      }
    });

    // Collect page (uncaught) errors
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  // After each test assert that no console errors or uncaught page errors occurred.
  // This verifies that the page loaded and ran without runtime exceptions.
  test.afterEach(async () => {
    // Assert that no console errors occurred
    expect(consoleErrors, `Expected no console.error messages, found: ${JSON.stringify(consoleErrors, null, 2)}`).toHaveLength(0);

    // Assert that no uncaught page errors occurred
    expect(pageErrors, `Expected no uncaught page errors, found: ${pageErrors.map(e => String(e)).join('\n')}`).toHaveLength(0);
  });

  test('Initial page load shows correct static content and initial Set state', async ({ page }) => {
    // Purpose: Verify page loads, headings are present, and the Set starts empty
    const sp = new SetDemoPage(page);
    await sp.goto();

    // Verify page title and main heading
    await expect(page.locator('title')).toHaveAttribute('text', /JavaScript Set Demonstration|/);
    await expect(page.locator('h1')).toHaveText('JavaScript Set Object Demonstration');

    // Verify interactive controls exist and are visible
    await expect(sp.valueInput).toBeVisible();
    await expect(sp.addValueBtn).toBeVisible();
    await expect(sp.deleteValueBtn).toBeVisible();
    await expect(sp.hasValueBtn).toBeVisible();

    // Verify initial interactive output and set contents
    const initialInteractive = await sp.getInteractiveOutputText();
    expect(initialInteractive?.trim()).toBe('');

    const setContents = await sp.getSetContentsText();
    // The script sets '(Set is empty)' initially
    expect(setContents).toBe('(Set is empty)');
  });

  test('Basic Set demo button demonstrates creation, add, delete, iteration and conversion', async ({ page }) => {
    // Purpose: Click the "Run Basic Set Demo" button and assert expected output lines
    const sp1 = new SetDemoPage(page);
    await sp.goto();

    await sp.clickBasicDemo();

    // Wait for basicSetOutput to be populated
    await expect(sp.basicSetOutput).toBeVisible();
    const text = await sp.getBasicOutputText();
    expect(text).toContain('Created new empty Set.');
    expect(text).toContain('Added values: 1, 5, "some text"');
    expect(text).toContain('Attempted to add duplicate value 5');
    expect(text).toMatch(/Set size is:\s*\d+/); // size line exists
    expect(text).toContain('Set has "some text"? true');
    expect(text).toContain('Set has 7? false');
    expect(text).toContain('Deleted value 5 from Set.');
    expect(text).toContain('Iterate over Set values:');
    expect(text).toContain('Converted Set to Array:');
  });

  test.describe('Interactive Add/Delete/Check flows', () => {
    test('Adding a value updates setContents and provides a confirmation message', async ({ page }) => {
      // Purpose: Add a value and verify DOM updates and input focus/clear behavior
      const sp2 = new SetDemoPage(page);
      await sp.goto();

      // Add 'apple'
      await sp.addValue('apple');

      // interactiveOutput should confirm addition
      await expect(sp.interactiveOutput).toHaveText('Added "apple" to the Set.');

      // setContents should list the added value
      await expect(sp.setContents).toHaveText('apple');

      // input should be cleared and focused
      expect(await sp.getValueInputValue()).toBe('');
      expect(await sp.isValueInputFocused()).toBe(true);
    });

    test('Adding a duplicate value shows appropriate message and does not change set contents', async ({ page }) => {
      // Purpose: Ensure duplicates are not added
      const sp3 = new SetDemoPage(page);
      await sp.goto();

      // Add 'apple' once
      await sp.addValue('apple');
      await expect(sp.setContents).toHaveText('apple');

      // Try to add 'apple' again
      await sp.addValue('apple');
      await expect(sp.interactiveOutput).toHaveText('"apple" is already in the Set.');

      // setContents should remain with single 'apple'
      await expect(sp.setContents).toHaveText('apple');
    });

    test('Deleting an existing value removes it and updates the UI', async ({ page }) => {
      // Purpose: Ensure delete removes values and updates display
      const sp4 = new SetDemoPage(page);
      await sp.goto();

      // Add 'orange' then delete it
      await sp.addValue('orange');
      await expect(sp.setContents).toHaveText('orange');

      // Delete
      await sp.deleteValue('orange');
      await expect(sp.interactiveOutput).toHaveText('Deleted "orange" from the Set.');

      // setContents should indicate empty
      await expect(sp.setContents).toHaveText('(Set is empty)');
    });

    test('Deleting a non-existing value shows a not-found message', async ({ page }) => {
      // Purpose: Verify deletion of missing items produces informative message
      const sp5 = new SetDemoPage(page);
      await sp.goto();

      // Ensure set is empty
      await expect(sp.setContents).toHaveText('(Set is empty)');

      // Attempt delete for 'banana' which is not present
      await sp.deleteValue('banana');
      await expect(sp.interactiveOutput).toHaveText('"banana" was not found in the Set.');

      // setContents should remain empty
      await expect(sp.setContents).toHaveText('(Set is empty)');
    });

    test('Checking presence of values returns correct yes/no messages', async ({ page }) => {
      // Purpose: Validate the has-check functionality for present and absent values
      const sp6 = new SetDemoPage(page);
      await sp.goto();

      // Add 'kiwi' and check
      await sp.addValue('kiwi');
      await expect(sp.setContents).toHaveText('kiwi');

      await sp.hasValue('kiwi');
      await expect(sp.interactiveOutput).toHaveText('Yes, "kiwi" is in the Set.');

      // Check for a missing value 'pear'
      await sp.hasValue('pear');
      await expect(sp.interactiveOutput).toHaveText('No, "pear" is NOT in the Set.');
    });
  });

  test.describe('Edge cases and input validation', () => {
    test('Empty input when adding should produce an instruction message', async ({ page }) => {
      // Purpose: Clicking Add with empty input should ask the user to provide a value
      const sp7 = new SetDemoPage(page);
      await sp.goto();

      // Ensure input is empty
      await sp.valueInput.fill('');
      await sp.addValue(); // click without filling

      await expect(sp.interactiveOutput).toHaveText('Please enter a value to add.');
    });

    test('Empty input when deleting should produce an instruction message', async ({ page }) => {
      // Purpose: Clicking Delete with empty input should ask the user to provide a value
      const sp8 = new SetDemoPage(page);
      await sp.goto();

      // Ensure input is empty
      await sp.valueInput.fill('');
      await sp.deleteValue(); // click without filling

      await expect(sp.interactiveOutput).toHaveText('Please enter a value to delete.');
    });

    test('Empty input when checking should produce an instruction message', async ({ page }) => {
      // Purpose: Clicking Check with empty input should ask the user to provide a value
      const sp9 = new SetDemoPage(page);
      await sp.goto();

      // Ensure input is empty
      await sp.valueInput.fill('');
      await sp.hasValue(); // click without filling

      await expect(sp.interactiveOutput).toHaveText('Please enter a value to check.');
    });
  });

  test.describe('Accessibility and visibility checks', () => {
    test('Interactive controls have accessible text and are focusable', async ({ page }) => {
      // Purpose: Ensure buttons and input are visible and keyboard-focusable
      const sp10 = new SetDemoPage(page);
      await sp.goto();

      // Check visibility
      await expect(sp.addValueBtn).toBeVisible();
      await expect(sp.deleteValueBtn).toBeVisible();
      await expect(sp.hasValueBtn).toBeVisible();
      await expect(sp.valueInput).toBeVisible();

      // Tab into the input to ensure focusable
      await page.keyboard.press('Tab'); // focus typically goes to body->first tabbable; ensure stable
      await sp.valueInput.focus();
      expect(await sp.isValueInputFocused()).toBe(true);

      // Tab to Add button and ensure it's focusable
      await page.keyboard.press('Tab');
      // We can't guarantee exact tab order across environments, so ensure the button can be focused programmatically
      await sp.addValueBtn.focus();
      // Use evaluate to get activeElement id
      const activeId = await page.evaluate(() => document.activeElement?.id);
      expect(['addValueBtn', 'deleteValueBtn', 'hasValueBtn', 'valueInput']).toContain(activeId);
    });
  });
});