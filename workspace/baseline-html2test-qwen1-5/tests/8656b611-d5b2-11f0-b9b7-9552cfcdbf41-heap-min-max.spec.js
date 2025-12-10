import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-qwen1-5/html/8656b611-d5b2-11f0-b9b7-9552cfcdbf41.html';

// Page object for the Heap app to encapsulate interactions and queries
class HeapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.consoleMessages = [];
    this.pageErrors = [];

    // Collect console messages
    this.page.on('console', (msg) => {
      // capture type and text for assertions
      this.consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect uncaught exceptions / page errors
    this.page.on('pageerror', (err) => {
      this.pageErrors.push(err);
    });
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  // Click the Heapify button
  async clickHeapify() {
    await this.page.click('button:has-text("Heapify")');
    // give a small pause to ensure console events are flushed and handlers processed
    await this.page.waitForTimeout(50);
  }

  // Get text content of the #container element
  async getContainerText() {
    return this.page.locator('#container').innerText();
  }

  // Get visible text of the Heapify button
  async getButtonText() {
    return this.page.locator('button:has-text("Heapify")').innerText();
  }

  // Return computed background-color of the button (useful to verify hover style)
  async getButtonBackgroundColor() {
    return this.page.evaluate(() => {
      const btn = document.querySelector('button');
      return window.getComputedStyle(btn).backgroundColor;
    });
  }

  // Hover the button to cause :hover style to apply, then return computed background color
  async hoverButtonAndGetBackgroundColor() {
    await this.page.hover('button:has-text("Heapify")');
    // allow style changes to take effect
    await this.page.waitForTimeout(50);
    return this.getButtonBackgroundColor();
  }
}

test.describe('Heap (Min/Max) interactive app - 8656b611-d5b2-11f0-b9b7-9552cfcdbf41', () => {
  // Use a fresh page for each test
  test.beforeEach(async ({ page }) => {
    // nothing globally to set up here; each test will construct its HeapPage and navigate
  });

  test('Initial load: UI elements present and default state is empty', async ({ page }) => {
    // Purpose: Verify page loads, button and container are present, and no unexpected console/page errors at load
    const heap = new HeapPage(page);
    await heap.goto();

    // Title should contain "Heap"
    await expect(page).toHaveTitle(/Heap/);

    // The container should be present and empty by default
    const containerText = await heap.getContainerText();
    expect(containerText).toBe('', 'Expected #container to be empty on initial load');

    // The Heapify button should be visible and have the expected accessible name
    const button = page.locator('button:has-text("Heapify")');
    await expect(button).toBeVisible();
    const btnText = await heap.getButtonText();
    expect(btnText.trim()).toBe('Heapify');

    // No unexpected page errors should have occurred during load
    expect(heap.pageErrors.length).toBe(0);
    // No console logs should be emitted on mere page load (the app logs only on interactions)
    const logs = heap.consoleMessages;
    const nonTrivialLogs = logs.filter(m => m.text && m.text.trim().length > 0);
    expect(nonTrivialLogs.length).toBe(0);
  });

  test('Clicking Heapify logs "Heap Size: 5" and does not modify DOM container', async ({ page }) => {
    // Purpose: Validate the primary interaction: clicking the Heapify button logs expected output
    const heap = new HeapPage(page);
    await heap.goto();

    // Precondition: container empty
    expect(await heap.getContainerText()).toBe('');

    // Click the Heapify button once
    await heap.clickHeapify();

    // Verify console log contains the exact message
    const matches = heap.consoleMessages.filter(m => m.type === 'log' && m.text.includes('Heap Size: 5'));
    expect(matches.length).toBeGreaterThanOrEqual(1, 'Expected at least one console.log with "Heap Size: 5" after clicking Heapify');

    // Verify the container was not modified by the click (implementation logs only)
    expect(await heap.getContainerText()).toBe('', 'Expected #container to remain empty after clicking Heapify');

    // Ensure no uncaught page errors occurred during interaction
    expect(heap.pageErrors.length).toBe(0);
  });

  test('Clicking Heapify multiple times produces consistent logs for heap size', async ({ page }) => {
    // Purpose: Ensure repeated interactions are stable and produce consistent console output
    const heap = new HeapPage(page);
    await heap.goto();

    // Click 3 times and collect logs
    const clickCount = 3;
    for (let i = 0; i < clickCount; i++) {
      await heap.clickHeapify();
    }

    // Count occurrences of the expected log message
    const occurrences = heap.consoleMessages.filter(m => m.type === 'log' && m.text.includes('Heap Size: 5')).length;
    expect(occurrences).toBeGreaterThanOrEqual(clickCount, `Expected at least ${clickCount} "Heap Size: 5" log messages after ${clickCount} clicks`);

    // No page errors expected
    expect(heap.pageErrors.length).toBe(0);
  });

  test('Visual feedback: button hover applies the hover background-color style', async ({ page }) => {
    // Purpose: Check visual hover feedback (CSS :hover) changes the button background color
    const heap = new HeapPage(page);
    await heap.goto();

    // Get background color before hover
    const before = await heap.getButtonBackgroundColor();
    // Hover the button and get computed background color
    const after = await heap.hoverButtonAndGetBackgroundColor();

    // Default background-color defined in CSS: #4CAF50 -> rgb(76, 175, 80)
    // Hover background-color defined: #3e5f6c -> rgb(62, 95, 108)
    // We assert that the computed value changes and matches expected hover color
    expect(before).not.toBe(after);
    expect(after).toMatch(/rgb\(\s*62,\s*95,\s*108\s*\)/, 'Expected hover background color to be rgb(62, 95, 108)');
  });

  test('Accessibility check: Heapify button is keyboard accessible and triggers same behavior on Enter', async ({ page }) => {
    // Purpose: Ensure keyboard activation works (Enter key) producing the same console output as click
    const heap = new HeapPage(page);
    await heap.goto();

    const button = page.locator('button:has-text("Heapify")');
    await button.focus();
    // Press Enter to activate the button
    await page.keyboard.press('Enter');
    // wait for console messages to be captured
    await page.waitForTimeout(50);

    // Verify a Heap Size log was produced
    const found = heap.consoleMessages.some(m => m.type === 'log' && m.text.includes('Heap Size: 5'));
    expect(found).toBeTruthy();
    expect(heap.pageErrors.length).toBe(0);
  });
});