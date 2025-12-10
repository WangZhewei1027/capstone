import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8a7e80-d59e-11f0-89ab-2f71529652ac.html';

// Page object encapsulating interactions with the Deque demo page
class DequePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#inputValue');
    this.addFrontBtn = page.locator('button', { hasText: 'Add Front' });
    this.addBackBtn = page.locator('button', { hasText: 'Add Back' });
    this.removeFrontBtn = page.locator('button', { hasText: 'Remove Front' });
    this.removeBackBtn = page.locator('button', { hasText: 'Remove Back' });
    this.dequeList = page.locator('#deque');
    this.dequeItems = page.locator('#deque li');
  }

  // Navigate to the page and ensure it is loaded
  async goto() {
    await this.page.goto(APP_URL);
    await expect(this.page).toHaveURL(APP_URL);
    // Wait for main elements to be visible
    await expect(this.input).toBeVisible();
    await expect(this.addFrontBtn).toBeVisible();
    await expect(this.addBackBtn).toBeVisible();
  }

  // Enter text into the input
  async enterValue(value) {
    await this.input.fill(value);
  }

  async clickAddFront() {
    await this.addFrontBtn.click();
  }

  async clickAddBack() {
    await this.addBackBtn.click();
  }

  async clickRemoveFront() {
    await this.removeFrontBtn.click();
  }

  async clickRemoveBack() {
    await this.removeBackBtn.click();
  }

  // Return array of visible deque item texts
  async getItemsText() {
    const count = await this.dequeItems.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push(await this.dequeItems.nth(i).innerText());
    }
    return texts;
  }

  async getItemsCount() {
    return await this.dequeItems.count();
  }
}

test.describe('Deque (Double-Ended Queue) Demonstration - E2E', () => {
  // Hold console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  // Set up instrumentation before each test: capture console & page errors and navigate to page
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture all console messages
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
  });

  // Test initial load and default state
  test('Initial page load shows empty deque and all controls are visible', async ({ page }) => {
    const deque = new DequePage(page);
    // Navigate and assert URL and element visibility
    await deque.goto();

    // The deque list should be empty initially
    await expect(deque.dequeList).toBeVisible();
    expect(await deque.getItemsCount()).toBe(0);

    // Input should be empty and placeholders correct
    await expect(deque.input).toHaveAttribute('placeholder', 'Enter a value');
    await expect(deque.input).toHaveValue('');

    // Buttons should be enabled and visible
    await expect(deque.addFrontBtn).toBeVisible();
    await expect(deque.addFrontBtn).toBeEnabled();
    await expect(deque.addBackBtn).toBeVisible();
    await expect(deque.addBackBtn).toBeEnabled();
    await expect(deque.removeFrontBtn).toBeVisible();
    await expect(deque.removeBackBtn).toBeVisible();

    // Ensure no unexpected page errors or console errors occurred during initial load
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test adding items to the back and front and verify DOM order and input clearing
  test('Add Back and Add Front update the deque order and clear input', async ({ page }) => {
    const deque1 = new DequePage(page);
    await deque.goto();

    // Add '1' to back
    await deque.enterValue('1');
    await deque.clickAddBack();
    expect(await deque.getItemsText()).toEqual(['1']);
    await expect(deque.input).toHaveValue(''); // input cleared

    // Add '2' to back -> order should be 1,2
    await deque.enterValue('2');
    await deque.clickAddBack();
    expect(await deque.getItemsText()).toEqual(['1', '2']);
    await expect(deque.input).toHaveValue('');

    // Add '0' to front -> order should be 0,1,2
    await deque.enterValue('0');
    await deque.clickAddFront();
    expect(await deque.getItemsText()).toEqual(['0', '1', '2']);

    // Ensure count matches
    expect(await deque.getItemsCount()).toBe(3);

    // No console errors or page errors produced by these operations
    const consoleErrors1 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test remove operations remove the correct ends
  test('Remove Front and Remove Back remove appropriate items and update DOM', async ({ page }) => {
    const deque2 = new DequePage(page);
    await deque.goto();

    // Seed deque with known items: addBack 1, addBack 2, addBack 3
    await deque.enterValue('1');
    await deque.clickAddBack();
    await deque.enterValue('2');
    await deque.clickAddBack();
    await deque.enterValue('3');
    await deque.clickAddBack();
    expect(await deque.getItemsText()).toEqual(['1', '2', '3']);

    // removeFront should remove '1' -> remaining 2,3
    await deque.clickRemoveFront();
    expect(await deque.getItemsText()).toEqual(['2', '3']);

    // removeBack should remove '3' -> remaining 2
    await deque.clickRemoveBack();
    expect(await deque.getItemsText()).toEqual(['2']);

    // removeFront remove last element -> empty array
    await deque.clickRemoveFront();
    expect(await deque.getItemsCount()).toBe(0);
    expect(await deque.getItemsText()).toEqual([]);

    // No console errors or page errors produced by these operations
    const consoleErrors2 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test edge cases: adding empty input and removing from empty deque triggers alert
  test('Edge cases: adding empty strings does nothing; removing from empty shows alert', async ({ page }) => {
    const deque3 = new DequePage(page);
    await deque.goto();

    // Ensure deque is empty
    expect(await deque.getItemsCount()).toBe(0);

    // Attempt to add empty value to front
    await deque.enterValue('');
    await deque.clickAddFront();
    expect(await deque.getItemsCount()).toBe(0);

    // Attempt to add empty value to back
    await deque.enterValue('');
    await deque.clickAddBack();
    expect(await deque.getItemsCount()).toBe(0);

    // When removing from empty deque, an alert should appear with specific message
    // Test removeFront alert
    const dialogsSeen = [];
    page.once('dialog', async dialog => {
      dialogsSeen.push(dialog.message());
      await dialog.accept();
    });
    await deque.clickRemoveFront();
    expect(dialogsSeen).toEqual(['Deque is empty!']);

    // Test removeBack alert
    page.once('dialog', async dialog => {
      dialogsSeen.push(dialog.message());
      await dialog.accept();
    });
    await deque.clickRemoveBack();
    expect(dialogsSeen).toEqual(['Deque is empty!', 'Deque is empty!']);

    // There should be no console error messages or uncaught page errors as a result
    const consoleErrors3 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Accessibility and visibility checks for interactive elements
  test('Accessibility: interactive controls are reachable and labelled', async ({ page }) => {
    const deque4 = new DequePage(page);
    await deque.goto();

    // Buttons should have visible text content
    await expect(deque.addFrontBtn).toHaveText('Add Front');
    await expect(deque.addBackBtn).toHaveText('Add Back');
    await expect(deque.removeFrontBtn).toHaveText('Remove Front');
    await expect(deque.removeBackBtn).toHaveText('Remove Back');

    // Input should have accessible placeholder and be focusable
    await deque.input.focus();
    await expect(deque.input).toBeFocused();

    // No console errors or page errors during these checks
    const consoleErrors4 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Final sanity: ensure no uncaught exceptions were reported during the test run
  test.afterEach(async ({ page }) => {
    // Log console messages for debugging if there were errors (kept as non-failing)
    const consoleErrors5 = consoleMessages.filter(m => m.type === 'error');
    if (consoleErrors.length > 0) {
      // Surface console error details in assertion so test output includes them
      expect(consoleErrors).toEqual([]);
    }

    // Assert that no page errors (uncaught exceptions) occurred
    expect(pageErrors).toEqual([]);
  });
});