import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd6f102-d59e-11f0-ae0b-570552a0b645.html';

// Page Object Model for the Queue application
class QueuePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#queue-input');
    this.enqueueBtn = page.locator('#enqueue-btn');
    this.dequeueBtn = page.locator('#dequeue-btn');
    this.clearBtn = page.locator('#clear-btn');
    this.queueContainer = page.locator('#queue');
    this.sizeValue = page.locator('#size-value');
    this.frontValue = page.locator('#front-value');
    this.rearValue = page.locator('#rear-value');
    this.errorMessage = page.locator('#error-message');
    this.logEntries = page.locator('#log-entries');
  }

  // Navigate to the app page
  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  }

  // Enqueue a value using the Enqueue button
  async enqueue(value) {
    await this.input.fill(value);
    await this.enqueueBtn.click();
  }

  // Enqueue a value by pressing Enter in the input
  async enqueueByEnter(value) {
    await this.input.fill(value);
    await this.input.press('Enter');
  }

  // Click dequeue
  async dequeue() {
    await this.dequeueBtn.click();
  }

  // Click clear
  async clear() {
    await this.clearBtn.click();
  }

  // Return count of visual queue items
  async getQueueItemsCount() {
    return await this.queueContainer.locator('.queue-item').count();
  }

  // Return texts of queue items in DOM order
  async getQueueItemsTexts() {
    const items = this.queueContainer.locator('.queue-item');
    const count = await items.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push(await items.nth(i).textContent());
    }
    return texts;
  }

  async firstQueueItem() {
    return this.queueContainer.locator('.queue-item').first();
  }

  async lastQueueItem() {
    return this.queueContainer.locator('.queue-item').last();
  }

  async getSize() {
    return (await this.sizeValue.textContent()).trim();
  }

  async getFront() {
    return (await this.frontValue.textContent()).trim();
  }

  async getRear() {
    return (await this.rearValue.textContent()).trim();
  }

  async getErrorText() {
    return (await this.errorMessage.textContent()).trim();
  }

  async getLogCount() {
    return await this.logEntries.locator('.log-entry').count();
  }

  async getTopLogText() {
    const first = this.logEntries.locator('.log-entry').first();
    return (await first.textContent())?.trim() ?? '';
  }

  async getAllLogTexts() {
    const items = this.logEntries.locator('.log-entry');
    const count = await items.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push((await items.nth(i).textContent()).trim());
    }
    return texts;
  }
}

test.describe('Queue Data Structure Visualization - Comprehensive E2E', () => {
  let queuePage;
  let consoleErrors;
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Prepare arrays to capture console and page errors for each test
    consoleErrors = [];
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages and errors
    page.on('console', (msg) => {
      const type = msg.type(); // e.g., 'log', 'error'
      const text = msg.text();
      consoleMessages.push({ type, text });
      if (type === 'error') {
        consoleErrors.push(text);
      }
    });

    // Collect page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    queuePage = new QueuePage(page);
    await queuePage.goto();
  });

  test.afterEach(async () => {
    // Basic safety: ensure tests capture console / page errors; tests will assert expectations
    // (No teardown modifications required for the page)
  });

  test.describe('Initial page load and default state', () => {
    test('Initial load shows expected static elements and default queue state', async ({ page }) => {
      // Verify page title and main heading are present and correct
      await expect(page.locator('h1')).toHaveText('Queue Data Structure');

      // Verify input placeholder and buttons present
      await expect(queuePage.input).toHaveAttribute('placeholder', 'Enter a value to enqueue');
      await expect(queuePage.enqueueBtn).toBeVisible();
      await expect(queuePage.dequeueBtn).toBeVisible();
      await expect(queuePage.clearBtn).toBeVisible();

      // Default stats: size 0, front and rear '-'
      expect(await queuePage.getSize()).toBe('0');
      expect(await queuePage.getFront()).toBe('-');
      expect(await queuePage.getRear()).toBe('-');

      // No queue items rendered initially
      expect(await queuePage.getQueueItemsCount()).toBe(0);

      // Error message area is empty
      expect(await queuePage.getErrorText()).toBe('');

      // Operations log initially empty
      expect(await queuePage.getLogCount()).toBe(0);

      // Ensure no page errors or console.error messages occurred during initial load
      expect(pageErrors.length, 'No page errors on initial load').toBe(0);
      expect(consoleErrors.length, 'No console.error messages on initial load').toBe(0);
    });
  });

  test.describe('Enqueue operations and input handling', () => {
    test('Enqueue via button updates visual queue, stats, and operations log', async ({ page }) => {
      // Enqueue a single value
      await queuePage.enqueue('A');

      // After enqueue, one visual queue item should appear
      expect(await queuePage.getQueueItemsCount()).toBe(1);

      // The visible item should contain the enqueued value
      const texts = await queuePage.getQueueItemsTexts();
      expect(texts[0]).toBe('A');

      // The last item should have the "new" class applied (visual indicator)
      await expect(queuePage.lastQueueItem()).toHaveClass(/queue-item/);
      const lastClasses = await queuePage.lastQueueItem().getAttribute('class');
      expect(lastClasses.includes('new')).toBeTruthy();

      // Stats should update to size 1 and front/rear reflect 'A'
      expect(await queuePage.getSize()).toBe('1');
      expect(await queuePage.getFront()).toBe('A');
      expect(await queuePage.getRear()).toBe('A');

      // Operations log should contain an "Enqueued: A" entry at the top
      expect(await queuePage.getLogCount()).toBe(1);
      const topLog = await queuePage.getTopLogText();
      expect(topLog.includes('Enqueued: A')).toBeTruthy();

      // No unexpected console or page errors
      expect(pageErrors.length).toBe(0);
      expect(consoleErrors.length).toBe(0);
    });

    test('Enqueue via Enter key works and updates states', async ({ page }) => {
      // Enqueue a second value using Enter key
      await queuePage.enqueueByEnter('B');

      // Two items expected: 'A' (front) and 'B' (rear)
      expect(await queuePage.getQueueItemsCount()).toBe(2);
      const texts = await queuePage.getQueueItemsTexts();
      expect(texts[0]).toBe('A'); // front remains A
      expect(texts[1]).toBe('B'); // newly enqueued B at rear

      // Stats should reflect size 2, front A, rear B
      expect(await queuePage.getSize()).toBe('2');
      expect(await queuePage.getFront()).toBe('A');
      expect(await queuePage.getRear()).toBe('B');

      // Log should have newest entry indicating Enqueued: B
      const topLog = await queuePage.getTopLogText();
      expect(topLog.includes('Enqueued: B')).toBeTruthy();

      // Input should be cleared after enqueue by Enter as well
      await expect(queuePage.input).toHaveValue('');

      // No page or console errors introduced
      expect(pageErrors.length).toBe(0);
      expect(consoleErrors.length).toBe(0);
    });

    test('Attempting to enqueue with empty input shows appropriate error message', async ({ page }) => {
      // Ensure input is empty
      await queuePage.input.fill('');

      // Click enqueue with empty input
      await queuePage.enqueueBtn.click();

      // Expect the error area to show the "Please enter a value to enqueue." message
      expect(await queuePage.getErrorText()).toBe('Please enter a value to enqueue.');

      // Stats should remain unchanged (size should remain 2 from previous steps)
      // However, since each test runs in isolation, ensure that behavior is consistent:
      // Size should be numeric; assert it is present and not negative
      const size = parseInt(await queuePage.getSize(), 10);
      expect(Number.isFinite(size)).toBeTruthy();
      expect(size).toBeGreaterThanOrEqual(0);

      // No unexpected page or console errors
      expect(pageErrors.length).toBe(0);
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe('Dequeue operations and animations', () => {
    test('Dequeue from non-empty queue triggers removal animation and updates stats/log', async ({ page }) => {
      // Precondition: ensure there are at least two items (enqueue if necessary)
      // For isolation, clear first then enqueue A and B to ensure known state
      await queuePage.clear();
      await queuePage.enqueue('A');
      await queuePage.enqueue('B');

      // Confirm precondition
      expect(await queuePage.getQueueItemsCount()).toBe(2);
      expect(await queuePage.getFront()).toBe('A');
      expect(await queuePage.getRear()).toBe('B');

      // Click dequeue: should add 'removing' class to first item immediately
      const firstItem = queuePage.queueContainer.locator('.queue-item').first();
      await queuePage.dequeue();

      // Immediately after click, first child should have 'removing' class
      await expect(firstItem).toHaveClass(/removing/);

      // Wait for animation completion + debounce (visualizeDequeue uses 500ms)
      await page.waitForTimeout(650);

      // After animation and internal dequeue, the first item should be removed
      expect(await queuePage.getQueueItemsCount()).toBe(1);
      // New front should be 'B' and size should be '1'
      expect(await queuePage.getFront()).toBe('B');
      expect(await queuePage.getSize()).toBe('1');

      // Log should include a "Dequeued: A" entry
      const logs = await queuePage.getAllLogTexts();
      const hasDequeuedA = logs.some((t) => t.includes('Dequeued: A'));
      expect(hasDequeuedA).toBeTruthy();

      // No page or console errors
      expect(pageErrors.length).toBe(0);
      expect(consoleErrors.length).toBe(0);
    });

    test('Dequeue on empty queue shows "Queue is empty" error message', async ({ page }) => {
      // Ensure queue is cleared
      await queuePage.clear();
      expect(await queuePage.getQueueItemsCount()).toBe(0);

      // Click dequeue on empty queue; the actual error message is set by queue.dequeue() after a 500ms timeout
      await queuePage.dequeue();

      // Wait for the internal setTimeout(500) to execute
      await page.waitForTimeout(600);

      // Expect the error message to indicate empty queue
      expect(await queuePage.getErrorText()).toBe('Queue is empty! Cannot dequeue.');

      // No unexpected page-level errors should have occurred
      expect(pageErrors.length).toBe(0);
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe('Clear and log management behavior', () => {
    test('Clear Queue empties visual items, resets stats, and logs the clearing', async ({ page }) => {
      // Enqueue a few values first
      await queuePage.enqueue('X');
      await queuePage.enqueue('Y');
      expect(await queuePage.getQueueItemsCount()).toBeGreaterThanOrEqual(2);

      // Click clear
      await queuePage.clear();

      // After clearing, no queue items should remain
      expect(await queuePage.getQueueItemsCount()).toBe(0);

      // Stats reset to size 0 and front/rear '-'
      expect(await queuePage.getSize()).toBe('0');
      expect(await queuePage.getFront()).toBe('-');
      expect(await queuePage.getRear()).toBe('-');

      // Operations log should include a "Queue cleared" entry
      const logs = await queuePage.getAllLogTexts();
      const hasClear = logs.some((t) => t.includes('Queue cleared'));
      expect(hasClear).toBeTruthy();

      // No page or console errors
      expect(pageErrors.length).toBe(0);
      expect(consoleErrors.length).toBe(0);
    });

    test('Operations log retains only the last 5 entries', async ({ page }) => {
      // Clear any existing items and log state to be deterministic
      await queuePage.clear();

      // Enqueue 6 distinct items in quick succession
      const values = ['1', '2', '3', '4', '5', '6'];
      for (const v of values) {
        await queuePage.enqueue(v);
        // Small pause to allow DOM/log update (logOperation is synchronous, but be defensive)
        await page.waitForTimeout(20);
      }

      // The log should keep only last 5 entries
      const logCount = await queuePage.getLogCount();
      expect(logCount).toBe(5);

      // The top (most recent) log entry should correspond to the last enqueued value '6'
      const top = await queuePage.getTopLogText();
      expect(top.includes('Enqueued: 6')).toBeTruthy();

      // The bottom-most log entry (oldest visible) should correspond to '2'
      const allLogs = await queuePage.getAllLogTexts();
      const oldestVisible = allLogs[allLogs.length - 1];
      expect(oldestVisible.includes('Enqueued: 2')).toBeTruthy();

      // No page or console errors
      expect(pageErrors.length).toBe(0);
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe('Accessibility and misc checks', () => {
    test('Input is focusable and has a maxlength attribute', async ({ page }) => {
      // Check maxlength attribute
      await expect(queuePage.input).toHaveAttribute('maxlength', '10');

      // Focus the input and ensure active element is the input
      await queuePage.input.focus();
      const activeId = await page.evaluate(() => document.activeElement?.id || '');
      expect(activeId).toBe('queue-input');

      // No page or console errors
      expect(pageErrors.length).toBe(0);
      expect(consoleErrors.length).toBe(0);
    });

    test('No uncaught exceptions or console.error messages throughout interactions', async ({ page }) => {
      // Perform a mix of interactions to exercise codepaths
      await queuePage.clear();
      await queuePage.enqueue('alpha');
      await queuePage.enqueue('beta');
      await queuePage.dequeue();
      await page.waitForTimeout(600); // allow dequeue internals to run
      await queuePage.clear();

      // Expect no uncaught exceptions were emitted to the page
      expect(pageErrors.length).toBe(0);

      // Expect no console.error messages were produced
      expect(consoleErrors.length).toBe(0);

      // Basic sanity: operations log should contain textual entries
      const logs = await queuePage.getAllLogTexts();
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });
  });
});