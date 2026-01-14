import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f7678222-d5b8-11f0-9ee1-ef07bdc6053d.html';
const ARRAY_SIZE = 20;

class QuickSortPage {
  constructor(page) {
    this.page = page;
  }

  // Returns an array of numeric heights (px -> integer)
  async getBarHeights() {
    return await this.page.$$eval('#arrayContainer .bar', bars =>
      bars.map(b => {
        // style.height is like "123px"
        const h = b.style.height || window.getComputedStyle(b).height;
        return parseInt(h.replace('px', ''), 10);
      })
    );
  }

  // Returns number of bars currently rendered
  async getBarCount() {
    return await this.page.$$eval('#arrayContainer .bar', bars => bars.length);
  }

  // Click the Start Quick Sort button
  async clickStart() {
    await this.page.click('button[onclick="startQuickSort()"]');
  }

  // Poll until the innerHTML of #arrayContainer remains unchanged for "stableMs" milliseconds
  // timeoutMs is the maximum time to wait
  async waitForStableArray(stableMs = 600, timeoutMs = 30000) {
    const pollInterval = 100;
    const start = Date.now();
    let lastHtml = await this.page.$eval('#arrayContainer', el => el.innerHTML);
    let lastChangeTime = Date.now();

    while (Date.now() - start < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      const currentHtml = await this.page.$eval('#arrayContainer', el => el.innerHTML);
      if (currentHtml !== lastHtml) {
        lastHtml = currentHtml;
        lastChangeTime = Date.now();
      } else {
        if (Date.now() - lastChangeTime >= stableMs) {
          return; // stable
        }
      }
    }
    throw new Error('Timed out waiting for stable array DOM');
  }

  // Helper to check if numeric array is non-decreasing
  static isNonDecreasing(arr) {
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] < arr[i - 1]) return false;
    }
    return true;
  }
}

test.describe('Quick Sort Visualization - FSM tests', () => {
  let page;
  let qsPage;
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    consoleMessages = [];
    pageErrors = [];

    // Collect console messages for inspection
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect uncaught errors on the page
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    qsPage = new QuickSortPage(page);
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Initial state S0_Idle: array is generated and displayed on load (entry action displayArray)', async () => {
    // Validate: on initial load (Idle state) the array is displayed with ARRAY_SIZE bars.
    const count = await qsPage.getBarCount();
    // There should be ARRAY_SIZE bars displayed as per the implementation's initial generation
    expect(count).toBe(ARRAY_SIZE);

    // The bars should have numeric heights (non-empty and positive)
    const heights = await qsPage.getBarHeights();
    expect(heights.length).toBe(ARRAY_SIZE);
    for (const h of heights) {
      expect(Number.isFinite(h)).toBeTruthy();
      expect(h).toBeGreaterThan(0);
    }

    // There should be no uncaught page errors during initial load
    expect(pageErrors.length).toBe(0);

    // Informational: record that displayArray has run by presence of bars (entry action)
    // (No direct access to internal function call counts; DOM observation suffices.)
  });

  test('Transition S0_Idle -> S1_Sorting on StartQuickSort click: sorting begins and array updates (entry action quickSort)', async () => {
    // Make test tolerant to the visualization delay
    test.setTimeout(60000);

    // Capture the initial state of the container
    const initialHtml = await page.$eval('#arrayContainer', el => el.innerHTML);

    // Click the Start Quick Sort button to trigger transition to Sorting
    await qsPage.clickStart();

    // After clicking, we expect the array DOM to update at least once (displayArray called)
    await page.waitForFunction(
      (initial) => document.getElementById('arrayContainer').innerHTML !== initial,
      initialHtml
    );

    // During sorting, there should be multiple intermediate updates.
    // Capture several samples over a short period to ensure the visualization is occurring.
    const snapshots = [];
    for (let i = 0; i < 6; i++) {
      await new Promise(resolve => setTimeout(resolve, 200)); // allow time for visualization updates
      snapshots.push(await page.$eval('#arrayContainer', el => el.innerHTML));
    }
    // There should be at least two distinct snapshots indicating that displayArray was invoked multiple times
    const distinctSnapshots = new Set(snapshots);
    expect(distinctSnapshots.size).toBeGreaterThan(1);

    // Wait until sorting completes by waiting for the DOM to become stable for a short duration
    await qsPage.waitForStableArray(700, 45000);

    // After sorting completes (on exit of Sorting state displayArray(arr) should be called),
    // the bars should represent a non-decreasing sequence (sorted ascending heights)
    const finalHeights = await qsPage.getBarHeights();
    expect(finalHeights.length).toBe(ARRAY_SIZE);
    expect(QuickSortPage.isNonDecreasing(finalHeights)).toBeTruthy();

    // Ensure no uncaught page errors occurred during sorting
    expect(pageErrors.length).toBe(0);
  });

  test('Transition S1_Sorting -> S1_Sorting (SortingStep): array updates during partition/swaps', async () => {
    test.setTimeout(60000);

    // Start sorting
    await qsPage.clickStart();

    // Wait for the first change to ensure sorting started
    await page.waitForFunction(
      () => {
        const container = document.getElementById('arrayContainer');
        return container && container.innerHTML.length > 0;
      }
    );

    // Monitor changes for a short window and count distinct states to validate intermediate displayArray calls
    const seen = new Set();
    const start = Date.now();
    while (Date.now() - start < 3000) { // observe for 3 seconds
      const html = await page.$eval('#arrayContainer', el => el.innerHTML);
      seen.add(html);
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    // There should be multiple distinct observed states during sorting indicating repeated displayArray(arr) calls
    expect(seen.size).toBeGreaterThan(1);

    // Finally wait until stable (sorting finished) and ensure array is sorted
    await qsPage.waitForStableArray(700, 45000);
    const finalHeights = await qsPage.getBarHeights();
    expect(QuickSortPage.isNonDecreasing(finalHeights)).toBeTruthy();

    // No uncaught page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Edge case: clicking Start Quick Sort repeatedly (concurrent starts) should replace array and continue sorting without uncaught errors', async () => {
    test.setTimeout(90000);

    // Click start multiple times in quick succession to simulate rapid user interaction
    await qsPage.clickStart();
    await new Promise(resolve => setTimeout(resolve, 150)); // small delay
    await qsPage.clickStart();
    await new Promise(resolve => setTimeout(resolve, 120)); // another quick click
    await qsPage.clickStart();

    // After these rapid clicks, ensure the DOM updated and eventually becomes stable
    await qsPage.waitForStableArray(700, 70000);

    // Final state should be sorted
    const finalHeights = await qsPage.getBarHeights();
    expect(finalHeights.length).toBe(ARRAY_SIZE);
    expect(QuickSortPage.isNonDecreasing(finalHeights)).toBeTruthy();

    // Ensure no uncaught errors happened while restarting sorting multiple times
    expect(pageErrors.length).toBe(0);

    // Additionally ensure that successive start clicks produced changes (i.e., we didn't have a no-op)
    // We assert that the current innerHTML contains at least one bar element
    const innerHtml = await page.$eval('#arrayContainer', el => el.innerHTML);
    expect(innerHtml).toContain('class="bar"');
  });

  test('Error observation test: capture console and page errors during navigation and interactions', async () => {
    // This test focuses on observing console messages and page errors as part of required monitoring.
    // It will not modify the page. It asserts that all collected page errors are reported (if any),
    // and ensures that any console messages of severity "error" are captured.

    // Perform a start to cause runtime behavior
    await qsPage.clickStart();

    // Wait a bit for runtime logs/errors to surface
    await new Promise(resolve => setTimeout(resolve, 1500));

    // pageErrors array contains uncaught exceptions (if any)
    // The test validates the monitoring mechanism by asserting that pageErrors is an array
    expect(Array.isArray(pageErrors)).toBeTruthy();

    // Also ensure consoleMessages captured are an array and include at least the messages we've collected
    expect(Array.isArray(consoleMessages)).toBeTruthy();

    // If there are any page errors, fail the test and print them in assertion message for debugging.
    if (pageErrors.length > 0) {
      // Provide the errors in the assertion message; fail explicitly.
      const messages = pageErrors.map(e => e.message).join('\n---\n');
      throw new Error(`Detected uncaught page errors:\n${messages}`);
    }

    // Assert that there are no console messages of type 'error' (uncaught or logged)
    const errorConsole = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsole.length).toBe(0);
  });
});