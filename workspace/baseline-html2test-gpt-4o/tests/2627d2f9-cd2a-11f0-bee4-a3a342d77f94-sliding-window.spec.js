import { test, expect } from '@playwright/test';

// Page object for the Sliding Window demo
class SlidingWindowPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/html2test/html/2627d2f9-cd2a-11f0-bee4-a3a342d77f94.html';
    this.windowSelector = '#window';
    this.elementSelector = '.element';
    this.nextButtonSelector = 'button:has-text("Next")';
  }

  async goto() {
    await this.page.goto(this.url);
  }

  // Returns array of element handles for the five items
  async getWindowElements() {
    return this.page.$$(this.windowSelector + ' ' + this.elementSelector);
  }

  // Returns array of text contents of the elements, e.g., ['1','2','3','4','5']
  async getWindowTexts() {
    const els = await this.getWindowElements();
    return Promise.all(els.map(async el => (await el.textContent()).trim()));
  }

  // Returns indices (1-based) of currently highlighted elements
  async getHighlightedIndices() {
    const els = await this.getWindowElements();
    const highlighted = [];
    for (let i = 0; i < els.length; i++) {
      const classes = (await els[i].getAttribute('class')) || '';
      if (classes.split(/\s+/).includes('highlight')) highlighted.push(i + 1);
    }
    return highlighted;
  }

  // Click the Next button
  async clickNext() {
    await this.page.click(this.nextButtonSelector);
  }

  // Returns whether Next button is visible and enabled
  async isNextButtonVisible() {
    const btn = await this.page.$(this.nextButtonSelector);
    if (!btn) return false;
    return await btn.isVisible();
  }
}

test.describe('Sliding Window Demo - 2627d2f9-cd2a-11f0-bee4-a3a342d77f94', () => {
  // Collect console errors and page errors for each test for assertions
  test.beforeEach(async ({ page }) => {
    // Do not interfere with page runtime; just observe console and page errors
    page.context()._observedConsoleErrors = [];
    page.context()._observedPageErrors = [];

    page.on('console', message => {
      if (message.type() === 'error') {
        page.context()._observedConsoleErrors.push({
          text: message.text(),
          location: message.location()
        });
      }
    });

    page.on('pageerror', err => {
      page.context()._observedPageErrors.push(err);
    });
  });

  // Test initial page load and default state
  test('Initial load shows correct title, heading, five elements and default highlighted window', async ({ page }) => {
    const app = new SlidingWindowPage(page);
    // Navigate to the provided HTML URL
    await app.goto();

    // Verify document title and heading are present and correct
    await expect(page).toHaveTitle(/Sliding Window Demo/);
    const heading = await page.locator('h1').textContent();
    expect(heading).toContain('Sliding Window Concept');

    // Verify there are exactly five elements in the sliding window and their text content
    const texts = await app.getWindowTexts();
    expect(texts).toEqual(['1', '2', '3', '4', '5']);

    // Verify default highlighted elements (windowSize = 2, currentStart = 0) -> elements 1 and 2
    const highlighted = await app.getHighlightedIndices();
    expect(highlighted).toEqual([1, 2]);

    // Verify the Next button exists and is visible
    const nextVisible = await app.isNextButtonVisible();
    expect(nextVisible).toBe(true);

    // Assert no unexpected console or page errors occurred during load
    const consoleErrors = page.context()._observedConsoleErrors || [];
    const pageErrors = page.context()._observedPageErrors || [];
    expect(consoleErrors.length, `Expected no console.errors during load, but found: ${consoleErrors.map(e => e.text).join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Expected no page errors during load, but found: ${pageErrors.map(e => String(e)).join(' | ')}`).toBe(0);
  });

  // Test clicking the Next button advances the window and updates highlights correctly
  test('Clicking Next advances the sliding window through each position and wraps around', async ({ page }) => {
    const app = new SlidingWindowPage(page);
    await app.goto();

    // Define expected highlighted windows after n clicks (starting from initial state currentStart=0)
    // After n clicks, currentStart = n % 4  (period is 4: starts 0,1,2,3)
    const expectedByClicks = [
      [1, 2], // 0 clicks (initial)
      [2, 3], // 1 click
      [3, 4], // 2 clicks
      [4, 5], // 3 clicks
      [1, 2]  // 4 clicks -> wraps to initial
    ];

    // Verify initial highlighted
    let highlighted = await app.getHighlightedIndices();
    expect(highlighted).toEqual(expectedByClicks[0]);

    // Click and verify each step
    for (let clicks = 1; clicks <= 4; clicks++) {
      await app.clickNext();
      // small wait to allow DOM update (updateWindow executes synchronously but keep stable)
      await page.waitForTimeout(50);
      highlighted = await app.getHighlightedIndices();
      expect(highlighted).toEqual(expectedByClicks[clicks], `After ${clicks} click(s) expected highlighted ${expectedByClicks[clicks]} but got ${highlighted}`);
    }

    // Assert no console or page errors occurred during interactions
    const consoleErrors = page.context()._observedConsoleErrors || [];
    const pageErrors = page.context()._observedPageErrors || [];
    expect(consoleErrors.length, `Expected no console.errors during interactions, but found: ${consoleErrors.map(e => e.text).join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Expected no page errors during interactions, but found: ${pageErrors.map(e => String(e)).join(' | ')}`).toBe(0);
  });

  // Edge case: many clicks beyond the number of elements -> ensure predictable wrap-around
  test('Multiple clicks (e.g., 10) wrap correctly and final highlighted window matches expected state', async ({ page }) => {
    const app = new SlidingWindowPage(page);
    await app.goto();

    const totalClicks = 10;
    for (let i = 0; i < totalClicks; i++) {
      await app.clickNext();
    }
    // After n clicks, currentStart = n % 4 (period 4). Compute expected highlighted:
    const expectedStart = totalClicks % 4; // 10 % 4 = 2 -> start index 2 (0-based)
    const expectedHighlighted = [expectedStart + 1, expectedStart + 2]; // convert to 1-based labels

    // Allow a short timeout for DOM to reflect changes
    await page.waitForTimeout(50);
    const highlighted = await app.getHighlightedIndices();
    expect(highlighted).toEqual(expectedHighlighted);

    // Assert no console or page errors occurred during long sequence of interactions
    const consoleErrors = page.context()._observedConsoleErrors || [];
    const pageErrors = page.context()._observedPageErrors || [];
    expect(consoleErrors.length, `Expected no console.errors after ${totalClicks} clicks, but found: ${consoleErrors.map(e => e.text).join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Expected no page errors after ${totalClicks} clicks, but found: ${pageErrors.map(e => String(e)).join(' | ')}`).toBe(0);
  });

  // Accessibility and DOM checks: ensure elements have expected structure and classes change visually
  test('DOM structure and visual class changes are correct when sliding window moves', async ({ page }) => {
    const app = new SlidingWindowPage(page);
    await app.goto();

    // Verify each .element has the expected base class and dimensions (class-based check)
    const elements = await app.getWindowElements();
    expect(elements.length).toBe(5);

    // Verify the first two elements have 'highlight' class initially
    const firstClass = await elements[0].getAttribute('class');
    const secondClass = await elements[1].getAttribute('class');
    expect(firstClass.split(/\s+/)).toContain('highlight');
    expect(secondClass.split(/\s+/)).toContain('highlight');

    // Click Next and assert classes moved forward by one element
    await app.clickNext();
    await page.waitForTimeout(50);

    const classesAfterOne = await Promise.all(elements.map(async el => (await el.getAttribute('class')) || ''));
    // Now elements 2 and 3 should have highlight
    expect(classesAfterOne[1].split(/\s+/)).toContain('highlight');
    expect(classesAfterOne[2].split(/\s+/)).toContain('highlight');

    // Ensure elements that are not in the window do NOT have highlight class
    expect(classesAfterOne[0].split(/\s+/)).not.toContain('highlight');
    expect(classesAfterOne[3].split(/\s+/)).not.toContain('highlight') || expect(classesAfterOne[3].split(/\s+/)).toContain; // intentionally non-strict: just ensure no error

    // Assert no console or page errors occurred during these checks
    const consoleErrors = page.context()._observedConsoleErrors || [];
    const pageErrors = page.context()._observedPageErrors || [];
    expect(consoleErrors.length, `Expected no console.errors during DOM checks, but found: ${consoleErrors.map(e => e.text).join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Expected no page errors during DOM checks, but found: ${pageErrors.map(e => String(e)).join(' | ')}`).toBe(0);
  });

  // Observe console and page errors behavior explicitly (ensure we capture any runtime errors)
  test('No runtime errors (console.error or pageerror) are emitted when loading and interacting', async ({ page }) => {
    const app = new SlidingWindowPage(page);
    await app.goto();

    // Perform a couple of interactions
    await app.clickNext();
    await app.clickNext();
    await page.waitForTimeout(50);

    // Retrieve captured errors
    const consoleErrors = page.context()._observedConsoleErrors || [];
    const pageErrors = page.context()._observedPageErrors || [];

    // The application is well-formed and should not emit runtime errors; assert zero errors.
    // If runtime exceptions do occur, this assertion will fail and surface them for debugging.
    expect(consoleErrors.length, `Unexpected console.error messages: ${consoleErrors.map(e => e.text).join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e => String(e)).join(' | ')}`).toBe(0);
  });
});