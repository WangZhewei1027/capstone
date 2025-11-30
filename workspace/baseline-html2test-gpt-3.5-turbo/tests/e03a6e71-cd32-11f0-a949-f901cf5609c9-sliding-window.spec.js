import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e03a6e71-cd32-11f0-a949-f901cf5609c9.html';

// Page Object Model for the Sliding Window page
class SlidingWindowPage {
  constructor(page) {
    this.page = page;
  }

  // Element selectors
  inputArray() { return this.page.locator('#inputArray'); }
  inputWindowSize() { return this.page.locator('#inputWindowSize'); }
  btnInitialize() { return this.page.locator('#btnInitialize'); }
  arrayItems() { return this.page.locator('.array-item'); }
  btnPrev() { return this.page.locator('#btnPrev'); }
  btnNext() { return this.page.locator('#btnNext'); }
  btnPlay() { return this.page.locator('#btnPlay'); }
  btnPause() { return this.page.locator('#btnPause'); }
  windowSum() { return this.page.locator('#windowSum'); }
  speedControl() { return this.page.locator('#speedControl'); }
  speedDisplay() { return this.page.locator('#speedDisplay'); }

  // Actions
  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  async clickInitialize() {
    await this.btnInitialize().click();
  }

  async setArrayInput(value) {
    await this.inputArray().fill(value);
  }

  async setWindowSize(value) {
    await this.inputWindowSize().fill(String(value));
  }

  async clickNext() {
    await this.btnNext().click();
  }

  async clickPrev() {
    await this.btnPrev().click();
  }

  async clickPlay() {
    await this.btnPlay().click();
  }

  async clickPause() {
    await this.btnPause().click();
  }

  async setSpeed(value) {
    // value is number representing the range input value (200..2000)
    await this.speedControl().evaluate((el, v) => {
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, String(value));
  }

  // Getters
  async getArrayValues() {
    const count = await this.arrayItems().count();
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push((await this.arrayItems().nth(i).textContent()).trim());
    }
    return arr;
  }

  async getArrayCount() {
    return this.arrayItems().count();
  }

  async getWindowSumText() {
    return (await this.windowSum().textContent()).trim();
  }

  async hasClassOnItem(index, className) {
    return await this.arrayItems().nth(index).evaluate((el, cls) => el.classList.contains(cls), className);
  }

  async isButtonDisabled(locator) {
    return await locator.getAttribute('disabled') !== null;
  }
}

// Collect console messages and page errors for assertions
test.describe('Sliding Window Visualization - e03a6e71...', () => {
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Setup collectors before navigation so we capture logs/errors during load
    consoleMessages = [];
    pageErrors = [];

    page.on('console', msg => {
      // Record all console messages with type and text
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', error => {
      // Record uncaught exceptions (ReferenceError, TypeError, etc.)
      pageErrors.push(error);
    });
  });

  // Test initial load and default state produced by the auto-initialization on window load.
  test('Initial load: default initialization and UI state', async ({ page }) => {
    const app = new SlidingWindowPage(page);

    // Navigate to app (load event will trigger auto-initialize)
    await app.goto();

    // Wait for array items to be present
    await page.waitForSelector('.array-item');

    // Assertions about array contents & counts
    const count1 = await app.getArrayCount();
    expect(count).toBe(7); // default value "1,3,-2,8,5,7,6" -> 7 items

    const values = await app.getArrayValues();
    expect(values).toEqual(['1', '3', '-2', '8', '5', '7', '6']);

    // Window sum for default window size 3: 1 + 3 + (-2) = 2
    const sumText = await app.getWindowSumText();
    expect(sumText).toBe('2');

    // First window items (indices 0,1,2) should have in-window class
    expect(await app.hasClassOnItem(0, 'in-window')).toBeTruthy();
    expect(await app.hasClassOnItem(1, 'in-window')).toBeTruthy();
    expect(await app.hasClassOnItem(2, 'in-window')).toBeTruthy();

    // window-left and window-right should be applied appropriately
    expect(await app.hasClassOnItem(0, 'window-left')).toBeTruthy();
    expect(await app.hasClassOnItem(2, 'window-right')).toBeTruthy();

    // Buttons: Prev disabled, Next enabled, Play enabled, Pause disabled
    expect(await app.btnPrev().isDisabled()).toBe(true);
    expect(await app.btnNext().isDisabled()).toBe(false);
    expect(await app.btnPlay().isDisabled()).toBe(false);
    expect(await app.btnPause().isDisabled()).toBe(true);

    // No uncaught page errors should have occurred during load
    expect(pageErrors.length).toBe(0);

    // No console errors (recorded console messages of type 'error')
    const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
  });

  // Test manual navigation via Next and Prev buttons and verify DOM updates and sums
  test('Manual navigation: Next and Prev update window and sum correctly', async ({ page }) => {
    const app1 = new SlidingWindowPage(page);
    await app.goto();

    // ensure initialized
    await page.waitForSelector('.array-item');

    // Click Next 1 time and check sum and highlights: window start at 1 -> elements [3,-2,8] = 9
    await app.clickNext();
    await page.waitForTimeout(100); // small wait for DOM update
    expect(await app.getWindowSumText()).toBe(String(3 + (-2) + 8)); // 9

    // Verify highlight moved: now indices 1,2,3 are in-window
    expect(await app.hasClassOnItem(1, 'in-window')).toBeTruthy();
    expect(await app.hasClassOnItem(3, 'in-window')).toBeTruthy();
    expect(await app.hasClassOnItem(0, 'in-window')).toBeFalsy();

    // Click Next until we reach final start index (array.length - windowSize = 4)
    // We'll click until Next becomes disabled
    while (!(await app.btnNext().isDisabled())) {
      await app.clickNext();
      await page.waitForTimeout(50);
    }

    // Now Next disabled and Prev enabled; check final sum: indices 4,5,6 -> 5+7+6=18
    expect(await app.btnNext().isDisabled()).toBe(true);
    expect(await app.btnPrev().isDisabled()).toBe(false);
    expect(await app.getWindowSumText()).toBe('18');

    // Click Prev once and verify sum decreases
    await app.clickPrev();
    await page.waitForTimeout(50);
    // sum should now correspond to start index 3 -> values 8,5,7 -> 20
    expect(await app.getWindowSumText()).toBe(String(8 + 5 + 7));

    // Confirm no uncaught page errors
    expect(pageErrors.length).toBe(0);
    const errorConsoleMsgs1 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
  });

  // Test Play and Pause controls with speed adjustment and ensure animation plays to the end
  test('Play/Pause functionality and speed control influence', async ({ page }) => {
    const app2 = new SlidingWindowPage(page);
    await app.goto();

    // Wait for initial elements
    await page.waitForSelector('.array-item');

    // Set speed to minimal for faster animation (200ms)
    await app.setSpeed(200);
    // Confirm speed display updated
    const display = await app.speedDisplay().textContent();
    expect(display.trim()).toBe('0.2s');

    // Start playing
    await app.clickPlay();

    // Immediately after play, Pause should be enabled
    expect(await app.btnPause().isDisabled()).toBe(false);

    // Wait until animation finishes: windowSum should become 18 (final)
    await page.waitForFunction(() => {
      const el = document.getElementById('windowSum');
      return el && el.textContent.trim() === '18';
    }, null, { timeout: 5000 });

    // After finishing, Pause should be disabled and Play disabled (because at end)
    expect(await app.btnPause().isDisabled()).toBe(true);
    // Play is disabled if currentIndex >= array.length - windowSize
    expect(await app.btnPlay().isDisabled()).toBe(true);

    // No uncaught errors
    expect(pageErrors.length).toBe(0);
    const errorConsoleMsgs2 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
  });

  // Test invalid array input triggers an alert and prevents initialization
  test('Invalid array input shows an alert and does not reinitialize', async ({ page }) => {
    const app3 = new SlidingWindowPage(page);

    // Collect dialogs to assert their messages
    let dialogMessage = null;
    page.once('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    await app.goto();

    // Wait for initial initialization to finish
    await page.waitForSelector('.array-item');

    // Now provide invalid array input and click Initialize
    await app.setArrayInput('a,b,c');
    await app.clickInitialize();

    // Ensure a dialog was shown with expected message
    expect(dialogMessage).toBeTruthy();
    expect(dialogMessage).toContain('Invalid array input');

    // Ensure existing array still present (initial values shouldn't be overwritten)
    const values1 = await app.getArrayValues();
    expect(values.length).toBeGreaterThan(0);

    // No uncaught page errors
    expect(pageErrors.length).toBe(0);
    const errorConsoleMsgs3 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
  });

  // Test invalid window size (too big) triggers an alert and prevents initialization
  test('Invalid window size (greater than array length) shows an alert', async ({ page }) => {
    const app4 = new SlidingWindowPage(page);

    let dialogMessage1 = null;
    page.once('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    await app.goto();
    await page.waitForSelector('.array-item');

    // Set a valid array but an invalid window size (> array length)
    await app.setArrayInput('1,2,3'); // 3 elements
    await app.setWindowSize(10);
    await app.clickInitialize();

    expect(dialogMessage).toBeTruthy();
    expect(dialogMessage).toMatch(/Invalid window size/);
    expect(dialogMessage).toMatch(/\(array length.*3\)|3/);

    // Confirm that after dismissing the alert, controls are still usable
    expect(await app.btnInitialize().isDisabled()).toBe(false);

    // No uncaught page errors
    expect(pageErrors.length).toBe(0);
    const errorConsoleMsgs4 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
  });

  // Test speed display updates correctly when changing speed control
  test('Speed control updates speed display text correctly', async ({ page }) => {
    const app5 = new SlidingWindowPage(page);
    await app.goto();

    // Set speed to 1000 -> expect 1.0s
    await app.setSpeed(1000);
    expect((await app.speedDisplay().textContent()).trim()).toBe('1.0s');

    // Set speed to 1500 -> expect 1.5s
    await app.setSpeed(1500);
    expect((await app.speedDisplay().textContent()).trim()).toBe('1.5s');

    // No uncaught page errors
    expect(pageErrors.length).toBe(0);
    const errorConsoleMsgs5 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
  });

  // Final test to ensure there were no uncaught exceptions or console errors across actions
  test('No uncaught exceptions or console errors encountered during interactions', async ({ page }) => {
    const app6 = new SlidingWindowPage(page);

    // Do a sequence of interactions to exercise the app
    await app.goto();
    await page.waitForSelector('.array-item');

    // click next, prev, change speed, play/pause quickly
    await app.clickNext();
    await app.clickPrev();
    await app.setSpeed(800);
    await app.clickPlay();
    // Pause almost immediately
    await page.waitForTimeout(150);
    await app.clickPause();

    // Allow possible asynchronous errors to surface
    await page.waitForTimeout(200);

    // Assert no uncaught page errors
    expect(pageErrors.length).toBe(0);

    // Assert no console messages of severity 'error'
    const errorConsoleMsgs6 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
  });
});