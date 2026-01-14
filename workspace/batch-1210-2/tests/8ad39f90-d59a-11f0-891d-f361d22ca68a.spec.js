import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad39f90-d59a-11f0-891d-f361d22ca68a.html';

// Page object encapsulating interactions with the Bubble Sort example page
class BubbleSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.inputSelector = '#input';
    this.sortBtnSelector = '#sort-btn';
    this.outputSelector = '#output';
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  async setInput(value) {
    await this.page.fill(this.inputSelector, String(value));
  }

  async clickSort() {
    return this.page.click(this.sortBtnSelector);
  }

  async getOutputText() {
    return this.page.locator(this.outputSelector).innerText();
  }

  async getInputAttributes() {
    return this.page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      return {
        type: el.getAttribute('type'),
        placeholder: el.getAttribute('placeholder'),
        value: el.value,
      };
    }, this.inputSelector);
  }

  // call bubbleSort directly in page context (this does not trigger the click handler)
  async callBubbleSort(arr) {
    return this.page.evaluate((a) => {
      // call the global bubbleSort function defined by the page HTML
      // If bubbleSort is not defined, this will throw and bubble up, which tests can observe.
      // We purposely do not patch or define anything.
      return bubbleSort(a);
    }, arr);
  }
}

test.describe('Bubble Sort Example (FSM: Idle -> Sorted)', () => {
  // Capture console messages and page errors for assertions
  test.beforeEach(async ({ page }) => {
    // No-op here; individual tests will attach listeners as needed.
  });

  // Test the initial Idle state S0_Idle: page should render input, button, and an output container.
  test('Initial Idle state renders input, sort button, and empty output (S0_Idle)', async ({ page }) => {
    const app = new BubbleSortPage(page);
    await app.goto();

    // Verify the input exists with correct attributes (evidence of S0_Idle)
    const inputAttrs = await app.getInputAttributes();
    expect(inputAttrs).not.toBeNull();
    expect(inputAttrs.type).toBe('number');
    expect(inputAttrs.placeholder).toBe('Enter the number of elements');
    expect(inputAttrs.value).toBe(''); // initially empty

    // Verify the sort button exists
    const sortBtn = page.locator('#sort-btn');
    await expect(sortBtn).toHaveCount(1);
    await expect(sortBtn).toHaveText('Sort');

    // Verify the output div exists and is initially empty (no Sorted state yet)
    const outputText = await app.getOutputText();
    expect(outputText).toBe(''); // idle state: no output text
  });

  // Test that the internal bubbleSort function (entry action logic) works when called directly.
  // This verifies the algorithm implementation separately from the click handler.
  test('bubbleSort function sorts arrays when invoked directly (internal algorithm works)', async ({ page }) => {
    const app = new BubbleSortPage(page);
    await app.goto();

    // Directly call bubbleSort in page context with various arrays
    const sorted = await app.callBubbleSort([3, 1, 2, 5, 4]);
    expect(sorted).toEqual([1, 2, 3, 4, 5]);

    const sortedEmpty = await app.callBubbleSort([]);
    expect(sortedEmpty).toEqual([]);

    const sortedSingle = await app.callBubbleSort([42]);
    expect(sortedSingle).toEqual([42]);

    // also test with duplicates
    const sortedDup = await app.callBubbleSort([5, 3, 3, 1]);
    expect(sortedDup).toEqual([1, 3, 3, 5]);
  });

  // Test the main transition: clicking the Sort button (SortButtonClick event).
  // According to the page's script, the handler declares 'const arr = ...' then attempts 'arr = bubbleSort(arr);'
  // That reassignment to a const should throw a TypeError at runtime. We assert that error happens and that the output is NOT updated.
  test('Clicking Sort triggers SortButtonClick and results in runtime TypeError; output is not updated (transition S0_Idle -> S1_Sorted fails due to error)', async ({ page }) => {
    const app = new BubbleSortPage(page);
    await app.goto();

    // Prepare listeners for pageerror and console error
    const pageErrorPromise = page.waitForEvent('pageerror');
    const consoleErrorPromise = page.waitForEvent('console', (msg) => msg.type() === 'error');

    // Set a valid numeric input (e.g., 5) and click the sort button.
    // We expect the click handler to execute and throw due to reassignment to const.
    await app.setInput(5);

    // Perform click and wait for the pageerror to appear
    await Promise.all([
      app.clickSort(),
      pageErrorPromise, // will resolve when the uncaught exception bubbles up as a pageerror
      consoleErrorPromise // will resolve when console.error is emitted
    ]).then(async (results) => {
      // The pageerror resolve value is in results[1] (may vary depending on ordering)
      // Better to individually await both promises above; above Promise.all returns all resolved values in order
    });

    // Now explicitly wait for and capture the errors to assert their messages
    const pageError = await page.waitForEvent('pageerror');
    expect(pageError).toBeTruthy();
    // We expect a TypeError message mentioning assignment to constant variable.
    // Different engines may phrase it slightly differently; assert on the presence of "Assignment" and "constant"
    expect(pageError.message).toEqual(expect.stringContaining('Assignment').or(expect.stringContaining('assignment')));
    expect(pageError.message.toLowerCase()).toContain('constant');

    // Also verify a console error was emitted
    const consoleError = await page.waitForEvent('console', (msg) => msg.type() === 'error');
    expect(consoleError).toBeTruthy();
    const consoleText = consoleError.text();
    expect(consoleText.toLowerCase()).toEqual(expect.stringContaining('assignment').or(expect.stringContaining('assignment to constant')).toLowerCase());

    // After the error, the output should remain unchanged (transition did not complete successfully)
    const outputText = await app.getOutputText();
    // The script attempted to assign arr then set output.innerText, but the assignment to const prevented further execution.
    // So the output should still be empty.
    expect(outputText).toBe('');
  });

  // Edge cases: clicking Sort with various problematic inputs should still trigger the same runtime error
  // because the handler's reassignment to const occurs regardless of the input value. We verify this behavior.
  test('Edge cases: empty input, zero, negative, and non-numeric input still trigger runtime TypeError and leave output unchanged', async ({ page }) => {
    const app = new BubbleSortPage(page);
    await app.goto();

    const testValues = ['', '0', '-3', 'abc']; // note: page input is type=number, but fill accepts strings
    for (const val of testValues) {
      // Reload the page to ensure independent runs (clears previous console/pageerror state)
      await app.goto();

      // Prepare to capture the next pageerror
      const pageErrorPromise = page.waitForEvent('pageerror');
      // Set the input (fill with string representation)
      await app.setInput(val);

      // Click and wait for the pageerror; do not swallow the error
      await Promise.all([
        app.clickSort(),
        pageErrorPromise
      ]).catch(() => {
        // The promise may reject if the page navigates or other unexpected behavior occurs.
        // We still continue to explicitly await the pageerror below.
      });

      const pageError = await page.waitForEvent('pageerror');
      expect(pageError).toBeTruthy();
      expect(pageError.message.toLowerCase()).toContain('constant');

      // Confirm output is unchanged (still empty)
      const outputText = await app.getOutputText();
      expect(outputText).toBe('');
    }
  });

  // Test that the Sort button has an attached event listener by observing behavior when clicked.
  // This is indirect evidence of the 'sortBtn.addEventListener("click", ...)' handler described in the FSM.
  test('Sort button has an event listener attached (evidence: clicking produces runtime behavior/exception)', async ({ page }) => {
    const app = new BubbleSortPage(page);
    await app.goto();

    // Click without setting input; expect a runtime error due to the click handler executing.
    const [pageError] = await Promise.all([
      page.waitForEvent('pageerror'),
      app.clickSort()
    ]);

    expect(pageError).toBeTruthy();
    // The error should indicate an assignment to a const variable (handler executed)
    expect(pageError.message.toLowerCase()).toContain('constant');

    // As further evidence, ensure output remains unchanged
    const outputText = await app.getOutputText();
    expect(outputText).toBe('');
  });

  // Verify that calling bubbleSort directly on edge arrays returns expected results:
  // This further validates the algorithm implementation independent of the broken click handler.
  test('bubbleSort handles edge arrays correctly when called directly: empty, already sorted, reverse', async ({ page }) => {
    const app = new BubbleSortPage(page);
    await app.goto();

    // Empty array
    const e = await app.callBubbleSort([]);
    expect(e).toEqual([]);

    // Already sorted
    const s = await app.callBubbleSort([1, 2, 3, 4]);
    expect(s).toEqual([1, 2, 3, 4]);

    // Reverse order
    const r = await app.callBubbleSort([5, 4, 3, 2, 1]);
    expect(r).toEqual([1, 2, 3, 4, 5]);
  });
});