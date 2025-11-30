import { test, expect } from '@playwright/test';

const URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bddf560-cd36-11f0-b98e-a1744d282049.html';

test.describe('Queue (FIFO) Interactive Demo - End-to-end', () => {
  // Arrays to collect console messages and page errors for each test run
  let consoleMessages;
  let pageErrors;

  // Hook that runs before each test: navigate to the page and wire up listeners
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect console events emitted by the page
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect uncaught errors from the page
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Go to the application page
    await page.goto(URL, { waitUntil: 'domcontentloaded' });

    // Wait for initial render of queue area and log to be present
    await expect(page.locator('#queueArea')).toBeVisible();
    await expect(page.locator('#log')).toBeVisible();
  });

  // Hook that runs after each test: ensure there were no uncaught page errors or console.error messages.
  test.afterEach(async () => {
    // Fail if any uncaught page errors happened
    expect(pageErrors, `No uncaught page errors expected, found: ${pageErrors.length}`).toHaveLength(0);

    // Fail if any console messages of type 'error' were emitted
    const consoleErrors = consoleMessages.filter(c => c.type === 'error');
    expect(consoleErrors, `No console.error calls expected, found: ${consoleErrors.length}`).toHaveLength(0);
  });

  test('Initial page load shows empty queue and demo intro in log', async ({ page }) => {
    // Check initial meta badges are set to expected defaults
    await expect(page.locator('#size')).toHaveText('0');
    await expect(page.locator('#frontVal')).toHaveText('—');
    await expect(page.locator('#rearVal')).toHaveText('—');
    await expect(page.locator('#capVal')).toHaveText('∞');

    // The visual area should show an "Empty" node when queue is empty
    const firstNode = page.locator('#queueArea .node').first();
    await expect(firstNode).toHaveText(/Empty/);

    // The demo prepends an explanatory line to the operation log synchronously,
    // so the log should include the demo intro text.
    await expect(page.locator('#log')).toContainText('Demo: enqueue A, B, C, then dequeue twice to show FIFO');
  });

  test('Enqueue with explicit value updates UI, size, meta badges, and log', async ({ page }) => {
    // Enter a value and click Enqueue
    await page.fill('#valueInput', 'Task A');
    await page.click('#enqueueBtn');

    // The queue should now contain a node with the enqueued value
    await expect(page.locator('#queueArea .node')).toContainText('Task A');

    // Size should update to at least 1 (demo may have already enqueued items; ensure size increased relative to zero if it was zero)
    const sizeText = await page.locator('#size').textContent();
    expect(Number(sizeText)).toBeGreaterThanOrEqual(1);

    // Front and rear badges should reflect the presence of at least one element
    await expect(page.locator('#frontVal')).not.toHaveText('—');
    await expect(page.locator('#rearVal')).not.toHaveText('—');

    // Operation log should include an "Enqueued" entry for our value
    await expect(page.locator('#log')).toContainText('Enqueued "Task A"');
  });

  test('Enqueue via Enter key and random-item fallback works', async ({ page }) => {
    // Clear any value and press Enter: it should enqueue a generated "Item-XXX"
    await page.fill('#valueInput', '');
    await page.press('#valueInput', 'Enter');

    // The queue area should show a node whose text starts with "Item-"
    const nodes = page.locator('#queueArea .node');
    await expect(nodes.first()).toHaveText(/Item-\d+/);

    // Log should contain Enqueued with Item- prefix
    await expect(page.locator('#log')).toContainText('Enqueued "Item-');
  });

  test('Dequeue removes the front element and updates state and log', async ({ page }) => {
    // Ensure a known state by clearing first
    await page.click('#clearBtn');
    await expect(page.locator('#size')).toHaveText('0');

    // Enqueue two predictable items
    await page.fill('#valueInput', 'First');
    await page.click('#enqueueBtn');
    await page.fill('#valueInput', 'Second');
    await page.click('#enqueueBtn');

    // Verify both items are present
    await expect(page.locator('#queueArea .node')).toContainText('First');
    await expect(page.locator('#queueArea .node')).toContainText('Second');

    // Click Dequeue
    await page.click('#dequeueBtn');

    // After dequeue, "First" should no longer be the front; front badge should show "Second"
    await expect(page.locator('#frontVal')).toHaveText('Second');

    // The size should be 1 now
    const sizeAfter = await page.locator('#size').textContent();
    expect(Number(sizeAfter)).toBe(1);

    // Log should include the dequeued value
    await expect(page.locator('#log')).toContainText('Dequeued "First"');
  });

  test('Peek highlights front without removing it and logs correctly', async ({ page }) => {
    // Clear, enqueue a value to peek at
    await page.click('#clearBtn');
    await page.fill('#valueInput', 'PeekMe');
    await page.click('#enqueueBtn');

    // Click Peek
    await page.click('#peekBtn');

    // Log should indicate peeked value
    await expect(page.locator('#log')).toContainText('Peek: "PeekMe" (front)');

    // The front node should have an inline style box-shadow applied by the peek rendering
    const frontNode = page.locator('#queueArea .node').first();
    const styleAttr = await frontNode.getAttribute('style');
    expect(styleAttr).toBeTruthy();
    expect(styleAttr).toContain('rgba(59,130,246'); // color used for peek highlight
  });

  test('Clear button empties the queue and logs the action', async ({ page }) => {
    // Enqueue an item then clear
    await page.fill('#valueInput', 'ToBeCleared');
    await page.click('#enqueueBtn');

    // Ensure it's there
    await expect(page.locator('#queueArea .node')).toContainText('ToBeCleared');

    // Click Clear
    await page.click('#clearBtn');

    // Queue should show "Empty" node and size 0
    await expect(page.locator('#queueArea .node')).toHaveText(/Empty/);
    await expect(page.locator('#size')).toHaveText('0');

    // Log should record the clear action
    await expect(page.locator('#log')).toContainText('Cleared queue');
  });

  test('Applying capacity smaller than current size drops oldest items and updates meta & log', async ({ page }) => {
    // Reset to empty
    await page.click('#clearBtn');

    // Enqueue three specific items X, Y, Z
    await page.fill('#valueInput', 'X');
    await page.click('#enqueueBtn');
    await page.fill('#valueInput', 'Y');
    await page.click('#enqueueBtn');
    await page.fill('#valueInput', 'Z');
    await page.click('#enqueueBtn');

    // Verify 3 items enqueued
    const sizeBefore = Number(await page.locator('#size').textContent());
    expect(sizeBefore).toBeGreaterThanOrEqual(3);

    // Apply capacity = 2 (should drop oldest X)
    await page.fill('#capacity', '2');
    await page.click('#applyCap');

    // The queue size should now be 2
    await expect(page.locator('#size')).toHaveText('2');

    // Front should be Y and rear Z
    await expect(page.locator('#frontVal')).toHaveText('Y');
    await expect(page.locator('#rearVal')).toHaveText('Z');

    // Log should mention capacity applied and dropped items
    await expect(page.locator('#log')).toContainText('Applied capacity 2');
    await expect(page.locator('#log')).toContainText('Dropped oldest');
  });

  test('Applying invalid capacity logs an error message', async ({ page }) => {
    // Enter an invalid negative capacity and apply
    await page.fill('#capacity', '-5');
    await page.click('#applyCap');

    // Log should contain "Invalid capacity"
    await expect(page.locator('#log')).toContainText('Invalid capacity');
  });

  test('Auto demo runs and completes — verify final demo message appears in log', async ({ page }) => {
    // The demo runs with timeouts; wait for the final "Demo complete" message to appear.
    // Allow generous timeout for the demo sequence to finish (~4.5s in implementation).
    await expect(page.locator('#log')).toContainText('Demo: enqueue A, B, C, then dequeue twice to show FIFO');

    // Wait up to 8 seconds for the completion message appended by the demo
    await expect(page.locator('#log')).toContainText('Demo complete — queue preserves FIFO: A then B were removed first', { timeout: 8000 });
  }, { timeout: 15000 }); // Extend test timeout to accommodate demo timing if necessary
});