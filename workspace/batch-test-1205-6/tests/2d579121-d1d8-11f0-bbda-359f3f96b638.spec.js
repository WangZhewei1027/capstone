import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d579121-d1d8-11f0-bbda-359f3f96b638.html';

// Page Object for the Topological Sort page
class TopoPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#inputEdges');
    this.sortButton = page.locator('button[onclick="performTopologicalSort()"]');
    this.result = page.locator('#result');
    this.header = page.locator('h1');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async enterEdges(text) {
    await this.input.fill(text);
  }

  async clickSort() {
    await this.sortButton.click();
  }

  async getResultText() {
    return await this.result.innerText();
  }

  async headerText() {
    return await this.header.innerText();
  }

  async inputPlaceholder() {
    return await this.input.getAttribute('placeholder');
  }
}

test.describe('Topological Sort Interactive App (FSM validation)', () => {
  // Arrays to capture console error messages and page errors for each test
  let consoleErrors;
  let pageErrors;

  // Setup listeners and navigate before each test
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages (particularly errors)
    page.on('console', msg => {
      try {
        if (msg.type() === 'error') {
          // store the text for inspection
          consoleErrors.push(msg.text());
        }
      } catch (e) {
        // ignore any listener errors
      }
    });

    // Capture uncaught exceptions from the page
    page.on('pageerror', error => {
      try {
        pageErrors.push(String(error && error.message ? error.message : error));
      } catch (e) {
        // ignore
      }
    });

    // Navigate to the application page
    await page.goto(APP_URL);
  });

  // Clean up listeners after each test (Playwright cleans page event handlers on new page,
  // but we reset arrays for clarity)
  test.afterEach(async () => {
    consoleErrors = [];
    pageErrors = [];
  });

  test('Initial Idle State renders correctly (S0_Idle evidence)', async ({ page }) => {
    // This test validates the initial/idle state's evidence:
    // - Page header is present
    // - Input placeholder matches expected
    // - Sort button exists with the expected onclick attribute
    // - Result div is present and initially empty
    const topo = new TopoPage(page);

    // Verify page header exists and matches FSM evidence
    await expect(topo.header).toBeVisible();
    expect(await topo.headerText()).toBe('Topological Sort Demonstration');

    // Verify input placeholder
    expect(await topo.inputPlaceholder()).toBe('e.g., A,B; B,C; A,C');

    // Verify Sort button exists and its onclick attribute is present
    const sortButton = page.locator('button[onclick="performTopologicalSort()"]');
    await expect(sortButton).toBeVisible();
    await expect(sortButton).toHaveText('Sort');

    // Verify result div is present and initially empty
    await expect(page.locator('#result')).toBeVisible();
    expect(await page.locator('#result').innerText()).toBe('');

    // Ensure that loading the page did not immediately produce console errors or page errors
    expect(consoleErrors.length, 'No console errors on initial load').toBe(0);
    expect(pageErrors.length, 'No page errors on initial load').toBe(0);
  });

  test('Perform topological sort on acyclic graph transitions Idle -> Sorting -> Result (S0 -> S1 -> S2)', async ({ page }) => {
    // This test performs a normal topological sort (acyclic graph) and validates:
    // - Clicking Sort triggers the algorithm
    // - The result div displays the expected topological order
    // - No runtime console/page errors are produced during the operation
    const topo1 = new TopoPage(page);

    // Provide the example acyclic input from the FSM: A,B; B,C; A,C
    await topo.enterEdges('A,B; B,C; A,C');

    // Click the Sort button (this triggers performTopologicalSort)
    await topo.clickSort();

    // The implementation should produce the deterministic order A -> B -> C for this input
    await expect(topo.result).toHaveText('Topological Sort: A -> B -> C');

    // Confirm no console errors or page errors happened while sorting
    expect(consoleErrors.length, 'No console errors when sorting acyclic graph').toBe(0);
    expect(pageErrors.length, 'No page errors when sorting acyclic graph').toBe(0);
  });

  test('Detects cycles and displays the cycle message (S1_Sorting -> S2_Result cycle branch)', async ({ page }) => {
    // This test verifies the application's cycle detection:
    // - Input a simple 2-node cycle (A,B; B,A)
    // - Click Sort and verify the cycle message is displayed
    const topo2 = new TopoPage(page);

    await topo.enterEdges('A,B; B,A');
    await topo.clickSort();

    await expect(topo.result).toHaveText('The graph has a cycle, topological sort is not possible.');

    // Confirm no console errors or page errors occurred while detecting cycle
    expect(consoleErrors.length, 'No console errors when detecting cycle').toBe(0);
    expect(pageErrors.length, 'No page errors when detecting cycle').toBe(0);
  });

  test('Edge case: empty input handling', async ({ page }) => {
    // This test examines how the app handles empty input:
    // - Leaves the input empty and clicks Sort
    // - Verifies that the app shows some deterministic output (doesn't crash)
    const topo3 = new TopoPage(page);

    // Ensure input is empty and click sort
    await topo.enterEdges('');
    await topo.clickSort();

    // The implementation may produce an odd result but must not crash; check that result is non-empty text
    const text = await topo.getResultText();
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);

    // Ensure no console / page errors were thrown in the process
    expect(consoleErrors.length, 'No console errors for empty input').toBe(0);
    expect(pageErrors.length, 'No page errors for empty input').toBe(0);
  });

  test('Invoking missing FSM functions causes ReferenceError (observe page errors for renderPage/displayResult)', async ({ page }) => {
    // The FSM definition referenced functions renderPage() and displayResult() as entry/exit actions,
    // but the provided HTML does not define them. This test intentionally invokes those functions
    // in the page context to allow natural ReferenceError to occur and asserts these errors are observed.
    // This validates that missing action functions in the FSM produce runtime ReferenceError as-is (per instructions).

    // Attempt to call renderPage() and assert the evaluation rejects with a ReferenceError-like message.
    // We do not patch the page; we let the ReferenceError happen naturally.
    await expect(page.evaluate(() => {
      // Intentionally call a function that is not defined by the page
      // This will throw a ReferenceError in the page context
      // eslint-disable-next-line no-undef
      return renderPage();
    })).rejects.toThrow(/renderPage|is not defined|not a function/);

    // Similarly attempt to call displayResult()
    await expect(page.evaluate(() => {
      // eslint-disable-next-line no-undef
      return displayResult();
    })).rejects.toThrow(/displayResult|is not defined|not a function/);

    // After the above calls, the pageerror listener should have captured at least one page error.
    // The exact message strings may vary across engines, so assert that pageErrors contains substrings.
    // Wait briefly to ensure pageerror events are processed
    await page.waitForTimeout(50);

    // At least one of the captured page errors should reference 'renderPage' or 'displayResult'
    const joinedPageErrors = pageErrors.join(' | ');
    expect(joinedPageErrors.length).toBeGreaterThan(0);

    // Check that we observed an error mentioning renderPage or displayResult
    const hasRender = /renderPage/.test(joinedPageErrors);
    const hasDisplay = /displayResult/.test(joinedPageErrors);
    expect(hasRender || hasDisplay).toBeTruthy();
  });

  test('Verify DOM evidence for S1_Sorting (button with onclick exists) and S2_Result (result div updated)', async ({ page }) => {
    // This test double-checks the FSM evidence entries:
    // - The Sort button's onclick attribute exists in the DOM
    // - After clicking Sort, the result div (#result) is updated (either to a sort result or a cycle message)
    const topo4 = new TopoPage(page);

    // Confirm button node has the onclick attribute exactly as expected
    const buttonHandle = await page.$('button[onclick="performTopologicalSort()"]');
    expect(buttonHandle).not.toBeNull();

    // Use a simple input to produce a result and verify #result is updated
    await topo.enterEdges('X,Y; Y,Z');
    // Ensure result is initially empty
    expect(await topo.getResultText()).toBe('');
    await topo.clickSort();
    // Verify result is updated to contain 'Topological Sort:' prefix
    const resText = await topo.getResultText();
    expect(resText.startsWith('Topological Sort:') || resText.includes('cycle'), 'Result div should be updated with either sort result or cycle message').toBeTruthy();

    // Ensure no runtime errors were produced in this flow
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});