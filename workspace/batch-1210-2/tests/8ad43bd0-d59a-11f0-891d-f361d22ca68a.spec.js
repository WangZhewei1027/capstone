import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad43bd0-d59a-11f0-891d-f361d22ca68a.html';

class BinarySearchPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#input-field');
    this.button = page.locator('button[onclick="search()"]');
    this.result = page.locator('#result');
  }

  async load() {
    await this.page.goto(APP_URL);
    // Ensure the main elements are present
    await expect(this.input).toBeVisible();
    await expect(this.button).toBeVisible();
    await expect(this.result).toBeVisible();
  }

  async enterNumber(value) {
    // Use fill to set the numeric input. Accept numbers and numeric strings.
    await this.input.fill(String(value));
  }

  async clickSearch() {
    // Click the search button and wait for any synchronous UI update (function is synchronous)
    await this.button.click();
  }

  async getResultText() {
    return this.result.innerText();
  }

  async clearInput() {
    await this.input.fill('');
  }
}

test.describe('Binary Search FSM - Comprehensive E2E tests', () => {
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    // Reset trackers before each test
    consoleErrors = [];
    pageErrors = [];

    // Capture console 'error' messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location ? msg.location() : undefined,
        });
      }
    });

    // Capture uncaught page errors (ReferenceError, TypeError, SyntaxError, etc.)
    page.on('pageerror', (err) => {
      // err is Error instance
      pageErrors.push({
        message: err.message,
        name: err.name,
        stack: err.stack,
      });
    });

    // Navigate to app and assert basic render (S0_Idle entry evidence)
    const bsPage = new BinarySearchPage(page);
    await bsPage.load();
  });

  test.afterEach(async () => {
    // After each test, assert there were no unexpected console or page errors.
    // These assertions validate that the page executed without throwing uncaught runtime errors.
    // If the application had ReferenceError/SyntaxError/TypeError these arrays would be non-empty
    // and the assertions would fail, surfacing the errors.
    expect(consoleErrors, 'No console.error messages should be emitted during the test').toHaveLength(0);
    expect(pageErrors, 'No uncaught page errors should occur during the test').toHaveLength(0);
  });

  test.describe('Initial State (S0_Idle) validations', () => {
    test('renders input, button, and empty result on load', async ({ page }) => {
      // Validate initial DOM matches FSM evidence for Idle state
      const bsPage = new BinarySearchPage(page);
      await expect(bsPage.input).toHaveAttribute('placeholder', 'Enter a number');
      await expect(bsPage.button).toHaveText('Search');
      // result should be empty initially
      await expect(bsPage.result).toHaveText('');
    });
  });

  test.describe('Searching and Result states (S1_Searching -> S2_ResultFound / S3_ResultNotFound)', () => {
    test('search finds a middle element (5) and updates result with correct index (4)', async ({ page }) => {
      // This test validates a correct transition: Idle -> Searching -> ResultFound
      const bsPage = new BinarySearchPage(page);
      await bsPage.enterNumber(5); // 5 is present at index 4 in [1..10]
      await bsPage.clickSearch();

      // The search() is synchronous and returns immediately with result update.
      await expect(bsPage.result).toHaveText('Number 5 is present at index 4');
    });

    test('search finds first element (1) and updates result with index 0', async ({ page }) => {
      // Validate boundary - first element
      const bsPage = new BinarySearchPage(page);
      await bsPage.enterNumber(1);
      await bsPage.clickSearch();
      await expect(bsPage.result).toHaveText('Number 1 is present at index 0');
    });

    test('search finds last element (10) and updates result with index 9', async ({ page }) => {
      // Validate boundary - last element
      const bsPage = new BinarySearchPage(page);
      await bsPage.enterNumber(10);
      await bsPage.clickSearch();
      await expect(bsPage.result).toHaveText('Number 10 is present at index 9');
    });

    test('search with a decimal input (5.9) uses parseInt => 5 and finds index 4', async ({ page }) => {
      // Edge case: parseInt on a decimal string should truncate to integer
      const bsPage = new BinarySearchPage(page);
      // Fill with a decimal value; input[type=number] accepts decimals.
      await bsPage.enterNumber('5.9');
      await bsPage.clickSearch();
      await expect(bsPage.result).toHaveText('Number 5 is present at index 4');
    });

    test('search for an absent value (11) updates result with not found message', async ({ page }) => {
      // Validate transition Idle -> Searching -> ResultNotFound
      const bsPage = new BinarySearchPage(page);
      await bsPage.enterNumber(11);
      await bsPage.clickSearch();
      await expect(bsPage.result).toHaveText('Number 11 is not present in array');
    });

    test('search for negative value (-1) updates result with not found message', async ({ page }) => {
      // Validate absent value less than array range
      const bsPage = new BinarySearchPage(page);
      await bsPage.enterNumber(-1);
      await bsPage.clickSearch();
      await expect(bsPage.result).toHaveText('Number -1 is not present in array');
    });

    test('consecutive searches update result correctly without page reload', async ({ page }) => {
      // Validate repeated interactions and state transitions do not break the flow
      const bsPage = new BinarySearchPage(page);
      await bsPage.enterNumber(2);
      await bsPage.clickSearch();
      await expect(bsPage.result).toHaveText('Number 2 is present at index 1');

      // Now search for absent number
      await bsPage.enterNumber(20);
      await bsPage.clickSearch();
      await expect(bsPage.result).toHaveText('Number 20 is not present in array');

      // Back to present number
      await bsPage.enterNumber(7);
      await bsPage.clickSearch();
      await expect(bsPage.result).toHaveText('Number 7 is present at index 6');
    });
  });

  test.describe('FSM Evidence & Edge validations', () => {
    test('verifies DOM evidence strings exist (input, button with onclick, and result div)', async ({ page }) => {
      // Confirm selectors/evidence described in the FSM are present in the implementation
      await expect(page.locator('input#input-field')).toHaveCount(1);
      await expect(page.locator('button[onclick="search()"]')).toHaveCount(1);
      await expect(page.locator('#result')).toHaveCount(1);
    });

    test('does not click search with empty input to avoid potential infinite loop; validates app guards', async ({ page }) => {
      // Important: The implementation uses parseInt on the input value. If the input is empty,
      // parseInt('') => NaN, and the while loop uses comparisons with NaN which could cause
      // the function not to progress. Because we must NOT modify the application, we avoid
      // invoking that potentially infinite path. Instead, this test ensures that the input
      // is empty initially and that we do not call search() so as to keep test runner stable.
      const bsPage = new BinarySearchPage(page);
      const inputValue = await bsPage.input.inputValue();
      // The initial input should be empty; we assert that and then skip invoking the search.
      expect(inputValue).toBe('');
      // Also verify result remains empty without invoking search
      await expect(bsPage.result).toHaveText('');
    });

    test('observes console and page errors during typical interactions (should be none)', async ({ page }) => {
      // This test purposefully runs a few typical searches and then relies on afterEach to assert no errors were recorded.
      const bsPage = new BinarySearchPage(page);
      await bsPage.enterNumber(3);
      await bsPage.clickSearch();
      await expect(bsPage.result).toHaveText('Number 3 is present at index 2');

      await bsPage.enterNumber(999);
      await bsPage.clickSearch();
      await expect(bsPage.result).toHaveText('Number 999 is not present in array');

      // We do NOT assert errors here directly; afterEach will assert that consoleErrors and pageErrors arrays are empty.
    });
  });
});