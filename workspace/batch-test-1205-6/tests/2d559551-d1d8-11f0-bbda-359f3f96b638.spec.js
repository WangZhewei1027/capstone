import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d559551-d1d8-11f0-bbda-359f3f96b638.html';

// Page Object for the Deque demo page
class DequePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#inputValue');
    this.addFrontBtn = page.locator('button[onclick="addFront()"]');
    this.addBackBtn = page.locator('button[onclick="addBack()"]');
    this.removeFrontBtn = page.locator('button[onclick="removeFront()"]');
    this.removeBackBtn = page.locator('button[onclick="removeBack()"]');
    this.dequeDiv = page.locator('#deque');
    this.outputDiv = page.locator('#output');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async setInput(value) {
    await this.input.fill(String(value));
  }

  async addFront(value) {
    if (value !== undefined) {
      await this.setInput(value);
    }
    await this.addFrontBtn.click();
  }

  async addBack(value) {
    if (value !== undefined) {
      await this.setInput(value);
    }
    await this.addBackBtn.click();
  }

  async removeFront() {
    await this.removeFrontBtn.click();
  }

  async removeBack() {
    await this.removeBackBtn.click();
  }

  async getDequeText() {
    return (await this.dequeDiv.textContent()) || '';
  }

  async getOutputText() {
    return (await this.outputDiv.textContent()) || '';
  }

  async getInputValue() {
    return (await this.input.inputValue()).toString();
  }
}

test.describe('Deque Demonstration - end-to-end tests', () => {
  let consoleMessages;
  let consoleErrors;
  let pageErrors;
  let dialogs;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    consoleErrors = [];
    pageErrors = [];
    dialogs = [];

    // Capture console messages and errors
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push({ type: msg.type(), text });
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    // Capture uncaught exceptions / runtime errors from the page
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Capture dialogs (alerts, confirms, prompts)
    page.on('dialog', async dialog => {
      dialogs.push({ type: dialog.type(), message: dialog.message() });
      // Always dismiss/accept to avoid blocking; alert dialogs should be dismissed
      try {
        await dialog.dismiss();
      } catch (e) {
        // ignore if already handled
      }
    });

    // Navigate to the app page for each test
    await page.goto(APP_URL);
  });

  test.afterEach(async ({ page }) => {
    // As a best-effort check, ensure there were no unexpected console errors or page errors.
    // Tests below will also assert on these arrays explicitly for each scenario.
    // No modification of page code is performed — we only observe.
    // Keep the afterEach light to avoid masking test-specific assertions.
  });

  test.describe('Initial State (S0_Idle) and render checks', () => {
    test('Initial UI elements exist and initial deque is empty', async ({ page }) => {
      // Validate presence of input and buttons and initial empty deque/output.
      const app = new DequePage(page);

      // Elements present
      await expect(app.input).toBeVisible();
      await expect(app.addFrontBtn).toBeVisible();
      await expect(app.addBackBtn).toBeVisible();
      await expect(app.removeFrontBtn).toBeVisible();
      await expect(app.removeBackBtn).toBeVisible();
      await expect(app.dequeDiv).toBeVisible();
      await expect(app.outputDiv).toBeVisible();

      // Initial deque should be empty string (display() hasn't been called yet)
      const dequeText = await app.getDequeText();
      expect(dequeText).toBe('', 'Expected initial #deque to be empty');

      const outputText = await app.getOutputText();
      expect(outputText).toBe('', 'Expected initial #output to be empty');

      // No runtime page errors or console errors during initial render
      expect(pageErrors.length).toBe(0);
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe('Add operations (S1_ItemAddedToFront, S2_ItemAddedToBack)', () => {
    test('Add to Front updates deque and clears input (S1_ItemAddedToFront)', async ({ page }) => {
      // This test validates clicking "Add to Front" with a value causes the deque display to update
      const app1 = new DequePage(page);

      await app.addFront('10');

      // Deque should show the new item at front
      const dequeText1 = await app.getDequeText();
      expect(dequeText).toBe('Deque: [10]');

      // Input should be cleared after adding
      const inputVal = await app.getInputValue();
      expect(inputVal).toBe('', 'Input should be cleared after addFront');

      // No output message expected after adding
      const outputText1 = await app.getOutputText();
      expect(outputText).toBe('');

      // No console or page errors
      expect(pageErrors.length).toBe(0);
      expect(consoleErrors.length).toBe(0);
    });

    test('Add to Back updates deque correctly (S2_ItemAddedToBack) and maintains order', async ({ page }) => {
      // Validate adding front then back gives expected order [front, back]
      const app2 = new DequePage(page);

      await app.addFront('1'); // deque: [1]
      await app.addBack('2');  // deque: [1, 2]

      const dequeText2 = await app.getDequeText();
      expect(dequeText).toBe('Deque: [1, 2]');

      // No output text and no errors
      expect(await app.getOutputText()).toBe('');
      expect(pageErrors.length).toBe(0);
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe('Remove operations (S3_ItemRemovedFromFront, S4_ItemRemovedFromBack)', () => {
    test('Remove from Front returns and displays removed item and updates deque (S3_ItemRemovedFromFront)', async ({ page }) => {
      // Add two items then remove from front; expect first item removed, deque updated and output shown
      const app3 = new DequePage(page);

      await app.addBack('5');
      await app.addBack('6'); // deque should be [5, 6]

      // Remove front
      await app.removeFront();

      // After removal, deque should show remaining item
      const dequeText3 = await app.getDequeText();
      expect(dequeText).toBe('Deque: [6]');

      // Output should show removed item message
      const outputText2 = await app.getOutputText();
      expect(outputText).toBe('Removed from Front: 5');

      // No console/page errors
      expect(pageErrors.length).toBe(0);
      expect(consoleErrors.length).toBe(0);
    });

    test('Remove from Back returns and displays removed item and updates deque (S4_ItemRemovedFromBack)', async ({ page }) => {
      // Add two items then remove from back; expect last item removed, deque updated and output shown
      const app4 = new DequePage(page);

      await app.addFront('7'); // deque: [7]
      await app.addBack('8');  // deque: [7,8]

      await app.removeBack();

      const dequeText4 = await app.getDequeText();
      expect(dequeText).toBe('Deque: [7]');

      const outputText3 = await app.getOutputText();
      expect(outputText).toBe('Removed from Back: 8');

      expect(pageErrors.length).toBe(0);
      expect(consoleErrors.length).toBe(0);
    });

    test('Removing until empty then removing again triggers empty deque alert (S3->S5 and S4->S5 transitions)', async ({ page }) => {
      // This test hits the guard path where remove triggers alert when deque is empty.
      const app5 = new DequePage(page);

      // Add one item then remove it from front
      await app.addBack('42'); // deque: [42]
      await app.removeFront(); // removes 42, deque becomes empty

      // After removing last item, output is shown and deque cleared
      expect(await app.getDequeText()).toBe('', 'After removing last item, display() will clear #deque in this implementation');
      expect(await app.getOutputText()).toBe('Removed from Front: 42');

      // Now removing from front again should trigger alert "Deque is empty!"
      // Because page.on('dialog') was set up in beforeEach, the alert will be captured in dialogs array.
      await app.removeFront();

      // Ensure at least one dialog captured and its message matches expected alert
      const foundEmptyAlert = dialogs.find(d => d.message === 'Deque is empty!');
      expect(foundEmptyAlert).toBeTruthy();
      expect(foundEmptyAlert.type).toBe('alert');

      // Similarly test removeBack alert when deque is empty (fresh reload)
      // Navigate again to ensure fresh state (avoid reusing mutated state)
      await page.goto(APP_URL);

      // Reset dialog capture for the new page context
      dialogs = [];
      const fresh = new DequePage(page);

      // Remove back on empty deque should alert
      await fresh.removeBack();
      const foundEmptyAlert2 = dialogs.find(d => d.message === 'Deque is empty!');
      expect(foundEmptyAlert2).toBeTruthy();
      expect(foundEmptyAlert2.type).toBe('alert');

      // No console/page errors
      expect(pageErrors.length).toBe(0);
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe('Edge cases and error scenarios', () => {
    test('Adding without input value triggers validation alert', async ({ page }) => {
      // When input is empty and user clicks add, page should alert "Please enter a valid number."
      const app6 = new DequePage(page);

      // Ensure input is empty
      await app.input.fill('');

      // Click addFront with no value
      await app.addFront();

      // The alert should be captured
      const alert = dialogs.find(d => d.message === 'Please enter a valid number.');
      expect(alert).toBeTruthy();
      expect(alert.type).toBe('alert');

      // Also test addBack with empty value triggers same alert
      dialogs = [];
      await app.addBack();
      const alert2 = dialogs.find(d => d.message === 'Please enter a valid number.');
      expect(alert2).toBeTruthy();
      expect(alert2.type).toBe('alert');

      // No console/page errors
      expect(pageErrors.length).toBe(0);
      expect(consoleErrors.length).toBe(0);
    });

    test('Sequence of operations results in correct FIFO/LIFO behavior and state transitions', async ({ page }) => {
      // Complex sequence: addFront(1), addBack(2), addFront(0) => deque [0,1,2]
      // removeBack => removes 2, removeFront => removes 0 => remaining [1]
      const app7 = new DequePage(page);

      await app.addFront('1');   // [1]
      await app.addBack('2');    // [1,2]
      await app.addFront('0');   // [0,1,2]

      expect(await app.getDequeText()).toBe('Deque: [0, 1, 2]');

      await app.removeBack();    // should remove 2
      expect(await app.getOutputText()).toBe('Removed from Back: 2');
      expect(await app.getDequeText()).toBe('Deque: [0, 1]');

      await app.removeFront();   // should remove 0
      expect(await app.getOutputText()).toBe('Removed from Front: 0');
      expect(await app.getDequeText()).toBe('Deque: [1]');

      // Final removeFront should remove 1 leaving deque empty
      await app.removeFront();
      expect(await app.getOutputText()).toBe('Removed from Front: 1');

      // Further remove operations should alert (guard to S5)
      dialogs = [];
      await app.removeBack();
      const emptyAlert = dialogs.find(d => d.message === 'Deque is empty!');
      expect(emptyAlert).toBeTruthy();

      // No console/page errors during sequence
      expect(pageErrors.length).toBe(0);
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe('Observability: console and page errors', () => {
    test('No unexpected console.error or uncaught exceptions during normal flows', async ({ page }) => {
      // Basic operations to smoke test for runtime errors appearing in console or pageerror
      const app8 = new DequePage(page);

      await app.addFront('100');
      await app.addBack('200');
      await app.removeFront();
      await app.removeBack();

      // At the end of the scenario, assert that no console errors or page errors were captured.
      expect(consoleErrors.length).toBe(0, `Expected no console.error messages, got: ${JSON.stringify(consoleErrors)}`);
      expect(pageErrors.length).toBe(0, `Expected no uncaught page errors, got: ${pageErrors.map(e => String(e)).join('; ')}`);

      // We still keep a record of all console messages for debugging if necessary
      // but do not fail on ordinary console.log/info messages.
    });
  });
});