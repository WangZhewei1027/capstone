import { test, expect } from '@playwright/test';

const APP_URL =
  // The application is served from the workspace. Use the path without the stray space.
  'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/0ccd3fa0-d5b5-11f0-899c-75bf12e026a9.html';

// Page object encapsulating interactions with the Sliding Window demo page
class SlidingPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.form = page.locator('#slidingForm');
    this.arrayInput = page.locator('#arrayInput');
    this.windowInput = page.locator('#windowSizeInput');
    this.submitButton = page.locator("button[type='submit']");
    this.output = page.locator('#output');
    this.heading = page.locator('h1');
    this.description = page.locator('p.description');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async fillArray(text) {
    await this.arrayInput.fill(text);
  }

  async setWindowSize(n) {
    // number inputs accept fill as text
    await this.windowInput.fill(String(n));
  }

  async submit() {
    await Promise.all([
      // clicking the submit button triggers the form submit handler
      this.page.waitForEvent('load').catch(() => {}), // in case the page doesn't navigate; swallow
      this.submitButton.click()
    ]).catch(() => {
      // The script does not navigate; click completes. We intentionally ignore load errors.
    });
  }

  async clickSubmitAndWaitForOutputChange(previousContent = '') {
    // Click the submit button and wait until output's textContent differs from previousContent
    const changed = this.output.locator('xpath=..'); // dummy to keep locator consistent
    await this.submitButton.click();
    // Wait for output text to update (either become different or contain expected markers)
    await this.page.waitForFunction(
      ([selector, prev]) => {
        const el = document.querySelector(selector);
        if (!el) return false;
        return el.textContent.trim() !== prev.trim();
      },
      [ '#output', previousContent ],
      { timeout: 2000 }
    );
  }

  async outputText() {
    return (await this.output.textContent()) ?? '';
  }

  async outputHTML() {
    return (await this.output.evaluate((el) => el.innerHTML)) ?? '';
  }

  async windowSpanCount() {
    return await this.output.locator('.window').count();
  }

  async sumSpanTexts() {
    const count = await this.output.locator('.sum').count();
    const out = [];
    for (let i = 0; i < count; i++) {
      out.push((await this.output.locator('.sum').nth(i).textContent()) ?? '');
    }
    return out;
  }
}

test.describe('Sliding Window Technique Demo - FSM and UI tests', () => {
  // Containers to capture console errors and page errors per test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages of type error to report any runtime issues
    page.on('console', (msg) => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      } catch {
        // ignored
      }
    });

    // Capture uncaught page errors (unhandled exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the application before each test
    const sp = new SlidingPage(page);
    await sp.goto();
  });

  test.afterEach(async ({ page }) => {
    // Assert that no uncaught runtime page errors occurred during the test.
    // If errors exist, include them in the assertion message to aid debugging.
    expect(
      pageErrors.length,
      `Expected no uncaught page errors. Found: ${pageErrors
        .map((e) => (e && e.message) || String(e))
        .join(' | ')}`
    ).toBe(0);

    // Assert that no console.error messages were emitted.
    expect(
      consoleErrors.length,
      `Expected no console.error messages. Found: ${consoleErrors.join(' | ')}`
    ).toBe(0);

    // Small cleanup: attempt to navigate away so any lingering listeners are reset
    await page.goto('about:blank');
  });

  test('Initial state (S0_Idle): page renders initial UI elements', async ({ page }) => {
    // Verify initial page rendering (renderPage on entry)
    // Expect the heading and description to be present and the form inputs to exist
    const sp = new SlidingPage(page);

    // Check that heading from FSM evidence is present
    await expect(sp.heading).toHaveText('Sliding Window Technique Demo');

    // Description presence
    await expect(sp.description).toContainText(
      'Enter an array of numbers and a window size'
    );

    // Inputs and submit button exist and are empty
    await expect(sp.arrayInput).toBeVisible();
    await expect(sp.windowInput).toBeVisible();
    await expect(sp.submitButton).toBeVisible();

    // Output should be initially empty
    const initialOutput = (await sp.output.textContent()) ?? '';
    expect(initialOutput.trim()).toBe('', 'Expected output to be empty in Idle state');
  });

  test('Transition (SubmitForm): submitting valid input moves to ResultsDisplayed (S1_ResultsDisplayed)', async ({ page }) => {
    // This test validates the submit event, the slidingWindowSum computation,
    // the renderResults output formatting, and that the output contains HTML spans.
    const sp = new SlidingPage(page);

    // Provide known input and window size
    await sp.fillArray('2, 1, 5, 2, 3, 2');
    await sp.setWindowSize(3);

    // Submit the form and wait for output change
    await sp.clickSubmitAndWaitForOutputChange('');

    // Verify that output contains expected "Total windows" line and number
    const outputText = await sp.outputText();
    expect(outputText).toContain('Total windows: 4');

    // There should be 4 .window elements (one per number displayed across windows)
    // Each window consists of k span.window elements; we assert counts of window containers
    // Instead of counting the total .window spans for all windows, assert number of windows via "Window X:" occurrences
    expect(outputText).toContain('Window 1:');
    expect(outputText).toContain('Window 4:');

    // Count the .window spans (each displayed number is wrapped in span.window)
    const windowSpanCount = await sp.windowSpanCount();
    // For windows sizes 3 and 4 windows -> total span.window count = 3 * 4 = 12
    expect(windowSpanCount).toBe(12);

    // Check that sum labels exist and have the correct sums for each window
    const sums = await sp.sumSpanTexts(); // e.g. ["Sum: 8", "Sum: 8", "Sum: 10", "Sum: 7"]
    // Normalize and extract numbers
    const numericSums = sums.map((s) => {
      const m = s.match(/Sum:\s*([-\d]+)/);
      return m ? Number(m[1]) : NaN;
    });
    expect(numericSums).toEqual([8, 8, 10, 7]);
  });

  test('Validation: empty array input shows appropriate error message', async ({ page }) => {
    // Edge case where user submits without array numbers: should trigger validation message
    const sp = new SlidingPage(page);

    // Ensure array input is empty and window size is provided
    await sp.fillArray('');
    await sp.setWindowSize(3);

    // Click submit and wait for output change
    await sp.clickSubmitAndWaitForOutputChange('');

    // Expect validation message visible in output area
    const out = await sp.outputText();
    expect(out.trim()).toBe('Please enter a valid array of numbers.');
  });

  test('Validation: invalid window size (too large) shows appropriate error message', async ({ page }) => {
    // Edge case where k > array.length should be handled with a helpful message
    const sp = new SlidingPage(page);

    await sp.fillArray('1 2 3');
    await sp.setWindowSize(5);

    await sp.clickSubmitAndWaitForOutputChange('');

    const out = await sp.outputText();
    expect(out.trim()).toBe(
      'Window size must be a positive integer and less than or equal to the array length.'
    );
  });

  test('Transition on repeated submissions: output is cleared on each new submit (onExit action evidence)', async ({ page }) => {
    // This test validates that before new results are rendered, the output is cleared (the transition's exit action).
    // We perform two submissions and assert the final output does not contain the old output content.

    const sp = new SlidingPage(page);

    // First submit with one dataset
    await sp.fillArray('10,20,30,40');
    await sp.setWindowSize(2);
    await sp.clickSubmitAndWaitForOutputChange('');

    const firstOutput = await sp.outputText();
    expect(firstOutput).toContain('Total windows: 3');
    // Make sure we have a distinctive piece of content to search for
    expect(firstOutput).toContain('Window 1:');

    // Second submit with different data; we record previous HTML and ensure it's not preserved
    await sp.fillArray('1,2,3,4,5');
    await sp.setWindowSize(3);

    const prevHTML = await sp.outputHTML();

    // Click submit and wait for output to change
    await sp.clickSubmitAndWaitForOutputChange(prevHTML);

    const secondOutput = await sp.outputText();

    // The previous HTML should not be present in the new output (output was cleared on exit before rendering)
    expect(secondOutput).not.toContain(prevHTML.trim());

    // New output should reflect the new data (Total windows: 3 for length 5/window 3)
    expect(secondOutput).toContain('Total windows: 3');
  });

  test('RenderResults formatting: output includes HTML spans and preserved markup via innerHTML', async ({ page }) => {
    // Validate that renderResults returns HTML strings and the page injects them using innerHTML,
    // so that .window and .sum spans are present as actual elements (not escaped).
    const sp = new SlidingPage(page);

    await sp.fillArray('4,5,6');
    await sp.setWindowSize(2);
    await sp.clickSubmitAndWaitForOutputChange('');

    // The output should contain .window elements as real DOM nodes, not escaped text
    const windowNodes = sp.output.locator('.window');
    await expect(windowNodes).toHaveCount(4); // windows: [4,5], [5,6] -> 2 windows * 2 elements = 4 spans

    // Verify that .sum spans are present and contain "Sum:"
    const sumNodes = sp.output.locator('.sum');
    await expect(sumNodes).toHaveCount(2);
    await expect(sumNodes.first()).toContainText('Sum: 9');
  });
});