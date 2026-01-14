import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b74600-d5a1-11f0-9c7a-cdf1d7a06e11.html';

/**
 * Page Object for the Queue app.
 * Encapsulates locators and common actions used by the tests.
 */
class QueuePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#input');
    this.addBtn = page.locator('#add-btn');
    this.removeBtn = page.locator('#remove-btn');
    this.clearBtn = page.locator('#clear-btn');
    this.queueElement = page.locator('#queue');
  }

  // Type a message into the input
  async typeMessage(message) {
    await this.input.fill(message);
  }

  // Click the Add to Queue button
  async clickAdd() {
    await this.addBtn.click();
  }

  // Click the Remove from Queue button
  async clickRemove() {
    await this.removeBtn.click();
  }

  // Click the Clear Queue button
  async clickClear() {
    await this.clearBtn.click();
  }

  // Helper to add a message (type and click add)
  async addMessage(message) {
    await this.typeMessage(message);
    await this.clickAdd();
  }

  // Get the visible text content of the queue element (trimmed)
  async getQueueText() {
    return (await this.queueElement.innerText()).trim();
  }

  // Get the placeholder attribute of the input
  async getInputPlaceholder() {
    return await this.input.getAttribute('placeholder');
  }

  // Check if a button is enabled
  async isButtonEnabled(buttonLocator) {
    return await buttonLocator.isEnabled();
  }

  // Check if an element is visible
  async isVisible(locator) {
    return await locator.isVisible();
  }

  // Get current value of the input
  async getInputValue() {
    return await this.input.inputValue();
  }
}

/**
 * Helper to initialize the page, attach console/pageerror listeners,
 * and return the Page Object plus captured errors for assertions.
 *
 * Important: We intentionally do NOT modify or patch the page environment.
 *
 * @param {import('@playwright/test').Page} page
 */
async function createQueueApp(page) {
  const consoleErrors = [];
  const pageErrors = [];

  // Capture console messages of type 'error'
  page.on('console', (msg) => {
    try {
      if (msg.type && msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    } catch (e) {
      // If something goes wrong capturing console, record the stringified error
      consoleErrors.push(`console-capture-error: ${String(e)}`);
    }
  });

  // Capture uncaught exceptions on the page
  page.on('pageerror', (err) => {
    try {
      pageErrors.push(err && err.message ? err.message : String(err));
    } catch (e) {
      pageErrors.push(`pageerror-capture-error: ${String(e)}`);
    }
  });

  // Navigate to the app page exactly as-is
  await page.goto(APP_URL);

  const app = new QueuePage(page);
  return { app, consoleErrors, pageErrors };
}

test.describe('Queue App (11b74600-d5a1-11f0-9c7a-cdf1d7a06e11)', () => {
  // Test: initial page load and default state
  test('Initial load: controls visible and queue empty by default', async ({ page }) => {
    // Arrange: initialize app and listeners
    const { app, consoleErrors, pageErrors } = await createQueueApp(page);

    // Assert: input visible and has placeholder
    await expect(app.input).toBeVisible();
    expect(await app.getInputPlaceholder()).toBe('Enter a message');

    // Assert: buttons are visible and enabled
    await expect(app.addBtn).toBeVisible();
    await expect(app.removeBtn).toBeVisible();
    await expect(app.clearBtn).toBeVisible();

    expect(await app.isButtonEnabled(app.addBtn)).toBe(true);
    expect(await app.isButtonEnabled(app.removeBtn)).toBe(true);
    expect(await app.isButtonEnabled(app.clearBtn)).toBe(true);

    // Assert: queue element exists and is empty on load
    const qText = await app.getQueueText();
    expect(qText).toBe(''); // The HTML initializes with an empty div

    // Assert: No console errors or page errors occurred during load
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test: adding items updates the queue and clears input
  test('Add button: appends messages to queue and clears input', async ({ page }) => {
    const { app, consoleErrors, pageErrors } = await createQueueApp(page);

    // Add first message
    await app.addMessage('first');
    // After adding, the queue should reflect the single item
    expect(await app.getQueueText()).toBe('Queue: first');
    // Input should be cleared after adding
    expect(await app.getInputValue()).toBe('');

    // Add second message
    await app.addMessage('second');
    expect(await app.getQueueText()).toBe('Queue: first, second');
    expect(await app.getInputValue()).toBe('');

    // Add a third message with extra whitespace to confirm trimming behavior
    await app.typeMessage('   third   ');
    await app.clickAdd();
    // Implementation trims input before pushing; expect the trimmed value
    expect(await app.getQueueText()).toBe('Queue: first, second, third');

    // Ensure no console errors or uncaught page errors occurred during interactions
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test: remove button dequeues items in FIFO order
  test('Remove button: removes the oldest item (FIFO behavior)', async ({ page }) => {
    const { app, consoleErrors, pageErrors } = await createQueueApp(page);

    // Setup: add three items
    await app.addMessage('one');
    await app.addMessage('two');
    await app.addMessage('three');
    expect(await app.getQueueText()).toBe('Queue: one, two, three');

    // Remove once: should remove 'one'
    await app.clickRemove();
    expect(await app.getQueueText()).toBe('Queue: two, three');

    // Remove again: should remove 'two'
    await app.clickRemove();
    expect(await app.getQueueText()).toBe('Queue: three');

    // Remove last item: after shift, join on empty array yields 'Queue: ' (with trailing colon and space)
    await app.clickRemove();
    // Implementation: when queue becomes empty after remove, innerText is set to `Queue: ${queue.join(', ')}`
    // queue.join(', ') === '' so the text is 'Queue: '
    expect(await app.getQueueText()).toBe('Queue:');

    // Ensure no console or page errors
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test: clear button empties the queue and shows explicit "(empty)"
  test('Clear button: empties the queue and displays explicit empty state', async ({ page }) => {
    const { app, consoleErrors, pageErrors } = await createQueueApp(page);

    // Setup: add items
    await app.addMessage('a');
    await app.addMessage('b');
    expect(await app.getQueueText()).toBe('Queue: a, b');

    // Click clear: should set the queue array to [] and display 'Queue: (empty)'
    await app.clickClear();
    expect(await app.getQueueText()).toBe('Queue: (empty)');

    // Clicking clear again when already empty should keep the same display
    await app.clickClear();
    expect(await app.getQueueText()).toBe('Queue: (empty)');

    // Ensure no console or page errors
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Edge case tests
  test('Edge cases: adding empty or whitespace-only input does nothing', async ({ page }) => {
    const { app, consoleErrors, pageErrors } = await createQueueApp(page);

    // Initially empty
    expect(await app.getQueueText()).toBe('');

    // Type only spaces and click add
    await app.typeMessage('    ');
    await app.clickAdd();
    // Nothing should be added; queue remains empty
    expect(await app.getQueueText()).toBe('');
    // Input should remain as the script clears only on valid add; in implementation it trims and only clears when non-empty
    // Because message trimmed to '', the input value should still be whitespace or unchanged; verify that it did not get cleared
    // The implementation calls input.value = '' only when message !== '', so for whitespace input it should remain as originally typed
    // However Playwright's fill replaces the value; after clickAdd we expect the value to still be the whitespace we typed
    expect(await app.getInputValue()).toBe('    ');

    // Clear the input programmatically for cleanliness (without modifying app code we simulate user clearing)
    await app.input.fill('');

    // Add an explicit empty string (no characters)
    await app.typeMessage('');
    await app.clickAdd();
    expect(await app.getQueueText()).toBe(''); // still empty

    // Ensure no console or page errors
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Removing when queue is empty does not throw and leaves UI unchanged', async ({ page }) => {
    const { app, consoleErrors, pageErrors } = await createQueueApp(page);

    // Ensure queue is empty at start
    expect(await app.getQueueText()).toBe('');

    // Click remove on empty queue; implementation guards against empty length
    await app.clickRemove();

    // Queue should remain empty (no 'Queue: (empty)' since clear button sets that)
    expect(await app.getQueueText()).toBe('');

    // Ensure no console or page errors occurred as a result
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Accessibility and visibility checks
  test('Accessibility: controls have expected attributes and are keyboard accessible', async ({ page }) => {
    const { app, consoleErrors, pageErrors } = await createQueueApp(page);

    // Input should have placeholder attribute for assistive guidance
    expect(await app.getInputPlaceholder()).toBe('Enter a message');

    // Buttons should be reachable/focusable via keyboard tabbing
    await app.input.focus();
    await page.keyboard.press('Tab'); // move to Add button
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('add-btn');

    await page.keyboard.press('Tab'); // move to Remove button
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('remove-btn');

    await page.keyboard.press('Tab'); // move to Clear button
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('clear-btn');

    // Ensure no console or page errors
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});