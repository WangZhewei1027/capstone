import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad3c6a1-d59a-11f0-891d-f361d22ca68a.html';

// Page Object for the Merge Sort page
class MergeSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arraySelector = '#array';
    this.sortBtnSelector = '#sort-btn';
    this.resultSelector = '#result';
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async fillArray(text) {
    await this.page.fill(this.arraySelector, text);
  }

  async clickSort() {
    // Click the sort button. Do not attempt to prevent navigation or patch the page.
    await this.page.click(this.sortBtnSelector);
  }

  async getResultText() {
    return (await this.page.locator(this.resultSelector).innerText()).trim();
  }

  async hasSortButton() {
    return await this.page.locator(this.sortBtnSelector).count() > 0;
  }

  async hasArrayTextarea() {
    return await this.page.locator(this.arraySelector).count() > 0;
  }

  async isMergeSortDefined() {
    return await this.page.evaluate(() => typeof mergeSort !== 'undefined');
  }
}

test.describe('Merge Sort FSM and UI - Application 8ad3c6a1-d59a-11f0-891d-f361d22ca68a', () => {
  let pageErrors;
  let page;
  let msPage;

  test.beforeEach(async ({ browser, context: _ctx, _workerInfo }) => {
    // Create a fresh page for each test
    page = await browser.newPage();
    pageErrors = [];

    // Capture unhandled page errors so tests can assert on them.
    page.on('pageerror', (error) => {
      pageErrors.push(error);
    });

    // Also capture console.error for additional evidence (not required but useful)
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        // Wrap console errors into Error objects for easier assertions if needed.
        pageErrors.push(new Error(`console.error: ${msg.text()}`));
      }
    });

    msPage = new MergeSortPage(page);
    await msPage.goto();
  });

  test.afterEach(async () => {
    // Ensure page is closed
    if (page && !page.isClosed()) {
      await page.close();
    }
  });

  test('Initial Idle state: page renders expected controls (textarea, Sort button, result div)', async () => {
    // Validate initial UI elements exist corresponding to S0_Idle
    expect(await msPage.hasArrayTextarea()).toBeTruthy();
    expect(await msPage.hasSortButton()).toBeTruthy();
    const resultCount = await page.locator('#result').count();
    expect(resultCount).toBe(1);

    // The textarea should be empty on initial render
    const textareaValue = await page.locator('#array').inputValue();
    expect(textareaValue).toBe('');

    // The Sort button should contain the text "Sort"
    const btnText = await page.locator('#sort-btn').innerText();
    expect(btnText.trim()).toBe('Sort');

    // No runtime errors should have occurred during initial load
    expect(pageErrors.length).toBe(0);

    // Merge sort function should be defined on the page (function exists even if buggy)
    const mergeSortDefined = await msPage.isMergeSortDefined();
    expect(mergeSortDefined).toBe(true);
  });

  test('Transition S0 -> S1 with single element: displays the same element (no runtime error)', async () => {
    // This tests the successful path where mergeSort is called with an array of length 1.
    // The implementation's bug that reassigns const variables does not execute for arrays of length <= 1.
    await msPage.fillArray('42');

    // Clear any previous errors
    pageErrors = [];

    // Click Sort
    await msPage.clickSort();

    // Wait briefly to allow the click handler to update the DOM.
    await page.waitForTimeout(200);

    // Expect no runtime errors for this simple case
    expect(pageErrors.length).toBe(0);

    // Result should contain the single element '42'
    const resultText = await msPage.getResultText();
    expect(resultText).toBe('42');
  });

  test('Edge case: empty input produces empty result (no runtime error)', async () => {
    // Empty input should produce empty resultDiv (join of empty array -> '')
    await msPage.fillArray('');

    pageErrors = [];
    await msPage.clickSort();

    // Wait a short moment for DOM update
    await page.waitForTimeout(200);

    // No errors expected
    expect(pageErrors.length).toBe(0);

    const resultText = await msPage.getResultText();
    // resultDiv should be empty string (may include whitespace trimmed)
    expect(resultText).toBe('');
  });

  test('Edge case: single non-numeric token displays NaN (no runtime error)', async () => {
    // Input 'abc' -> Number('abc') === NaN; mergeSort on single element returns it unchanged
    await msPage.fillArray('abc');

    pageErrors = [];
    await msPage.clickSort();

    await page.waitForTimeout(200);

    // No runtime errors expected
    expect(pageErrors.length).toBe(0);

    const resultText = await msPage.getResultText();
    // "NaN" is expected text representation
    expect(resultText).toBe('NaN');
  });

  test('Transition S0 -> S1 with multiple elements: implementation bug triggers TypeError (Assignment to constant variable)', async () => {
    // This test deliberately triggers the bug in mergeSort where const left/right are reassigned.
    // We expect an unhandled pageerror (TypeError) to be emitted and captured.
    await msPage.fillArray('3 1 2 5');

    // Ensure no previous errors are counted
    pageErrors = [];

    // Click Sort and wait for a pageerror to be emitted.
    // The click may also submit the form and cause navigation; we do not prevent that.
    let capturedError;
    try {
      // Wait for the pageerror event specifically.
      const errEventPromise = page.waitForEvent('pageerror', { timeout: 2000 });
      await msPage.clickSort();
      capturedError = await errEventPromise;
    } catch (err) {
      // If we did not get a pageerror within timeout, capture whatever was recorded.
      if (pageErrors.length > 0) {
        capturedError = pageErrors[0];
      } else {
        capturedError = null;
      }
    }

    // We expect a runtime error due to the bug (assignment to const). Assert that a page error was captured.
    expect(capturedError, 'Expected a runtime error (TypeError) to be thrown when sorting multiple elements').toBeTruthy();

    // The message should indicate an assignment to a constant (V8 message: "Assignment to constant variable.")
    // Use a less brittle check: ensure the message contains 'constant' or 'Assignment'
    const msg = capturedError ? capturedError.message || String(capturedError) : '';
    expect(msg.toLowerCase()).toMatch(/assignment|constant/);

    // The result div should either be empty or unchanged; it should not contain a correct sorted sequence due to the failure.
    // We allow either empty or partial content; but we assert that it is NOT the correctly sorted sequence '1\n2\n3\n5'.
    const resultText = await msPage.getResultText();
    expect(resultText).not.toBe('1\n2\n3\n5');
  });

  test('Event handler existence and expected listener evidence: clicking #sort-btn triggers handler (even if it errors)', async () => {
    // This test ensures that the click event is wired to #sort-btn.
    // We set a short list to trigger the bug and assert that clicking triggers a page error (evidence of invocation).
    await msPage.fillArray('2 1');

    pageErrors = [];

    // Attempt to click and capture pageerror. We don't fail the test if no error occurs here; rather we assert the handler ran by checking either result update or an error.
    let handlerRan = false;

    // Listen to DOM changes in result to detect if handler updated the DOM
    const resultLocator = page.locator('#result');
    const initialResult = await resultLocator.innerText();

    // Click the button
    await msPage.clickSort();

    // Wait a short moment for either DOM update or error event
    try {
      await page.waitForEvent('pageerror', { timeout: 1000 });
      handlerRan = true;
    } catch (e) {
      // No error observed in timeframe; check if DOM changed instead
      await page.waitForTimeout(200);
      const after = await resultLocator.innerText();
      if (after !== initialResult) handlerRan = true;
    }

    expect(handlerRan, 'Clicking #sort-btn should invoke its handler (observed via DOM change or page error)').toBe(true);
  });

  test('Sanity check: merge and mergeSort functions exist but mergeSort is buggy (detect TypeError when invoked on multi-element arrays via evaluate)', async () => {
    // Directly call mergeSort from page context to observe behavior programmatically.
    // This will still let runtime errors surface as exceptions from evaluate.
    // For a single-element array, it should succeed and return the same array.
    const singleResult = await page.evaluate(() => {
      try {
        return mergeSort([7]);
      } catch (e) {
        return { __error: e && e.message ? e.message : String(e) };
      }
    });
    expect(Array.isArray(singleResult)).toBe(true);
    expect(singleResult[0]).toBe(7);

    // For a multi-element array, the implementation should throw (assignment to const). We assert that.
    const multiResult = await page.evaluate(() => {
      try {
        return mergeSort([3, 2]);
      } catch (e) {
        return { __error: e && e.message ? e.message : String(e) };
      }
    });

    // Expect an error object indicating the thrown error
    expect(multiResult && typeof multiResult === 'object' && multiResult.__error).toBeTruthy();
    expect(String(multiResult.__error).toLowerCase()).toMatch(/assignment|constant/);
  });
});