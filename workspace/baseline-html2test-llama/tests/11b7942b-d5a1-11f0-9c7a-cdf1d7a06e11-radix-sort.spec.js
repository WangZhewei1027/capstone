import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b7942b-d5a1-11f0-9c7a-cdf1d7a06e11.html';

// Page object representing the Radix Sort demo page.
// Encapsulates selectors and common interactions to keep tests organized.
class RadixSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.container = '.container';
    this.heading = 'h2';
    this.paragraphs = 'p';
    this.pre = 'pre';
  }

  // Navigate to the application URL and wait for load.
  async navigate() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  // Get the main heading text.
  async getHeadingText() {
    return this.page.textContent(this.heading);
  }

  // Get the text content of the first paragraph.
  async getFirstParagraphText() {
    return this.page.textContent(`${this.paragraphs}:nth-of-type(1)`);
  }

  // Get the text content of the second paragraph.
  async getSecondParagraphText() {
    return this.page.textContent(`${this.paragraphs}:nth-of-type(2)`);
  }

  // Get the raw text inside the <pre> block (expected to contain the script snippet).
  async getPreText() {
    return this.page.textContent(this.pre);
  }

  // Determine if any interactive controls (inputs, buttons, selects, forms, textareas) exist.
  async hasInteractiveControls() {
    const selectors = ['button', 'input', 'select', 'form', 'textarea'];
    for (const sel of selectors) {
      const count = await this.page.locator(sel).count();
      if (count > 0) return true;
    }
    return false;
  }
}

test.describe('Radix Sort interactive demo (static snippet)', () => {
  // Basic smoke test: confirm the page loads and static content is present.
  test('Page loads and displays expected static content', async ({ page }) => {
    const radixPage = new RadixSortPage(page);

    // Navigate to the page
    await radixPage.navigate();

    // Verify the main heading is present and correct
    const heading = await radixPage.getHeadingText();
    expect(heading).toBeTruthy();
    expect(heading.trim()).toBe('Radix Sort');

    // Verify explanatory paragraphs are visible and contain expected phrases
    const p1 = await radixPage.getFirstParagraphText();
    expect(p1).toBeTruthy();
    expect(p1).toContain('Radix sort is a non-comparative sorting algorithm');

    const p2 = await radixPage.getSecondParagraphText();
    expect(p2).toBeTruthy();
    expect(p2).toContain("Here's a simple implementation in JavaScript");

    // Verify the <pre> contains the script snippet and function name
    const preText = await radixPage.getPreText();
    expect(preText).toBeTruthy();
    expect(preText).toContain('function radixSort');
    expect(preText).toContain('const arr = [170, 45, 75, 90, 802, 24, 2, 66]');
  });

  // There are no interactive controls in the provided HTML; assert that fact.
  test('No interactive controls exist on the page (buttons, inputs, forms, selects, textareas)', async ({ page }) => {
    const radixPage1 = new RadixSortPage(page);
    await radixPage.navigate();

    // Assert that the page contains no interactive elements.
    const hasControls = await radixPage.hasInteractiveControls();
    expect(hasControls).toBe(false);
  });

  // This test focuses on observing console and page errors that arise from executing
  // the inline script snippet. We attach listeners before navigation so we capture
  // runtime errors emitted during initial load.
  test('Runtime errors from the embedded script are captured via pageerror/console', async ({ page }) => {
    // Arrays to collect events
    /** @type {import('@playwright/test').ConsoleMessage[]} */
    const consoleMessages = [];
    /** @type {Error[]} */
    const pageErrors = [];

    // Capture console events (log, error, etc.)
    page.on('console', (msg) => {
      consoleMessages.push(msg);
    });

    // Capture uncaught errors on the page
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate and allow scripts to run
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Give a short grace period for any asynchronous errors to surface
    await page.waitForTimeout(200);

    // Assert that at least one page error (runtime exception) was reported.
    // The provided script logic is flawed and is expected to throw a TypeError
    // when attempting to call .reduce on undefined buckets.
    expect(pageErrors.length).toBeGreaterThan(0);

    // Verify that one of the captured errors appears to be a TypeError related to reduce/undefined.
    const errorMessages = pageErrors.map((e) => (e && e.message) || String(e));
    const matchedError = errorMessages.find((m) => /TypeError|reduce|Cannot read|undefined/.test(m));
    expect(matchedError).toBeTruthy();

    // Additionally assert that the console contains an 'error' message (if emitted).
    const errorConsoleMsgs = consoleMessages.filter((m) => m.type() === 'error' || /TypeError|reduce|Cannot read|undefined/.test(m.text()));
    expect(errorConsoleMsgs.length).toBeGreaterThan(0);

    // Confirm that the example's console.log of "Sorted array:" was not successfully logged due to the runtime error.
    const sortedArrayLogs = consoleMessages.filter((m) => m.type() === 'log' && m.text().includes('Sorted array'));
    expect(sortedArrayLogs.length).toBe(0);
  });

  // This test asserts that the script is present in the DOM but that its behavior is not interactive.
  test('Script snippet is present in the page source but does not add interactive UI elements', async ({ page }) => {
    const radixPage2 = new RadixSortPage(page);

    // Navigate to the page
    await radixPage.navigate();

    // The script is included as a visible code block (<pre>), ensure it is present.
    const preText1 = await radixPage.getPreText();
    expect(preText).toContain('function radixSort');
    // Ensure that despite the script text being present, there are no dynamically added controls.
    const anyButton = await page.locator('button').count();
    const anyInput = await page.locator('input').count();
    const anyForm = await page.locator('form').count();
    expect(anyButton).toBe(0);
    expect(anyInput).toBe(0);
    expect(anyForm).toBe(0);
  });

  // Edge-case test: verify that the page is accessible by checking heading role and that main content is visible.
  test('Accessibility and visibility checks: heading and container are visible', async ({ page }) => {
    const radixPage3 = new RadixSortPage(page);
    await radixPage.navigate();

    // Ensure the main container is visible
    const containerVisible = await page.isVisible(radixPage.container);
    expect(containerVisible).toBe(true);

    // Ensure the primary heading is visible and has correct semantics
    const headingVisible = await page.isVisible(radixPage.heading);
    expect(headingVisible).toBe(true);
    const headingText = await radixPage.getHeadingText();
    expect(headingText.trim()).toBe('Radix Sort');
  });
});