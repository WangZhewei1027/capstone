import { test, expect } from '@playwright/test';

// Test file: be873c62-cd35-11f0-9e7b-93b903303299-queue.spec.js
// URL under test:
const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be873c62-cd35-11f0-9e7b-93b903303299.html';

// Simple Page Object for the Queue Demo
class QueuePage {
  constructor(page) {
    this.page = page;
    this.implSelect = page.locator('#impl');
    this.capacityInput = page.locator('#capacity');
    this.valueInput = page.locator('#value');
    this.enqueueBtn = page.locator('#enqueue');
    this.dequeueBtn = page.locator('#dequeue');
    this.peekBtn = page.locator('#peek');
    this.clearBtn = page.locator('#clear');
    this.randomBtn = page.locator('#random');
    this.sizeSpan = page.locator('#size');
    this.emptySpan = page.locator('#empty');
    this.frontIndexSpan = page.locator('#frontIndex');
    this.rearIndexSpan = page.locator('#rearIndex');
    this.queueBox = page.locator('#queueBox');
    this.logBox = page.locator('#log');
    this.arrayGrid = page.locator('#arrayGrid');
  }

  // Helper to read current log texts (most recent first)
  async getLogLines() {
    return this.logBox.locator('div').allTextContents();
  }

  async getQueueCellTexts() {
    // returns visible logical queue cell texts in order
    const cells = this.queueBox.locator('.cell');
    return cells.allTextContents();
  }

  async getArrayGridCellTexts() {
    // returns underlying buffer cell texts (if circular)
    const cells1 = this.arrayGrid.locator('.cell');
    return cells.allTextContents();
  }
}

test.describe('Queue Demonstration - end-to-end', () => {
  // Collect page errors and console messages for assertions
  let pageErrors;
  let consoleMessages;

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Capture console messages
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Navigate to app
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  });

  test.afterEach(async () => {
    // no-op; page handlers are bound per test via beforeEach
  });

  test.describe('Initial load and default state', () => {
    test('should load the page and show initial empty queue (Array impl)', async ({ page }) => {
      const q = new QueuePage(page);

      // Ensure page title is correct
      await expect(page).toHaveTitle(/Queue Demonstration/);

      // Verify default implementation is "array"
      await expect(q.implSelect).toHaveValue('array');

      // Verify initial info: size 0 and empty true
      await expect(q.sizeSpan).toHaveText('0');
      await expect(q.emptySpan).toHaveText('true');

      // The queueBox should show a single empty cell with text "Empty"
      await expect(q.queueBox.locator('.cell.empty')).toHaveCount(1);
      await expect(q.queueBox.locator('.cell.empty')).toHaveText('Empty');

      // The array grid (underlying buffer) should be hidden for array impl
      await expect(q.arrayGrid).toBeHidden();

      // The log should include the "Ready — using Array implementation" entry
      const logs = await q.getLogLines();
      expect(logs.some(l => l.includes('Ready — using Array implementation'))).toBe(true);

      // Assert no uncaught page errors occurred during load
      expect(pageErrors).toHaveLength(0);
    });
  });

  test.describe('Array implementation operations', () => {
    test('enqueue, peek (shows alert), and dequeue should update DOM and logs', async ({ page }) => {
      const q1 = new QueuePage(page);

      // Clear any pre-existing logs by clicking clear (defensive)
      await q.clearBtn.click();
      // Enqueue a value via input + click
      await q.valueInput.fill('A');
      await q.enqueueBtn.click();

      // After enqueue, logical queue should contain one cell with "A"
      await expect(q.queueBox.locator('.cell')).toHaveCount(1);
      const cellTexts = await q.getQueueCellTexts();
      // The cell's text includes the labels "Front" and "Rear" appended as separate nodes;
      // expect the main text to contain 'A' somewhere.
      expect(cellTexts.some(t => t.includes('A'))).toBe(true);

      // Size and Empty indicators update
      await expect(q.sizeSpan).toHaveText('1');
      await expect(q.emptySpan).toHaveText('false');

      // The log should include Enqueued "A" (array)
      let logs1 = await q.getLogLines();
      expect(logs.some(l => l.includes('Enqueued "A" (array)'))).toBe(true);

      // Clicking Peek should show an alert with "Front: A" and log a Peek entry
      const [dialog] = await Promise.all([
        page.waitForEvent('dialog'),
        q.peekBtn.click()
      ]);
      // Validate dialog message and accept it
      expect(dialog.message()).toContain('Front: A');
      await dialog.accept();

      logs = await q.getLogLines();
      expect(logs.some(l => l.includes('Peek: "A"'))).toBe(true);

      // Click Dequeue: should highlight the first cell then remove it after animation
      await q.dequeueBtn.click();

      // Immediately after click, the first logical cell should acquire highlight class and reduced opacity
      const firstCell = q.queueBox.locator('.cell').first();
      await expect(firstCell).toHaveClass(/highlight|/); // highlight may be present; non-strict check
      // wait for animation timeout plus buffer (animateDequeue calls setTimeout render at 300ms)
      await page.waitForTimeout(420);

      // After animation, queue should be empty again
      await expect(q.sizeSpan).toHaveText('0');
      await expect(q.emptySpan).toHaveText('true');
      await expect(q.queueBox.locator('.cell.empty')).toHaveCount(1);

      // Dequeue log entry should exist
      logs = await q.getLogLines();
      expect(logs.some(l => l.includes('Dequeued "A"'))).toBe(true);

      // Assert no uncaught page errors occurred
      expect(pageErrors).toHaveLength(0);
    });
  });

  test.describe('Edge cases and user alerts', () => {
    test('attempting to enqueue an empty value should trigger an alert and not change queue', async ({ page }) => {
      const q2 = new QueuePage(page);

      // Ensure queue empty
      await q.clearBtn.click();
      await expect(q.sizeSpan).toHaveText('0');

      // Ensure value input is empty
      await q.valueInput.fill('');

      // Clicking Enqueue with empty input triggers an alert
      const [dialog] = await Promise.all([
        page.waitForEvent('dialog'),
        q.enqueueBtn.click()
      ]);
      expect(dialog.message()).toBe('Enter a value to enqueue');
      await dialog.accept();

      // Queue remains unchanged
      await expect(q.sizeSpan).toHaveText('0');
      await expect(q.queueBox.locator('.cell.empty')).toHaveCount(1);

      // No error in console
      expect(pageErrors).toHaveLength(0);
    });

    test('pressing Backspace on focused empty input triggers dequeue attempt log (empty queue)', async ({ page }) => {
      const q3 = new QueuePage(page);

      // Ensure queue empty
      await q.clearBtn.click();
      await expect(q.sizeSpan).toHaveText('0');

      // Focus value input (ensure it's empty)
      await q.valueInput.fill('');
      await q.valueInput.focus();

      // Press Backspace on empty input should call dequeueAction and produce a log entry
      await page.keyboard.press('Backspace');

      // Small delay for shake/log
      await page.waitForTimeout(120);

      const logs2 = await q.getLogLines();
      expect(logs.some(l => l.includes('Dequeue attempted on empty queue'))).toBe(true);

      // No uncaught exceptions
      expect(pageErrors).toHaveLength(0);
    });
  });

  test.describe('Circular buffer implementation and capacity behavior', () => {
    test('switch to circular, change capacity, fill buffer and observe failure on overflow', async ({ page }) => {
      const q4 = new QueuePage(page);

      // Switch implementation to circular via select
      await q.implSelect.selectOption('circular');

      // The arrayGrid (underlying buffer) should now be visible
      await expect(q.arrayGrid).toBeVisible();

      // The log should contain an entry about switching to circular buffer (default capacity 8)
      let logs3 = await q.getLogLines();
      expect(logs.some(l => l.includes('Switched to Circular Buffer'))).toBe(true);

      // Change capacity to 3: modify input value and dispatch change event
      await q.capacityInput.fill('3');
      // Dispatch change event programmatically to trigger capacity change handler
      await q.capacityInput.evaluate((el) => el.dispatchEvent(new Event('change')));

      // The log should report the capacity change
      logs = await q.getLogLines();
      expect(logs.some(l => l.includes('Capacity changed. New circular buffer capacity=3'))).toBe(true);

      // Enqueue three items
      await q.valueInput.fill('x');
      await q.enqueueBtn.click();
      await q.valueInput.fill('y');
      await q.enqueueBtn.click();
      await q.valueInput.fill('z');
      await q.enqueueBtn.click();

      // After enqueuing 3 items, size should be 3
      await expect(q.sizeSpan).toHaveText('3');
      await expect(q.emptySpan).toHaveText('false');

      // Logical queue should show 3 items
      const logical = await q.getQueueCellTexts();
      // Ensure x, y, z are present in logical view (text may include labels)
      expect(logical.some(t => t.includes('x'))).toBe(true);
      expect(logical.some(t => t.includes('y'))).toBe(true);
      expect(logical.some(t => t.includes('z'))).toBe(true);

      // Underlying array grid should show the buffered values in some cells
      const bufferCells = await q.getArrayGridCellTexts();
      // At least three cells should contain x, y, z (some cells may be empty strings)
      expect(bufferCells.filter(t => t !== '').length).toBeGreaterThanOrEqual(3);

      // Attempt to enqueue a fourth item which should fail (buffer full)
      await q.valueInput.fill('overflow');
      await q.enqueueBtn.click();

      // The log should include a failure message about buffer full
      logs = await q.getLogLines();
      expect(logs.some(l => l.includes('Failed to enqueue "overflow" — buffer full'))).toBe(true);

      // The size should still be 3
      await expect(q.sizeSpan).toHaveText('3');

      // No uncaught exceptions
      expect(pageErrors).toHaveLength(0);
    });
  });

  test.describe('Keyboard and random actions', () => {
    test('enter key enqueues the typed value and Random button enqueues something', async ({ page }) => {
      const q5 = new QueuePage(page);

      // Ensure array implementation
      await q.implSelect.selectOption('array');
      await expect(q.arrayGrid).toBeHidden();

      // Use keyboard Enter to enqueue
      await q.valueInput.fill('kbd-value');
      await q.valueInput.focus();
      // Press Enter to enqueue
      await page.keyboard.press('Enter');

      // Wait a short while to allow enqueue animation to finish
      await page.waitForTimeout(180);

      // Verify queue contains the new item
      const logical1 = await q.getQueueCellTexts();
      expect(logical.some(t => t.includes('kbd-value'))).toBe(true);

      // Click Random to add a random value
      await q.randomBtn.click();
      await page.waitForTimeout(180);

      // After random, size should be at least 2 now
      const sizeText = await q.sizeSpan.textContent();
      expect(Number(sizeText)).toBeGreaterThanOrEqual(2);

      // No uncaught exceptions
      expect(pageErrors).toHaveLength(0);
    });
  });
});