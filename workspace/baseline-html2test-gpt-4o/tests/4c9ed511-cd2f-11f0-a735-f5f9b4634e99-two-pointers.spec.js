import { test, expect } from '@playwright/test';

// Test file: 4c9ed511-cd2f-11f0-a735-f5f9b4634e99-two-pointers.spec.js
// Application URL:
const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9ed511-cd2f-11f0-a735-f5f9b4634e99.html';

// Page Object for the Two Pointers demo page
class TwoPointersPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayLocator = page.locator('#array');
    this.inputLocator = page.locator('#target');
    this.buttonLocator = page.locator('button', { hasText: 'Find Pair' });
    this.resultLocator = page.locator('#result');
  }

  // Navigate to the application page
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Get the displayed array text
  async getArrayText() {
    return await this.arrayLocator.textContent();
  }

  // Get the current input value
  async getInputValue() {
    return await this.inputLocator.inputValue();
  }

  // Type into the target input (replaces existing content)
  async enterTarget(value) {
    await this.inputLocator.fill(String(value));
  }

  // Click the Find Pair button
  async clickFind() {
    await this.buttonLocator.click();
  }

  // Read the result text
  async getResultText() {
    // Use textContent rather than innerText to match the page behavior
    return await this.resultLocator.textContent();
  }
}

test.describe('Two Pointers Technique - UI and behavior tests', () => {
  // Arrays to collect console errors and page errors per test
  let consoleErrors;
  let pageErrors;

  // Attach listeners for console and page errors before each test and navigate to the page
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Listen for console messages and collect only "error" level messages
    page.on('console', (msg) => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push({ text: msg.text(), location: msg.location() });
        }
      } catch (e) {
        // If retrieving message properties throws, still record the raw message
        consoleErrors.push({ text: String(msg), location: {} });
      }
    });

    // Listen for page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(String(err));
    });

    // Navigate to the application page
    await page.goto(APP_URL);
  });

  // After each test assert that no unexpected console errors or page errors were emitted.
  // This ensures the page loaded and ran its scripts without runtime errors.
  test.afterEach(async () => {
    // Assert there were no page errors (uncaught exceptions)
    expect(pageErrors, `Expected no page errors, but found: ${JSON.stringify(pageErrors)}`).toHaveLength(0);
    // Assert there were no console.error messages
    expect(consoleErrors, `Expected no console.error messages, but found: ${JSON.stringify(consoleErrors)}`).toHaveLength(0);
  });

  test('Initial page load shows the array, input and an empty result', async ({ page }) => {
    // Arrange
    const app = new TwoPointersPage(page);

    // Act - page.goto done in beforeEach
    // Assert initial UI elements and default state
    const arrayText = await app.getArrayText();
    expect(arrayText).toBe('Array: [1, 2, 5, 9, 12, 15]');

    const inputValue = await app.getInputValue();
    expect(inputValue).toBe(''); // input should be empty initially

    const resultText = await app.getResultText();
    // Result area should be empty (no message) at initial load
    expect(resultText).toBe('');
  });

  test('Finds a valid pair when a matching target is entered (target 17 => (2, 15))', async ({ page }) => {
    // This test verifies a common use-case: a matching pair exists.
    const app = new TwoPointersPage(page);

    await app.enterTarget('17');
    // Double-check input value was set correctly
    expect(await app.getInputValue()).toBe('17');

    await app.clickFind();

    // The script sets innerText to "Pair found: (2, 15)"
    const result = await app.getResultText();
    expect(result).toBe('Pair found: (2, 15)');
  });

  test('Finds a different valid pair (target 16 => (1, 15)) and updates result on repeated clicks', async ({ page }) => {
    // Test clicking repeatedly and ensuring the message updates accordingly
    const app = new TwoPointersPage(page);

    // First scenario
    await app.enterTarget('16');
    await app.clickFind();
    expect(await app.getResultText()).toBe('Pair found: (1, 15)');

    // Now change input to another valid target and click again
    await app.enterTarget('14'); // 2 + 12 = 14
    await app.clickFind();
    expect(await app.getResultText()).toBe('Pair found: (2, 12)');
  });

  test('Shows "No pair found" message for targets with no matching pair (e.g., 100)', async ({ page }) => {
    // Ensure the algorithm returns the expected negative case message.
    const app = new TwoPointersPage(page);

    await app.enterTarget('100');
    await app.clickFind();

    const result = await app.getResultText();
    expect(result).toBe('No pair found for target sum of 100.');
  });

  test('Handles empty input gracefully (parseInt -> NaN) and displays NaN in message', async ({ page }) => {
    // The page's JavaScript uses parseInt on the input value. If empty, this yields NaN.
    const app = new TwoPointersPage(page);

    // Ensure input is empty
    await app.enterTarget('');
    await app.clickFind();

    // Expect the result to include 'NaN' because parseInt('') === NaN
    const result = await app.getResultText();
    expect(result).toBe('No pair found for target sum of NaN.');
  });

  test('Handles non-numeric input (e.g., "abc") and exposes NaN in the result text', async ({ page }) => {
    // Non-numeric input will produce parseInt('abc') === NaN; test the resulting message.
    const app = new TwoPointersPage(page);

    await app.enterTarget('abc');
    await app.clickFind();
    const result = await app.getResultText();
    expect(result).toBe('No pair found for target sum of NaN.');
  });

  test('Button and input are accessible via roles and have expected labels/placeholders', async ({ page }) => {
    // Accessibility-oriented checks for presence and basic attributes
    const app = new TwoPointersPage(page);

    // The input should have the placeholder text
    const placeholder = await page.locator('#target').getAttribute('placeholder');
    expect(placeholder).toBe('Enter target sum');

    // The button should be discoverable by role with the label 'Find Pair'
    const btn = page.getByRole('button', { name: 'Find Pair' });
    await expect(btn).toBeVisible();
    await expect(btn).toHaveText('Find Pair');
  });

  test('Algorithm behavior for edge-case sum combinations: lowest and highest possible sums', async ({ page }) => {
    // Test the smallest possible sum (1 + 2 = 3) and the largest possible sum (15 + 12 = 27)
    const app = new TwoPointersPage(page);

    // smallest sum
    await app.enterTarget('3');
    await app.clickFind();
    expect(await app.getResultText()).toBe('Pair found: (1, 2)');

    // largest sum
    await app.enterTarget('27'); // 12 + 15 = 27
    await app.clickFind();
    // Depending on algorithm traversal, expected pair is (12, 15) or (15,12) but implementation uses arr[left], arr[right] so (12,15)
    expect(await app.getResultText()).toBe('Pair found: (12, 15)');
  });
});