import { test, expect } from '@playwright/test';

const APP_URL =
  'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e039f941-cd32-11f0-a949-f901cf5609c9.html';

// Page Object for the Set demo page
class SetPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#valueInput');
    this.addBtn = page.locator('#addBtn');
    this.deleteBtn = page.locator('#deleteBtn');
    this.hasBtn = page.locator('#hasBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.showBtn = page.locator('#showBtn');
    this.output = page.locator('#outputArea');
  }

  // Navigate to the page
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Helper to type a value into the input
  async typeValue(value) {
    await this.input.fill(value);
  }

  // Click Add button (types value first if provided)
  async add(value) {
    if (value !== undefined) await this.typeValue(value);
    await this.addBtn.click();
  }

  // Click Delete button (types value first if provided)
  async del(value) {
    if (value !== undefined) await this.typeValue(value);
    await this.deleteBtn.click();
  }

  // Click Has button (types value first if provided)
  async has(value) {
    if (value !== undefined) await this.typeValue(value);
    await this.hasBtn.click();
  }

  // Click Clear button
  async clear() {
    await this.clearBtn.click();
  }

  // Click Show button
  async show() {
    await this.showBtn.click();
  }

  // Get the text content of the output area
  async outputText() {
    return (await this.output.textContent()) ?? '';
  }

  // Get current input value
  async inputValue() {
    return this.input.inputValue();
  }
}

test.describe('JavaScript Set Demo - e039f941-cd32-11f0-a949-f901cf5609c9', () => {
  // Basic smoke test: page loads and initial UI elements are visible and enabled
  test('should load the page and display default UI elements', async ({ page }) => {
    const setPage = new SetPage(page);
    await setPage.goto();

    // Verify title and heading are present
    await expect(page).toHaveTitle(/JavaScript Set Demo/);
    await expect(page.locator('h1')).toHaveText('JavaScript Set Demo');

    // Verify UI elements visibility and enabled state
    await expect(setPage.input).toBeVisible();
    await expect(setPage.addBtn).toBeVisible();
    await expect(setPage.deleteBtn).toBeVisible();
    await expect(setPage.hasBtn).toBeVisible();
    await expect(setPage.clearBtn).toBeVisible();
    await expect(setPage.showBtn).toBeVisible();
    await expect(setPage.output).toBeVisible();

    // Initial output text should say the set is empty.
    await expect(setPage.output).toHaveText('Set is empty.');
  });

  test.describe('Add / Delete / Has behavior', () => {
    test('should show errors when input is empty for add, delete, and check', async ({ page }) => {
      const setPage1 = new SetPage(page);
      await setPage.goto();

      // Ensure input is empty
      await setPage.input.fill('');

      // Click Add with empty input
      await setPage.add();
      await expect(setPage.output).toHaveText('Please enter a value to add.');

      // Click Delete with empty input
      await setPage.del();
      await expect(setPage.output).toHaveText('Please enter a value to delete.');

      // Click Has with empty input
      await setPage.has();
      await expect(setPage.output).toHaveText('Please enter a value to check.');
    });

    test('should add a value and prevent duplicates', async ({ page }) => {
      const setPage2 = new SetPage(page);
      await setPage.goto();

      // Add a value 'apple'
      await setPage.add('apple');
      await expect(setPage.output).toHaveText('"apple" added to the set.');

      // Input should have been cleared after adding
      await expect(setPage.input).toHaveValue('');

      // Add same value again => should indicate it's already in the set
      await setPage.typeValue('apple');
      await setPage.addBtn.click();
      await expect(setPage.output).toHaveText('"apple" is already in the set.');
      await expect(setPage.input).toHaveValue('');
    });

    test('should delete values and report when not found', async ({ page }) => {
      const setPage3 = new SetPage(page);
      await setPage.goto();

      // Add and then delete a value
      await setPage.add('orange');
      await expect(setPage.output).toHaveText('"orange" added to the set.');

      // Delete existing
      await setPage.del('orange');
      await expect(setPage.output).toHaveText('"orange" removed from the set.');

      // Delete again - not found
      await setPage.del('orange');
      await expect(setPage.output).toHaveText('"orange" was not found in the set.');
    });

    test('should correctly report membership with Has button', async ({ page }) => {
      const setPage4 = new SetPage(page);
      await setPage.goto();

      // Ensure banana is not present
      await setPage.has('banana');
      await expect(setPage.output).toHaveText('Set does NOT contain "banana".');

      // Add banana and check again
      await setPage.add('banana');
      await expect(setPage.output).toHaveText('"banana" added to the set.');

      await setPage.has('banana');
      await expect(setPage.output).toHaveText('Set contains "banana".');
    });
  });

  test.describe('Clear and Show contents', () => {
    test('should clear the set and reflect cleared state', async ({ page }) => {
      const setPage5 = new SetPage(page);
      await setPage.goto();

      // Add several values
      await setPage.add('a');
      await setPage.add('b');
      await setPage.add('c');
      await expect(setPage.output).toHaveText('"c" added to the set.'); // last add

      // Clear the set
      await setPage.clear();
      await expect(setPage.output).toHaveText('Set cleared.');

      // Show contents => should now say empty
      await setPage.show();
      await expect(setPage.output).toHaveText('Set is empty.');
    });

    test('should show set contents and preserve insertion order', async ({ page }) => {
      const setPage6 = new SetPage(page);
      await setPage.goto();

      // Add multiple distinct values in a specific order
      await setPage.add('first');
      await setPage.add('second');
      await setPage.add('third');

      // Request to show contents
      await setPage.show();

      // The output should indicate 3 values and list them in insertion order
      const content = await setPage.outputText();

      // Check header
      expect(content.startsWith('Set contents (3 values):')).toBeTruthy();

      // Ensure each line is present in order
      // We expect lines like:
      // Set contents (3 values):
      // 1. first
      // 2. second
      // 3. third
      const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
      expect(lines[0]).toBe('Set contents (3 values):');
      expect(lines[1]).toBe('1. first');
      expect(lines[2]).toBe('2. second');
      expect(lines[3]).toBe('3. third');
    });
  });

  test.describe('Console and Page Error Observation', () => {
    test('should not produce page errors or console.error messages on load and interactions', async ({ page }) => {
      // Capture page errors and console errors
      const pageErrors = [];
      const consoleErrors = [];

      page.on('pageerror', (err) => {
        // Collect page-level errors (uncaught exceptions)
        pageErrors.push(err);
      });

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      const setPage7 = new SetPage(page);
      await setPage.goto();

      // Perform a set of interactions that exercise the app
      await setPage.add('x');
      await setPage.add('x'); // duplicate
      await setPage.has('x');
      await setPage.del('x');
      await setPage.del('x'); // delete non-existent
      await setPage.add('y');
      await setPage.show();
      await setPage.clear();
      await setPage.show();

      // Give a small time window for any async errors to surface
      await page.waitForTimeout(50);

      // Assert that no uncaught page errors occurred
      expect(pageErrors.length).toBe(0);

      // Assert that no console.error messages were emitted
      expect(consoleErrors.length).toBe(0);
    });
  });
});