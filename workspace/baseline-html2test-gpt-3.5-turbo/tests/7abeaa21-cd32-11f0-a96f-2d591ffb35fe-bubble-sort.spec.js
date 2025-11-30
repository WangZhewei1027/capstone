import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abeaa21-cd32-11f0-a96f-2d591ffb35fe.html';

// Page Object model for the Bubble Sort page
class BubbleSortPage {
  constructor(page) {
    this.page = page;
    this.arrayInput = page.locator('#arrayInput');
    this.sortButton = page.locator('#sortButton');
    this.arrayContainer = page.locator('#arrayContainer');
    this.output = page.locator('#output');
    this.speedRange = page.locator('#speedRange');
    this.speedValue = page.locator('#speedValue');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async getTitle() {
    return this.page.title();
  }

  async getArrayInputValue() {
    return this.arrayInput.inputValue();
  }

  async setArrayInputValue(value) {
    await this.arrayInput.fill(value);
  }

  async clickStart() {
    await this.sortButton.click();
  }

  async isStartDisabled() {
    return this.sortButton.isDisabled();
  }

  async setSpeedValue(ms) {
    // Set the range input value and dispatch input event to update UI
    await this.speedRange.evaluate((el, v) => {
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, String(ms));
  }

  async getSpeedDisplay() {
    return this.speedValue.textContent();
  }

  async getBars() {
    return this.page.$$eval('#arrayContainer .bar', bars =>
      bars.map(b => {
        // Primary numeric content is in the textContent of the bar (and a span below)
        const text = b.textContent.trim();
        // Determine classes
        const classes = Array.from(b.classList);
        return { text, classes };
      })
    );
  }

  async getBarValues() {
    return this.page.$$eval('#arrayContainer .bar', bars =>
      bars.map(b => {
        // textContent contains label text; parse first number occurrence
        const txt = b.textContent || '';
        const m = txt.match(/-?\d+(\.\d+)?/);
        return m ? Number(m[0]) : null;
      })
    );
  }

  async getOutputText() {
    return this.output.textContent();
  }
}

test.describe('Bubble Sort Visualization - 7abeaa21-cd32-11f0-a96f-2d591ffb35fe', () => {
  // Collect console errors and page errors per test to assert stability
  test.beforeEach(async ({ page }) => {
    // No-op here; individual tests will set up the page object and listeners
  });

  test.describe('Initial load and UI controls', () => {
    // Test initial page load and default state
    test('Initial load shows expected controls, default input, and rendered bars', async ({ page }) => {
      const consoleErrors = [];
      const pageErrors = [];

      // Capture console error messages and page errors
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', err => {
        pageErrors.push(err.message);
      });

      const p = new BubbleSortPage(page);
      await p.goto();

      // Check page title
      const title = await p.getTitle();
      expect(title).toContain('Bubble Sort Visualization');

      // Check default array input value is populated with example
      const inputVal = await p.getArrayInputValue();
      expect(inputVal).toBe('5,3,8,4,2,7,1,6');

      // Speed display should reflect default 500 ms
      const speedText = await p.getSpeedDisplay();
      expect(speedText.trim()).toBe('500 ms');

      // Sort button should be enabled initially
      expect(await p.isStartDisabled()).toBe(false);

      // There should be 8 bars rendered for the 8 numbers
      const barValues = await p.getBarValues();
      expect(barValues.length).toBe(8);
      // Ensure each bar has a numeric value matching the input sequence
      expect(barValues).toEqual([5, 3, 8, 4, 2, 7, 1, 6]);

      // No console or page errors on initial load
      expect(consoleErrors, 'No console.errors during initial load').toEqual([]);
      expect(pageErrors, 'No page errors during initial load').toEqual([]);
    });
  });

  test.describe('Interactive controls and sorting behavior', () => {
    test('Speed control updates the visible label when changed', async ({ page }) => {
      const consoleErrors1 = [];
      page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
      const p1 = new BubbleSortPage(page);
      await p.goto();

      // Change speed to 150 ms and verify UI update
      await p.setSpeedValue(150);
      expect(await p.getSpeedDisplay()).toBe('150 ms');

      // Change speed to minimal 50 ms (fast)
      await p.setSpeedValue(50);
      expect(await p.getSpeedDisplay()).toBe('50 ms');

      expect(consoleErrors).toEqual([]);
    });

    test('Clicking Start sorts the array visually and outputs completion', async ({ page }) => {
      const consoleErrors2 = [];
      const pageErrors1 = [];
      page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
      page.on('pageerror', err => pageErrors.push(err.message));

      const p2 = new BubbleSortPage(page);
      await p.goto();

      // Speed up animation for test
      await p.setSpeedValue(50);

      // Start sorting
      await p.clickStart();

      // Immediately after starting, controls should be disabled
      expect(await p.isStartDisabled()).toBe(true);

      // Wait for the output to indicate sorting completion
      await page.waitForFunction(() => {
        const o = document.querySelector('#output');
        return o && o.textContent.includes('Array is fully sorted!');
      }, null, { timeout: 20000 });

      // After completion, controls should be re-enabled
      expect(await p.isStartDisabled()).toBe(false);

      // Final output should contain the completion message
      const finalOutput = await p.getOutputText();
      expect(finalOutput).toContain('Array is fully sorted!');

      // Final bar values should be sorted ascending
      const finalBarValues = await p.getBarValues();
      const sorted = [...finalBarValues].sort((a, b) => a - b);
      expect(finalBarValues).toEqual(sorted);

      // All bars should have the 'sorted' class
      const bars = await p.getBars();
      for (const b of bars) {
        expect(b.classes).toContain('sorted');
      }

      // Ensure no runtime errors occurred
      expect(consoleErrors, 'No console.errors during sorting run').toEqual([]);
      expect(pageErrors, 'No page errors during sorting run').toEqual([]);
    }, 30000);

    test('Invalid input triggers an alert and sorting does not start', async ({ page }) => {
      const consoleErrors3 = [];
      page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

      const p3 = new BubbleSortPage(page);
      await p.goto();

      // Prepare to capture the dialog
      const dialogs = [];
      page.on('dialog', async dialog => {
        dialogs.push({ message: dialog.message(), type: dialog.type() });
        await dialog.dismiss();
      });

      // Enter invalid input
      await p.setArrayInputValue('a,b');

      // Click start - should show alert
      await p.clickStart();

      // Wait briefly for the dialog to be captured
      await page.waitForTimeout(200);

      expect(dialogs.length).toBeGreaterThan(0);
      expect(dialogs[0].message).toBe('Please enter a valid list of numbers separated by commas.');
      // Ensure the sort button wasn't disabled (sorting did not proceed)
      expect(await p.isStartDisabled()).toBe(false);

      expect(consoleErrors).toEqual([]);
    });

    test('Empty input triggers an alert and no sorting occurs', async ({ page }) => {
      const consoleErrors4 = [];
      page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

      const p4 = new BubbleSortPage(page);
      await p.goto();

      const dialogs1 = [];
      page.on('dialog', async dialog => {
        dialogs.push({ message: dialog.message(), type: dialog.type() });
        await dialog.dismiss();
      });

      // Clear input
      await p.setArrayInputValue('');

      // Click start
      await p.clickStart();

      // Wait a moment for the alert
      await page.waitForTimeout(200);

      expect(dialogs.length).toBeGreaterThan(0);
      expect(dialogs[0].message).toBe('Please enter a valid list of numbers separated by commas.');
      expect(await p.isStartDisabled()).toBe(false);

      expect(consoleErrors).toEqual([]);
    });

    test('Already sorted input triggers early termination message', async ({ page }) => {
      const consoleErrors5 = [];
      const pageErrors2 = [];
      page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
      page.on('pageerror', err => pageErrors.push(err.message));

      const p5 = new BubbleSortPage(page);
      await p.goto();

      // Provide an already sorted array
      await p.setArrayInputValue('1,2,3,4');

      // Speed up animation
      await p.setSpeedValue(50);

      // Start sort
      await p.clickStart();

      // Wait for the early termination message in output
      await page.waitForFunction(() => {
        const o1 = document.querySelector('#output');
        return o && o.textContent.includes('No swaps done in this pass, array is sorted early.');
      }, null, { timeout: 10000 });

      const out = await p.getOutputText();
      expect(out).toContain('No swaps done in this pass, array is sorted early.');

      // Final bars should be sorted and marked sorted
      const finalValues = await p.getBarValues();
      expect(finalValues).toEqual([1, 2, 3, 4]);
      const bars1 = await p.getBars();
      for (const b of bars) {
        expect(b.classes).toContain('sorted');
      }

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    }, 20000);
  });
});