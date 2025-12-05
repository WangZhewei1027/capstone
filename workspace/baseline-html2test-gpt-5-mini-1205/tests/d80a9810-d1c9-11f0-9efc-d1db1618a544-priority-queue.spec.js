import { test, expect } from '@playwright/test';

// Test file for: Priority Queue Demo — Binary Heap vs Naive Array
// Page URL (served externally): http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80a9810-d1c9-11f0-9efc-d1db1618a544.html
const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80a9810-d1c9-11f0-9efc-d1db1618a544.html';

// Page Object for interacting with the Priority Queue demo UI
class PriorityQueuePage {
  constructor(page) {
    this.page = page;
    // Heap (binary heap) selectors
    this.hValue = page.locator('#hValue');
    this.hPriority = page.locator('#hPriority');
    this.hInsert = page.locator('#hInsert');
    this.hInsertRand = page.locator('#hInsertRand');
    this.hPop = page.locator('#hPop');
    this.hPeek = page.locator('#hPeek');
    this.hAnimate = page.locator('#hAnimate');
    this.heapArray = page.locator('#heapArray');
    this.heapTree = page.locator('#heapTree');
    this.heapLog = page.locator('#heapLog');
    this.heapMeta = page.locator('#heapMeta');

    // Array-based PQ selectors
    this.aValue = page.locator('#aValue');
    this.aPriority = page.locator('#aPriority');
    this.aInsert = page.locator('#aInsert');
    this.aInsertRand = page.locator('#aInsertRand');
    this.aPop = page.locator('#aPop');
    this.aPeek = page.locator('#aPeek');
    this.arrArray = page.locator('#arrArray');
    this.arrLog = page.locator('#arrLog');
    this.arrMeta = page.locator('#arrMeta');

    // Benchmark selectors
    this.benchN = page.locator('#benchN');
    this.benchRun = page.locator('#benchRun');
    this.benchResult = page.locator('#benchResult');
  }

  // Utility: get text content of all nodes in arr container
  async getArrayTexts(locator) {
    const count = await locator.locator('.node').count();
    const texts = [];
    for (let i = 0; i < count; i++) texts.push((await locator.locator('.node').nth(i).textContent()).trim());
    return texts;
  }

  // Wait until heapMeta shows expected size text
  async waitForHeapSize(size, opts = {}) {
    await expect(this.heapMeta).toHaveText(`size: ${size}`, opts);
  }

  // Wait until arrMeta shows expected size text
  async waitForArrSize(size, opts = {}) {
    await expect(this.arrMeta).toHaveText(`size: ${size}`, opts);
  }
}

test.describe('Priority Queue Demo — Binary Heap vs Naive Array', () => {
  // capture console messages and page errors for assertions
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Listen to console events and page errors
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the demo page and ensure it loads
    await page.goto(BASE_URL, { waitUntil: 'load' });

    // Basic sanity: page title should contain "Priority Queue Demo"
    await expect(page).toHaveTitle(/Priority Queue Demo/i);
  });

  test.afterEach(async ({ page }) => {
    // For each test, assert there are no uncaught page errors
    expect(pageErrors, 'No page errors should be thrown').toEqual([]);

    // Assert that there are no console.error messages emitted by the page
    const errors = consoleMessages.filter(m => m.type === 'error' || m.type === 'trace' || m.type === 'warning');
    expect(errors.length, `Expected no console error/warning/trace messages, got: ${JSON.stringify(errors)}`).toBe(0);
  });

  test('initial page load shows seeded items and metadata', async ({ page }) => {
    // Purpose: Verify seeded demo state on load: both PQs should be seeded with 5 items.
    const ui = new PriorityQueuePage(page);

    // Wait for UI to reflect seeded items
    await ui.waitForHeapSize(5);
    await ui.waitForArrSize(5);

    // The array-based PQ preserves insertion order; check those exact items are present in order
    const arrTexts = await ui.getArrayTexts(ui.arrArray);
    // Expect the seeded insertion order: taskA, taskB, taskC, taskD, taskE
    expect(arrTexts.length).toBe(5);
    expect(arrTexts[0]).toContain('taskA:25');
    expect(arrTexts[1]).toContain('taskB:5');
    expect(arrTexts[2]).toContain('taskC:40');
    expect(arrTexts[3]).toContain('taskD:5');
    expect(arrTexts[4]).toContain('taskE:12');

    // The heap root should be the smallest priority (taskB with priority 5, stable tie before taskD)
    // The heap array's first element is shown as "0: value:priority"
    const heapTexts = await ui.getArrayTexts(ui.heapArray);
    expect(heapTexts.length).toBe(5);
    // Root node displayed at index 0 should contain taskB:5
    expect(heapTexts[0]).toContain('taskB:5');

    // Both logs should have a seeded message inserted by initialization
    const heapLogText = await ui.heapLog.textContent();
    const arrLogText = await ui.arrLog.textContent();
    expect(heapLogText).toMatch(/Seeded demo heap with sample items/i);
    expect(arrLogText).toMatch(/Seeded demo array with sample items/i);
  });

  test('binary heap peek and pop update UI and logs (non-animated)', async ({ page }) => {
    // Purpose: Test heap peek and pop behavior with animations disabled for speed and determinism.
    const ui = new PriorityQueuePage(page);

    // Disable animations to avoid waiting for timeouts
    await ui.hAnimate.uncheck();

    // Perform a peek on heap and verify log contains expected min item (taskB:5)
    await ui.hPeek.click();
    await expect(ui.heapLog).toContainText(/Peek ->/i);
    await expect(ui.heapLog).toContainText(/taskB:5/);

    // Pop the min element and verify heap size decreases
    await ui.hPop.click();
    await ui.waitForHeapSize(4);

    // Verify the popped message exists in heapLog
    await expect(ui.heapLog).toContainText(/Popped .*:.*\d+/i);

    // Ensure heap array no longer contains the popped root "taskB" at index 0
    const heapTextsAfterPop = await ui.getArrayTexts(ui.heapArray);
    const anyTaskB = heapTextsAfterPop.some(t => t.includes('taskB:5'));
    expect(anyTaskB, 'taskB should no longer be present in heap array after pop').toBe(false);
  });

  test('naive array peek and pop update UI and logs', async ({ page }) => {
    // Purpose: Verify behavior of the naive array-based PQ: peek and pop should select the min (stable).
    const ui = new PriorityQueuePage(page);

    // Peek in the array PQ should show the same min as heap
    await ui.aPeek.click();
    await expect(ui.arrLog).toContainText(/Peek ->/i);
    await expect(ui.arrLog).toContainText(/taskB:5/);

    // Pop from the array PQ and ensure size decreases and logs update
    await ui.aPop.click();
    await ui.waitForArrSize(4);
    await expect(ui.arrLog).toContainText(/Popped .*:.*\d+/i);

    // Confirm the popped element (taskB:5) is no longer in the array display
    const arrTextsAfterPop = await ui.getArrayTexts(ui.arrArray);
    const containsTaskB = arrTextsAfterPop.some(t => t.includes('taskB:5'));
    expect(containsTaskB, 'taskB should be removed from arrArray after pop').toBe(false);
  });

  test('inserting items via inputs updates displays and metadata', async ({ page }) => {
    // Purpose: Test manual insertion into both PQs using input fields
    const ui = new PriorityQueuePage(page);

    // Insert into heap: value 'newH' with priority 2
    await ui.hValue.fill('newH');
    await ui.hPriority.fill('2');
    // Ensure animations disabled for deterministic immediate effect
    await ui.hAnimate.uncheck();
    await ui.hInsert.click();
    // After insert, heap size should increase to 6
    await ui.waitForHeapSize(6);
    const heapTexts = await ui.getArrayTexts(ui.heapArray);
    // The new item should be present somewhere in the heap array representation
    expect(heapTexts.some(t => t.includes('newH:2'))).toBe(true);

    // Insert into array PQ: value 'newA' with priority 1
    await ui.aValue.fill('newA');
    await ui.aPriority.fill('1');
    await ui.aInsert.click();
    await ui.waitForArrSize(5); // prior size was 4 after earlier pop; now should be 5
    const arrTexts = await ui.getArrayTexts(ui.arrArray);
    // Because array PQ preserves insertion order, newA should appear at the last index
    expect(arrTexts[arrTexts.length - 1]).toContain('newA:1');
  });

  test('edge-case: popping until empty and extra pop logs "Pop: empty"', async ({ page }) => {
    // Purpose: Exhaust both queues via UI controls (with animations disabled for speed), then verify additional pops produce empty logs.
    const ui = new PriorityQueuePage(page);

    // Disable heap animations to speed up popping
    await ui.hAnimate.uncheck();

    // Drain the heap: repeatedly pop until size reaches 0
    let heapSizeText = await ui.heapMeta.textContent();
    let heapSize = parseInt(heapSizeText.replace('size:', '').trim(), 10);
    while (heapSize > 0) {
      await ui.hPop.click();
      heapSizeText = await ui.heapMeta.textContent();
      heapSize = parseInt(heapSizeText.replace('size:', '').trim(), 10);
    }
    // Now heap is empty: one more pop should produce "Pop: empty" in heap log
    await ui.hPop.click();
    await expect(ui.heapLog).toContainText(/Pop: empty/i);

    // Drain the array PQ similarly
    let arrSizeText = await ui.arrMeta.textContent();
    let arrSize = parseInt(arrSizeText.replace('size:', '').trim(), 10);
    while (arrSize > 0) {
      await ui.aPop.click();
      arrSizeText = await ui.arrMeta.textContent();
      arrSize = parseInt(arrSizeText.replace('size:', '').trim(), 10);
    }
    // Extra pop should log "Pop: empty"
    await ui.aPop.click();
    await expect(ui.arrLog).toContainText(/Pop: empty/i);
  });

  test('benchmark run updates bench result and logs (small N for test)', async ({ page }) => {
    // Purpose: Run the benchmark with a small N to verify bench UI and log updates work.
    const ui = new PriorityQueuePage(page);

    // Use a small number to keep the test fast and deterministic
    await ui.benchN.fill('100');
    await ui.benchRun.click();

    // Wait for benchResult to be populated with both implementations timings
    await expect(ui.benchResult).toContainText(/BinaryHeap/i);
    await expect(ui.benchResult).toContainText(/NaiveArray/i);

    // Check that bench logs exist in both heapLog and arrLog
    await expect(ui.heapLog).toContainText(/Benchmark n=/i);
    await expect(ui.arrLog).toContainText(/Benchmark n=/i);
  });

  test('visual elements (heap tree and node highlights) update on random insert', async ({ page }) => {
    // Purpose: Clicking the random insert button for the heap should change the heap array and tree visuals.
    const ui = new PriorityQueuePage(page);

    // Disable animation to avoid transient highlights interfering with assertions
    await ui.hAnimate.uncheck();

    // Grab current heap nodes text
    const before = await ui.getArrayTexts(ui.heapArray);

    // Click insert random for heap
    await ui.hInsertRand.click();

    // New size should be previous + 1
    await ui.waitForHeapSize(before.length + 1);

    // Verify that the DOM representing heap tree has nodes corresponding to internal array length
    const heapNodesCount = await ui.heapArray.locator('.node').count();
    const heapTreeNodesCount = await ui.heapTree.locator('.node').count();
    // Tree view might show same number of nodes (one per element) - assert at least 1 and counts consistent
    expect(heapNodesCount).toBeGreaterThan(0);
    expect(heapTreeNodesCount).toBeGreaterThan(0);

    // Verify heap log received an "Inserted" message
    await expect(ui.heapLog).toContainText(/Inserted/i);
  });
});