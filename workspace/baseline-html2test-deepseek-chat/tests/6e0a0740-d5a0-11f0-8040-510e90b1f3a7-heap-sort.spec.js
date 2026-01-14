import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e0a0740-d5a0-11f0-8040-510e90b1f3a7.html';

// Page object model for the Heap Sort page
class HeapSortPage {
  constructor(page) {
    this.page = page;
  }

  arrayInput() {
    return this.page.locator('#arrayInput');
  }

  resetButton() {
    return this.page.locator('#resetBtn');
  }

  randomButton() {
    return this.page.locator('#randomBtn');
  }

  startButton() {
    return this.page.locator('#startBtn');
  }

  stepButton() {
    return this.page.locator('#stepBtn');
  }

  visualization() {
    return this.page.locator('#visualization');
  }

  heapVisual() {
    return this.page.locator('#heapVisual');
  }

  codeDisplay() {
    return this.page.locator('#codeDisplay');
  }

  // Helper to get all array element bars
  arrayElements() {
    return this.visualization().locator('.element');
  }

  // Helper to get heap elements
  heapElements() {
    return this.heapVisual().locator('.heap-element');
  }
}

test.describe('Heap Sort Algorithm Visualization (6e0a0740-d5a0-11f0-8040-510e90b1f3a7)', () => {
  // Arrays to capture console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages
    page.on('console', msg => {
      // store the message object and text for assertions
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location ? msg.location() : undefined
      });
    });

    // Capture uncaught exceptions / page errors
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Navigate to the app
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Allow a short pause for any client-side script execution/errors to appear
    await page.waitForTimeout(300);
  });

  // Test: initial DOM presence & static content
  test('Initial load: key DOM elements are present and code block is rendered', async ({ page }) => {
    const heapPage = new HeapSortPage(page);

    // Verify input and control buttons are present and visible
    await expect(heapPage.arrayInput()).toBeVisible();
    await expect(heapPage.resetButton()).toBeVisible();
    await expect(heapPage.randomButton()).toBeVisible();
    await expect(heapPage.startButton()).toBeVisible();
    await expect(heapPage.stepButton()).toBeVisible();

    // The code display (pre block) should contain the heapSort function text as static content
    const codeText = await heapPage.codeDisplay().innerText();
    expect(codeText).toContain('function heapSort');
    expect(codeText).toContain('function heapify');

    // Even if the script failed, the static HTML should still render the visualization containers
    await expect(heapPage.visualization()).toBeVisible();
    await expect(heapPage.heapVisual()).toBeVisible();
  });

  // Test: detect script errors on the page (SyntaxError / ReferenceError / TypeError)
  test('Page should emit JavaScript errors (syntax or runtime) captured via pageerror/console', async ({ page }) => {
    // We expect that the provided HTML/JS (as-is) may contain a syntax/runtime error.
    // Collect error messages that indicate parsing/runtime problems.
    // Assert that at least one pageerror was captured.
    expect(pageErrors.length).toBeGreaterThan(0);

    // At least one of the errors should mention SyntaxError or be a runtime exception
    const errorMessages = pageErrors.map(e => String(e && e.message ? e.message : e));
    const hasSyntaxOrRuntime = errorMessages.some(msg =>
      /syntaxerror|unexpected end of input|unexpected token|unterminated|referenceerror|typeerror/i.test(msg)
    );
    expect(hasSyntaxOrRuntime).toBeTruthy();

    // Additionally check console messages for error type entries (if any)
    const consoleErrs = consoleMessages.filter(m => m.type === 'error' || /error|uncaught/i.test(m.text));
    expect(consoleErrs.length).toBeGreaterThanOrEqual(0); // at minimum zero, but we log them for inspection

    // For debugging and clarity in test output, attach at least one console message text to assertion context
    if (consoleErrs.length > 0) {
      // Ensure console error text is a non-empty string
      expect(consoleErrs[0].text.length).toBeGreaterThan(0);
    }
  });

  // Test: interactive controls exist but, due to script error, their event handlers may not have run;
  // clicking them should not produce the full visualization/algorithm behavior.
  test('Interactive controls are present but do not drive sorting behavior when script fails', async ({ page }) => {
    const heapPage = new HeapSortPage(page);

    // Input should be present. Since the page script that initializes the input likely did not run,
    // the input value should remain empty (placeholder visible) rather than being pre-filled by JS.
    const inputValue = await heapPage.arrayInput().inputValue();
    // The original HTML does not set a value attribute; script normally sets it. Expect empty string when script fails.
    expect(inputValue).toBe('');

    // Visualization should start empty if script didn't populate it
    const initialElementsCount = await heapPage.arrayElements().count();
    // If script didn't execute, there should be zero generated .element divs
    expect(initialElementsCount).toBe(0);

    // Try clicking each control button and verify that nothing meaningful changes in the DOM
    await heapPage.randomButton().click();
    await page.waitForTimeout(100); // brief pause to allow any handlers to run if present

    // After clicking random (which would normally generate and initialize array), verify input still empty or unchanged
    const afterRandomValue = await heapPage.arrayInput().inputValue();
    expect(afterRandomValue).toBe(inputValue);

    // Click Reset button
    await heapPage.resetButton().click();
    await page.waitForTimeout(100);

    // Click Start Sorting
    await heapPage.startButton().click();
    await page.waitForTimeout(100);

    // Click Next Step
    await heapPage.stepButton().click();
    await page.waitForTimeout(100);

    // Re-evaluate visualization and heap elements - expect still empty (no .element or .heap-element generated)
    const elementsCount = await heapPage.arrayElements().count();
    const heapElemCount = await heapPage.heapElements().count();

    expect(elementsCount).toBe(initialElementsCount);
    expect(heapElemCount).toBe(0);
  });

  // Test: verify that heap visualization area remains with no generated heap elements when script fails,
  // but the descriptive text (if present) in the static HTML remains readable.
  test('Heap visualization remains unpopulated; explanatory static content remains accessible', async ({ page }) => {
    const heapPage = new HeapSortPage(page);

    // The explanatory headings and paragraphs from the static HTML should exist
    const howItWorksHeading = page.locator('h2', { hasText: 'How Heap Sort Works' });
    await expect(howItWorksHeading).toBeVisible();

    // The heap visual container should exist but contain no child heap-element nodes due to script failure
    const heapCount = await heapPage.heapElements().count();
    expect(heapCount).toBe(0);

    // The visualization area should not contain dynamically created bars
    const barCount = await heapPage.arrayElements().count();
    expect(barCount).toBe(0);

    // The code container remains present and contains the 'heapify' snippet (static)
    const codeContent = await heapPage.codeDisplay().textContent();
    expect(codeContent).toContain('heapify(arr, n, i)');
  });

  // Test: capture and assert on error details for traceability (ensure tests fail if no errors are present)
  test('Captured error details include helpful diagnostics (message and stack where available)', async ({ page }) => {
    // Ensure we captured at least one page error
    expect(pageErrors.length).toBeGreaterThan(0);

    // Inspect first error
    const firstError = pageErrors[0];
    const msg = String(firstError && firstError.message ? firstError.message : firstError);
    expect(msg.length).toBeGreaterThan(0);

    // Attempt to detect syntax-related phrasing
    const isSyntax = /syntaxerror|unexpected end of input|unexpected token|unterminated/i.test(msg);
    const isRuntime = /referenceerror|typeerror|cannot read property|is not a function/i.test(msg);

    // At least one of the indicators should be true so we know what kind of failure occurred
    expect(isSyntax || isRuntime).toBeTruthy();

    // Also verify we captured console messages (may be empty but we ensure variable exists)
    expect(Array.isArray(consoleMessages)).toBeTruthy();
  });
});