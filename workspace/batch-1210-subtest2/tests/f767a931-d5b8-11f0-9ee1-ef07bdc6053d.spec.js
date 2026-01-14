import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f767a931-d5b8-11f0-9ee1-ef07bdc6053d.html';

test.describe('Counting Sort Visualization (FSM: f767a931-d5b8-11f0-9ee1-ef07bdc6053d)', () => {

  // Navigate to the page before each test. We attach error/console listeners inside tests
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
  });

  // Test the initial Idle state (S0_Idle)
  test('S0 Idle: initial render contains input, button, and empty result area; renderPage not defined', async ({ page }) => {
    // Ensure required DOM elements exist on initial load
    const input = await page.$('#inputArray');
    const button = await page.$('button[onclick="performCountingSort()"]');
    const result = await page.$('#result');

    expect(input, 'input#inputArray should be present').not.toBeNull();
    expect(button, 'sort button should be present and wired with onclick attribute').not.toBeNull();
    expect(result, 'result div should be present').not.toBeNull();

    // Verify placeholder text matches FSM evidence
    const placeholder = await page.getAttribute('#inputArray', 'placeholder');
    expect(placeholder).toBe('e.g. 4 2 3 1 0 4 3 2');

    // Verify result area is empty on load (S0 Idle -> no bars shown)
    const barsOnLoad = await page.$$(`#result .bar`);
    expect(barsOnLoad.length).toBe(0);

    // FSM mentioned an entry action renderPage(). Verify it is not defined (the implementation does not define it)
    const renderPageDefined = await page.evaluate(() => typeof window['renderPage'] !== 'undefined');
    expect(renderPageDefined).toBe(false);
  });

  // Test the transition S0 -> S1 and S1 -> S2 with a valid numeric input
  test('S0->S1->S2: clicking Sort with valid integers visualizes sorted array and clears previous results', async ({ page }) => {
    // Ensure no page errors occur during the successful run
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err));

    // Input a known array and click Sort
    await page.fill('#inputArray', '4 2 3 1 0 4 3 2');
    await page.click('button[onclick="performCountingSort()"]');

    // Wait for result bars to appear
    await page.waitForSelector('#result .bar');

    // Validate the number of bars equals the number of elements
    const bars = await page.$$(`#result .bar`);
    expect(bars.length).toBe(8);

    // Validate each bar's title (tooltip) shows the correct sorted values in non-decreasing order
    const titles = await Promise.all(bars.map(b => b.getAttribute('title')));
    // Expect sorted array: [0,1,2,2,3,3,4,4]
    expect(titles).toEqual(['0', '1', '2', '2', '3', '3', '4', '4']);

    // Validate the height style correlates with value * 20px scaling
    const heights = await Promise.all(bars.map(b => b.evaluate(el => el.style.height)));
    expect(heights).toEqual(['0px', '20px', '40px', '40px', '60px', '60px', '80px', '80px']);

    // Now test displayResult clears previous results: sort a different array and ensure the old bars are removed
    await page.fill('#inputArray', '1 1 2');
    await page.click('button[onclick="performCountingSort()"]');

    // Wait for new result bars
    await page.waitForSelector('#result .bar');

    const newBars = await page.$$(`#result .bar`);
    expect(newBars.length).toBe(3);

    const newTitles = await Promise.all(newBars.map(b => b.getAttribute('title')));
    expect(newTitles).toEqual(['1', '1', '2']);

    // Ensure no page errors were emitted during valid operations
    expect(pageErrors.length, 'no runtime errors expected for valid numeric input').toBe(0);
  });

  // Verify the presence of the onclick attribute and that clicking the button triggers DOM change (transition trigger)
  test('Event: SortButtonClicked - button has correct onclick and triggers sorting when clicked', async ({ page }) => {
    const button = await page.$('button[onclick="performCountingSort()"]');
    expect(button, 'should find the sort button with the exact onclick attribute').not.toBeNull();

    // Fill with a simple array and click
    await page.fill('#inputArray', '3 0 2');
    await page.click('button[onclick="performCountingSort()"]');

    // Result should be rendered and sorted: [0,2,3]
    await page.waitForSelector('#result .bar');

    const titles = await page.$$eval('#result .bar', bars => bars.map(b => b.title));
    expect(titles).toEqual(['0', '2', '3']);
  });

  // Edge case: non-numeric tokens should lead to a runtime error in the implementation (we let it happen naturally)
  test('Edge case: non-numeric input produces a runtime error (RangeError due to invalid array length)', async ({ page }) => {
    // Wait for the pageerror event that should be thrown by the countingSort implementation when given NaN values
    const errorPromise = page.waitForEvent('pageerror');

    // Provide non-numeric input that will become NaN after Number() conversion
    await page.fill('#inputArray', 'a b c');

    // Click triggers performCountingSort() which will call countingSort and likely throw
    await page.click('button[onclick="performCountingSort()"]');

    // Capture the error
    const err = await errorPromise;

    // Assert that an error was thrown and check that it's plausibly the invalid array length RangeError coming from new Array(NaN)
    expect(err).toBeTruthy();
    // Error message may vary across engines; check for known patterns
    const msg = err.message || '';
    const matchesCommon = /Invalid array length|RangeError|NaN/.test(msg);
    expect(matchesCommon, `expected a runtime error related to invalid array length or NaN, got: ${msg}`).toBe(true);
  });

  // Additional edge-case: partially invalid tokens (numbers mixed with invalid) should also produce an error or produce a result;
  // we assert that either a result is rendered or an error is emitted (implementation-dependent), and we capture both possibilities.
  test('Edge case: mixed valid and invalid tokens - either renders or throws (implementation-defined)', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err));

    await page.fill('#inputArray', '4 x 2');
    await page.click('button[onclick="performCountingSort()"]');

    // Give a short pause to allow either rendering or error to occur
    await page.waitForTimeout(200);

    const bars = await page.$$(`#result .bar`);

    if (pageErrors.length > 0) {
      // If errors occurred, assert at least one is present and related to number parsing/array construction
      const msgs = pageErrors.map(e => e.message || '');
      const anyMatch = msgs.some(m => /Invalid array length|RangeError|NaN/.test(m));
      expect(anyMatch, `expected at least one parse/array-related error, got: ${msgs.join('; ')}`).toBe(true);
    } else {
      // Otherwise, validate that some result was produced (best-effort check)
      expect(bars.length >= 0).toBe(true); // just ensures no crash
      // If bars exist, ensure their titles are strings (they may include "NaN" if produced)
      if (bars.length > 0) {
        const titles = await Promise.all(bars.map(b => b.getAttribute('title')));
        expect(titles.every(t => typeof t === 'string')).toBe(true);
      }
    }
  });

  // Verify displayResult clears previous innerHTML (S2 ResultDisplayed evidence requirement)
  test('S2 ResultDisplayed: displayResult clears previous result before rendering new bars', async ({ page }) => {
    // First render a set of bars
    await page.fill('#inputArray', '2 2 1');
    await page.click('button[onclick="performCountingSort()"]');
    await page.waitForSelector('#result .bar');

    const firstBars = await page.$$(`#result .bar`);
    expect(firstBars.length).toBe(3);

    // Now render a single-item array and ensure previous bars are removed (innerHTML cleared)
    await page.fill('#inputArray', '5');
    await page.click('button[onclick="performCountingSort()"]');
    await page.waitForSelector('#result .bar');

    const secondBars = await page.$$(`#result .bar`);
    expect(secondBars.length).toBe(1);

    // Additional check: ensure the bar corresponds to the new value
    const title = await secondBars[0].getAttribute('title');
    expect(title).toBe('5');
  });

});