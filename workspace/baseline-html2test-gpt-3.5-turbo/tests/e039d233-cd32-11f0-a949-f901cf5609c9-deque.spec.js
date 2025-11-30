import { test, expect } from '@playwright/test';

const APP_URL =
  'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e039d233-cd32-11f0-a949-f901cf5609c9.html';

// Page object to encapsulate selectors and actions for the Deque demo
class DequePage {
  constructor(page) {
    this.page = page;
    this.selectors = {
      dequeContainer: '#deque-container',
      inputValue: '#input-value',
      pushBackBtn: '#push-back-btn',
      pushFrontBtn: '#push-front-btn',
      popFrontBtn: '#pop-front-btn',
      popBackBtn: '#pop-back-btn',
      log: '#log',
      dequeElements: '.deque-element',
    };
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'networkidle' });
  }

  async getDequeText() {
    return this.page.locator(this.selectors.dequeContainer).innerText();
  }

  async getLogText() {
    return this.page.locator(this.selectors.log).innerText();
  }

  async fillInput(value) {
    await this.page.fill(this.selectors.inputValue, value);
  }

  async clickPushBack() {
    await this.page.click(this.selectors.pushBackBtn);
  }

  async clickPushFront() {
    await this.page.click(this.selectors.pushFrontBtn);
  }

  async clickPopFront() {
    await this.page.click(this.selectors.popFrontBtn);
  }

  async clickPopBack() {
    await this.page.click(this.selectors.popBackBtn);
  }

  async getDequeElements() {
    return this.page.locator(this.selectors.dequeContainer + ' > *');
  }

  async getDequeElementAt(index) {
    return this.page.locator(`${this.selectors.dequeContainer} > :nth-child(${index + 1})`);
  }

  async activeElementId() {
    return this.page.evaluate(() => document.activeElement && document.activeElement.id);
  }
}

test.describe('Deque Demo - e039d233-cd32-11f0-a949-f901cf5609c9', () => {
  // Arrays to collect runtime issues from the page
  let consoleErrors;
  let consoleWarnings;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    consoleWarnings = [];
    pageErrors = [];

    // Collect console messages and page errors for assertions
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') consoleErrors.push(text);
      if (type === 'warning') consoleWarnings.push(text);
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  test('Initial load shows empty deque and controls are available', async ({ page }) => {
    // Purpose: Verify the initial state of the application after navigation
    const dp = new DequePage(page);
    await dp.goto();

    // Title sanity
    await expect(page).toHaveTitle(/Deque/i);

    // Deque should display "(empty)" when no elements are present
    const dequeText = await dp.getDequeText();
    expect(dequeText.trim()).toContain('(empty)');

    // Buttons and input should be present and enabled
    await expect(page.locator(dp.selectors.inputValue)).toBeVisible();
    await expect(page.locator(dp.selectors.pushBackBtn)).toBeVisible();
    await expect(page.locator(dp.selectors.pushFrontBtn)).toBeVisible();
    await expect(page.locator(dp.selectors.popFrontBtn)).toBeVisible();
    await expect(page.locator(dp.selectors.popBackBtn)).toBeVisible();

    // Log should be empty initially
    const logText = await dp.getLogText();
    expect(logText.trim()).toBe('');

    // No runtime console errors or page errors should have occurred during load
    expect(consoleErrors.length, `console errors: ${consoleErrors.join(', ')}`).toBe(0);
    expect(pageErrors.length, `page errors: ${pageErrors.map(e=>e.message).join(', ')}`).toBe(0);
  });

  test('Push Back adds an element to the back and updates DOM and log', async ({ page }) => {
    // Purpose: Test pushBack behavior and DOM/log updates
    const dp1 = new DequePage(page);
    await dp.goto();

    // Insert value and click push back
    await dp.fillInput('A');
    await dp.clickPushBack();

    // After pushing, there should be a .deque-element with text 'A'
    const elements = page.locator(dp.selectors.dequeContainer + ' > .deque-element');
    await expect(elements).toHaveCount(1);
    await expect(elements.first()).toHaveText('A');

    // The first element should be marked as front (title set to 'Front of deque')
    const firstEl = elements.first();
    await expect(firstEl).toHaveAttribute('title', 'Front of deque');

    // The inline style.border should be set to the front border value as set by the app
    // (it was assigned inline: '2px solid #0f0')
    const borderValue = await firstEl.evaluate((el) => el.style.border);
    expect(borderValue).toBe('2px solid #0f0');

    // Log should contain pushBack("A")
    const logText1 = await dp.getLogText();
    expect(logText).toContain('pushBack("A")');

    // No runtime errors happened
    expect(consoleErrors.length, `console errors: ${consoleErrors.join(', ')}`).toBe(0);
    expect(pageErrors.length, `page errors: ${pageErrors.map(e=>e.message).join(', ')}`).toBe(0);
  });

  test('Push Front places element at the front and preserves order', async ({ page }) => {
    // Purpose: Verify that pushFront inserts at the front and order of elements is correct
    const dp2 = new DequePage(page);
    await dp.goto();

    // Add two elements: pushBack '1', then pushFront '0' => expected order: 0, 1
    await dp.fillInput('1');
    await dp.clickPushBack();
    await dp.fillInput('0');
    await dp.clickPushFront();

    const elements1 = page.locator(dp.selectors.dequeContainer + ' > .deque-element');
    await expect(elements).toHaveCount(2);

    // First element should be '0' and have front title and green border
    const first = elements.nth(0);
    await expect(first).toHaveText('0');
    await expect(first).toHaveAttribute('title', 'Front of deque');
    const firstBorder = await first.evaluate((el) => el.style.border);
    expect(firstBorder).toBe('2px solid #0f0');

    // Last element should be '1' and have back title and yellow border as set by the app
    const last = elements.nth(1);
    await expect(last).toHaveText('1');
    await expect(last).toHaveAttribute('title', 'Back of deque');
    const lastBorder = await last.evaluate((el) => el.style.border);
    expect(lastBorder).toBe('2px solid #ff0');

    // Logs should include both pushBack and pushFront entries
    const logText2 = await dp.getLogText();
    expect(logText).toContain('pushBack("1")');
    expect(logText).toContain('pushFront("0")');

    // No runtime errors happened
    expect(consoleErrors.length, `console errors: ${consoleErrors.join(', ')}`).toBe(0);
    expect(pageErrors.length, `page errors: ${pageErrors.map(e=>e.message).join(', ')}`).toBe(0);
  });

  test('popFront and popBack remove elements and log returned values', async ({ page }) => {
    // Purpose: Ensure popFront/popBack remove correct elements and the log shows removed values
    const dp3 = new DequePage(page);
    await dp.goto();

    // Setup: pushBack 'X', pushBack 'Y' => order X, Y
    await dp.fillInput('X');
    await dp.clickPushBack();
    await dp.fillInput('Y');
    await dp.clickPushBack();

    // popFront should remove 'X'
    await dp.clickPopFront();

    // After popFront, only one element should exist with text 'Y' and be front & back
    const elementsAfterPopFront = page.locator(dp.selectors.dequeContainer + ' > .deque-element');
    await expect(elementsAfterPopFront).toHaveCount(1);
    await expect(elementsAfterPopFront.first()).toHaveText('Y');
    await expect(elementsAfterPopFront.first()).toHaveAttribute('title', 'Front of deque');

    // Log should contain popFront() -> "X"
    const logAfterPopFront = await dp.getLogText();
    expect(logAfterPopFront).toContain('popFront() -> "X"');

    // popBack should remove 'Y' and result in empty deque
    await dp.clickPopBack();

    // Deque should show (empty)
    const finalDequeText = await dp.getDequeText();
    expect(finalDequeText.trim()).toContain('(empty)');

    // Log should contain popBack() -> "Y"
    const finalLog = await dp.getLogText();
    expect(finalLog).toContain('popBack() -> "Y"');

    // No runtime errors happened
    expect(consoleErrors.length, `console errors: ${consoleErrors.join(', ')}`).toBe(0);
    expect(pageErrors.length, `page errors: ${pageErrors.map(e=>e.message).join(', ')}`).toBe(0);
  });

  test('Attempting to push an empty value triggers an alert and focuses input', async ({ page }) => {
    // Purpose: Validate input validation path that alerts when pushing empty value
    const dp4 = new DequePage(page);
    await dp.goto();

    // Ensure input is empty
    await dp.fillInput('');
    // Listen for dialog and assert message
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      dp.clickPushBack(), // attempt to push empty input
    ]);

    expect(dialog.message()).toBe('Please enter a value to add.');
    // Accept the alert
    await dialog.accept();

    // After alert, input should be focused
    const activeId = await dp.activeElementId();
    expect(activeId).toBe('input-value');

    // The deque should remain empty and no new log entry for push should be present
    const dequeText1 = await dp.getDequeText();
    expect(dequeText.trim()).toContain('(empty)');
    const logText3 = await dp.getLogText();
    expect(logText).not.toContain('pushBack(');

    // No runtime errors happened
    expect(consoleErrors.length, `console errors: ${consoleErrors.join(', ')}`).toBe(0);
    expect(pageErrors.length, `page errors: ${pageErrors.map(e=>e.message).join(', ')}`).toBe(0);
  });

  test('Attempting to pop from an empty deque triggers alerts for both front and back', async ({ page }) => {
    // Purpose: Verify the app alerts correctly when popping from empty deque
    const dp5 = new DequePage(page);
    await dp.goto();

    // Ensure deque is empty
    const initialDequeText = await dp.getDequeText();
    expect(initialDequeText.trim()).toContain('(empty)');

    // popFront should alert
    const [dialogFront] = await Promise.all([
      page.waitForEvent('dialog'),
      dp.clickPopFront(),
    ]);
    expect(dialogFront.message()).toBe('Deque is empty. Cannot pop front.');
    await dialogFront.accept();

    // popBack should alert
    const [dialogBack] = await Promise.all([
      page.waitForEvent('dialog'),
      dp.clickPopBack(),
    ]);
    expect(dialogBack.message()).toBe('Deque is empty. Cannot pop back.');
    await dialogBack.accept();

    // No changes to deque content or logs should have occurred
    const finalDeque = await dp.getDequeText();
    expect(finalDeque.trim()).toContain('(empty)');
    const finalLog1 = await dp.getLogText();
    // No pop entries should be present
    expect(finalLog).not.toContain('popFront()');
    expect(finalLog).not.toContain('popBack()');

    // No runtime errors happened
    expect(consoleErrors.length, `console errors: ${consoleErrors.join(', ')}`).toBe(0);
    expect(pageErrors.length, `page errors: ${pageErrors.map(e=>e.message).join(', ')}`).toBe(0);
  });
});