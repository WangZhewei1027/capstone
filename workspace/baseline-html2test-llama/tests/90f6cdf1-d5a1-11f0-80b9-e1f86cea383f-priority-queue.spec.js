import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f6cdf1-d5a1-11f0-80b9-e1f86cea383f.html';

test.describe('Priority Queue Application (90f6cdf1-d5a1-11f0-80b9-e1f86cea383f)', () => {
  // Navigate to the application before each test
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
  });

  test('Initial load: UI elements are present and default state is empty', async ({ page }) => {
    // Verify the page title and header are correct
    await expect(page).toHaveTitle(/Priority Queue/i);
    const header = await page.locator('h1');
    await expect(header).toHaveText('Priority Queue');

    // Verify interactive elements exist: input, add button, queue container
    const input = page.locator('#priority');
    const addButton = page.locator('#add');
    const queueContainer = page.locator('#queue');

    await expect(input).toBeVisible();
    await expect(addButton).toBeVisible();
    await expect(queueContainer).toBeVisible();

    // Input should be empty by default and queue container should have no content
    await expect(input).toHaveValue('');
    await expect(queueContainer).toHaveText('');

    // Ensure the PriorityQueue global exists and is empty at load
    const size = await page.evaluate(() => {
      return window.priorityQueue ? window.priorityQueue.size() : null;
    });
    expect(size).toBe(0);
  });

  test('Typing into the input triggers the input handler, adds to internal queue, and a runtime error occurs from displayQueue', async ({ page }) => {
    // Collect the first pageerror emitted by the page
    const waitForError = page.waitForEvent('pageerror');

    // Type a numeric value into the input - this triggers the input event listener
    await page.fill('#priority', '10');

    // Wait for the runtime error triggered by displayQueue (the code calls displayQueue after add)
    const error = await waitForError;
    // Assert that an error occurred and message indicates the displayQueue bug (this.queue is undefined -> .map fails)
    expect(error).toBeTruthy();
    expect(error.message).toMatch(/undefined|Cannot read properties|map/i);

    // Despite the runtime error during DOM display, the PriorityQueue instance should have been mutated by add()
    const pqSize = await page.evaluate(() => window.priorityQueue.size());
    expect(pqSize).toBeGreaterThanOrEqual(1);

    // The DOM queue container should remain empty because displayQueue throws before updating the DOM
    const queueHtml = await page.locator('#queue').innerHTML();
    expect(queueHtml).toBe('');
  });

  test('Clicking the Add button calls add() and triggers the same runtime error from displayQueue', async ({ page }) => {
    // Ensure no prior value
    await page.fill('#priority', '');

    // Prepare to capture the pageerror caused by the add click handler's call to displayQueue
    const pageErrorPromise = page.waitForEvent('pageerror');

    // Set the input value (the add button reads the input value on click)
    await page.fill('#priority', '7');

    // Click the Add button
    await page.click('#add');

    // Wait for the runtime error emitted as a result of displayQueue being called
    const err = await pageErrorPromise;
    expect(err).toBeTruthy();
    expect(err.message).toMatch(/undefined|Cannot read properties|map/i);

    // Even though displayQueue threw, the internal queue should contain the item added by the button handler
    const peekItem = await page.evaluate(() => {
      // Use peek() to return the highest-priority item's item string
      return window.priorityQueue.peek();
    });
    // The input value "7" is used both as item and priority in the implementation; ensure peek returns "7"
    expect(peekItem).toBe('7');
  });

  test('Calling peek() on an empty PriorityQueue throws an exception (edge case)', async ({ page }) => {
    // Ensure priorityQueue is empty on fresh load
    const size1 = await page.evaluate(() => window.priorityQueue.size1());
    expect(size).toBe(0);

    // Calling peek() on an empty queue should cause an exception in the page context.
    // We assert that the evaluated promise is rejected.
    await expect(page.evaluate(() => window.priorityQueue.peek())).rejects.toThrow();
  });

  test('Adding a non-numeric value results in NaN priority stored internally and still triggers displayQueue runtime error', async ({ page }) => {
    // Prepare to capture the pageerror
    const pageErrorPromise1 = page.waitForEvent('pageerror');

    // Directly set the input's value to a non-numeric string (input type="number" allows programmatic assignment)
    await page.evaluate(() => {
      const el = document.getElementById('priority');
      el.value = 'abc';
    });

    // Click Add to trigger the event listener that uses parseInt -> NaN, then calls add() and displayQueue()
    await page.click('#add');

    // Wait for the runtime error from displayQueue
    const err1 = await pageErrorPromise;
    expect(err).toBeTruthy();
    expect(err.message).toMatch(/undefined|Cannot read properties|map/i);

    // Inspect the internal queue contents to confirm the item and its priority (NaN) were stored
    const internal = await page.evaluate(() => {
      const q = window.priorityQueue.queue.slice(); // clone
      return q.map(i => ({ item: i.item, priority: i.priority }));
    });

    // The recently added item should be present; at least one entry should have item 'abc' and priority NaN
    const found = internal.find(e => e.item === 'abc');
    expect(found).toBeTruthy();
    // Check that the stored priority is NaN
    expect(Number.isNaN(found.priority)).toBe(true);

    // DOM queue should remain empty due to displayQueue throwing before updating
    const queueText = await page.locator('#queue').innerText();
    expect(queueText).toBe('');
  });

  test('Multiple rapid input events add multiple items internally and emit runtime errors for displayQueue each time', async ({ page }) => {
    // Start listening for multiple pageerror events. We'll capture the first two errors.
    const errors = [];
    const handler = (e) => errors.push(e);
    page.on('pageerror', handler);

    // Rapidly fill input to cause multiple input events (each key will trigger input listener)
    // Use fill with one char at a time to simulate rapid typing
    const inputStr = '123';
    for (const ch of inputStr) {
      await page.type('#priority', ch);
      // Small delay to allow the event handler to run
      await page.waitForTimeout(50);
    }

    // Wait a short amount to ensure errors are collected
    await page.waitForTimeout(200);

    // We expect at least one runtime error caused by displayQueue; multiple input keystrokes may cause multiple errors
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].message).toMatch(/undefined|Cannot read properties|map/i);

    // Remove the error listener
    page.off('pageerror', handler);

    // Check that internal queue size increased by the number of add() calls (input handler invoked per input)
    const internalSize = await page.evaluate(() => window.priorityQueue.size());
    // At least one was added; depending on how many input events fired, size should be >= 1
    expect(internalSize).toBeGreaterThanOrEqual(1);

    // DOM queue remains empty because displayQueue throws during each attempt to render
    const queueHtml1 = await page.locator('#queue').innerHTML();
    expect(queueHtml).toBe('');
  });
});