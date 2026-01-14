import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8a5772-d59e-11f0-89ab-2f71529652ac.html';

// Page Object for the Queue application
class QueuePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.queueDisplay = page.locator('#queueDisplay');
    this.input = page.locator('#itemInput');
    this.enqueueButton = page.getByRole('button', { name: 'Enqueue' });
    this.dequeueButton = page.getByRole('button', { name: 'Dequeue' });
    this.clearButton = page.getByRole('button', { name: 'Clear Queue' });
  }

  // Navigate to the app and wait until main elements are ready
  async goto() {
    await this.page.goto(APP_URL);
    await expect(this.queueDisplay).toBeVisible();
    await expect(this.input).toBeVisible();
    await expect(this.enqueueButton).toBeVisible();
    await expect(this.dequeueButton).toBeVisible();
    await expect(this.clearButton).toBeVisible();
  }

  // Enqueue an item using the input and button (does not handle dialog)
  async enqueue(item) {
    await this.input.fill(item);
    await this.enqueueButton.click();
  }

  // Click dequeue
  async dequeue() {
    await this.dequeueButton.click();
  }

  // Click clear queue
  async clearQueue() {
    await this.clearButton.click();
  }

  // Get array of texts currently displayed in the queue
  async getQueueItemsText() {
    const items = this.queueDisplay.locator('.queue-item');
    const count = await items.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push(await items.nth(i).innerText());
    }
    return texts;
  }
}

test.describe('Queue Simulation (Application ID: 7e8a5772-d59e-11f0-89ab-2f71529652ac)', () => {
  // Arrays to capture runtime errors and console error messages for each test
  let pageErrors;
  let consoleErrors;

  test.beforeEach(async ({ page }) => {
    // Initialize capture arrays before each test
    pageErrors = [];
    consoleErrors = [];

    // Listen for uncaught exceptions on the page
    page.on('pageerror', (error) => {
      // store the Error object for assertions
      pageErrors.push(error);
    });

    // Listen for console messages and capture console.error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
  });

  test.afterEach(async () => {
    // After each test we will assert there were no unexpected page errors or console.error outputs.
    // This validates that the application's JavaScript didn't produce uncaught exceptions.
    expect(pageErrors, `Expected no page errors, but got: ${pageErrors.map(e => e.message).join(' | ')}`).toHaveLength(0);
    expect(consoleErrors, `Expected no console.error messages, but got: ${consoleErrors.join(' | ')}`).toHaveLength(0);
  });

  // Test initial page load and default state
  test('should load the page and show initial empty queue', async ({ page }) => {
    const app = new QueuePage(page);
    // Navigate to the application
    await app.goto();

    // The queue display should be present and initially empty (no .queue-item elements)
    const items1 = app.queueDisplay.locator('.queue-item');
    await expect(items).toHaveCount(0);

    // Input should be empty and visible
    await expect(app.input).toHaveValue('');
    await expect(app.input).toBeVisible();

    // Buttons should be enabled and visible
    await expect(app.enqueueButton).toBeEnabled();
    await expect(app.dequeueButton).toBeEnabled();
    await expect(app.clearButton).toBeEnabled();
  });

  // Test enqueuing a single item updates the DOM and clears the input
  test('should enqueue an item and display it in the queue', async ({ page }) => {
    const app1 = new QueuePage(page);
    await app.goto();

    // Enqueue the item "A" and verify it appears in the DOM
    await app.enqueue('A');

    // After enqueue, the input should be cleared
    await expect(app.input).toHaveValue('');

    // The queue display should show one item with text "A"
    const itemsText = await app.getQueueItemsText();
    expect(itemsText).toEqual(['A']);
  });

  // Test preserving FIFO order when enqueuing multiple items
  test('should maintain FIFO order when multiple items are enqueued', async ({ page }) => {
    const app2 = new QueuePage(page);
    await app.goto();

    // Enqueue multiple items
    await app.enqueue('first');
    await app.enqueue('second');
    await app.enqueue('third');

    // The queue display should show items in the order they were added
    const itemsText1 = await app.getQueueItemsText();
    expect(itemsText).toEqual(['first', 'second', 'third']);
  });

  // Test dequeue removes the first item (FIFO) and updates the DOM
  test('should dequeue the first item and update the display', async ({ page }) => {
    const app3 = new QueuePage(page);
    await app.goto();

    // Prepare queue
    await app.enqueue('one');
    await app.enqueue('two');
    await app.enqueue('three');

    // Dequeue should remove "one"
    await app.dequeue();

    // Verify remaining items are 'two', 'three'
    const itemsTextAfter = await app.getQueueItemsText();
    expect(itemsTextAfter).toEqual(['two', 'three']);
  });

  // Test clearing the queue resets the display to empty
  test('should clear the queue and remove all displayed items', async ({ page }) => {
    const app4 = new QueuePage(page);
    await app.goto();

    // Enqueue some items
    await app.enqueue('x');
    await app.enqueue('y');

    // Ensure items exist first
    let itemsText2 = await app.getQueueItemsText();
    expect(itemsText).toEqual(['x', 'y']);

    // Click clear and verify the display is empty
    await app.clearQueue();
    const itemsAfterClear = app.queueDisplay.locator('.queue-item');
    await expect(itemsAfterClear).toHaveCount(0);
  });

  // Test edge case: enqueue with empty input should trigger alert dialog
  test('should alert when attempting to enqueue an empty or whitespace-only input', async ({ page }) => {
    const app5 = new QueuePage(page);
    await app.goto();

    // Two scenarios: empty string and whitespace-only
    // Capture dialog for empty string
    const emptyDialogPromise = page.waitForEvent('dialog');
    // Ensure input is empty
    await app.input.fill('');
    // Click enqueue
    await app.enqueueButton.click();
    const emptyDialog = await emptyDialogPromise;
    // Assert the alert message is as expected
    expect(emptyDialog.message()).toBe('Please enter an item to enqueue.');
    await emptyDialog.dismiss();

    // Capture dialog for whitespace-only input
    const wsDialogPromise = page.waitForEvent('dialog');
    await app.input.fill('   ');
    await app.enqueueButton.click();
    const wsDialog = await wsDialogPromise;
    expect(wsDialog.message()).toBe('Please enter an item to enqueue.');
    await wsDialog.dismiss();

    // Ensure queue remains empty after these attempts
    const itemsText3 = await app.getQueueItemsText();
    expect(itemsText).toEqual([]);
  });

  // Test edge case: dequeue on an empty queue should trigger an alert
  test('should alert when attempting to dequeue from an empty queue', async ({ page }) => {
    const app6 = new QueuePage(page);
    await app.goto();

    // Ensure queue is empty
    const itemsBefore = await app.getQueueItemsText();
    expect(itemsBefore).toEqual([]);

    // Wait for the dialog triggered by dequeue
    const dialogPromise = page.waitForEvent('dialog');
    await app.dequeueButton.click();
    const dialog = await dialogPromise;
    expect(dialog.message()).toBe('Queue is empty. Nothing to dequeue.');
    await dialog.dismiss();

    // Still no items afterward
    const itemsAfter = await app.getQueueItemsText();
    expect(itemsAfter).toEqual([]);
  });

  // Test visual feedback: queue items have the expected class and styling attributes exist
  test('should render queue items using the .queue-item class and preserve visible styling container', async ({ page }) => {
    const app7 = new QueuePage(page);
    await app.goto();

    // Enqueue an item
    await app.enqueue('visualTest');

    // The item should have the .queue-item class
    const firstItem = app.queueDisplay.locator('.queue-item').first();
    await expect(firstItem).toHaveCount(1);
    await expect(firstItem).toHaveText('visualTest');

    // The queue display container should have at least a border style from CSS (computed style check)
    const borderStyle = await page.evaluate(() => {
      const el = document.getElementById('queueDisplay');
      return window.getComputedStyle(el).borderStyle;
    });
    // It should not be 'none' (the page style defined a border)
    expect(borderStyle).not.toBe('none');
  });

  // Accessibility check: input has placeholder and is focusable; buttons are reachable via keyboard evaluation
  test('should have accessible input placeholder and focusable controls', async ({ page }) => {
    const app8 = new QueuePage(page);
    await app.goto();

    // Input placeholder should be present
    const placeholder = await app.input.getAttribute('placeholder');
    expect(placeholder).toBe('Enter item');

    // Focus the input and type, then use keyboard to submit (click simulation done by click)
    await app.input.focus();
    await app.input.type('accessibility');

    // Ensure enqueue button is focusable and can be clicked via keyboard Enter (simulate pressing Enter while button focused)
    await app.enqueueButton.focus();
    await app.enqueueButton.press('Enter');

    // Validate item was added
    const itemsText4 = await app.getQueueItemsText();
    // The queue should contain the typed value
    expect(itemsText).toContain('accessibility');
  });
});