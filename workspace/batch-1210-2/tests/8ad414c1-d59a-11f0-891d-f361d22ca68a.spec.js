import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad414c1-d59a-11f0-891d-f361d22ca68a.html';

// Page Object Model for the Linear Search page
class LinearSearchPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#search-input');
    this.button = page.locator('#search-button');
    this.result = page.locator('#result');
    this.heading = page.locator('h2');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async enterInput(value) {
    await this.input.fill(''); // clear first to ensure deterministic state
    await this.input.fill(value);
  }

  async clickSearch() {
    await this.button.click();
  }

  async getResultText() {
    return (await this.result.textContent())?.trim() ?? '';
  }

  async getPlaceholder() {
    return await this.input.getAttribute('placeholder');
  }

  async getHeadingText() {
    return (await this.heading.textContent())?.trim() ?? '';
  }
}

test.describe('Linear Search App - FSM states and transitions', () => {
  let pageErrors = [];
  let consoleMessages = [];

  test.beforeEach(async ({ page }) => {
    // reset collectors for each test
    pageErrors = [];
    consoleMessages = [];

    // collect uncaught page errors
    page.on('pageerror', (error) => {
      // store Error objects for assertions and debugging
      pageErrors.push(error);
    });

    // collect console messages
    page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });
  });

  test.afterEach(async () => {
    // Nothing to teardown beyond Playwright fixtures.
    // We keep the afterEach to make explicit that no global patches are performed.
  });

  test.describe('Initial State (S0_Idle) - UI presence and entry actions', () => {
    test('should render the main UI elements on load (h2, input, button, result)', async ({ page }) => {
      // Arrange
      const ui = new LinearSearchPage(page);

      // Act
      await ui.goto();

      // Assert: heading present and correct
      const heading = await ui.getHeadingText();
      expect(heading).toBe('Linear Search');

      // Assert: input placeholder matches FSM evidence
      const placeholder = await ui.getPlaceholder();
      expect(placeholder).toBe('Enter a number');

      // Assert: button exists and has label "Search"
      await expect(ui.button).toBeVisible();
      await expect(ui.button).toHaveText('Search');

      // Assert: result element exists (initially empty)
      const initialResult = await ui.getResultText();
      expect(initialResult).toBe('');

      // Assert: No uncaught page errors or console errors on initial render
      // (We observe console and page errors and assert none occurred)
      expect(pageErrors.length).toBe(0);
      // Allow informational console logs but assert there are no error-level console messages
      const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
      expect(errorConsoleMessages.length).toBe(0);
    });

    test('should not call any missing onEnter/onExit functions (no ReferenceError thrown)', async ({ page }) => {
      // This test validates that if the FSM mentioned renderPage() as an entry action,
      // the page does not produce a ReferenceError when loading (i.e., it doesn't try to call an undefined function).
      const ui = new LinearSearchPage(page);
      await ui.goto();

      // Wait a short moment to capture any synchronous page errors emitted during load
      await page.waitForTimeout(200);

      // If renderPage() were invoked but undefined, a ReferenceError would be captured in pageErrors.
      const refErrors = pageErrors.filter(e => e instanceof Error && /ReferenceError/i.test(e.message));
      expect(refErrors.length).toBe(0);
    });
  });

  test.describe('Transitions triggered by SearchClick event', () => {
    test('S0 -> S1: clicking search with empty input shows "Please enter a number"', async ({ page }) => {
      // Validate the error path when input is empty
      const ui = new LinearSearchPage(page);
      await ui.goto();

      // Ensure input is empty
      await ui.input.fill('');
      await ui.clickSearch();

      // Assert expected observable from FSM
      const resultText = await ui.getResultText();
      expect(resultText).toBe('Please enter a number');

      // Ensure no unexpected runtime errors
      expect(pageErrors.length).toBe(0);
      const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
      expect(errorConsoleMessages.length).toBe(0);
    });

    test('S0 -> S3: clicking search with an existing number shows found message with correct index', async ({ page }) => {
      // Validate success path: number present in the list
      const ui = new LinearSearchPage(page);
      await ui.goto();

      // Choose a known present number: 42 (numbers generated are 1..100)
      await ui.enterInput('42');
      await ui.clickSearch();

      // Expected index is 41 (zero-based)
      const resultText = await ui.getResultText();
      expect(resultText).toBe('Number 42 found at index 41');

      // No runtime errors should be thrown
      expect(pageErrors.length).toBe(0);
      const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
      expect(errorConsoleMessages.length).toBe(0);
    });

    test('S0 -> S2: clicking search with a non-existent number shows "Number not found"', async ({ page }) => {
      // Validate the not-found error path
      const ui = new LinearSearchPage(page);
      await ui.goto();

      // Provide a number outside 1..100
      await ui.enterInput('150');
      await ui.clickSearch();

      const resultText = await ui.getResultText();
      expect(resultText).toBe('Number not found');

      // No runtime errors should be thrown
      expect(pageErrors.length).toBe(0);
      const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
      expect(errorConsoleMessages.length).toBe(0);
    });

    test('Edge case: non-numeric input "abc" should be treated as not found', async ({ page }) => {
      // Non-numeric input: parseInt('abc') -> NaN, indexOf(NaN) -> -1, result should be 'Number not found'
      const ui = new LinearSearchPage(page);
      await ui.goto();

      await ui.enterInput('abc');
      await ui.clickSearch();

      const resultText = await ui.getResultText();
      expect(resultText).toBe('Number not found');

      expect(pageErrors.length).toBe(0);
      const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
      expect(errorConsoleMessages.length).toBe(0);
    });

    test('Edge case: whitespace trimmed input " 1 " should find number 1 at index 0', async ({ page }) => {
      // Whitespace should be trimmed by the implementation (.trim()), so ' 1 ' should find 1
      const ui = new LinearSearchPage(page);
      await ui.goto();

      await ui.enterInput(' 1 ');
      await ui.clickSearch();

      const resultText = await ui.getResultText();
      expect(resultText).toBe('Number 1 found at index 0');

      expect(pageErrors.length).toBe(0);
      const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
      expect(errorConsoleMessages.length).toBe(0);
    });

    test('Edge case: leading zeros "042" should find number 42 at index 41', async ({ page }) => {
      // parseInt('042') -> 42, so it should find it
      const ui = new LinearSearchPage(page);
      await ui.goto();

      await ui.enterInput('042');
      await ui.clickSearch();

      const resultText = await ui.getResultText();
      expect(resultText).toBe('Number 042 found at index 41');

      // No runtime errors
      expect(pageErrors.length).toBe(0);
      const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
      expect(errorConsoleMessages.length).toBe(0);
    });
  });

  test.describe('Robustness checks: console and runtime errors observation', () => {
    test('should not produce uncaught exceptions during a typical sequence of interactions', async ({ page }) => {
      // Simulate a typical user flow: load page, perform multiple searches
      const ui = new LinearSearchPage(page);
      await ui.goto();

      // sequence
      await ui.enterInput(''); // empty -> error
      await ui.clickSearch();

      await ui.enterInput('99'); // found
      await ui.clickSearch();

      await ui.enterInput('1000'); // not found
      await ui.clickSearch();

      // small delay to ensure asynchronous errors (if any) are captured
      await page.waitForTimeout(200);

      // We expect that the page code is robust and does not throw uncaught errors.
      // Fail the test if there are any page errors captured.
      if (pageErrors.length > 0) {
        // Provide diagnostic output for test failure
        const messages = pageErrors.map(e => e.message).join('\n---\n');
        // Use expect to report failure with message
        expect(pageErrors.length, `Unexpected page errors:\n${messages}`).toBe(0);
      }

      // Also assert there are no console.error messages
      const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
      expect(errorConsoleMessages.length, `Unexpected console.error messages: ${JSON.stringify(errorConsoleMessages)}`).toBe(0);
    });
  });
});