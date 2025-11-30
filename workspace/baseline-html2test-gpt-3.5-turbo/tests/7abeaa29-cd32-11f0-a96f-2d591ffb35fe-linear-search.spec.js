import { test, expect } from '@playwright/test';

// Test file for Application ID: 7abeaa29-cd32-11f0-a96f-2d591ffb35fe
// Filename required: 7abeaa29-cd32-11f0-a96f-2d591ffb35fe-linear-search.spec.js
// This suite validates the Linear Search Visualization application:
// - Verifies initial state, interactions, visual feedback, error handling
// - Observes console messages and page errors (fails test if any uncaught errors are emitted)

// Page object encapsulating common operations against the demo page
class LinearSearchPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayInput = page.locator('#arrayInput');
    this.targetInput = page.locator('#targetInput');
    this.startBtn = page.locator('#startBtn');
    this.resetBtn = page.locator('#resetBtn');
    this.speedRange = page.locator('#speedRange');
    this.speedValue = page.locator('#speedValue');
    this.arrayContainer = page.locator('#arrayContainer');
    this.message = page.locator('#message');
  }

  async goto(url) {
    await this.page.goto(url);
  }

  async getArrayElements() {
    return this.arrayContainer.locator('.array-element');
  }

  async getArrayValues() {
    const els = await this.getArrayElements();
    const count = await els.count();
    const values = [];
    for (let i = 0; i < count; i++) {
      values.push(await els.nth(i).textContent());
    }
    return values;
  }

  async setArrayInput(value) {
    await this.arrayInput.fill('');
    await this.arrayInput.type(String(value));
  }

  async setTarget(value) {
    await this.targetInput.fill('');
    // allow empty string as valid input for some tests
    if (value !== '') {
      await this.targetInput.type(String(value));
    }
  }

  async setSpeed(value) {
    await this.speedRange.fill(''); // ensure focus
    // Use evaluate to set the value to guarantee the underlying input value changes
    await this.page.evaluate((v) => {
      const el = document.getElementById('speedRange');
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
  }

  async clickStart() {
    await this.startBtn.click();
  }

  async clickReset() {
    await this.resetBtn.click();
  }

  async messageText() {
    return (await this.message.textContent()) || '';
  }

  async isStartDisabled() {
    return await this.startBtn.isDisabled();
  }

  async isResetDisabled() {
    return await this.resetBtn.isDisabled();
  }

  async isArrayInputDisabled() {
    return await this.arrayInput.isDisabled();
  }

  async isTargetInputDisabled() {
    return await this.targetInput.isDisabled();
  }

  async elementHasClassAtIndex(index, className) {
    const el1 = this.arrayContainer.locator(`.array-element[data-index="${index}"]`);
    return await el.evaluate((node, cls) => node.classList.contains(cls), className);
  }

  async waitForMessageContains(substring, options = {}) {
    await this.page.waitForFunction(
      (sel, substr) => {
        const el2 = document.querySelector(sel);
        return el && el.textContent && el.textContent.includes(substr);
      },
      '#message',
      substring,
      options
    );
  }

  async waitForMessageEquals(text, options = {}) {
    await this.page.waitForFunction(
      (sel, expected) => {
        const el3 = document.querySelector(sel);
        return el && el.textContent && el.textContent.trim() === expected;
      },
      '#message',
      text,
      options
    );
  }
}

const BASE_URL =
  'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abeaa29-cd32-11f0-a96f-2d591ffb35fe.html';

test.describe('Linear Search Visualization - Full E2E', () => {
  let pageErrors;
  let consoleErrors;

  test.beforeEach(async ({ page }) => {
    // Collect page errors and console.error messages for each test
    pageErrors = [];
    consoleErrors = [];

    page.on('pageerror', (err) => {
      pageErrors.push(String(err));
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to the page under test
    await page.goto(BASE_URL);
  });

  test.afterEach(async () => {
    // After each test ensure there were no uncaught page errors or console.error messages
    // If there are, fail fast by asserting arrays are empty with their contents shown
    expect(pageErrors, `Unexpected page errors: ${pageErrors.join(' | ')}`).toEqual([]);
    expect(consoleErrors, `Unexpected console.error messages: ${consoleErrors.join(' | ')}`).toEqual([]);
  });

  test('Initial load shows default array, controls and accessibility attributes', async ({ page }) => {
    // Purpose: Validate the page loads with expected default state and elements present
    const p = new LinearSearchPage(page);

    // Verify default array is displayed with 7 elements (default value in HTML)
    const values1 = await p.getArrayValues();
    expect(values).toEqual(['3', '6', '8', '2', '10', '7', '4']);

    // Speed value should reflect the initial animationSpeed (500)
    await expect(p.speedValue).toHaveText('500');

    // Buttons and inputs initial enabled/disabled states
    expect(await p.isStartDisabled()).toBe(false);
    expect(await p.isResetDisabled()).toBe(true);

    expect(await p.isArrayInputDisabled()).toBe(false);
    expect(await p.isTargetInputDisabled()).toBe(false);

    // Accessibility attributes
    await expect(page.locator('#arrayContainer')).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('#message')).toHaveAttribute('role', 'alert');
    await expect(page.locator('#message')).toHaveAttribute('aria-live', 'assertive');
  });

  test('Starts search and finds an existing element; highlights and updates UI accordingly', async ({ page }) => {
    // Purpose: Enter a target that exists (10), run search, assert found message and element gets "found" class
    const p1 = new LinearSearchPage(page);

    // Set speed to faster to reduce test time
    await p.setSpeed(100);

    // Set target to 10 which is present at index 4
    await p.setTarget('10');

    // Click start and wait for found message
    await p.clickStart();

    // After start is clicked, start should be disabled and reset enabled
    expect(await p.isStartDisabled()).toBe(true);
    expect(await p.isResetDisabled()).toBe(false);

    // Wait for the success message indicating the element was found at index 4
    await p.waitForMessageContains('Element "10" found at index 4!', { timeout: 5000 });
    const message = await p.messageText();
    expect(message).toContain('Element "10" found at index 4!');

    // Verify the DOM element at index 4 has the 'found' class and appropriate styling class applied
    const foundClass = await p.elementHasClassAtIndex(4, 'found');
    expect(foundClass).toBe(true);

    // Ensure no other element mistakenly has 'found' class
    for (let i = 0; i < 7; i++) {
      if (i === 4) continue;
      expect(await p.elementHasClassAtIndex(i, 'found')).toBe(false);
    }
  });

  test('Search for a non-existing element completes and shows "not found" message', async ({ page }) => {
    // Purpose: Verify behavior when searching for an element that is not in the array
    const p2 = new LinearSearchPage(page);

    // Make speed fast for test
    await p.setSpeed(100);

    // Set target to a value not present
    await p.setTarget('999');

    // Click start and wait for final not-found message
    await p.clickStart();

    // Ensure start disabled while searching, reset enabled
    expect(await p.isStartDisabled()).toBe(true);
    expect(await p.isResetDisabled()).toBe(false);

    // Wait for not-found message
    await p.waitForMessageContains('Element "999" not found in the array.', { timeout: 5000 });
    const msg = await p.messageText();
    expect(msg).toContain('Element "999" not found in the array.');

    // Confirm no element has 'found' class
    const els1 = await p.getArrayElements();
    const count1 = await els.count1();
    for (let i = 0; i < count; i++) {
      expect(await els.nth(i).evaluate((node) => node.classList.contains('found'))).toBe(false);
    }
  });

  test('Reset button restores UI to initial editable state after a search', async ({ page }) => {
    // Purpose: After performing a search, clicking reset should restore initial state
    const p3 = new LinearSearchPage(page);

    // Start a search that will end quickly (search for 3 at index 0)
    await p.setTarget('3');
    await p.setSpeed(100);
    await p.clickStart();

    // Wait for found
    await p.waitForMessageContains('Element "3" found at index 0!', { timeout: 4000 });

    // Click reset and assert UI is back to initial condition
    await p.clickReset();

    // Message should be cleared
    await expect(p.message).toHaveText('', { timeout: 1000 });

    // Buttons and inputs restored
    expect(await p.isStartDisabled()).toBe(false);
    expect(await p.isResetDisabled()).toBe(true);
    expect(await p.isArrayInputDisabled()).toBe(false);
    expect(await p.isTargetInputDisabled()).toBe(false);

    // Array DOM should be recreated and still list original values
    const values2 = await p.getArrayValues();
    expect(values).toEqual(['3', '6', '8', '2', '10', '7', '4']);
  });

  test('Validation: empty target shows appropriate error message and does not start search', async ({ page }) => {
    // Purpose: Leave target empty and click start to trigger validation message
    const p4 = new LinearSearchPage(page);

    // Clear target input completely
    await p.setTarget('');

    // Click start - should not begin search and should show validation message
    await p.clickStart();

    // Message should indicate to enter a target element
    await p.waitForMessageContains('Please enter a target element to search.', { timeout: 1000 });
    const msg1 = await p.messageText();
    expect(msg).toContain('Please enter a target element to search.');

    // Start button should still be enabled (since start returns early without disabling)
    expect(await p.isStartDisabled()).toBe(false);

    // Reset should remain disabled since nothing started
    expect(await p.isResetDisabled()).toBe(true);
  });

  test('Validation: empty array input shows error message and prevents search', async ({ page }) => {
    // Purpose: Empty the array input and try starting search to check validation
    const p5 = new LinearSearchPage(page);

    // Clear array input
    await p.setArrayInput('');

    // Provide a valid target
    await p.setTarget('10');

    // Click start
    await p.clickStart();

    // Expect validation message about valid array
    await p.waitForMessageContains('Please enter a valid array.', { timeout: 1000 });
    const msg2 = await p.messageText();
    expect(msg).toContain('Please enter a valid array.');

    // Start should remain enabled since it returns early
    expect(await p.isStartDisabled()).toBe(false);

    // Reset should remain disabled
    expect(await p.isResetDisabled()).toBe(true);
  });

  test('Changing animation speed while running restarts the search animation', async ({ page }) => {
    // Purpose: Start a longer-running search and change speed while it runs.
    // The page's speedRange input handler restarts the search when animationInterval is active.
    const p6 = new LinearSearchPage(page);

    // Choose a target at the last index to maximize duration (value '4' at index 6)
    await p.setTarget('4');

    // Start with slower speed so we can detect the restarting behavior
    await p.setSpeed(800);
    await p.clickStart();

    // Wait until the process has started (message "Starting linear search..." or first "Checking element" message)
    await p.waitForMessageContains('Starting linear search...', { timeout: 2000 });

    // Now change speed via the speedRange input. This should trigger restart of the animation while running.
    await p.setSpeed(100);

    // After changing speed while running, the app's handler calls startLinearSearch() again which sets message to "Starting linear search..."
    // Wait for a "Starting linear search..." message to be present after the speed change (restarted)
    await p.waitForMessageContains('Starting linear search...', { timeout: 2000 });

    // Finally wait for the search to complete and find the element at index 6
    await p.waitForMessageContains('Element "4" found at index 6!', { timeout: 8000 });
    const finalMsg = await p.messageText();
    expect(finalMsg).toContain('Element "4" found at index 6!');

    // Ensure element at index 6 has 'found' class
    expect(await p.elementHasClassAtIndex(6, 'found')).toBe(true);
  });
});