import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f74329-d5a1-11f0-80b9-e1f86cea383f.html';

// Page object to encapsulate selectors and common actions
class DivideAndConquerPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.numberInput = page.locator('#number');
    this.divideButton = page.getByRole('button', { name: 'Divide' });
    this.conquerButton = page.getByRole('button', { name: 'Conquer' });
  }

  // Fill the numeric input (string input accepted)
  async setNumber(value) {
    // Use fill which works with input[type=number] as well
    await this.numberInput.fill(String(value));
  }

  // Click divide button
  async clickDivide() {
    await this.divideButton.click();
  }

  // Click conquer button
  async clickConquer() {
    await this.conquerButton.click();
  }

  // Read the current input value
  async getInputValue() {
    // inputValue() returns the value property
    return await this.numberInput.inputValue();
  }
}

test.describe('Divide and Conquer - UI and behavior', () => {
  let consoleMessages;
  let pageErrors;

  // Setup listeners and navigate before each test
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture all console messages with their types and text
    page.on('console', (msg) => {
      try {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
      } catch (e) {
        // If extracting text fails for any reason, still note a console event
        consoleMessages.push({ type: msg.type(), text: '<unreadable console message>' });
      }
    });

    // Capture any uncaught page errors
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the app under test
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  });

  // After each test assert there were no unexpected uncaught page errors.
  test.afterEach(async () => {
    // Fail the test if any uncaught page.error happened
    expect(pageErrors, 'No uncaught page errors should have occurred').toHaveLength(0);
  });

  test('Initial load: UI elements are present, visible, enabled and input is empty', async ({ page }) => {
    // Purpose: verify initial state & structure of the page
    const app = new DivideAndConquerPage(page);

    // Elements should be visible
    await expect(app.numberInput).toBeVisible();
    await expect(app.divideButton).toBeVisible();
    await expect(app.conquerButton).toBeVisible();

    // Buttons should be enabled
    await expect(app.divideButton).toBeEnabled();
    await expect(app.conquerButton).toBeEnabled();

    // Input should be empty by default
    const initialValue = await app.getInputValue();
    expect(initialValue).toBe('', 'Number input should be empty on load');

    // No console messages related to application logic should have been produced yet
    // We do not fail if the environment produces unrelated logs, but we assert that there are no "error" console messages captured.
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages).toHaveLength(0);
  });

  test('Divide button divides integer by two, updates input and logs result', async ({ page }) => {
    // Purpose: ensure divide behavior for a positive integer input
    const app1 = new DivideAndConquerPage(page);

    await app.setNumber('10');
    await app.clickDivide();

    // Verify input updated to "5"
    const valueAfterDivide = await app.getInputValue();
    expect(valueAfterDivide).toBe('5');

    // Verify console logged the expected Result message
    const logged = consoleMessages.map(m => m.text);
    expect(logged.some(text => text === 'Result: 5')).toBeTruthy();
  });

  test('Divide uses parseInt then divides (float input -> parseInt -> division)', async ({ page }) => {
    // Purpose: integer coercion via parseInt should be used before dividing
    const app2 = new DivideAndConquerPage(page);

    await app.setNumber('3.5');
    await app.clickDivide();

    // parseInt('3.5') === 3 => 3 / 2 === 1.5
    const valueAfterDivide1 = await app.getInputValue();
    expect(valueAfterDivide).toBe('1.5');

    const logged1 = consoleMessages.map(m => m.text);
    expect(logged.some(text => text === 'Result: 1.5')).toBeTruthy();
  });

  test('Divide with empty input results in NaN and logs "Result: NaN"', async ({ page }) => {
    // Purpose: edge case where input is empty string -> parseInt('') => NaN
    const app3 = new DivideAndConquerPage(page);

    // Ensure input is empty (explicit)
    await app.setNumber('');
    await app.clickDivide();

    // Input.value should become 'NaN' (the script assigns result which is NaN)
    const valueAfterDivide2 = await app.getInputValue();
    expect(valueAfterDivide).toBe('NaN');

    // Console should include Result: NaN
    const logged2 = consoleMessages.map(m => m.text);
    expect(logged.some(text => text === 'Result: NaN')).toBeTruthy();
  });

  test('Conquer button logs even numbers and odd numbers differently and clears input', async ({ page }) => {
    // Purpose: verify conquer behavior for even and odd inputs and that input is cleared after clicking
    const app4 = new DivideAndConquerPage(page);

    // Even number case
    await app.setNumber('4');
    await app.clickConquer();

    // After clicking conquer input should be cleared
    let value = await app.getInputValue();
    expect(value).toBe('', 'Input should be cleared after conquering an even number');

    // Console should contain "Conquer: 4"
    expect(consoleMessages.map(m => m.text).some(t => t === 'Conquer: 4')).toBeTruthy();

    // Reset captured console messages for a clear separation of assertions
    consoleMessages.length = 0;

    // Odd number case
    await app.setNumber('5');
    await app.clickConquer();

    // Input cleared again
    value = await app.getInputValue();
    expect(value).toBe('', 'Input should be cleared after conquering an odd number');

    // Console should indicate odd with the suffix " (odd)"
    expect(consoleMessages.map(m => m.text).some(t => t === 'Conquer: 5 (odd)')).toBeTruthy();
  });

  test('Conquer with empty input logs "Conquer: NaN (odd)" and leaves input empty', async ({ page }) => {
    // Purpose: edge case where input empty -> parseInt('') => NaN -> modulo yields NaN => treated as odd branch in implementation
    const app5 = new DivideAndConquerPage(page);

    await app.setNumber('');
    await app.clickConquer();

    // Input should be cleared (empty string)
    const value1 = await app.getInputValue();
    expect(value).toBe('', 'Input should remain/be cleared after conquering when starting empty');

    // Console log should indicate NaN odd branch
    expect(consoleMessages.map(m => m.text).some(t => t === 'Conquer: NaN (odd)')).toBeTruthy();
  });

  test('Divide then Conquer sequence: result from divide is used by conquer after coercion', async ({ page }) => {
    // Purpose: ensure the application properly chains operations: divide -> update input -> conquer interprets that value
    const app6 = new DivideAndConquerPage(page);

    // Start with 9: divide -> parseInt(9) => 9/2 = 4.5 (input becomes '4.5')
    await app.setNumber('9');
    await app.clickDivide();

    // Verify intermediate state
    const afterDivide = await app.getInputValue();
    expect(afterDivide).toBe('4.5');

    // Clear previous console captures for clarity
    const logsAfterDivide = consoleMessages.map(m => m.text);
    expect(logsAfterDivide.some(t => t === 'Result: 4.5')).toBeTruthy();

    // Now click Conquer: parseInt('4.5') => 4 -> even branch -> should log 'Conquer: 4' and clear input
    await app.clickConquer();

    // Input cleared
    const finalValue = await app.getInputValue();
    expect(finalValue).toBe('', 'Input should be cleared after conquer in the sequence');

    // Console should show both entries in order: Result: 4.5 then Conquer: 4
    const allLogs = consoleMessages.map(m => m.text);
    // Ensure that the two messages exist
    expect(allLogs.some(t => t === 'Result: 4.5')).toBeTruthy();
    expect(allLogs.some(t => t === 'Conquer: 4')).toBeTruthy();

    // Check approximate ordering: find indices and ensure Result is before Conquer
    const idxResult = allLogs.findIndex(t => t === 'Result: 4.5');
    const idxConquer = allLogs.findIndex(t => t === 'Conquer: 4');
    expect(idxResult).toBeGreaterThanOrEqual(0);
    expect(idxConquer).toBeGreaterThanOrEqual(0);
    expect(idxResult).toBeLessThan(idxConquer);
  });

  test('Accessibility checks: buttons exposed with accessible names', async ({ page }) => {
    // Purpose: basic accessibility - ensure the buttons can be found by role and name
    const app7 = new DivideAndConquerPage(page);

    // Buttons exist via role and name lookup
    await expect(app.divideButton).toBeVisible();
    await expect(app.conquerButton).toBeVisible();

    // Ensure pressing the button via keyboard is possible (focus + press)
    await app.divideButton.focus();
    await page.keyboard.press('Enter'); // pressing should trigger divide even if input is empty
    // This will produce a console log (Result) and may set input to 'NaN'
    expect(consoleMessages.map(m => m.text).some(t => t.startsWith('Result:'))).toBeTruthy();
  });
});