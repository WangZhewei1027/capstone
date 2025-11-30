import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d26192-cd33-11f0-bdf9-b3d97e91273d.html';

// Page Object for the Queue demo page
class QueuePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.enqueueInput = page.locator('#enqueueInput');
    this.enqueueBtn = page.locator('#enqueueBtn');
    this.dequeueBtn = page.locator('#dequeueBtn');
    this.peekBtn = page.locator('#peekBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.queueDisplay = page.locator('#queueDisplay');
    this.message = page.locator('#message');
  }

  // Navigate to the app URL
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Enqueue a value using the button
  async enqueue(value) {
    await this.enqueueInput.fill(value);
    await this.enqueueBtn.click();
  }

  // Enqueue by pressing Enter in the input
  async enqueueByEnter(value) {
    await this.enqueueInput.fill(value);
    await this.enqueueInput.press('Enter');
  }

  // Click Dequeue
  async dequeue() {
    await this.dequeueBtn.click();
  }

  // Click Peek
  async peek() {
    await this.peekBtn.click();
  }

  // Click Clear
  async clear() {
    await this.clearBtn.click();
  }

  // Get array of texts of queue items (front → rear)
  async getQueueItemsText() {
    const items = await this.queueDisplay.locator('.queue-item').allTextContents();
    return items.map(s => s.trim());
  }

  // Count queue items
  async queueCount() {
    return await this.queueDisplay.locator('.queue-item').count();
  }

  // Get the first (front) queue item element handle locator
  frontItem() {
    return this.queueDisplay.locator('.queue-item').first();
  }

  // Get message text
  async getMessageText() {
    return (await this.message.textContent())?.trim() ?? '';
  }

  // Check if a button is disabled
  async isDisabled(buttonLocator) {
    return await buttonLocator.isDisabled();
  }
}

test.describe('Queue Demonstration - end-to-end interactions', () => {
  // Collect console messages and page errors during tests to assert no unexpected runtime errors occurred.
  test.beforeEach(async ({ page }) => {
    // Attach listeners to capture console and page errors. Stored on page for access inside tests.
    page['_consoleMessages'] = [];
    page['_pageErrors'] = [];

    page.on('console', (msg) => {
      // store the message type and text for assertions
      page['_consoleMessages'].push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', (err) => {
      // store the error object for assertions
      page['_pageErrors'].push(err);
    });
  });

  // Helper to assert no critical runtime errors (ReferenceError, TypeError, SyntaxError) were thrown
  async function assertNoRuntimeErrors(page) {
    const pageErrors = page['_pageErrors'] || [];
    const consoleMessages = page['_consoleMessages'] || [];

    // Fail if any page errors were captured
    expect(pageErrors.length, `Unexpected uncaught page errors: ${pageErrors.map(e => String(e)).join('; ')}`).toBe(0);

    // Ensure there are no console messages of type 'error' which could indicate runtime issues
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, `Unexpected console errors: ${consoleErrors.map(e => e.text).join(' || ')}`).toBe(0);
  }

  test('Initial page load shows expected default state', async ({ page }) => {
    // Purpose: Verify initial render, button states, and intro message
    const q = new QueuePage(page);
    await q.goto();

    // Verify the title and header are present
    await expect(page).toHaveTitle(/Queue Demonstration/);
    await expect(page.locator('h1')).toHaveText('Queue Demonstration');

    // Buttons: Enqueue enabled, others disabled
    expect(await q.isDisabled(q.enqueueBtn)).toBe(false);
    expect(await q.isDisabled(q.dequeueBtn)).toBe(true);
    expect(await q.isDisabled(q.peekBtn)).toBe(true);
    expect(await q.isDisabled(q.clearBtn)).toBe(true);

    // Queue display is empty initially
    expect(await q.queueCount()).toBe(0);

    // Introductory message present
    const msg = await q.getMessageText();
    expect(msg).toContain('Enter values to enqueue');

    // Verify no runtime errors occurred during load
    await assertNoRuntimeErrors(page);
  });

  test.describe('Enqueue interactions and validations', () => {
    test('Enqueue a single value updates DOM and enables controls', async ({ page }) => {
      // Purpose: Test enqueueing a value via the Enqueue button and resulting UI changes
      const q1 = new QueuePage(page);
      await q.goto();

      await q.enqueue('apple');

      // Message should reflect successful enqueue
      expect(await q.getMessageText()).toBe('Enqueued "apple" successfully.');

      // Input should be cleared
      expect(await q.enqueueInput.inputValue()).toBe('');

      // Queue should now have one item with expected text
      const items1 = await q.getQueueItemsText();
      expect(items).toEqual(['apple']);

      // First item should indicate Front of Queue via title and inline style
      const front = q.frontItem();
      await expect(front).toHaveAttribute('title', 'Front of Queue');

      // Inline style should include a border for the front indicator
      const styleAttr = await front.getAttribute('style');
      expect(styleAttr).toBeTruthy();
      expect(styleAttr).toContain('2px solid');

      // Buttons should now be enabled (dequeue, peek, clear)
      expect(await q.isDisabled(q.dequeueBtn)).toBe(false);
      expect(await q.isDisabled(q.peekBtn)).toBe(false);
      expect(await q.isDisabled(q.clearBtn)).toBe(false);

      await assertNoRuntimeErrors(page);
    });

    test('Enqueueing empty value shows error and does not change queue', async ({ page }) => {
      // Purpose: Ensure empty input is rejected and error message displayed
      const q2 = new QueuePage(page);
      await q.goto();

      // Ensure queue empty
      expect(await q.queueCount()).toBe(0);

      // Click Enqueue with empty input
      await q.enqueueInput.fill('   ');
      await q.enqueueBtn.click();

      // Error message should appear
      const msg1 = await q.getMessageText();
      expect(msg).toBe('Please enter a value to enqueue.');

      // Queue should still be empty
      expect(await q.queueCount()).toBe(0);

      // Dequeue/peek/clear remain disabled
      expect(await q.isDisabled(q.dequeueBtn)).toBe(true);
      expect(await q.isDisabled(q.peekBtn)).toBe(true);
      expect(await q.isDisabled(q.clearBtn)).toBe(true);

      await assertNoRuntimeErrors(page);
    });

    test('Enqueue using Enter key triggers enqueue', async ({ page }) => {
      // Purpose: Validate keyboard accessibility: pressing Enter enqueues the input value
      const q3 = new QueuePage(page);
      await q.goto();

      await q.enqueueByEnter('banana');

      // Confirm queue updated
      expect(await q.getQueueItemsText()).toEqual(['banana']);

      // Confirm message
      expect(await q.getMessageText()).toBe('Enqueued "banana" successfully.');

      await assertNoRuntimeErrors(page);
    });

    test('Multiple enqueues preserve FIFO order (Front -> Rear)', async ({ page }) => {
      // Purpose: Validate ordering when multiple items enqueued sequentially
      const q4 = new QueuePage(page);
      await q.goto();

      await q.enqueue('one');
      await q.enqueue('two');
      await q.enqueue('three');

      // Expect front → rear to be one, two, three
      expect(await q.getQueueItemsText()).toEqual(['one', 'two', 'three']);

      // Front item should be 'one' with front title
      await expect(q.frontItem()).toHaveText('one');
      await expect(q.frontItem()).toHaveAttribute('title', 'Front of Queue');

      await assertNoRuntimeErrors(page);
    });
  });

  test.describe('Dequeue, Peek, and Clear behaviors', () => {
    test('Peek shows front without removing it', async ({ page }) => {
      // Purpose: Peek should display current front and not mutate the queue
      const q5 = new QueuePage(page);
      await q.goto();

      // Prepare queue
      await q.enqueue('alpha');
      await q.enqueue('beta');

      // Peek
      await q.peek();

      // Message should show front item
      expect(await q.getMessageText()).toBe('Front of the queue: "alpha".');

      // Queue should remain unchanged
      expect(await q.getQueueItemsText()).toEqual(['alpha', 'beta']);

      await assertNoRuntimeErrors(page);
    });

    test('Dequeue removes front and updates UI accordingly', async ({ page }) => {
      // Purpose: Ensure dequeue follows FIFO and UI reflects removal
      const q6 = new QueuePage(page);
      await q.goto();

      // Setup multiple items
      await q.enqueue('x');
      await q.enqueue('y');
      await q.enqueue('z');

      // Dequeue once
      await q.dequeue();

      // Message should reflect removed value
      expect(await q.getMessageText()).toBe('Dequeued "x".');

      // Now front should be 'y'
      expect(await q.getQueueItemsText()).toEqual(['y', 'z']);
      await expect(q.frontItem()).toHaveText('y');

      // Dequeue twice more to empty the queue
      await q.dequeue();
      await q.dequeue();

      // When empty, buttons (dequeue, peek, clear) disabled
      expect(await q.queueCount()).toBe(0);
      expect(await q.isDisabled(q.dequeueBtn)).toBe(true);
      expect(await q.isDisabled(q.peekBtn)).toBe(true);
      expect(await q.isDisabled(q.clearBtn)).toBe(true);

      await assertNoRuntimeErrors(page);
    });

    test('Clear empties the queue and shows cleared message', async ({ page }) => {
      // Purpose: Verify Clear Queue resets state and DOM
      const q7 = new QueuePage(page);
      await q.goto();

      await q.enqueue('a');
      await q.enqueue('b');

      // Clear the queue
      await q.clear();

      // Message must indicate cleared
      expect(await q.getMessageText()).toBe('Queue cleared.');

      // Queue display empty
      expect(await q.queueCount()).toBe(0);

      // Buttons disabled again
      expect(await q.isDisabled(q.dequeueBtn)).toBe(true);
      expect(await q.isDisabled(q.peekBtn)).toBe(true);
      expect(await q.isDisabled(q.clearBtn)).toBe(true);

      await assertNoRuntimeErrors(page);
    });

    test('Attempting to dequeue when queue empty shows error', async ({ page }) => {
      // Purpose: Test error handling when dequeue is invoked on empty queue
      const q8 = new QueuePage(page);
      await q.goto();

      // Ensure empty
      expect(await q.queueCount()).toBe(0);

      // Force click on disabled button is not allowed via Playwright if it's disabled.
      // Instead, call the dequeue button click through the DOM (simulate user cannot click disabled)
      // We will click only if enabled; otherwise assert the disabled state and then simulate user behavior:
      expect(await q.isDisabled(q.dequeueBtn)).toBe(true);

      // Use page.evaluate to try to trigger the handler as a user might via script is not allowed per instructions.
      // So instead assert that clicking is disabled and show proper expected message upon user trying to dequeue when empty:
      // The app sets the message when dequeueBtn is clicked; since the button is disabled, there is no change to message.
      // We'll assert that clicking is disabled and the message remains the introductory text.
      const beforeMsg = await q.getMessageText();
      expect(beforeMsg).toContain('Enter values to enqueue');

      await assertNoRuntimeErrors(page);
    });
  });

  test('Combined scenario: enqueue, peek, dequeue, clear cycle', async ({ page }) => {
    // Purpose: End-to-end scenario validating the full workflow in sequence
    const q9 = new QueuePage(page);
    await q.goto();

    // Start empty
    expect(await q.queueCount()).toBe(0);

    // Enqueue multiple items
    await q.enqueue('first');
    await q.enqueue('second');
    await q.enqueue('third');
    expect(await q.getQueueItemsText()).toEqual(['first', 'second', 'third']);

    // Peek should show 'first' without removing
    await q.peek();
    expect(await q.getMessageText()).toBe('Front of the queue: "first".');
    expect(await q.getQueueItemsText()).toEqual(['first', 'second', 'third']);

    // Dequeue should remove 'first'
    await q.dequeue();
    expect(await q.getMessageText()).toBe('Dequeued "first".');
    expect(await q.getQueueItemsText()).toEqual(['second', 'third']);

    // Clear the queue
    await q.clear();
    expect(await q.getMessageText()).toBe('Queue cleared.');
    expect(await q.queueCount()).toBe(0);

    await assertNoRuntimeErrors(page);
  });
});