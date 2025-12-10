import { test, expect } from '@playwright/test';

// Test file for application ID: 7e8a3060-d59e-11f0-89ab-2f71529652ac
// URL: http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8a3060-d59e-11f0-89ab-2f71529652ac.html

// Page object to encapsulate interactions with the Array Demonstration page
class ArrayPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#arrayInput');
    this.button = page.getByRole('button', { name: 'Submit' });
    this.output = page.locator('#arrayOutput');
  }

  // Navigate to the page
  async goto() {
    await this.page.goto('http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8a3060-d59e-11f0-89ab-2f71529652ac.html');
  }

  // Fill the input with the provided string
  async fillInput(value) {
    await this.input.fill(value);
  }

  // Click the submit button to process the array
  async clickSubmit() {
    await this.button.click();
  }

  // Get the visible text content of the output area
  async getOutputText() {
    return (await this.output.textContent())?.trim() ?? '';
  }

  // Convenience to assert substrings are present in output
  async expectOutputContains(substring) {
    const text = await this.getOutputText();
    expect(text).toContain(substring);
  }
}

test.describe('Array Demonstration - UI and behavior', () => {
  let consoleErrors = [];
  let pageErrors = [];

  // Attach listeners before navigating so we capture load-time console/page errors
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console.error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture page errors (unhandled exceptions)
    page.on('pageerror', err => {
      pageErrors.push(String(err?.message ?? err));
    });
  });

  // Basic smoke test - initial page load and default state
  test('Initial load: input, button and empty output are present', async ({ page }) => {
    const app = new ArrayPage(page);
    // Navigate to the page
    await app.goto();

    // Verify input is visible and has correct placeholder
    await expect(app.input).toBeVisible();
    await expect(app.input).toHaveAttribute('placeholder', 'Enter numbers separated by commas (e.g. 1,2,3)');

    // Verify button is visible and labelled 'Submit'
    await expect(app.button).toBeVisible();
    await expect(app.button).toHaveText('Submit');

    // On initial load, output should be empty (no strong tags content)
    const outputText = await app.getOutputText();
    expect(outputText).toBe(''); // empty by default

    // Ensure no console errors or page errors happened during load
    expect(consoleErrors, `console.error messages: ${consoleErrors.join('\n')}`).toHaveLength(0);
    expect(pageErrors, `page errors: ${pageErrors.join('\n')}`).toHaveLength(0);
  });

  // Test submitting a simple valid list of integers
  test('Submitting "3,1,2" shows original array, correct sum, and sorted array', async ({ page }) => {
    const app1 = new ArrayPage(page);
    await app.goto();

    // Enter values and submit
    await app.fillInput('3,1,2');
    await app.clickSubmit();

    // The application displays original array (unsorted), sum, and sorted array
    // Original Array should be shown as [3,1,2]
    await app.expectOutputContains('Original Array:');
    await app.expectOutputContains('[3,1,2]');
    // Sum should be 6
    await app.expectOutputContains('Sum: 6');
    // Sorted Array should be [1,2,3]
    await app.expectOutputContains('Sorted Array:');
    await app.expectOutputContains('[1,2,3]');

    // Verify no console errors or page errors occurred during interaction
    expect(consoleErrors, `console.error messages: ${consoleErrors.join('\n')}`).toHaveLength(0);
    expect(pageErrors, `page errors: ${pageErrors.join('\n')}`).toHaveLength(0);
  });

  // Edge case: empty input string behavior
  test('Submitting empty input results in array [0] and sum 0 (behavior of Number("") => 0)', async ({ page }) => {
    const app2 = new ArrayPage(page);
    await app.goto();

    // Leave input blank and click submit
    await app.fillInput('');
    await app.clickSubmit();

    // Based on the implementation, Number('') -> 0 and the filter check is num !== '' (ineffective),
    // therefore the result will include 0 as an element.
    await app.expectOutputContains('Original Array:');
    await app.expectOutputContains('[0]');
    await app.expectOutputContains('Sum: 0');
    await app.expectOutputContains('Sorted Array:');
    await app.expectOutputContains('[0]');

    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  // Test how non-numeric entries and spaces are handled
  test('Input with spaces and non-numeric entries: "4, ,abc,5" -> behaves according to implementation', async ({ page }) => {
    const app3 = new ArrayPage(page);
    await app.goto();

    // Insert an input containing a space-only element and a non-numeric token
    await app.fillInput('4, ,abc,5');
    await app.clickSubmit();

    // Analysis of behavior:
    // split -> ["4"," ","abc","5"]
    // map(Number) -> [4, 0, NaN, 5]
    // filter keeps values where !isNaN(num) and num !== '' -> [4,0,5]
    // Expect Original Array to display [4,0,5], sum 9, sorted [0,4,5]
    await app.expectOutputContains('Original Array:');
    await app.expectOutputContains('[4,0,5]');
    await app.expectOutputContains('Sum: 9');
    await app.expectOutputContains('Sorted Array:');
    await app.expectOutputContains('[0,4,5]');

    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  // Non-numeric only input should result in an empty array (no valid numbers) and sum 0
  test('Non-numeric only input "a,b" results in empty displayed array and sum 0', async ({ page }) => {
    const app4 = new ArrayPage(page);
    await app.goto();

    await app.fillInput('a,b');
    await app.clickSubmit();

    // map(Number) -> [NaN, NaN] => filtered out => empty array
    await app.expectOutputContains('Original Array:');
    // Expect representation of empty array: []
    await app.expectOutputContains('[]');
    await app.expectOutputContains('Sum: 0');
    await app.expectOutputContains('Sorted Array:');
    await app.expectOutputContains('[]');

    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  // Test decimals and negative numbers and verify numerical sorting
  test('Decimals and negatives are handled and sorted numerically', async ({ page }) => {
    const app5 = new ArrayPage(page);
    await app.goto();

    // Use decimals and negatives
    await app.fillInput('3.5,-2,1.25,0');
    await app.clickSubmit();

    // Original array should appear unsorted in order entered
    await app.expectOutputContains('[3.5,-2,1.25,0]');
    // Sum: 3.5 + (-2) + 1.25 + 0 = 2.75
    // Note: JavaScript number representation might show 2.75 exactly
    await app.expectOutputContains('Sum: 2.75');
    // Sorted numerically should be [-2,0,1.25,3.5]
    await app.expectOutputContains('[ -2,0,1.25,3.5 ]'.replace(/\s/g, '') || '[ -2,0,1.25,3.5 ]'); // fallback check
    // Simpler check to ensure sorted array contains the numeric sequence (without relying on whitespace)
    const out = await app.getOutputText();
    expect(out.replace(/\s/g, '')).toContain('SortedArray:[-2,0,1.25,3.5]');

    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  // Repeated submissions should update the output each time
  test('Clicking submit multiple times updates output accordingly', async ({ page }) => {
    const app6 = new ArrayPage(page);
    await app.goto();

    // First submission
    await app.fillInput('1,2');
    await app.clickSubmit();
    await app.expectOutputContains('[1,2]');
    await app.expectOutputContains('Sum: 3');

    // Second submission with different input
    await app.fillInput('10,5,5');
    await app.clickSubmit();
    await app.expectOutputContains('[10,5,5]');
    await app.expectOutputContains('Sum: 20');
    await app.expectOutputContains('[5,5,10]'); // sorted

    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  // Final check: ensure no unexpected console errors or page errors accumulated across tests
  test('No console.error or page errors were emitted during test interactions', async ({ page }) => {
    // This test simply loads the page and verifies there are no console or page errors emitted on load.
    // It is a final guard to ensure runtime did not produce unhandled exceptions.
    const app7 = new ArrayPage(page);
    await app.goto();

    // perform one nominal interaction
    await app.fillInput('7,8');
    await app.clickSubmit();

    // Assert none of the captured arrays contain entries
    expect(consoleErrors, `console.error messages: ${consoleErrors.join('\n')}`).toHaveLength(0);
    expect(pageErrors, `page errors: ${pageErrors.join('\n')}`).toHaveLength(0);
  });
});