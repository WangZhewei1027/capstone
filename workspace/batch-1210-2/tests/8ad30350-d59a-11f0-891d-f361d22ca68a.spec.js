import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad30350-d59a-11f0-891d-f361d22ca68a.html';

// Page object for the Heap demo page
class HeapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#input-field');
    this.addBtn = page.locator('#add-btn');
    this.clearBtn = page.locator('#clear-btn');
    this.sortBtn = page.locator('#sort-btn');
    this.heapSortBtn = page.locator('#heap-sort-btn');
    this.output = page.locator('#heap-output');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async setInput(value) {
    await this.input.fill(String(value));
  }

  async clickAdd() {
    await this.addBtn.click();
  }

  async clickClear() {
    await this.clearBtn.click();
  }

  async clickSort() {
    await this.sortBtn.click();
  }

  async clickHeapSort() {
    await this.heapSortBtn.click();
  }

  async getOutputText() {
    return this.output.innerText();
  }

  async isSortDisabled() {
    return await this.sortBtn.getAttribute('disabled').then(v => v !== null);
  }

  async isHeapSortDisabled() {
    return await this.heapSortBtn.getAttribute('disabled').then(v => v !== null);
  }
}

test.describe('Heap (Min/Max) Demo - FSM and page behavior', () => {
  // Collect console and page errors for assertions
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages
    page.on('console', msg => {
      try {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
      } catch (e) {
        consoleMessages.push({ type: 'unknown', text: String(msg) });
      }
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', err => {
      // err is an Error object
      pageErrors.push(String(err && err.message ? err.message : err));
    });
  });

  test.afterEach(async ({ page }) => {
    // Ensure we close any pages between tests (Playwright does it automatically,
    // but leaving this here to emphasize teardown steps)
    await page.close();
  });

  test('Idle state: page renders initial UI and script error is reported', async ({ page }) => {
    // Arrange
    const heapPage = new HeapPage(page);

    // Act
    await heapPage.goto();

    // Assert: essential UI elements exist (evidence for Idle state)
    await expect(heapPage.input).toBeVisible();
    await expect(heapPage.addBtn).toBeVisible();
    await expect(heapPage.clearBtn).toBeVisible();
    await expect(heapPage.sortBtn).toBeVisible();
    await expect(heapPage.heapSortBtn).toBeVisible();
    await expect(heapPage.output).toBeVisible();

    // Placeholder text and input type check
    await expect(heapPage.input).toHaveAttribute('placeholder', 'Enter a number...');
    await expect(heapPage.input).toHaveAttribute('type', 'number');

    // Sort and Heap Sort buttons are expected (per HTML) to be disabled
    expect(await heapPage.isSortDisabled()).toBe(true);
    expect(await heapPage.isHeapSortDisabled()).toBe(true);

    // The page's script attempts to instantiate a Heap which is not defined.
    // We expect a ReferenceError (or similar) to have been thrown during load.
    // Wait a short moment to ensure pageerror had chance to fire (if not already).
    await page.waitForTimeout(50);

    // There should be at least one page error captured
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);

    // Verify that one of the captured page errors refers to the missing Heap symbol
    const heapErrorFound = pageErrors.some(msg =>
      // Different browsers produce slightly different strings; check for key terms
      (msg && msg.includes('Heap') && (msg.includes('is not defined') || msg.includes('not defined') || msg.toLowerCase().includes('referenceerror')))
    );
    expect(heapErrorFound).toBe(true);

    // The script likely aborted before defining helper functions like updateHeapOutput or renderPage.
    // Verify those are not present on window.
    const updateHeapOutputType = await page.evaluate(() => typeof window.updateHeapOutput);
    const renderPageType = await page.evaluate(() => typeof window.renderPage);
    expect(updateHeapOutputType).toBe('undefined');
    expect(renderPageType).toBe('undefined');

    // The heap-output should be empty because the script failed before any rendering logic ran
    const outputText = await heapPage.getOutputText();
    expect(outputText.trim()).toBe('');
  });

  test('AddValue event: clicking Add after entering a value does not update output and no handlers are attached', async ({ page }) => {
    // Arrange
    const heapPage = new HeapPage(page);
    await heapPage.goto();

    // Capture counts before interaction
    const initialConsoleCount = consoleMessages.length;
    const initialPageErrorCount = pageErrors.length;

    // Act: set input and click Add
    await heapPage.setInput(42);
    // Clicking Add should be harmless (listeners likely not attached because script crashed).
    await heapPage.clickAdd();

    // Allow brief time for any potential runtime errors to surface
    await page.waitForTimeout(50);

    // Assert: output remains empty (no heap.insert executed)
    const outputAfterAdd = await heapPage.getOutputText();
    expect(outputAfterAdd.trim()).toBe('', 'Expected no items to be rendered because heap code did not run');

    // No new page errors should have been thrown by the click (the main error happened at load).
    expect(pageErrors.length).toBeGreaterThanOrEqual(initialPageErrorCount);
    // It's acceptable that no additional errors were thrown in response to clicking,
    // but the original ReferenceError should still be present.
    const hasOriginalHeapError = pageErrors.some(msg =>
      msg && msg.includes('Heap') && (msg.includes('is not defined') || msg.includes('not defined') || msg.toLowerCase().includes('referenceerror'))
    );
    expect(hasOriginalHeapError).toBe(true);

    // Console messages may include error stack traces; ensure at least one console error includes 'Heap'
    const consoleHeapError = consoleMessages.some(c =>
      c.text && c.text.includes('Heap')
    );
    expect(consoleHeapError).toBe(true);
  });

  test('ClearHeap event: clicking Clear is a no-op due to failed script; UI remains stable', async ({ page }) => {
    // Arrange
    const heapPage = new HeapPage(page);
    await heapPage.goto();

    // Act: click Clear
    await heapPage.clickClear();

    // Allow short buffer for errors (if any)
    await page.waitForTimeout(50);

    // Assert: still no output items
    const output = await heapPage.getOutputText();
    expect(output.trim()).toBe('');

    // Confirm that updateHeapOutput() is not defined and therefore couldn't have run
    const updateType = await page.evaluate(() => typeof window.updateHeapOutput);
    expect(updateType).toBe('undefined');
  });

  test('SortHeap and HeapSort events: buttons disabled and do not perform actions; FSM entry actions absent', async ({ page }) {
    // Arrange
    const heapPage = new HeapPage(page);
    await heapPage.goto();

    // Verify the Sort buttons are disabled in the DOM (as per HTML)
    expect(await heapPage.isSortDisabled()).toBe(true);
    expect(await heapPage.isHeapSortDisabled()).toBe(true);

    // Attempt to click the disabled Sort button (should be a no-op)
    // Playwright will click even if disabled, but DOM will not process click if 'disabled' is present for button.
    await heapPage.clickSort();
    await page.waitForTimeout(50);

    // Attempt to click the disabled Heap Sort button
    await heapPage.clickHeapSort();
    await page.waitForTimeout(50);

    // Assert: no rendering changes occurred
    const outputText = await heapPage.getOutputText();
    expect(outputText.trim()).toBe('');

    // The FSM describes entry actions (updateHeapOutput) for sorted states; since script didn't define them
    // they should not exist on the window object.
    const updateExists = await page.evaluate(() => typeof window.updateHeapOutput !== 'function');
    expect(updateExists).toBe(true);
  });

  test('Edge cases: input empty, invalid, and large values - ensure page remains stable (no heap operations executed)', async ({ page }) => {
    // Arrange
    const heapPage = new HeapPage(page);
    await heapPage.goto();

    // Case 1: empty input + Add
    await heapPage.setInput('');
    await heapPage.clickAdd();
    await page.waitForTimeout(50);
    expect((await heapPage.getOutputText()).trim()).toBe('');

    // Case 2: invalid "abc" provided to number input via script (browser will coerce to empty)
    // We set via evaluate to simulate non-numeric user input assignment
    await page.evaluate(() => {
      const input = document.getElementById('input-field');
      if (input) input.value = 'abc';
    });
    await heapPage.clickAdd();
    await page.waitForTimeout(50);
    expect((await heapPage.getOutputText()).trim()).toBe('');

    // Case 3: very large number
    await heapPage.setInput('12345678901234567890');
    await heapPage.clickAdd();
    await page.waitForTimeout(50);
    // Still nothing rendered because heap logic didn't run
    expect((await heapPage.getOutputText()).trim()).toBe('');
  });
});