import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b667a1-d1d5-11f0-b49a-6f458b3a25ef.html';

// Page object encapsulating interactions with the Deque demo page
class DequePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#inputValue');
    this.addFrontBtn = page.locator('#addFrontBtn');
    this.addBackBtn = page.locator('#addBackBtn');
    this.removeFrontBtn = page.locator('#removeFrontBtn');
    this.removeBackBtn = page.locator('#removeBackBtn');
    this.dequeDisplay = page.locator('#deque');
  }

  // Navigates to the page
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Sets the input value
  async setInput(value) {
    await this.input.fill(value);
  }

  // Click actions
  async clickAddFront() {
    await this.addFrontBtn.click();
  }
  async clickAddBack() {
    await this.addBackBtn.click();
  }
  async clickRemoveFront() {
    await this.removeFrontBtn.click();
  }
  async clickRemoveBack() {
    await this.removeBackBtn.click();
  }

  // Reads the current deque display text
  async getDequeText() {
    return (await this.dequeDisplay.textContent()).trim();
  }

  // Visibility checks
  async isInputVisible() {
    return await this.input.isVisible();
  }
  async areButtonsVisible() {
    const results = await Promise.all([
      this.addFrontBtn.isVisible(),
      this.addBackBtn.isVisible(),
      this.removeFrontBtn.isVisible(),
      this.removeBackBtn.isVisible()
    ]);
    return results.every(Boolean);
  }
}

test.describe('Deque (Double Ended Queue) Demonstration - Functional Tests', () => {
  // Arrays to capture console and page errors during each test
  /** @type {Array<import('@playwright/test').ConsoleMessage>} */
  let consoleMessages;
  /** @type {Array<Error>} */
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // reset arrays before each test
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages for later assertions
    page.on('console', msg => {
      consoleMessages.push(msg);
    });

    // Collect page-level errors (uncaught exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
  });

  // Helper to assert that no console-level errors or page errors were emitted.
  // We do not modify the page; we only observe and fail the test if errors happen.
  async function assertNoRuntimeErrors() {
    // Check console messages for 'error' type
    const consoleErrors = consoleMessages.filter(m => m.type() === 'error');
    if (consoleErrors.length > 0) {
      // Provide some context in the assertion failure
      const msgs = consoleErrors.map(m => `[${m.location().url}:${m.location().lineNumber}] ${m.text()}`).join('\n');
      throw new Error(`Console errors detected:\n${msgs}`);
    }
    if (pageErrors.length > 0) {
      const msgs1 = pageErrors.map(e => e.message).join('\n');
      throw new Error(`Page errors detected:\n${msgs}`);
    }
  }

  test('Initial page load shows default state "Deque is empty" and UI is visible', async ({ page }) => {
    // Purpose: Verify the page loads and the default deque message is correct.
    const dequePage = new DequePage(page);
    await dequePage.goto();

    // Basic visibility checks for input and buttons
    expect(await dequePage.isInputVisible()).toBe(true);
    expect(await dequePage.areButtonsVisible()).toBe(true);

    // The initial display should indicate the deque is empty
    const text = await dequePage.getDequeText();
    expect(text).toBe('Deque is empty');

    // Ensure there were no runtime console or page errors on load
    await assertNoRuntimeErrors();
  });

  test('Adding items to back and front updates the deque order correctly', async ({ page }) => {
    // Purpose: Verify addBack pushes to the end and addFront unshifts to the beginning.
    const dequePage1 = new DequePage(page);
    await dequePage.goto();

    // Add "A" to back -> deque: A
    await dequePage.setInput('A');
    await dequePage.clickAddBack();
    expect(await dequePage.getDequeText()).toBe('A');

    // Add "B" to back -> deque: A, B
    await dequePage.setInput('B');
    await dequePage.clickAddBack();
    expect(await dequePage.getDequeText()).toBe('A, B');

    // Add "C" to front -> deque: C, A, B
    await dequePage.setInput('C');
    await dequePage.clickAddFront();
    expect(await dequePage.getDequeText()).toBe('C, A, B');

    // Ensure input was cleared after adds (as implementation clears on success)
    expect(await (await page.locator('#inputValue')).inputValue()).toBe('');

    // Final check for runtime errors during these interactions
    await assertNoRuntimeErrors();
  });

  test('Removing from front and back modifies the deque correctly', async ({ page }) => {
    // Purpose: Populate deque and then remove from both ends checking correct elements removed.
    const dequePage2 = new DequePage(page);
    await dequePage.goto();

    // Setup: Add elements to have a known state -> [X, Y, Z] by addBack X, Y then addFront Z -> Z, X, Y
    await dequePage.setInput('X');
    await dequePage.clickAddBack();
    await dequePage.setInput('Y');
    await dequePage.clickAddBack();
    await dequePage.setInput('Z');
    await dequePage.clickAddFront();
    expect(await dequePage.getDequeText()).toBe('Z, X, Y');

    // Remove front -> removes Z -> deque: X, Y
    await dequePage.clickRemoveFront();
    expect(await dequePage.getDequeText()).toBe('X, Y');

    // Remove back -> removes Y -> deque: X
    await dequePage.clickRemoveBack();
    expect(await dequePage.getDequeText()).toBe('X');

    // Remove back again -> removes X -> deque becomes empty
    await dequePage.clickRemoveBack();
    expect(await dequePage.getDequeText()).toBe('Deque is empty');

    // Ensure no runtime errors during these operations
    await assertNoRuntimeErrors();
  });

  test('Attempting to add with empty input shows alert "Please enter a value"', async ({ page }) => {
    // Purpose: Verify that clicking add when the input is empty triggers the expected alert dialog.
    const dequePage3 = new DequePage(page);
    await dequePage.goto();

    // Ensure input is empty
    await dequePage.setInput('');
    // Listen for the dialog and assert its message
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      dequePage.clickAddBack() // triggers the alert because input is empty
    ]);
    try {
      expect(dialog.message()).toBe('Please enter a value');
    } finally {
      // Accept the alert so the page can continue
      await dialog.accept();
    }

    // Re-run with addFront as well to ensure both buttons behave the same
    const [dialog2] = await Promise.all([
      page.waitForEvent('dialog'),
      dequePage.clickAddFront()
    ]);
    try {
      expect(dialog2.message()).toBe('Please enter a value');
    } finally {
      await dialog2.accept();
    }

    // No runtime errors should have occurred beyond the expected dialogs
    await assertNoRuntimeErrors();
  });

  test('Removing from an empty deque shows alert "Deque is empty!" for both front and back', async ({ page }) => {
    // Purpose: Attempt remove operations on an empty deque and assert the expected alert messages.
    const dequePage4 = new DequePage(page);
    await dequePage.goto();

    // Ensure deque is empty at start
    expect(await dequePage.getDequeText()).toBe('Deque is empty');

    // Remove from front -> expect alert "Deque is empty!"
    const [dialogFront] = await Promise.all([
      page.waitForEvent('dialog'),
      dequePage.clickRemoveFront()
    ]);
    try {
      expect(dialogFront.message()).toBe('Deque is empty!');
    } finally {
      await dialogFront.accept();
    }

    // Remove from back -> expect the same alert
    const [dialogBack] = await Promise.all([
      page.waitForEvent('dialog'),
      dequePage.clickRemoveBack()
    ]);
    try {
      expect(dialogBack.message()).toBe('Deque is empty!');
    } finally {
      await dialogBack.accept();
    }

    // Confirm still shows empty message
    expect(await dequePage.getDequeText()).toBe('Deque is empty');

    // No unexpected runtime errors
    await assertNoRuntimeErrors();
  });

  test('Edge case: adding whitespace-only input is considered a value and is added', async ({ page }) => {
    // Purpose: Because the implementation checks if (inputValue) truthiness,
    // whitespace-only strings are truthy and will be accepted; verify behavior.
    const dequePage5 = new DequePage(page);
    await dequePage.goto();

    // Add a whitespace-only string
    await dequePage.setInput('   ');
    await dequePage.clickAddBack();

    // The display should contain the whitespace (trim in reading may remove leading/trailing)
    // The implementation uses join(', ') on items, so whitespace-only entries will show as spaces between commas.
    const rawText = await dequePage.getDequeText();
    // It may appear like three spaces, but trimmed by getDequeText; instead check underlying element's textContent directly
    const fullTextContent = (await page.locator('#deque').textContent());
    expect(fullTextContent).toContain('   '); // verify the literal whitespace is present in the DOM

    // Clean up: remove the whitespace entry (dialog not expected)
    await dequePage.clickRemoveFront();
    expect(await dequePage.getDequeText()).toBe('Deque is empty');

    // No runtime errors
    await assertNoRuntimeErrors();
  });

  test('Accessibility and UI state: buttons are enabled and input has placeholder', async ({ page }) => {
    // Purpose: Ensure basic accessibility/UX attributes are present.
    const dequePage6 = new DequePage(page);
    await dequePage.goto();

    // Check placeholder text on input
    const placeholder = await page.locator('#inputValue').getAttribute('placeholder');
    expect(placeholder).toBe('Enter a value');

    // Buttons should be enabled (not disabled)
    expect(await dequePage.addFrontBtn.isEnabled()).toBe(true);
    expect(await dequePage.addBackBtn.isEnabled()).toBe(true);
    expect(await dequePage.removeFrontBtn.isEnabled()).toBe(true);
    expect(await dequePage.removeBackBtn.isEnabled()).toBe(true);

    // No runtime errors
    await assertNoRuntimeErrors();
  });
});