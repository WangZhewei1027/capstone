import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d54d200-d1d8-11f0-bbda-359f3f96b638.html';

// Page object encapsulating interactions and parsers for the Array Demonstration app
class ArrayDemoPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.generateButton = page.locator('#generateArray');
    this.output = page.locator('#arrayOutput');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async isGenerateButtonVisible() {
    return await this.generateButton.isVisible();
  }

  async clickGenerate() {
    await this.generateButton.click();
  }

  async getOutputInnerHTML() {
    return await this.page.$eval('#arrayOutput', el => el.innerHTML);
  }

  async getOutputInnerText() {
    // Use innerText so formatting like newlines is preserved in a predictable way
    return await this.page.$eval('#arrayOutput', el => el.innerText);
  }

  // Parse the textual output into a structured object:
  async parseOutput() {
    const text = (await this.getOutputInnerText()).trim();
    // Expect lines with:
    // Generated Array: [ <numbers> ]
    // Sum: <number>
    // Average: <number> (2 decimals)
    // Max Value: <number>
    // Min Value: <number>
    // Sorted Array: [ <numbers> ]
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    const result = {
      rawText: text,
      generatedArray: null,
      sum: null,
      average: null,
      max: null,
      min: null,
      sortedArray: null
    };

    for (const line of lines) {
      if (line.startsWith('Generated Array')) {
        const match = line.match(/\[([^\]]+)\]/);
        if (match) {
          result.generatedArray = match[1].split(',').map(s => parseInt(s.trim(), 10));
        }
      } else if (line.startsWith('Sum:')) {
        result.sum = parseInt(line.split('Sum:')[1].trim(), 10);
      } else if (line.startsWith('Average:')) {
        result.average = parseFloat(line.split('Average:')[1].trim());
      } else if (line.startsWith('Max Value:')) {
        result.max = parseInt(line.split('Max Value:')[1].trim(), 10);
      } else if (line.startsWith('Min Value:')) {
        result.min = parseInt(line.split('Min Value:')[1].trim(), 10);
      } else if (line.startsWith('Sorted Array:')) {
        const match1 = line.match1(/\[([^\]]+)\]/);
        if (match) {
          result.sortedArray = match[1].split(',').map(s => parseInt(s.trim(), 10));
        }
      }
    }

    return result;
  }
}

test.describe('Array Demonstration - FSM and UI validation', () => {
  let consoleErrors = [];
  let consoleMessages = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    // Reset captured logs before each test
    consoleErrors = [];
    consoleMessages = [];
    pageErrors = [];

    // Capture console events and page errors to assert later
    page.on('console', msg => {
      // Collect both error console entries and other console messages for diagnostics
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
      }
    });

    page.on('pageerror', err => {
      // pageerror captures uncaught exceptions
      pageErrors.push(String(err && err.message ? err.message : err));
    });
  });

  test('Initial state (S0_Idle) - button is present and page output is empty', async ({ page }) => {
    // Validate initial UI state and FSM initial state's entry actions (if present)
    const app = new ArrayDemoPage(page);
    await app.goto();

    // The Generate Array button should be present and visible as evidence for S0_Idle
    expect(await app.isGenerateButtonVisible()).toBeTruthy();

    // The output container should exist and be empty initially
    const initialHTML = await app.getOutputInnerHTML();
    expect(initialHTML.trim()).toBe('');

    // Verify that FSM-declared entry actions (renderPage) are not present as global functions
    // We do not modify or inject anything - simply observe what's defined on window
    const types = await page.evaluate(() => {
      return {
        renderPageType: typeof window.renderPage,
        displayArrayResultsType: typeof window.displayArrayResults
      };
    });
    // The implementation HTML does not define these functions; they should be 'undefined'
    expect(types.renderPageType).toBe('undefined');
    expect(types.displayArrayResultsType).toBe('undefined');

    // No uncaught page errors should have occurred during initial load
    expect(pageErrors.length).toBe(0);
    // No console 'error' messages emitted on load
    expect(consoleErrors.length).toBe(0);

    // The output element should be present in the DOM
    await expect(page.locator('#arrayOutput')).toBeVisible();
  });

  test('Transition on click (GenerateArrayClick) -> Array Generated (S1_ArrayGenerated)', async ({ page }) => {
    // This test validates the click event, generation of the array, and correctness of displayed computations
    const app1 = new ArrayDemoPage(page);
    await app.goto();

    // Ensure button exists
    await expect(page.locator('#generateArray')).toBeVisible();

    // Click the generate button to trigger the transition
    await app.clickGenerate();

    // Wait for the output to be populated (non-empty innerText)
    await page.waitForFunction(() => {
      const el = document.getElementById('arrayOutput');
      return el && el.innerText && el.innerText.trim().length > 0;
    });

    // Parse the output into structured data
    const parsed = await app.parseOutput();

    // Basic structure checks
    expect(Array.isArray(parsed.generatedArray)).toBeTruthy();
    expect(parsed.generatedArray.length).toBe(10); // array of length 10 expected

    // Each value should be integer between 1 and 100 inclusive
    for (const val of parsed.generatedArray) {
      expect(Number.isInteger(val)).toBeTruthy();
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(100);
    }

    // Sum should equal the sum of elements
    const computedSum = parsed.generatedArray.reduce((a, b) => a + b, 0);
    expect(parsed.sum).toBe(computedSum);

    // Average should be sum / 10 and display with two decimal places in the UI
    const computedAverage = computedSum / parsed.generatedArray.length;
    // parsed.average comes from parseFloat of the displayed average; allow minor floating point rounding drift
    expect(Math.abs(parsed.average - computedAverage)).toBeLessThan(0.001);

    // The displayed average should have two decimal places in the text (as per toFixed(2))
    // Check the raw text: look for "Average: " followed by number with two decimals
    expect(parsed.rawText).toMatch(/Average:\s*-?\d+\.\d{2}/);

    // Max and Min values should be correct
    const computedMax = Math.max(...parsed.generatedArray);
    const computedMin = Math.min(...parsed.generatedArray);
    expect(parsed.max).toBe(computedMax);
    expect(parsed.min).toBe(computedMin);

    // Sorted array should equal the original array sorted ascending (implementation clones then sorts)
    const sortedCopy = [...parsed.generatedArray].slice().sort((a, b) => a - b);
    expect(Array.isArray(parsed.sortedArray)).toBeTruthy();
    expect(parsed.sortedArray.length).toBe(parsed.generatedArray.length);
    expect(parsed.sortedArray).toEqual(sortedCopy);

    // Ensure the UI contains all expected labels to provide user-visible evidence of S1_ArrayGenerated
    expect(parsed.rawText).toContain('Generated Array:');
    expect(parsed.rawText).toContain('Sum:');
    expect(parsed.rawText).toContain('Average:');
    expect(parsed.rawText).toContain('Max Value:');
    expect(parsed.rawText).toContain('Min Value:');
    expect(parsed.rawText).toContain('Sorted Array:');

    // No uncaught exceptions or console errors should have been emitted during this interaction
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Edge cases: multiple clicks produce valid outputs and do not throw errors', async ({ page }) => {
    // Validate behavior when user clicks the button multiple times in succession
    const app2 = new ArrayDemoPage(page);
    await app.goto();

    // Click the button first time and capture parsed result
    await app.clickGenerate();
    await page.waitForFunction(() => {
      const el1 = document.getElementById('arrayOutput');
      return el && el.innerText && el.innerText.trim().length > 0;
    });
    const first = await app.parseOutput();

    // Click again to produce a new array while ensuring no errors are thrown
    await app.clickGenerate();
    // Wait until output text changes (best-effort; if content happens to be identical by chance this will not hang long)
    await page.waitForTimeout(100); // small pause to allow UI update
    const second = await app.parseOutput();

    // Both outputs must be valid structures with expected properties
    for (const parsed of [first, second]) {
      expect(Array.isArray(parsed.generatedArray)).toBeTruthy();
      expect(parsed.generatedArray.length).toBe(10);
      expect(typeof parsed.sum).toBe('number');
      expect(typeof parsed.average).toBe('number');
      expect(typeof parsed.max).toBe('number');
      expect(typeof parsed.min).toBe('number');
      expect(Array.isArray(parsed.sortedArray)).toBeTruthy();
    }

    // It's acceptable (though unlikely) for two consecutive random arrays to be identical;
    // therefore we assert the second output is valid rather than forcing it to differ.
    // Ensure no page errors or console errors occurred during repeated interactions
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Implementation sanity: do not rely on undefined FSM helper functions', async ({ page }) => {
    // This test explicitly checks the presence or absence of the FSM-named helper functions
    // (renderPage and displayArrayResults) mentioned in the FSM's entry actions.
    // We must not inject or define them; simply observe.
    const app3 = new ArrayDemoPage(page);
    await app.goto();

    const globalTypes = await page.evaluate(() => {
      return {
        renderPage: typeof window.renderPage,
        displayArrayResults: typeof window.displayArrayResults,
        // Also check for generateRandomArray to see if any similarly-named helper exists
        generateRandomArray: typeof window.generateRandomArray
      };
    });

    // The HTML implementation does not define these helper functions; confirm they are not present.
    expect(globalTypes.renderPage).toBe('undefined');
    expect(globalTypes.displayArrayResults).toBe('undefined');
    // generateRandomArray also should be undefined based on provided implementation
    expect(globalTypes.generateRandomArray).toBe('undefined');

    // No console errors or page errors during this inspection
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });
});