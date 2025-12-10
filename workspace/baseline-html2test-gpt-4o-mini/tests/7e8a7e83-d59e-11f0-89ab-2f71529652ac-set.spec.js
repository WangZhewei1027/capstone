import { test, expect } from '@playwright/test';

test.describe('Set Demonstration App (7e8a7e83-d59e-11f0-89ab-2f71529652ac)', () => {
  const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8a7e83-d59e-11f0-89ab-2f71529652ac.html';

  // Helper page object to encapsulate element lookups and common actions
  const app = {
    async input(page) {
      return page.locator('#inputNumbers');
    },
    async addButton(page) {
      return page.locator('#addButton');
    },
    async setContents(page) {
      return page.locator('#setContents');
    },
    // Clicks the add button after filling the input with the provided value
    async addValues(page, value) {
      const input = await this.input(page);
      const button = await this.addButton(page);
      await input.fill(value);
      await button.click();
    }
  };

  // Capture console messages and page errors for each test to assert no unexpected runtime errors
  test.beforeEach(async ({ page }) => {
    // Navigate to the app before each test
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.describe('Initial page load and default state', () => {
    test('should load the page and show the correct title and visible controls', async ({ page }) => {
      // Verify page title
      await expect(page).toHaveTitle('Set Demonstration');

      // Verify input and button are visible and enabled
      const input1 = page.locator('#inputNumbers');
      const button1 = page.locator('#addButton');
      const setDisplay = page.locator('#setContents');

      await expect(input).toBeVisible();
      await expect(input).toBeEnabled();
      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();

      // On initial load, the set display should show an empty array "[]"
      await expect(setDisplay).toHaveText('[]');
    });

    test('should not have any page errors or console errors on initial load', async ({ page }) => {
      const pageErrors = [];
      const consoleMessages = [];

      const onPageError = (err) => pageErrors.push(err);
      const onConsole = (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() });

      page.on('pageerror', onPageError);
      page.on('console', onConsole);

      // Reload to ensure listeners capture any runtime errors immediately after load
      await page.reload({ waitUntil: 'load' });

      // Give a short moment for any asynchronous errors to surface
      await page.waitForTimeout(100);

      // Assert that there are no page errors and no console messages of type 'error'
      expect(pageErrors.length).toBe(0);
      const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error');
      expect(errorConsoleMsgs.length).toBe(0);

      // Cleanup listeners
      page.off('pageerror', onPageError);
      page.off('console', onConsole);
    });
  });

  test.describe('Adding values and Set behavior', () => {
    test('should add a single value and update the set display', async ({ page }) => {
      // Add a single number "1"
      await app.addValues(page, '1');

      const setContents = page.locator('#setContents');
      // After adding, the input should be cleared
      await expect(page.locator('#inputNumbers')).toHaveValue('');

      // JSON.stringify with indent 2 for single element: ["1"]
      await expect(setContents).toHaveText('[\n  "1"\n]');
    });

    test('should add multiple comma-separated values and remove duplicates', async ({ page }) => {
      // Add multiple values with duplicates and spaces
      await app.addValues(page, '1, 2,2, 3,1');

      const setContents1 = page.locator('#setContents1');
      // Expect unique insertion order preserved: ["1","2","3"]
      await expect(setContents).toHaveText('[\n  "1",\n  "2",\n  "3"\n]');

      // Input should be cleared after adding
      await expect(page.locator('#inputNumbers')).toHaveValue('');
    });

    test('should retain insertion order when adding across multiple submissions', async ({ page }) => {
      // First add "10,20"
      await app.addValues(page, '10,20');
      await expect(page.locator('#setContents')).toHaveText('[\n  "10",\n  "20"\n]');

      // Then add "20,30" - 20 is duplicate, 30 is new so should appear at the end
      await app.addValues(page, '20,30');
      await expect(page.locator('#setContents')).toHaveText('[\n  "10",\n  "20",\n  "30"\n]');
    });

    test('should handle non-numeric strings and treat them as distinct entries', async ({ page }) => {
      // Add alphabetic values
      await app.addValues(page, 'a, b, c');
      await expect(page.locator('#setContents')).toHaveText('[\n  "a",\n  "b",\n  "c"\n]');

      // Add a mixture of numeric-like and non-numeric; duplicates across types are distinct by string representation
      await app.addValues(page, '1, a, A');
      // Since "a" already exists and Set is case-sensitive, "A" is new; "1" is new
      await expect(page.locator('#setContents')).toHaveText('[\n  "a",\n  "b",\n  "c",\n  "1",\n  "A"\n]');
    });

    test('should trim whitespace and ignore empty items between commas', async ({ page }) => {
      // Input contains empty tokens and whitespace-only tokens
      await app.addValues(page, '   ,   , 5 , , 6,  ');
      // Only "5" and "6" should be added (assuming previous state was empty for this test run)
      // Because previous tests in this describe block may have modified state, we reload to get fresh state
      await page.reload({ waitUntil: 'load' });
      // Now add again to ensure clean state
      await app.addValues(page, '   ,   , 5 , , 6,  ');
      await expect(page.locator('#setContents')).toHaveText('[\n  "5",\n  "6"\n]');
    });

    test('pressing Enter in the input should NOT add values (no form present)', async ({ page }) => {
      // Ensure fresh state
      await page.reload({ waitUntil: 'load' });

      const input2 = page.locator('#inputNumbers');
      const setContents2 = page.locator('#setContents2');

      // Fill input and press Enter
      await input.fill('100,200');
      await input.press('Enter');

      // Since there is no form submission handler, pressing Enter should not change the set
      await expect(setContents).toHaveText('[]');

      // Now explicitly click Add to verify normal behavior still works
      await app.addValues(page, '100,200');
      await expect(setContents).toHaveText('[\n  "100",\n  "200"\n]');
    });
  });

  test.describe('Edge cases and robustness', () => {
    test('adding only separators or empty input should not modify the set', async ({ page }) => {
      // Ensure fresh state
      await page.reload({ waitUntil: 'load' });

      const setContents3 = page.locator('#setContents3');

      // Try adding only commas and spaces
      await app.addValues(page, ', , , ,  ,  ');
      await expect(setContents).toHaveText('[]');

      // Try adding an empty string
      await app.addValues(page, '');
      await expect(setContents).toHaveText('[]');
    });

    test('adding very large list of values handles deduplication and display', async ({ page }) => {
      // Ensure fresh state
      await page.reload({ waitUntil: 'load' });

      // Create 50 values with some duplicates
      const values = [];
      for (let i = 0; i < 50; i++) {
        values.push(String(i % 10)); // duplicates of 0-9 repeated
      }
      const csv = values.join(',');

      await app.addValues(page, csv);

      // Expect only "0".."9" in order
      const expectedArrayText = '[\n' + Array.from({ length: 10 }, (_, i) => `  "${i}"`).join(',\n') + '\n]';
      await expect(page.locator('#setContents')).toHaveText(expectedArrayText);
    });

    test('verify accessibility basics: input has placeholder and button has accessible name', async ({ page }) => {
      // Input should have a placeholder attribute visible to assistive tech
      const input3 = page.locator('#inputNumbers');
      await expect(input).toHaveAttribute('placeholder', 'Enter numbers separated by commas');

      // Button text should be visible and readable
      const button2 = page.locator('#addButton');
      await expect(button).toHaveText('Add to Set');
    });
  });
});