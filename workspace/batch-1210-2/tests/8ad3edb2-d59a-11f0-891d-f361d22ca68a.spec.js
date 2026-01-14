import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad3edb2-d59a-11f0-891d-f361d22ca68a.html';

// Page Object Model for the Counting Sort page
class CountingSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.consoleMessages = [];
    this.pageErrors = [];

    // Collect console messages and page errors for assertions
    this.page.on('console', (msg) => {
      try {
        this.consoleMessages.push({
          type: msg.type(),
          text: msg.text(),
        });
      } catch (e) {
        // ignore collection errors
      }
    });
    this.page.on('pageerror', (err) => {
      // store the Error object message for inspection
      this.pageErrors.push(err && err.message ? err.message : String(err));
    });
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  async title() {
    return this.page.title();
  }

  async headingText() {
    return this.page.textContent('h1');
  }

  async preContent() {
    // get the raw text inside the <pre> tag
    return this.page.textContent('pre');
  }

  async hasElement(selector) {
    return (await this.page.locator(selector).count()) > 0;
  }

  getConsoleMessages() {
    return this.consoleMessages;
  }

  getPageErrors() {
    return this.pageErrors;
  }
}

test.describe('Counting Sort App - FSM S0_Idle (static page checks and error observations)', () => {
  let pageModel;

  test.beforeEach(async ({ page }) => {
    // Initialize page model and attach listeners
    pageModel = new CountingSortPage(page);

    // Navigate to the page under test
    await pageModel.goto();
  });

  test.afterEach(async ({ page }) => {
    // Cleanup: ensure no background timers left (best-effort)
    try {
      await page.evaluate(() => {
        // It's safe to call clearTimeout on unknown ids (no-op if none)
        // We do not inject globals or redefine anything.
        // This is just a best-effort cleanup for the test environment.
        // eslint-disable-next-line no-undef
        if (typeof window !== 'undefined' && window._playwright_test_timer_ids) {
          window._playwright_test_timer_ids.forEach(id => clearTimeout(id));
        }
      });
    } catch (e) {
      // ignore errors during teardown
    }
  });

  test('Initial Idle state: page title and static content are rendered', async () => {
    // This test validates that the initial S0_Idle state is represented by
    // static page content: title, heading, explanatory text, and code snippet inside <pre>.
    const title = await pageModel.title();
    expect(title).toBe('Counting Sort');

    const heading = await pageModel.headingText();
    expect(heading).toBeTruthy();
    expect(heading.trim()).toBe('Counting Sort');

    // The implementation places the example algorithm inside a <pre> tag.
    const pre = await pageModel.preContent();
    expect(pre).toBeTruthy();

    // The <pre> is expected to contain a <script> block as plain text (not executed).
    expect(pre).toContain('<script>');
    expect(pre).toContain('function countingSort');
    expect(pre).toContain('console.log("Input Array:"');
  });

  test('No interactive elements / transitions found on the page', async () => {
    // According to the FSM extraction summary, no interactive elements or event handlers were detected.
    // Verify absence of common interactive elements.
    expect(await pageModel.hasElement('button')).toBe(false);
    expect(await pageModel.hasElement('input')).toBe(false);
    expect(await pageModel.hasElement('select')).toBe(false);
    expect(await pageModel.hasElement('form')).toBe(false);

    // There should be no anchor elements designed to be interactive as primary controls
    // (anchors may still be present for content; this asserts there are no clickable controls).
    // We're checking conservatively that there are zero anchors (common in simple static examples).
    // If anchors are present, this assertion would fail — it's designed to reflect the FSM notes.
    // To avoid false failures in environments where anchors are added by tooling, we only assert if zero.
    // Count anchors:
    const anchorCount = await pageModel.page.locator('a').count();
    expect(anchorCount).toBe(0);
  });

  test('Script inside <pre> is not executed: no console logs from the example script', async () => {
    // The example counting sort is embedded as text inside a <pre> tag, so it should not execute.
    // Verify there are no console messages containing the example log texts.
    const messages = pageModel.getConsoleMessages();
    // Wait a short moment to allow any automatic console messages (if they existed) to arrive.
    await pageModel.page.waitForTimeout(200);

    const texts = messages.map(m => m.text);
    // Ensure none of the console messages contain the strings that would be logged if the script ran.
    expect(texts.some(t => t.includes('Input Array:'))).toBe(false);
    expect(texts.some(t => t.includes('Sorted Array:'))).toBe(false);
  });

  test('No runtime page errors on load (pageerror events)', async () => {
    // Ensure the page did not emit pageerror events when loading the static content.
    // This validates that the page loads cleanly even if the FSM expected an entry action.
    // Allow a small delay to collect any asynchronous page errors that might surface.
    await pageModel.page.waitForTimeout(200);
    const pageErrors = pageModel.getPageErrors();
    expect(pageErrors.length).toBe(0);
  });

  test('Entry action renderPage is not defined on the window (verify missing onEnter handler)', async () => {
    // FSM listed an entry action renderPage() for the initial state.
    // The actual page does not define such a function since the example is inside <pre>.
    // Verify that renderPage is undefined and that trying to reference it would not have been invoked.
    const typeOfRenderPage = await pageModel.page.evaluate(() => {
      return typeof window.renderPage;
    });
    expect(typeOfRenderPage).toBe('undefined');
  });

  test('countingSort function is not defined globally (attempting to call it causes ReferenceError)', async () => {
    // The code example includes a countingSort function inside a <pre> and therefore is not defined.
    // We intentionally trigger an asynchronous call to the nonexistent function inside the page context
    // so that an unhandled ReferenceError surfaces as a pageerror event (natural runtime error).
    // The test asserts that this naturally-occurring ReferenceError is observed by Playwright.

    // Set up a listener promise to wait for the next pageerror event
    const pageErrorPromise = pageModel.page.waitForEvent('pageerror');

    // Schedule an asynchronous execution that will reference the missing identifier.
    // Using setTimeout ensures the error becomes an unhandled exception on the page,
    // which should trigger a pageerror event that our listener captures.
    await pageModel.page.evaluate(() => {
      // Store the timer id for optional cleanup in afterEach; non-invasive.
      if (typeof window !== 'undefined') {
        window._playwright_test_timer_ids = window._playwright_test_timer_ids || [];
        window._playwright_test_timer_ids.push(setTimeout(() => {
          // This will throw a ReferenceError because countingSort is not defined.
          // We do not catch it intentionally so it becomes a page-level error.
          // eslint-disable-next-line no-undef
          countingSort([1, 2, 3]);
        }, 0));
      }
    });

    // Wait for the pageerror event to occur (with a timeout to avoid hanging forever).
    const pageError = await pageErrorPromise;

    // The pageerror message should indicate the missing identifier.
    expect(pageError.message).toBeTruthy();
    // Different engines may phrase the message differently; check for the key substring.
    expect(pageError.message.toLowerCase()).toContain('countingsort');
    // As an extra check, ensure our recorded pageErrors array captured the event
    // (the CountingSortPage listener also stores messages).
    const recorded = pageModel.getPageErrors();
    // At least one page error should have been recorded.
    expect(recorded.length).toBeGreaterThanOrEqual(1);
    // The latest recorded message should mention the missing function
    expect(recorded[recorded.length - 1].toLowerCase()).toContain('countingsort');
  });

  test('Explicitly referencing countingSort inside evaluate will raise a ReferenceError (caught by evaluate)', async () => {
    // This test calls countingSort inside a try/catch within the page context and returns the error info.
    // It ensures that referencing the identifier leads to a ReferenceError, matching expected behavior.
    const result = await pageModel.page.evaluate(() => {
      try {
        // This will throw a ReferenceError because countingSort is not defined in the global scope.
        // We intentionally catch it and return the details to the test.
        // eslint-disable-next-line no-undef
        countingSort([4, 2, 2]);
        return { ok: true };
      } catch (err) {
        return { ok: false, name: err && err.name, message: err && err.message };
      }
    });

    expect(result.ok).toBe(false);
    // The thrown error should be a ReferenceError (some browsers may report different shapes; at least name should include ReferenceError)
    expect(result.name).toBeTruthy();
    expect(result.name).toMatch(/ReferenceError/i);
    expect(result.message).toBeTruthy();
  });
});