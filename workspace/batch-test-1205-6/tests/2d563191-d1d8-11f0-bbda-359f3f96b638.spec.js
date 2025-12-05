import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d563191-d1d8-11f0-bbda-359f3f96b638.html';

// Page object for the Heap demo page
class HeapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#numInput');
    this.button = page.locator('button[onclick="createHeaps()"]');
    this.output = page.locator('#output');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async setInput(value) {
    await this.input.fill(value);
  }

  async clickCreate() {
    await this.button.click();
  }

  async getOutputHtml() {
    return await this.output.innerHTML();
  }

  async getOutputText() {
    return await this.output.innerText();
  }

  /**
   * Extracts the Min and Max heap lines from output text.
   * Returns { minHeapText, maxHeapText } or null parts if not present.
   */
  async parseHeaps() {
    const text = await this.getOutputText();
    // The output format in the app is:
    // Results
    // Min Heap: x, y, z
    // Max Heap: a, b, c
    const minMatch = text.match(/Min Heap:\s*(.*)/i);
    const maxMatch = text.match(/Max Heap:\s*(.*)/i);
    const minHeapText = minMatch ? minMatch[1].trim() : null;
    const maxHeapText = maxMatch ? maxMatch[1].trim() : null;
    return { minHeapText, maxHeapText, fullText: text };
  }
}

test.describe('Heap (Min/Max) Demonstration - FSM Tests', () => {
  // Collect console messages and page errors for assertions
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture uncaught exceptions on the page
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
  });

  // Test initial state S0_Idle: input, placeholder and Create Heaps button are present
  test('S0_Idle: initial UI is rendered with input and Create Heaps button', async ({ page }) => {
    const heapPage = new HeapPage(page);
    await heapPage.goto();

    // Validate input exists and has expected placeholder (evidence of S0_Idle entry_actions: renderPage())
    await expect(heapPage.input).toBeVisible();
    await expect(heapPage.input).toHaveAttribute('placeholder', 'e.g. 3,1,4,1,5,9,2,6,5');

    // Validate the Create Heaps button exists and is actionable
    await expect(heapPage.button).toBeVisible();
    const buttonText = await heapPage.button.innerText();
    expect(buttonText).toMatch(/Create Heaps/i);

    // Output container should be present but empty at initial state
    await expect(heapPage.output).toBeVisible();
    const outputText = await heapPage.getOutputText();
    // It may be empty string or contain whitespace; ensure it does not yet contain "Results"
    expect(outputText).not.toMatch(/Results/i);

    // Assert that no page errors occurred up to this point
    expect(pageErrors.length).toBe(0);
    // Assert that there are no console errors reported
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test the main transition: clicking Create Heaps moves to S1_HeapsCreated and renders results
  test('CreateHeaps event: clicking the button creates Min and Max heaps (S1_HeapsCreated)', async ({ page }) => {
    const heapPage1 = new HeapPage(page);
    await heapPage.goto();

    // Use representative input from the FSM evidence
    const sampleInput = '3,1,4,1,5,9,2,6,5';
    await heapPage.setInput(sampleInput);

    // Click the Create Heaps button (triggers CreateHeaps event / transition)
    await heapPage.clickCreate();

    // Wait for output to contain the "Results" header as evidence of S1_HeapsCreated
    await page.waitForSelector('#output');

    const { minHeapText, maxHeapText, fullText } = await heapPage.parseHeaps();

    // The output should contain the Results header and both heap lines
    expect(fullText).toMatch(/Results/i);
    expect(minHeapText).not.toBeNull();
    expect(maxHeapText).not.toBeNull();

    // Convert the heap text to arrays (strings split by comma) and trim
    const minHeapArray = minHeapText.split(',').map(s => s.trim());
    const maxHeapArray = maxHeapText.split(',').map(s => s.trim());

    // The number of elements in each heap output should match the number of input elements
    const inputCount = sampleInput.split(',').length;
    expect(minHeapArray.length).toBe(inputCount);
    expect(maxHeapArray.length).toBe(inputCount);

    // Verify root properties: min heap root should equal the minimal numeric value; max heap root should equal the maximal numeric value
    const numericInputs = sampleInput.split(',').map(s => parseInt(s.trim(), 10));
    const expectedMin = Math.min(...numericInputs);
    const expectedMax = Math.max(...numericInputs);

    // The first element in the heap arrays is the root value
    expect(parseInt(minHeapArray[0], 10)).toBe(expectedMin);
    expect(parseInt(maxHeapArray[0], 10)).toBe(expectedMax);

    // Basic sanity checks on formatting: ensure labels exist in the output HTML
    const outputHtml = await heapPage.getOutputHtml();
    expect(outputHtml).toMatch(/<h2>\s*Results\s*<\/h2>/i);
    expect(outputHtml).toMatch(/<p>\s*<strong>\s*Min Heap:\s*<\/strong>/i);
    expect(outputHtml).toMatch(/<p>\s*<strong>\s*Max Heap:\s*<\/strong>/i);

    // Verify no unexpected page errors occurred during heap creation
    expect(pageErrors.length).toBe(0);
    // Verify there are no console.error messages
    const consoleErrors1 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Edge case: empty input (user clicks Create Heaps with empty string)
  test('Edge case: empty input produces NaN entries (verification of app behavior without patching)', async ({ page }) => {
    const heapPage2 = new HeapPage(page);
    await heapPage.goto();

    // Set input to empty string and click create
    await heapPage.setInput('');
    await heapPage.clickCreate();

    // Wait for output; the implementation uses parseInt('') which is NaN and will surface in output
    await page.waitForSelector('#output');
    const { minHeapText, maxHeapText, fullText } = await heapPage.parseHeaps();

    // The app is expected (given its current implementation) to show "NaN" when non-numeric values are parsed
    // Ensure output exists and contains NaN (this asserts the app behavior without modifying code)
    expect(fullText).toMatch(/Results/i);
    // At least one of the heap outputs should contain "NaN" as parseInt('') yields NaN
    const containsNaN = (minHeapText && /NaN/.test(minHeapText)) || (maxHeapText && /NaN/.test(maxHeapText));
    expect(containsNaN).toBeTruthy();

    // Confirm that this behavior did not produce uncaught page errors
    expect(pageErrors.length).toBe(0);
    // And no console.error messages were emitted
    const consoleErrors2 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Edge case: partially invalid input mixed with valid numbers
  test('Edge case: mixed invalid and valid numbers (e.g., "a, 5, b") renders NaN and numeric values', async ({ page }) => {
    const heapPage3 = new HeapPage(page);
    await heapPage.goto();

    const mixedInput = 'a, 5, b';
    await heapPage.setInput(mixedInput);
    await heapPage.clickCreate();

    await page.waitForSelector('#output');
    const { minHeapText, maxHeapText, fullText } = await heapPage.parseHeaps();

    // The output should include the numeric 5 and at least one NaN for the invalid entries
    expect(fullText).toMatch(/Results/i);
    expect(fullText).toMatch(/5/);
    const hasNaN = /NaN/.test(fullText);
    expect(hasNaN).toBeTruthy();

    // Check that the number of displayed tokens matches the number of comma-separated inputs (the implementation parses each token)
    const tokens = mixedInput.split(',').map(s => s.trim());
    const displayedMinCount = minHeapText ? minHeapText.split(',').length : 0;
    const displayedMaxCount = maxHeapText ? maxHeapText.split(',').length : 0;
    // Each heap should have as many entries as input tokens
    expect(displayedMinCount).toBe(tokens.length);
    expect(displayedMaxCount).toBe(tokens.length);

    // Ensure no uncaught page errors occurred
    expect(pageErrors.length).toBe(0);
    // Ensure no console.error messages were emitted
    const consoleErrors3 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test to ensure the DOM evidence lines are present as expected after transition (verifies expected_observables)
  test('Transition evidence: output DOM contains expected evidence snippets after CreateHeaps', async ({ page }) => {
    const heapPage4 = new HeapPage(page);
    await heapPage.goto();

    // Provide sample numbers and trigger heap creation
    await heapPage.setInput('10,2,33');
    await heapPage.clickCreate();

    // Wait for output and inspect innerHTML as the FSM evidence references innerHTML assignment
    await page.waitForSelector('#output');
    const outputHtml1 = await heapPage.getOutputHtml();

    // Evidence: innerHTML should include a <h2>Results</h2> fragment
    expect(outputHtml).toMatch(/<h2>.*Results.*<\/h2>/i);

    // Evidence: HTML should contain the Min Heap and Max Heap paragraphs
    expect(outputHtml).toMatch(/<p>\s*<strong>\s*Min Heap:\s*<\/strong>/i);
    expect(outputHtml).toMatch(/<p>\s*<strong>\s*Max Heap:\s*<\/strong>/i);

    // Ensure no page errors occurred in this transition
    expect(pageErrors.length).toBe(0);
    const consoleErrors4 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test.afterEach(async ({ page }) => {
    // Final safety assertions: print captured console messages counts (useful for debugging if tests fail)
    // We assert again that no uncaught exceptions or console.errors remain
    const consoleErrors5 = consoleMessages.filter(m => m.type === 'error');
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });
});