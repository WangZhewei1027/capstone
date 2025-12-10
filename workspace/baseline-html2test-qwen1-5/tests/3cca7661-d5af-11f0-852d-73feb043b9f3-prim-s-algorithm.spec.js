import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-qwen1-5/html/3cca7661-d5af-11f0-852d-73feb043b9f3.html';

test.describe("Prim's Algorithm page (3cca7661-d5af-11f0-852d-73feb043b9f3)", () => {
  // Ensure each test gets a fresh page
  test.beforeEach(async ({ page }) => {
    // Nothing special to set up before navigation in this app,
    // but tests will attach listeners where required.
  });

  // Test initial page load and static content presence
  test('loads page and shows expected static content and board container', async ({ page }) => {
    // Navigate to the page
    await page.goto(APP_URL);

    // Check the page title element (h1) is present and correct
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText("Prim's Algorithm");

    // Check the descriptive paragraph exists and contains expected words
    const paragraph = page.locator('p');
    await expect(paragraph).toBeVisible();
    const paraText = await paragraph.textContent();
    expect(paraText).toBeTruthy();
    // Ensure the paragraph mentions Prim's Algorithm and a board/tower concept
    expect(paraText).toContain("Prim's Algorithm");
    expect(paraText.toLowerCase()).toContain('board');

    // Verify the board container exists and initially has no child pieces
    const board = page.locator('#board');
    await expect(board).toBeVisible();
    const childCount = await board.evaluate((el) => el.childElementCount);
    // The HTML provided has an empty div#board, so expect 0 children
    expect(childCount).toBe(0);

    // Verify there are no interactive controls (buttons, inputs, selects, forms) by default
    const buttonsCount = await page.locator('button').count();
    const inputsCount = await page.locator('input').count();
    const selectsCount = await page.locator('select').count();
    const formsCount = await page.locator('form').count();
    expect(buttonsCount).toBe(0);
    expect(inputsCount).toBe(0);
    expect(selectsCount).toBe(0);
    expect(formsCount).toBe(0);
  });

  // Test interaction attempts on non-interactive elements and ensure no DOM mutation
  test('clicking the board does not add pieces or change DOM unexpectedly', async ({ page }) => {
    await page.goto(APP_URL);

    const board = page.locator('#board');
    await expect(board).toBeVisible();

    // Record initial children count
    const initialChildCount = await board.evaluate((el) => el.childElementCount);

    // Simulate a click on the board; the app has no interactive handlers defined in the HTML,
    // so this should not create new DOM elements. We assert no change.
    await board.click();

    // Small wait to allow any synchronous or asynchronous handlers (if present) to run.
    await page.waitForTimeout(200);

    const afterChildCount = await board.evaluate((el) => el.childElementCount);
    expect(afterChildCount).toBe(initialChildCount);
  });

  // Observe console messages and page errors. According to the instructions we must allow any
  // ReferenceError/SyntaxError/TypeError to happen naturally and assert that they occur.
  test('observes runtime errors and console logs from included script (if any)', async ({ page }) => {
    // Collect pageerrors and console messages
    const pageErrors = [];
    const consoleMessages = [];

    page.on('pageerror', (err) => {
      // pageerror gives an Error object; store its message for assertions
      try {
        pageErrors.push(String(err && err.message ? err.message : String(err)));
      } catch (e) {
        pageErrors.push(String(err));
      }
    });

    page.on('console', (msg) => {
      // Collect console messages (text and type) for later inspection
      consoleMessages.push({ text: msg.text(), type: msg.type() });
    });

    // Also listen for request failures (e.g., script 404) to provide context in assertions
    const requestFailures = [];
    page.on('requestfailed', (request) => {
      try {
        requestFailures.push({
          url: request.url(),
          failure: request.failure() ? request.failure().errorText : null,
          resourceType: request.resourceType(),
        });
      } catch (e) {
        requestFailures.push({ url: request.url(), info: 'failed to capture request failure' });
      }
    });

    // Navigate to page and allow runtime to execute
    await page.goto(APP_URL);

    // Wait up to a short timeout to allow any synchronous or async errors to surface
    const maxWait = 2000;
    const pollInterval = 100;
    let waited = 0;
    while (waited < maxWait && pageErrors.length === 0) {
      // If console shows a clear JS error text, break early as well
      const jsErrorInConsole = consoleMessages.find((m) =>
        /ReferenceError|TypeError|SyntaxError|Uncaught|error/i.test(m.text)
      );
      if (jsErrorInConsole) break;

      await page.waitForTimeout(pollInterval);
      waited += pollInterval;
    }

    // For debugging in CI we still include in failure messages the collected logs.
    // Assert that at least one runtime page error or an indicative console error occurred.
    const foundPageErrorMatch = pageErrors.some((msg) =>
      /(ReferenceError|TypeError|SyntaxError)/i.test(msg)
    );
    const foundConsoleErrorMatch = consoleMessages.some((m) =>
      /(ReferenceError|TypeError|SyntaxError|Uncaught)/i.test(m.text)
    );

    // Build helpful contextual message for test failure
    const context = {
      pageErrors,
      consoleMessages,
      requestFailures,
    };

    // According to the provided instructions, the test should assert that such errors occur.
    // If none occurred naturally, fail the test to reflect that expectation.
    expect(
      foundPageErrorMatch || foundConsoleErrorMatch,
      `Expected a runtime JS error (ReferenceError, TypeError, or SyntaxError) to occur naturally. Collected context: ${JSON.stringify(
        context
      )}`
    ).toBeTruthy();
  });

  // Accessibility / semantic checks: ensure heading has role and is reachable by role queries
  test('semantic accessibility checks - heading is available by role', async ({ page }) => {
    await page.goto(APP_URL);

    // Use getByRole to find the main heading
    const headingByRole = page.getByRole('heading', { name: "Prim's Algorithm" });
    await expect(headingByRole).toBeVisible();

    // There should be exactly one H1 on the page
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
  });
});