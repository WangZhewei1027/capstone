import { test, expect } from '@playwright/test';

// Test file: 1da0f494-cd2f-11f0-a440-159d7b77af86-selection-sort.spec.js
// Tests for Selection Sort Visualization application
// Application URL: http://127.0.0.1:5500/workspace/html2test/html/1da0f494-cd2f-11f0-a440-159d7b77af86.html

// Page object model for the selection sort page
class SelectionSortPage {
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/html2test/html/1da0f494-cd2f-11f0-a440-159d7b77af86.html';
    this.startButton = page.locator('button', { hasText: 'Start Selection Sort' });
    this.arraySpans = page.locator('#array span');
    this.heading = page.locator('h1');
  }

  // Navigate to the page
  async goto() {
    await this.page.goto(this.url);
  }

  // Click the Start Selection Sort button
  async clickStart() {
    await this.startButton.click();
  }

  // Return the array values currently shown as numbers (array of numbers)
  async getArrayValues() {
    const texts = await this.arraySpans.allTextContents();
    // Trim and convert to numbers; filter out any empty entries
    return texts.map(t => t.trim()).filter(t => t.length > 0).map(Number);
  }

  // Return the style attribute of the span at given index (or null if not exist)
  async getSpanStyleAttribute(index) {
    const count = await this.arraySpans.count();
    if (index < 0 || index >= count) return null;
    return await this.arraySpans.nth(index).getAttribute('style');
  }

  // Wait until the span at `index` has style attribute containing `color:red`
  async waitForHighlightAt(index, timeout = 2500) {
    await this.page.waitForFunction(
      idx => {
        const spans = Array.from(document.querySelectorAll('#array span'));
        if (!spans[idx]) return false;
        const attr = spans[idx].getAttribute('style') || '';
        return attr.includes('red');
      },
      index,
      { timeout }
    );
  }

  // Wait until no span has a style that includes 'red' (i.e., no highlight)
  async waitForNoHighlight(timeout = 3000) {
    await this.page.waitForFunction(
      () => {
        const spans = Array.from(document.querySelectorAll('#array span'));
        return spans.every(s => {
          const attr = s.getAttribute('style') || '';
          return !attr.includes('red');
        });
      },
      { timeout }
    );
  }

  // Wait until the displayed array equals expected array (element-wise)
  async waitForArrayValues(expected, timeout = 2500) {
    await this.page.waitForFunction(
      expectedArr => {
        const spans = Array.from(document.querySelectorAll('#array span'));
        const values = spans.map(s => Number(s.textContent.trim()));
        if (values.length !== expectedArr.length) return false;
        for (let i = 0; i < values.length; i++) {
          if (values[i] !== expectedArr[i]) return false;
        }
        return true;
      },
      expected,
      { timeout }
    );
  }
}

test.describe('Selection Sort Visualization - Integration Tests', () => {
  let pageErrors;
  let consoleMessages;

  // Each test will create a fresh page via Playwright fixture `page`.
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', err => {
      // store message for assertions later
      pageErrors.push(String(err && err.message ? err.message : err));
    });

    // Capture console messages for inspection (info, error, warn, log)
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
  });

  test.describe('Initial Page Load and Static UI', () => {
    test('should load the page and display the initial unsorted array', async ({ page }) => {
      // Purpose: Verify initial page load, heading, button visibility and initial array content.
      const app = new SelectionSortPage(page);
      await app.goto();

      // Check page title and heading are present
      await expect(page).toHaveTitle(/Selection Sort Visualization/);
      await expect(app.heading).toBeVisible();
      await expect(app.heading).toHaveText('Selection Sort Visualization');

      // Button should be visible and enabled
      await expect(app.startButton).toBeVisible();
      await expect(app.startButton).toBeEnabled();

      // The array should initially display 5 elements: 64 25 12 22 11
      const initialValues = await app.getArrayValues();
      expect(initialValues).toEqual([64, 25, 12, 22, 11]);

      // No element should be highlighted initially (no inline style containing 'red')
      const count = await app.arraySpans.count();
      for (let i = 0; i < count; i++) {
        const style = await app.getSpanStyleAttribute(i);
        // style may be 'color:black' as set by the script
        expect(style).toBeTruthy();
        expect(style.includes('red')).toBeFalsy();
      }

      // Assert that there were no uncaught page errors on load
      expect(pageErrors).toHaveLength(0);
    });
  });

  test.describe('Sorting Interaction and Visual State Transitions', () => {
    test('should perform selection sort with correct swaps and highlights step-by-step', async ({ page }) => {
      // Purpose: Click the Start button and verify the array updates and highlighted index at each step.
      const app = new SelectionSortPage(page);
      await app.goto();

      // Start sorting. Note: first step's display happens synchronously in the function,
      // subsequent steps occur every 1 second via setTimeout.
      await app.clickStart();

      // Immediately after clicking, first step has already executed (i=0).
      // Expect array: [11, 25, 12, 22, 64], highlight at index 0.
      await app.waitForArrayValues([11, 25, 12, 22, 64], 500);
      await app.waitForHighlightAt(0, 500);
      let style0 = await app.getSpanStyleAttribute(0);
      expect(style0).toContain('red');

      // Next step (after ~1s): expect [11, 12, 25, 22, 64], highlight at index 1.
      await app.waitForArrayValues([11, 12, 25, 22, 64], 2500);
      await app.waitForHighlightAt(1, 2500);
      let style1 = await app.getSpanStyleAttribute(1);
      expect(style1).toContain('red');

      // Next step (after ~2s): expect [11, 12, 22, 25, 64], highlight at index 2.
      await app.waitForArrayValues([11, 12, 22, 25, 64], 2500);
      await app.waitForHighlightAt(2, 2500);
      let style2 = await app.getSpanStyleAttribute(2);
      expect(style2).toContain('red');

      // Next step (after ~3s): expect [11, 12, 22, 25, 64], highlight at index 3 (no actual swap on this step)
      await app.waitForArrayValues([11, 12, 22, 25, 64], 2500);
      await app.waitForHighlightAt(3, 2500);
      let style3 = await app.getSpanStyleAttribute(3);
      expect(style3).toContain('red');

      // After the final timeout (~4s from start), the algorithm displays the final array with no highlight.
      await app.waitForNoHighlight(3000);
      // Final array should be sorted ascending
      const finalValues = await app.getArrayValues();
      expect(finalValues).toEqual([11, 12, 22, 25, 64]);

      // Ensure no uncaught page errors occurred during the interactive session
      expect(pageErrors).toHaveLength(0);
    });

    test('should allow restarting the visualization by clicking Start again after completion', async ({ page }) => {
      // Purpose: Verify that clicking Start after the sort has finished restarts the visualization.
      const app = new SelectionSortPage(page);
      await app.goto();

      // First run: allow the whole sort to finish
      await app.clickStart();
      await app.waitForNoHighlight(7000); // wait enough time for the full sequence to complete

      const afterFirstRun = await app.getArrayValues();
      expect(afterFirstRun).toEqual([11, 12, 22, 25, 64]);

      // Click Start again to restart; the code uses the original const array as source,
      // so the first step should immediately swap to [11,25,12,22,64] with highlight at 0 again.
      await app.clickStart();

      // Immediately expect the first step of the restarted run
      await app.waitForArrayValues([11, 25, 12, 22, 64], 500);
      await app.waitForHighlightAt(0, 500);
      const style0 = await app.getSpanStyleAttribute(0);
      expect(style0).toContain('red');

      // Clean up: wait until sorting completes again
      await app.waitForNoHighlight(7000);

      // Ensure no uncaught page errors or console errors that are fatal occurred
      expect(pageErrors).toHaveLength(0);
    });
  });

  test.describe('Edge cases, accessibility and robustness', () => {
    test('should have accessible start button and no runtime exceptions when clicking multiple times quickly', async ({ page }) => {
      // Purpose: Verify the Start button is reachable/usable and that multiple rapid clicks do not throw errors.
      const app = new SelectionSortPage(page);
      await app.goto();

      // Ensure button has accessible name (text)
      await expect(app.startButton).toHaveText('Start Selection Sort');

      // Rapidly click the Start button multiple times to create overlapping timers
      // We do this to ensure the page doesn't crash or throw uncaught exceptions.
      await Promise.all([
        app.clickStart(),
        app.clickStart(),
        app.clickStart()
      ]);

      // Allow a reasonable amount of time for multiple asynchronous steps to play out
      await app.waitForNoHighlight(8000);

      // Check that the array ends up sorted at the end (sorted state should be same despite multiple clicks)
      const finalValues = await app.getArrayValues();
      expect(finalValues).toEqual([11, 12, 22, 25, 64]);

      // Assert no uncaught page errors occurred
      expect(pageErrors).toHaveLength(0);

      // Optionally assert there were console messages but none of type 'error' with fatal stack traces
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length).toBeLessThan(2); // typically should be 0; allow <2 in case of non-fatal warnings
    });
  });
});