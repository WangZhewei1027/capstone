import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-58-04/html/df89af21-ca8c-11f0-ad7a-c12be6d976fe.html';

// Page object for interacting with the Deque example page
class DequePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.selectors = {
      addFrontButton: '.deque-operations > button:nth-child(1)',
      addRearButton:  '.deque-operations > button:nth-child(2)',
      removeFrontButton: '.deque-operations > button:nth-child(3)',
      removeRearButton:  '.deque-operations > button:nth-child(4)',
      display: '#deque-display',
    };
  }

  // Returns current display text
  async getDisplayText() {
    const txt = await this.page.textContent(this.selectors.display);
    // textContent may be null; return empty string instead
    return txt ?? '';
  }

  // Click "Add to Front" and accept the prompt with given value (string)
  // Returns the dialog message
  async addFrontAccept(value) {
    const dialogPromise = this.page.waitForEvent('dialog');
    await this.page.click(this.selectors.addFrontButton);
    const dialog = await dialogPromise;
    // Prompt expected
    return (async () => {
      expect(dialog.type()).toBe('prompt');
      const message = dialog.message();
      await dialog.accept(value);
      return message;
    })();
  }

  // Click "Add to Front" and dismiss the prompt (cancel)
  async addFrontCancel() {
    const dialogPromise = this.page.waitForEvent('dialog');
    await this.page.click(this.selectors.addFrontButton);
    const dialog = await dialogPromise;
    expect(dialog.type()).toBe('prompt');
    await dialog.dismiss();
    return dialog.message();
  }

  // Click "Add to Rear" and accept the prompt with given value (string)
  async addRearAccept(value) {
    const dialogPromise = this.page.waitForEvent('dialog');
    await this.page.click(this.selectors.addRearButton);
    const dialog = await dialogPromise;
    expect(dialog.type()).toBe('prompt');
    const message = dialog.message();
    await dialog.accept(value);
    return message;
  }

  // Click "Add to Rear" and dismiss the prompt (cancel)
  async addRearCancel() {
    const dialogPromise = this.page.waitForEvent('dialog');
    await this.page.click(this.selectors.addRearButton);
    const dialog = await dialogPromise;
    expect(dialog.type()).toBe('prompt');
    await dialog.dismiss();
    return dialog.message();
  }

  // Click "Remove from Front" and, if an alert appears, accept it and return the message.
  // If no dialog appears within timeout, returns null.
  async removeFrontMaybeAlert(timeout = 500) {
    // Start the click; then race for a dialog event with short timeout
    await this.page.click(this.selectors.removeFrontButton);
    try {
      const dialog = await this.page.waitForEvent('dialog', { timeout });
      // Only alerts expected
      expect(dialog.type()).toBe('alert');
      const message = dialog.message();
      await dialog.accept();
      return message;
    } catch (e) {
      // No dialog appeared (expected when deque empty)
      return null;
    }
  }

  // Click "Remove from Rear" and, if an alert appears, accept it and return the message.
  // If no dialog appears within timeout, returns null.
  async removeRearMaybeAlert(timeout = 500) {
    await this.page.click(this.selectors.removeRearButton);
    try {
      const dialog = await this.page.waitForEvent('dialog', { timeout });
      expect(dialog.type()).toBe('alert');
      const message = dialog.message();
      await dialog.accept();
      return message;
    } catch (e) {
      return null;
    }
  }
}

test.describe('Deque FSM - End-to-End', () => {
  // Collect console messages and page errors for each test
  test.beforeEach(async ({ page }) => {
    // No-op here; individual tests will set listeners and navigate
  });

  // Test: initial page load - idle state expectations
  test('Initial state is idle and display is empty', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];

    // Listen to console and page errors
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    await page.goto(APP_URL);

    const deque = new DequePage(page);

    // On initial load, the display should be empty string
    const display = await deque.getDisplayText();
    expect(display).toBe('');

    // Assert no uncaught errors in the page context
    expect(pageErrors.length).toBe(0);

    // Assert no console error-level messages
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test adding to front: prompt appears, accepting it updates display
  test('ADD_FRONT_CLICKED -> prompting_add_front -> adding_front -> ADDED_FRONT (accept prompt)', async ({ page }) => {
    // Collect runtime signals
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    await page.goto(APP_URL);
    const deque = new DequePage(page);

    // Click add front and accept the prompt with value "front1"
    const promptMessage = await deque.addFrontAccept('front1');
    // Verify the prompt message corresponds to the implementation
    expect(promptMessage).toContain('Enter a value to add to the front');

    // After accepting, display should show the value
    const display = await deque.getDisplayText();
    expect(display).toBe('front1');

    // No page errors or console errors
    expect(pageErrors.length).toBe(0);
    expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
  });

  // Test adding to front: canceling the prompt leaves deque unchanged
  test('ADD_FRONT_CLICKED -> prompting_add_front -> PROMPT_CANCEL leaves state idle with no change', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    await page.goto(APP_URL);
    const deque = new DequePage(page);

    // Precondition: display empty
    expect(await deque.getDisplayText()).toBe('');

    // Click add front and dismiss (cancel)
    const promptMessage = await deque.addFrontCancel();
    expect(promptMessage).toContain('Enter a value to add to the front');

    // Display remains unchanged
    expect(await deque.getDisplayText()).toBe('');

    expect(pageErrors.length).toBe(0);
    expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
  });

  // Test adding to rear and cancel/submit behaviors
  test('ADD_REAR_CLICKED -> prompting_add_rear behaviors (submit and cancel)', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    await page.goto(APP_URL);
    const deque = new DequePage(page);

    // Submit a value to rear
    const promptMessage1 = await deque.addRearAccept('rear1');
    expect(promptMessage1).toContain('Enter a value to add to the rear');
    expect(await deque.getDisplayText()).toBe('rear1');

    // Cancel adding to rear - should not change display
    const promptMessage2 = await deque.addRearCancel();
    expect(promptMessage2).toContain('Enter a value to add to the rear');
    expect(await deque.getDisplayText()).toBe('rear1');

    expect(pageErrors.length).toBe(0);
    expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
  });

  // Test removing from front when non-empty triggers alert and updates display
  test('REMOVE_FRONT_CLICKED -> removing_front when non-empty shows alert and removes the item', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    await page.goto(APP_URL);
    const deque = new DequePage(page);

    // Setup: add two elements: front-> "A", rear-> "B" so display "A, B"
    await deque.addFrontAccept('A');
    await deque.addRearAccept('B');
    expect(await deque.getDisplayText()).toBe('A, B');

    // Remove from front: should alert "Removed from front: A" and display becomes "B"
    const alertMessage = await deque.removeFrontMaybeAlert();
    expect(alertMessage).toBe('Removed from front: A');
    expect(await deque.getDisplayText()).toBe('B');

    expect(pageErrors.length).toBe(0);
    expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
  });

  // Test removing from rear when non-empty triggers alert and updates display
  test('REMOVE_REAR_CLICKED -> removing_rear when non-empty shows alert and removes the item', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    await page.goto(APP_URL);
    const deque = new DequePage(page);

    // Setup: add elements: rear-> "1", rear-> "2" so display "1, 2"
    await deque.addRearAccept('1');
    await deque.addRearAccept('2');
    expect(await deque.getDisplayText()).toBe('1, 2');

    // Remove from rear: should alert "Removed from rear: 2" and display becomes "1"
    const alertMessage = await deque.removeRearMaybeAlert();
    expect(alertMessage).toBe('Removed from rear: 2');
    expect(await deque.getDisplayText()).toBe('1');

    expect(pageErrors.length).toBe(0);
    expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
  });

  // Edge case: removing from empty deque should not show alert and should not throw errors
  test('Removing from empty deque produces no alert and leaves display unchanged (NO_ELEMENT_FRONT / NO_ELEMENT_REAR)', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    await page.goto(APP_URL);
    const deque = new DequePage(page);

    // Ensure empty
    expect(await deque.getDisplayText()).toBe('');

    // Remove front: expect no dialog and no change
    const frontResult = await deque.removeFrontMaybeAlert(300);
    expect(frontResult).toBeNull();
    expect(await deque.getDisplayText()).toBe('');

    // Remove rear: expect no dialog and no change
    const rearResult = await deque.removeRearMaybeAlert(300);
    expect(rearResult).toBeNull();
    expect(await deque.getDisplayText()).toBe('');

    expect(pageErrors.length).toBe(0);
    expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
  });

  // Edge case: adding an empty string value and verifying how it's rendered in display
  test('Adding an empty string is allowed (value !== null) and display reflects it', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    await page.goto(APP_URL);
    const deque = new DequePage(page);

    // Add rear "X" then add front empty string ''
    await deque.addRearAccept('X');
    const promptMsg = await deque.addFrontAccept(''); // empty string accepted
    expect(promptMsg).toContain('Enter a value to add to the front');

    // The Deque.display joins items with ', '. For ['', 'X'] it should produce ', X'
    expect(await deque.getDisplayText()).toBe(', X');

    expect(pageErrors.length).toBe(0);
    expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
  });

  // Complex sequence: verify ordering across many operations
  test('Sequence of operations maintains correct deque order across add/remove operations', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    await page.goto(APP_URL);
    const deque = new DequePage(page);

    // Sequence: addRear(1), addRear(2), addFront(0) -> expect "0, 1, 2"
    await deque.addRearAccept('1');
    await deque.addRearAccept('2');
    await deque.addFrontAccept('0');
    expect(await deque.getDisplayText()).toBe('0, 1, 2');

    // removeRear -> should remove '2', display -> "0, 1"
    const removedRear = await deque.removeRearMaybeAlert();
    expect(removedRear).toBe('Removed from rear: 2');
    expect(await deque.getDisplayText()).toBe('0, 1');

    // removeFront -> should remove '0', display -> "1"
    const removedFront = await deque.removeFrontMaybeAlert();
    expect(removedFront).toBe('Removed from front: 0');
    expect(await deque.getDisplayText()).toBe('1');

    // removeFront -> should remove '1', display -> ""
    const removedFront2 = await deque.removeFrontMaybeAlert();
    expect(removedFront2).toBe('Removed from front: 1');
    expect(await deque.getDisplayText()).toBe('');

    expect(pageErrors.length).toBe(0);
    expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
  });

  // Observability test: ensure that we capture console messages and page errors if they occur naturally
  test('Observes console and page errors (captures runtime exceptions if any)', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    await page.goto(APP_URL);
    // We do not inject or modify the page; just assert that we observed (or not) errors.
    // Tests in this suite already assert there are no page errors on normal operation.
    // Here we explicitly assert that pageErrors is an array (can be empty).
    expect(Array.isArray(pageErrors)).toBe(true);
    // If any unexpected page errors occurred, fail the test and print them
    if (pageErrors.length > 0) {
      // Re-throw first error to show its stack in test output
      throw pageErrors[0];
    }
    // Also assert there are no console error-level messages
    const errorConsole = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsole.length).toBe(0);
  });
});