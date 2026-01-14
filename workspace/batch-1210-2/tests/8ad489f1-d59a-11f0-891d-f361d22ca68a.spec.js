import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad489f1-d59a-11f0-891d-f361d22ca68a.html';

test.describe('Kruskal Algorithm interactive app (FSM validation)', () => {
  // Arrays to capture console messages and uncaught page errors for each test
  let consoleMessages;
  let pageErrors;

  // Simple page object to encapsulate selectors and interactions
  class KruskalPage {
    constructor(page) {
      this.page = page;
    }
    async goto() {
      await this.page.goto(APP_URL);
    }
    async getHeadingText() {
      return this.page.textContent('h1');
    }
    async getInputValue(id) {
      return this.page.$eval(id, (el) => el.value);
    }
    async clickInput(id) {
      await this.page.click(id);
    }
    async clickSort() {
      await this.page.click('#sort-btn');
    }
    async clickKruskal() {
      await this.page.click('#kruskal-btn');
    }
    async clickMST() {
      await this.page.click('#mst-btn');
    }
    async getResultText() {
      return this.page.$eval('#result', (el) => el.textContent || '');
    }
    async setInputValue(id, value) {
      await this.page.fill(id, String(value));
    }
  }

  // Setup a fresh page and listeners before each test
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages
    page.on('console', (msg) => {
      try {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
      } catch (e) {
        consoleMessages.push({ type: 'unknown', text: String(msg) });
      }
    });

    // Collect uncaught page errors (ReferenceError, TypeError, SyntaxError, etc.)
    page.on('pageerror', (error) => {
      // store the message string for assertions
      pageErrors.push(String(error && (error.message || error)));
    });
  });

  // Test initial idle state S0_Idle
  test('Initial state (S0_Idle): page renders heading, inputs and empty result', async ({ page }) => {
    // This test validates the initial rendering (onEnter evidence: <h1>Kruskal\'s Algorithm</h1>)
    const app = new KruskalPage(page);
    await app.goto();

    // Verify heading exists and correct
    const heading = await app.getHeadingText();
    expect(heading).toBe("Kruskal's Algorithm");

    // Verify initial input values per the FSM/components
    expect(await app.getInputValue('#num1')).toBe('10');
    expect(await app.getInputValue('#num2')).toBe('20');
    expect(await app.getInputValue('#num3')).toBe('30');

    // Result area should start empty (no immediate DOM updates in provided implementation)
    const resultText = await app.getResultText();
    expect(resultText).toBe('');

    // No page errors should have occurred just by loading the page
    expect(pageErrors.length).toBe(0);
  });

  // Test InputClick: clicking on input fields should log "Sorted numbers:" via click handler
  test('Input interaction (InputClick): clicking an input logs sorted numbers without throwing', async ({ page }) => {
    // Validates the transition S0_Idle -> S0_Idle on InputClick (no state change, just an interaction)
    const app = new KruskalPage(page);
    await app.goto();

    // Click an input - this should trigger a console.log from the input click handler
    const consolePromise = page.waitForEvent('console', {
      predicate: (m) => m.text().includes('Sorted numbers:'),
      timeout: 2000,
    });

    await app.clickInput('#num1');

    const msg = await consolePromise;
    expect(msg.text()).toContain('Sorted numbers:');

    // Give a short moment and assert no uncaught page errors resulted from the input click handler
    // (the input handler only parses values and logs; it should not throw)
    await page.waitForTimeout(100);
    expect(pageErrors.length).toBe(0);

    // Result area remains untouched
    expect(await app.getResultText()).toBe('');
  });

  // Test SortClick: clicking Sort should log "Sorted numbers:" then attempt to call kruskal and produce an error
  test('Sort transition (S0_Idle -> S1_Sorted): Sort click logs sorted numbers and results in a parsing error when calling kruskal', async ({ page }) => {
    // This validates the "SortClick" event and the expected console log evidence, and observes the error path
    const app = new KruskalPage(page);
    await app.goto();

    // Prepare to capture the expected console log and the subsequent uncaught error
    const consolePromise = page.waitForEvent('console', {
      predicate: (m) => m.text().includes('Sorted numbers:'),
      timeout: 2000,
    });
    const errorPromise = page.waitForEvent('pageerror', { timeout: 2000 });

    // Trigger the Sort event
    await app.clickSort();

    // The implementation first console.logs sortedNumbers, then calls kruskal(sortedNumbers)
    // which causes a JSON.parse on a non-string and therefore a SyntaxError in most environments.
    const consoleMsg = await consolePromise;
    expect(consoleMsg.text()).toContain('Sorted numbers:');

    // We assert that an uncaught page error occurred as part of this transition
    const error = await errorPromise;
    // Record should also be present in pageErrors captured by listener
    expect(pageErrors.length).toBeGreaterThan(0);

    // The exact message may vary by environment; assert it's a parsing/syntax-related error
    const combinedErrors = pageErrors.join(' | ');
    // Accept either SyntaxError / Unexpected / JSON parse related messages
    expect(/(SyntaxError|Unexpected|JSON|parse)/i.test(combinedErrors)).toBeTruthy();

    // Result div is not updated by the broken flow - still empty
    expect(await app.getResultText()).toBe('');
  });

  // Test KruskalClick: clicking Kruskal's Algorithm should log edges and then cause a TypeError due to incorrect destructuring
  test("Kruskal transition (S1_Sorted -> S2_KruskalResult): clicking Kruskal's Algorithm logs edges and causes a runtime TypeError", async ({ page }) => {
    // This validates the "KruskalClick" event evidence ("Edges: ...") and that the runtime throws as observed in code
    const app = new KruskalPage(page);
    await app.goto();

    // Wait for console 'Edges:' log and then for the uncaught page error
    const consolePromise = page.waitForEvent('console', {
      predicate: (m) => m.text().includes('Edges:'),
      timeout: 2000,
    });
    const errorPromise = page.waitForEvent('pageerror', { timeout: 2000 });

    // Click the Kruskal button
    await app.clickKruskal();

    const consoleMsg = await consolePromise;
    expect(consoleMsg.text()).toContain('Edges:');

    const error = await errorPromise;
    // Our listener must also have at least one recorded error
    expect(pageErrors.length).toBeGreaterThan(0);

    // The implementation attempts to JSON.parse a valid JSON string into array of objects,
    // then destructures each object using array pattern: "let [u, v] = edge;" which should throw TypeError (edge not iterable).
    const combinedErrors = pageErrors.join(' | ');
    expect(/(TypeError|not iterable|cannot|is not iterable)/i.test(combinedErrors)).toBeTruthy();

    // The UI result remains unchanged
    expect(await app.getResultText()).toBe('');
  });

  // Test MSTClick: clicking Minimum Spanning Tree should log edges and then cause a runtime TypeError similar to kruskal
  test('MST transition (S1_Sorted -> S3_MSTResult): clicking MST logs edges and triggers a runtime error in mst processing', async ({ page }) => {
    // Validate "MSTClick" event evidence ("Edges: ...") and the expected uncaught error
    const app = new KruskalPage(page);
    await app.goto();

    const consolePromise = page.waitForEvent('console', {
      predicate: (m) => m.text().includes('Edges:'),
      timeout: 2000,
    });
    const errorPromise = page.waitForEvent('pageerror', { timeout: 2000 });

    // Click the MST button
    await app.clickMST();

    const consoleMsg = await consolePromise;
    expect(consoleMsg.text()).toContain('Edges:');

    const error = await errorPromise;
    expect(pageErrors.length).toBeGreaterThan(0);

    // Expect a TypeError / destructuring error as mst expects iterable edge entries but receives objects
    const combinedErrors = pageErrors.join(' | ');
    expect(/(TypeError|not iterable|cannot|is not iterable)/i.test(combinedErrors)).toBeTruthy();

    // Ensure result div remains empty after the erroneous flow
    expect(await app.getResultText()).toBe('');
  });

  // Edge case test: clear an input (empty string), then perform Sort click to observe error paths with NaN inputs
  test('Edge case: empty input values and Sort click -> should log and still produce a parse/runtime error', async ({ page }) => {
    // This test exercises an edge case where inputs are empty strings; parseInt will yield NaN,
    // and the subsequent kruskal invocation will likely throw a JSON.parse/SyntaxError
    const app = new KruskalPage(page);
    await app.goto();

    // Set one input to an empty string to simulate malformed input
    await app.setInputValue('#num1', '');

    // Expect a console log of sorted numbers (which will include NaN) and an ensuing page error
    const consolePromise = page.waitForEvent('console', {
      predicate: (m) => m.text().includes('Sorted numbers:'),
      timeout: 2000,
    });
    const errorPromise = page.waitForEvent('pageerror', { timeout: 2000 });

    await app.clickSort();

    const consoleMsg = await consolePromise;
    expect(consoleMsg.text()).toContain('Sorted numbers:');

    const error = await errorPromise;
    expect(pageErrors.length).toBeGreaterThan(0);

    // Error likely to be SyntaxError from JSON.parse on "NaN,20,30" or similar; assert a parse-related error exists
    const combinedErrors = pageErrors.join(' | ');
    expect(/(SyntaxError|Unexpected|JSON|parse|NaN)/i.test(combinedErrors)).toBeTruthy();

    // Result area still not updated
    expect(await app.getResultText()).toBe('');
  });

  // Teardown: simple sanity check that listeners collected data and didn't crash test harness
  test.afterEach(async () => {
    // ensure our arrays exist and are arrays (helps detect listener failures)
    expect(Array.isArray(consoleMessages)).toBeTruthy();
    expect(Array.isArray(pageErrors)).toBeTruthy();
  });
});