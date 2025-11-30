import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde4382-cd36-11f0-b98e-a1744d282049.html';

// Page object for the Priority Queue demo
class HeapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Controls
    this.mode = page.locator('#mode');
    this.speed = page.locator('#speed');
    this.item = page.locator('#item');
    this.priority = page.locator('#priority');
    this.insertBtn = page.locator('#insertBtn');
    this.insertRandom = page.locator('#insertRandom');
    this.bulkRandom = page.locator('#bulkRandom');
    this.peekBtn = page.locator('#peekBtn');
    this.popBtn = page.locator('#popBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.targetId = page.locator('#targetId');
    this.newPriority = page.locator('#newPriority');
    this.changeBtn = page.locator('#changeBtn');
    this.removeBtn = page.locator('#removeBtn');

    // Visuals / info
    this.array = page.locator('#array');
    this.size = page.locator('#size');
    this.comps = page.locator('#comps');
    this.time = page.locator('#time');
    this.log = page.locator('#log');
    this.tree = page.locator('#tree');
  }

  // Helper: wait for seeding log message (seed may be async)
  async waitForSeeded() {
    await this.page.waitForSelector('#log >> text=seeded demo items', { timeout: 5000 });
  }

  // Helper: set animation speed (string value like '0','200')
  async setSpeed(value) {
    await this.speed.selectOption(value);
  }

  // Returns array cell locators
  async getCellLocator(index) {
    return this.array.locator('.cell').nth(index);
  }

  // Returns number of array cells
  async getArrayCount() {
    return await this.array.locator('.cell').count();
  }

  // Read a cell's id and priority text by index
  async readCell(index) {
    const cell = this.array.locator('.cell').nth(index);
    const id = (await cell.locator('div').nth(1).innerText()).trim();
    const priority = (await cell.locator('.muted').innerText()).trim();
    return { id, priority };
  }

  // Click a cell by index (fills the targetId input)
  async clickCell(index) {
    const c = this.array.locator('.cell').nth(index);
    await c.click();
  }

  // Insert an item with optional label and numeric priority
  async insertItem(label, priority) {
    if (label !== null) {
      await this.item.fill(String(label));
    } else {
      await this.item.fill('');
    }
    if (priority !== null) {
      await this.priority.fill(String(priority));
    } else {
      await this.priority.fill('');
    }
    await this.insertBtn.click();
  }

  // Convenience: click peek, pop, change, remove
  async clickPeek() { await this.peekBtn.click(); }
  async clickPop() { await this.popBtn.click(); }
  async clickClear() { await this.clearBtn.click(); }
  async clickInsertRandom() { await this.insertRandom.click(); }
  async clickBulkRandom() { await this.bulkRandom.click(); }
  async changePriorityTo(newPrio) {
    await this.newPriority.fill(String(newPrio));
    await this.changeBtn.click();
  }
  async clickRemove() { await this.removeBtn.click(); }

  // Read summary metrics
  async readSize() { return Number((await this.size.innerText()).trim()); }
  async readComps() { return Number((await this.comps.innerText()).trim()); }
  async readTime() { return (await this.time.innerText()).trim(); }

  // Read log text contains
  async logContains(text) {
    return await this.log.locator(`text=${text}`).count() > 0;
  }

  // Read SVG node count (text elements representing ids)
  async svgNodeCount() {
    // nodes are composed of <g> groups appended to the svg
    return await this.tree.locator('g').count();
  }
}

test.describe('Priority Queue — Binary Heap Visualization', () => {
  let pageErrors = [];
  let consoleErrors = [];
  let dialogs = [];

  test.beforeEach(async ({ page }) => {
    // Collect page errors and console errors for assertions later
    pageErrors = [];
    consoleErrors = [];
    dialogs = [];

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Auto accept alerts and capture messages
    page.on('dialog', async (dialog) => {
      dialogs.push(dialog.message());
      await dialog.accept();
    });

    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  });

  test.afterEach(async () => {
    // After each test ensure there are no unexpected runtime errors or console errors.
    // If there are, include them in the assertion message for debugging.
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e => String(e)).join(' | ')}`).toBe(0);
    expect(consoleErrors.length, `Unexpected console errors: ${consoleErrors.join(' | ')}`).toBe(0);
  });

  test('Initial load: seeded items appear and UI shows correct counts', async ({ page }) => {
    const heap = new HeapPage(page);

    // Set speed to instant to avoid animations during test
    await heap.setSpeed('0');

    // Wait for the demo seeding to finish (seed log entry)
    await heap.waitForSeeded();

    // Verify size shows 5 (A,B,C,D,E seeded)
    const size = await heap.readSize();
    expect(size).toBe(5);

    // The seeded order can be derived from the insertion logic:
    // After seed the array should be: D,B,C,A,E (D has priority 5, B 10, etc.)
    // Read the ids for the first five cells and assert they match expected seed ordering.
    const ids = [];
    for (let i = 0; i < 5; i++) {
      const cell1 = heap.array.locator('.cell1').nth(i);
      await expect(cell).toBeVisible();
      const idText = (await cell.locator('div').nth(1).innerText()).trim();
      ids.push(idText);
    }
    expect(ids).toEqual(['D', 'B', 'C', 'A', 'E']);

    // Ensure the log contains the seeded message
    const seededLog = await heap.logContains('seeded demo items');
    expect(seededLog).toBeTruthy();

    // Tree SVG should render nodes equal to array length
    const svgCount = await heap.svgNodeCount();
    expect(svgCount).toBe(5);
  });

  test('Insert: missing priority triggers alert and valid insert updates heap', async ({ page }) => {
    const heap1 = new HeapPage(page);

    // Make animations instant
    await heap.setSpeed('0');

    // Wait for seeded items
    await heap.waitForSeeded();

    // Attempt insert without priority -> expect dialog alert message and no size change
    await heap.insertItem('X', null);
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    const lastDialogMsg = dialogs[dialogs.length - 1];
    expect(lastDialogMsg).toContain('Please enter a numeric priority');

    // Now insert valid item with priority 3 (should bubble to root for min-heap)
    await heap.insertItem('X', 3);

    // After insert, size should increment
    await page.waitForTimeout(50); // small pause to ensure UI updated
    const newSize = await heap.readSize();
    expect(newSize).toBe(6);

    // The new item 'X' with priority 3 should be present in the array
    let found = false;
    const count = await heap.getArrayCount();
    for (let i = 0; i < count; i++) {
      const { id, priority } = await heap.readCell(i);
      if (id === 'X' && Number(priority) === 3) {
        found = true;
        break;
      }
    }
    expect(found).toBeTruthy();

    // Log should contain an insertion entry for X
    const hasInsertLog = await heap.logContains('inserted X:3');
    expect(hasInsertLog).toBeTruthy();
  });

  test('Peek and Pop operations: peek shows alert and pop removes top item', async ({ page }) => {
    const heap2 = new HeapPage(page);
    await heap.setSpeed('0');
    await heap.waitForSeeded();

    // Peek: expect an alert with top item (D should be top from seed)
    await heap.clickPeek();
    // Last dialog message should include the top id and priority
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    const peekMsg = dialogs[dialogs.length - 1];
    expect(peekMsg).toContain('Peek:');
    expect(peekMsg).toContain('D');

    // Record current size
    const before = await heap.readSize();
    expect(before).toBeGreaterThan(0);

    // Pop: remove root and check size decreases and log contains popped message
    await heap.clickPop();
    await page.waitForTimeout(50); // allow UI refresh
    const after = await heap.readSize();
    expect(after).toBe(before - 1);

    // Ensure log contains a 'popped' entry (some log text with 'popped')
    const poppedLog = await heap.logContains('popped');
    expect(poppedLog).toBeTruthy();
  });

  test('Clicking array cell populates targetId input; change priority and remove by id', async ({ page }) => {
    const heap3 = new HeapPage(page);
    await heap.setSpeed('0');
    await heap.waitForSeeded();

    // Click the second cell (index 1) and verify targetId updated
    await heap.clickCell(1);
    const targetVal = (await heap.targetId.inputValue()).trim();
    expect(targetVal).not.toBe('');

    // Attempt change priority without entering new priority -> expect alert
    await heap.changeBtn.click();
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    const lastAlert = dialogs[dialogs.length - 1];
    // The page's changeBtn handler will alert when new priority is empty
    expect(lastAlert).toContain('Enter new priority');

    // Now set a new priority (very low) to make that item bubble up
    await heap.newPriority.fill('1');
    await heap.changeBtn.click();
    await page.waitForTimeout(50);
    // Log should contain 'changed' entry
    const changedLog = await heap.logContains('changed');
    expect(changedLog).toBeTruthy();

    // The item with targetId should exist in the array and have new priority 1
    const targetIdValue = (await heap.targetId.inputValue()).trim();
    let found1 = false;
    for (let i = 0; i < await heap.getArrayCount(); i++) {
      const { id, priority } = await heap.readCell(i);
      if (id === targetIdValue && Number(priority) === 1) {
        found = true;
        break;
      }
    }
    expect(found).toBeTruthy();

    // Now remove that id via remove button
    await heap.clickRemove();
    await page.waitForTimeout(50);
    // Log should contain removed entry with id
    const removedLog = await heap.logContains('removed');
    expect(removedLog).toBeTruthy();

    // Ensure the id is no longer present in the array cells
    let stillPresent = false;
    for (let i = 0; i < await heap.getArrayCount(); i++) {
      const { id } = await heap.readCell(i);
      if (id === targetIdValue) {
        stillPresent = true;
        break;
      }
    }
    expect(stillPresent).toBeFalsy();
  });

  test('Random insert and bulk random increase size as expected', async ({ page }) => {
    const heap4 = new HeapPage(page);
    await heap.setSpeed('0');
    await heap.waitForSeeded();

    const sizeBefore = await heap.readSize();

    // Insert random single
    await heap.clickInsertRandom();
    await page.waitForTimeout(50);
    const sizeAfterOne = await heap.readSize();
    expect(sizeAfterOne).toBe(sizeBefore + 1);

    // Bulk random (5)
    await heap.clickBulkRandom();
    // Bulk insertion adds 5 items, wait a bit for operations
    await page.waitForTimeout(200);
    const sizeAfterBulk = await heap.readSize();
    expect(sizeAfterBulk).toBe(sizeAfterOne + 5);

    // Log should mention 'bulk inserted 5 items' after the operation
    const bulkLog = await heap.logContains('bulk inserted 5 items');
    expect(bulkLog).toBeTruthy();
  });

  test('Mode switch resets heap and updates mode log', async ({ page }) => {
    const heap5 = new HeapPage(page);
    await heap.setSpeed('0');
    await heap.waitForSeeded();

    // Switch to max mode
    await heap.mode.selectOption('max');
    await page.waitForTimeout(50);

    // After switching mode, heap is reset so size should be 0
    const size1 = await heap.readSize();
    expect(size).toBe(0);

    // Log should include change of mode
    const modeLog = await heap.logContains('mode switched to max');
    expect(modeLog).toBeTruthy();
  });

  test('Clear button empties heap and clears log', async ({ page }) => {
    const heap6 = new HeapPage(page);
    await heap.setSpeed('0');
    await heap.waitForSeeded();

    // Ensure size > 0 initially
    const before1 = await heap.readSize();
    expect(before).toBeGreaterThan(0);

    // Click clear
    await heap.clickClear();
    await page.waitForTimeout(50);
    const after1 = await heap.readSize();
    expect(after).toBe(0);

    // Log area should still contain our 'heap cleared' entry (the implementation logs after clearing)
    const clearLog = await heap.logContains('heap cleared');
    expect(clearLog).toBeTruthy();
  });

  test('Edge cases: pop on empty heap and remove/change on missing id', async ({ page }) => {
    const heap7 = new HeapPage(page);
    await heap.setSpeed('0');
    await heap.waitForSeeded();

    // Clear to make empty
    await heap.clickClear();
    await page.waitForTimeout(50);

    // Pop on empty -> should log attempt and not throw; no dialog for empty pop
    await heap.clickPop();
    await page.waitForTimeout(50);
    const popAttemptLog = await heap.logContains('pop attempted on empty heap');
    expect(popAttemptLog).toBeTruthy();

    // Try change priority with empty id -> triggers alert
    await heap.newPriority.fill('10');
    await heap.changeBtn.click();
    await page.waitForTimeout(20);
    // Last dialog should mention entering id
    const last = dialogs[dialogs.length - 1];
    expect(last).toContain('Enter id to change');

    // Try remove without id -> triggers alert
    await heap.removeBtn.click();
    await page.waitForTimeout(20);
    const last2 = dialogs[dialogs.length - 1];
    expect(last2).toContain('Enter id to remove');
  });

});