import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f76697c0-d5b8-11f0-9ee1-ef07bdc6053d.html';

// Page object for the Set Demonstration app
class SetPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.selectors = {
      input: '#numberInput',
      addButton: '#addButton',
      clearButton: '#clearButton',
      setListItems: '#setList li',
      setList: '#setList',
    };
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  // Fill the number input and click Add. Returns dialog message if an alert appeared.
  async addNumber(value) {
    // Use page.fill even for non-numeric strings to simulate edge input scenarios.
    await this.page.fill(this.selectors.input, String(value));
    // Attempt to catch dialog if it appears when clicking Add.
    let dialogMessage = null;
    const dialogPromise = this.page.waitForEvent('dialog', { timeout: 300 }).then(dialog => {
      dialogMessage = dialog.message();
      return dialog.accept();
    }).catch(() => {
      // no dialog appeared
    });
    await this.page.click(this.selectors.addButton);
    // await the dialogPromise so we know whether a dialog happened
    await dialogPromise;
    return dialogMessage;
  }

  async clearSet() {
    await this.page.click(this.selectors.clearButton);
  }

  async getListItems() {
    return await this.page.$$eval(this.selectors.setListItems, items => items.map(i => i.textContent));
  }

  async getInputValue() {
    return await this.page.$eval(this.selectors.input, el => el.value);
  }

  async getSetListHTML() {
    return await this.page.$eval(this.selectors.setList, el => el.innerHTML);
  }
}

test.describe('Set Demonstration - FSM validation and UI tests', () => {
  // Collect console and page errors for each test to assert app runtime stability.
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console.error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Capture unhandled page errors (exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
  });

  // Test initial render: verifies components exist as per S0_Idle entry state (renderPage)
  test('Initial render shows input, buttons, and empty set list (S0_Idle)', async ({ page }) => {
    const app = new SetPage(page);
    await app.goto();

    // Verify input and buttons are present
    await expect(page.locator('#numberInput')).toBeVisible();
    await expect(page.locator('#addButton')).toBeVisible();
    await expect(page.locator('#clearButton')).toBeVisible();
    // Set list should be present and empty initially
    const items = await app.getListItems();
    expect(items.length).toBe(0);

    // Validate that the input has the correct placeholder from the FSM evidence
    const placeholder = await page.getAttribute('#numberInput', 'placeholder');
    expect(placeholder).toBe('Enter a number');

    // No runtime console errors or page errors should have occurred during load
    expect(consoleErrors.length, 'No console.error messages during initial render').toBe(0);
    expect(pageErrors.length, 'No page errors during initial render').toBe(0);
  });

  // Test adding a number: transition S0_Idle -> S1_NumberAdded
  test('Adding a number updates the set and clears input (S1_NumberAdded)', async ({ page }) => {
    const app = new SetPage(page);
    await app.goto();

    // Add 5 to the set
    const dialogMsg = await app.addNumber(5);
    // No alert expected, so dialogMsg should be null
    expect(dialogMsg).toBeNull();

    // List should contain '5' and input should be cleared
    const itemsAfterAdd = await app.getListItems();
    expect(itemsAfterAdd).toContain('5');
    expect(itemsAfterAdd.length).toBe(1);

    const inputValue = await app.getInputValue();
    expect(inputValue).toBe('', 'Input should be cleared after successful add');

    // Add another number to verify S1 -> S0 (user can add another number)
    await app.addNumber(7);
    const itemsAfterSecondAdd = await app.getListItems();
    expect(itemsAfterSecondAdd).toEqual(expect.arrayContaining(['5', '7']));
    expect(itemsAfterSecondAdd.length).toBe(2);

    // Validate no runtime errors occurred during interactions
    expect(consoleErrors.length, 'No console.error during adds').toBe(0);
    expect(pageErrors.length, 'No page errors during adds').toBe(0);
  });

  // Test duplicate handling: adding same number twice should not create duplicates in the set
  test('Adding a duplicate number does not create duplicate entries', async ({ page }) => {
    const app = new SetPage(page);
    await app.goto();

    // Add 10 once
    await app.addNumber(10);
    let items = await app.getListItems();
    expect(items).toContain('10');
    expect(items.length).toBe(1);

    // Add 10 again (duplicate)
    await app.addNumber(10);
    items = await app.getListItems();
    // Count should remain 1
    expect(items.filter(i => i === '10').length).toBe(1);
    expect(items.length).toBe(1);

    // Validate no runtime errors occurred during duplicate test
    expect(consoleErrors.length, 'No console.error during duplicate adds').toBe(0);
    expect(pageErrors.length, 'No page errors during duplicate adds').toBe(0);
  });

  // Test clearing the set: S0_Idle -> S2_SetCleared
  test('Clearing the set empties the display (S2_SetCleared)', async ({ page }) => {
    const app = new SetPage(page);
    await app.goto();

    // Add two numbers first
    await app.addNumber(1);
    await app.addNumber(2);
    let items = await app.getListItems();
    expect(items.length).toBe(2);

    // Now clear the set
    await app.clearSet();
    items = await app.getListItems();
    expect(items.length).toBe(0);

    // After clearing, user should be able to add again: S2_SetCleared -> S0_Idle
    await app.addNumber(3);
    items = await app.getListItems();
    expect(items).toContain('3');
    expect(items.length).toBe(1);

    expect(consoleErrors.length, 'No console.error during clear/test').toBe(0);
    expect(pageErrors.length, 'No page errors during clear/test').toBe(0);
  });

  // Edge case: empty input behavior. The implementation uses Number('') => 0, so adding with an empty input will add 0.
  test('Edge case: adding with empty input results in 0 being added (observed behavior)', async ({ page }) => {
    const app = new SetPage(page);
    await app.goto();

    // Ensure input is empty (it is by default)
    const initialInput = await app.getInputValue();
    expect(initialInput).toBe('');

    // Click Add with empty input
    const dialogMsg = await app.addNumber(''); // filling with '' simulates user not entering anything
    // No alert expected; instead 0 will be added per implementation
    expect(dialogMsg).toBeNull();

    const items = await app.getListItems();
    // The list should contain '0' per Number('') => 0
    expect(items).toContain('0');

    expect(consoleErrors.length, 'No console.error during empty-input add').toBe(0);
    expect(pageErrors.length, 'No page errors during empty-input add').toBe(0);
  });

  // Edge case: invalid non-numeric input - should trigger alert and not modify the set
  test('Invalid non-numeric input triggers alert and does not modify the set', async ({ page }) => {
    const app = new SetPage(page);
    await app.goto();

    // Precondition: set is empty
    let itemsBefore = await app.getListItems();
    expect(itemsBefore.length).toBe(0);

    // Attempt to add non-numeric value; because input[type=number] can be programmatically filled,
    // Number('abc') evaluates to NaN and should trigger alert("Please enter a valid number.")
    const dialogPromise = page.waitForEvent('dialog', { timeout: 1000 });
    // Use page.fill via helper to set 'abc' then click add; the helper also waits for dialog if any.
    const dialogMsg = await app.addNumber('abc');

    // Ensure a dialog appeared with the expected text
    // The helper accepted the dialog and returned the message if present.
    expect(dialogMsg).toBe('Please enter a valid number.');

    // Ensure list unchanged
    const itemsAfter = await app.getListItems();
    expect(itemsAfter.length).toBe(0);

    expect(consoleErrors.length, 'No console.error during invalid input test').toBe(0);
    expect(pageErrors.length, 'No page errors during invalid input test').toBe(0);
  });

  // Observability test: ensure no runtime ReferenceError/SyntaxError/TypeError occurred during normal usage.
  // This test verifies that console.error and pageerror did not capture unhandled exceptions.
  test('No unexpected runtime exceptions (ReferenceError/SyntaxError/TypeError) should be present in console or page errors', async ({ page }) => {
    const app = new SetPage(page);
    await app.goto();

    // Perform a set of interactions to exercise code paths
    await app.addNumber(42);
    await app.addNumber('abc'); // will trigger alert but not a runtime exception
    await app.clearSet();

    // Assert that no console.error or pageerror events occurred
    // (If any ReferenceError/SyntaxError/TypeError happened during page execution, they would appear here)
    expect(consoleErrors.length, 'Expected no console.error messages across interactions').toBe(0);
    expect(pageErrors.length, 'Expected no unhandled page errors across interactions').toBe(0);
  });
});