import { test, expect } from '@playwright/test';

// Test file for application: dfd71812-d59e-11f0-ae0b-570552a0b645
// This suite validates the interactive Set demo page:
// - Loads the page as-is (no modifications)
// - Observes console messages and page errors (lets any JS errors happen naturally)
// - Exercises all interactive buttons and verifies DOM updates and visual feedback
// - Asserts on expected behavior and that no unexpected console errors or page errors occurred

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd71812-d59e-11f0-ae0b-570552a0b645.html';

// Page Object encapsulating interactions with the demo page
class SetDemoPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.output = page.locator('#output');
    this.basicBtn = page.locator('button', { hasText: 'Basic Operations' });
    this.setOpsBtn = page.locator('button', { hasText: 'Set Operations' });
    this.nativeBtn = page.locator('button', { hasText: 'Native JavaScript Set' });
    this.clearBtn = page.locator('button', { hasText: 'Clear Output' });
    this.codeBlock = page.locator('#setCode');
    this.methodCards = page.locator('.method-card');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async clickBasic() {
    await this.basicBtn.click();
  }

  async clickSetOperations() {
    await this.setOpsBtn.click();
  }

  async clickNative() {
    await this.nativeBtn.click();
  }

  async clickClear() {
    await this.clearBtn.click();
  }

  async getOutputText() {
    return (await this.output.textContent()) || '';
  }

  async getOutputHTML() {
    return (await this.output.evaluate(node => node.innerHTML)) || '';
  }

  async methodCardTexts() {
    return this.methodCards.allTextContents();
  }
}

test.describe('JavaScript Set Demo - Functional and Console Error Observations', () => {
  // Arrays to collect console errors and page errors observed during a test
  let consoleErrors;
  let pageErrors;

  // Attach listeners before each test to collect console and page errors.
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console messages of type 'error'
    page.on('console', msg => {
      try {
        if (msg.type && msg.type() === 'error') {
          // store text of error messages for assertions and debugging
          consoleErrors.push(msg.text());
        }
      } catch (e) {
        // If something unexpected happens reading console, capture it
        consoleErrors.push(`(failed to read console msg) ${String(e)}`);
      }
    });

    // Collect uncaught exceptions on the page (ReferenceError, TypeError, etc.)
    page.on('pageerror', err => {
      // err is Error object with message and stack
      pageErrors.push(err.message || String(err));
    });
  });

  // Basic smoke test to ensure the app loads and default UI is present
  test('Initial load: page elements and default output are present', async ({ page }) => {
    const app = new SetDemoPage(page);
    await app.goto();

    // Ensure the main headings and code block are visible
    await expect(page.locator('h1')).toHaveText('JavaScript Set Data Structure');
    await expect(page.locator('h2', { hasText: 'Interactive Demo' })).toBeVisible();

    // The displayed code block (static) should contain a MySet class definition (read-only)
    await expect(app.codeBlock).toContainText('class MySet');

    // The default output text should be the placeholder
    await expect(app.output).toHaveText(/Output will appear here.../);

    // Method cards: ensure each expected method is displayed
    const cards = await app.methodCardTexts();
    const expectedMethods = ['add()', 'delete()', 'has()', 'clear()', 'union()', 'intersection()', 'difference()', 'isSubset()'];
    for (const method of expectedMethods) {
      expect(cards.join(' | ')).toContain(method);
    }

    // Verify no console 'error' messages or uncaught page errors occurred during initial load
    expect(consoleErrors.length, `Console errors should be zero on initial load: ${consoleErrors.join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Page errors should be zero on initial load: ${pageErrors.join(' | ')}`).toBe(0);
  });

  // Test Basic Operations button: verifies add, has, delete, size, and toString behavior reflected in DOM
  test('Basic Operations button updates output with correct MySet behavior', async ({ page }) => {
    const app = new SetDemoPage(page);
    await app.goto();

    // Click the Basic Operations button and assert expected content shows up
    await app.clickBasic();

    // Wait for the output area to include the heading for basic operations
    await expect(app.output).toContainText('Basic Set Operations');

    const outputText = await app.getOutputHTML();

    // Validate that Set A was created and contains expected values and size
    expect(outputText).toContain('Set A:'); // presence of Set A
    expect(outputText).toContain('{1, 2, 3}'); // initial set before deletion shows 1,2,3
    expect(outputText).toContain('Size: 3'); // size should be 3 after duplicates ignored
    expect(outputText).toContain('Has 2: true'); // has(2) true initially
    expect(outputText).toContain('Has 5: false'); // has(5) false

    // After deleting 2, ensure output indicates removal
    expect(outputText).toContain('After deleting 2: {1, 3}');
    expect(outputText).toContain('Size: 2'); // size after deletion

    // Ensure no runtime console errors or page errors occurred during this demo
    expect(consoleErrors.length, `Console errors while running Basic Operations: ${consoleErrors.join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Page errors while running Basic Operations: ${pageErrors.join(' | ')}`).toBe(0);
  });

  // Test Set Operations button: union, intersection, difference, subset checks
  test('Set Operations button shows union, intersection, difference, and subset results', async ({ page }) => {
    const app = new SetDemoPage(page);
    await app.goto();

    // Click the Set Operations button
    await app.clickSetOperations();

    // The output should include advanced operations heading
    await expect(app.output).toContainText('Advanced Set Operations');

    const outputHTML = await app.getOutputHTML();

    // Verify Set A and Set B initial contents
    expect(outputHTML).toContain('Set A: {1, 2, 3, 4}');
    expect(outputHTML).toContain('Set B: {3, 4, 5, 6}');

    // Verify union contains combined unique values
    expect(outputHTML).toContain('Union: {1, 2, 3, 4, 5, 6}');

    // Verify intersection contains common values
    expect(outputHTML).toContain('Intersection: {3, 4}');

    // Verify difference (A - B) contains items only in A
    expect(outputHTML).toContain('A - B: {1, 2}');

    // Verify subset checks
    expect(outputHTML).toContain('Set C: {1, 2}');
    expect(outputHTML).toContain('Is C subset of A: true');
    expect(outputHTML).toContain('Is C subset of B: false');

    // Ensure no console error messages or page errors happened
    expect(consoleErrors.length, `Console errors while running Set Operations: ${consoleErrors.join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Page errors while running Set Operations: ${pageErrors.join(' | ')}`).toBe(0);
  });

  // Test Native JavaScript Set demo: verifies built-in Set usage and duplicate removal
  test('Native JavaScript Set demo displays native set values and demonstrates duplicate removal', async ({ page }) => {
    const app = new SetDemoPage(page);
    await app.goto();

    // Click the Native JavaScript Set button
    await app.clickNative();

    // Expect the output to include the native set heading
    await expect(app.output).toContainText('Native JavaScript Set');

    const out = await app.getOutputHTML();

    // Verify the native set contains the expected unique fruits (order may vary but test primary content)
    expect(out).toContain('Native Set values:');
    // Ensure size and membership checks are present
    expect(out).toContain('Size:');
    expect(out).toContain("Has 'banana': true");

    // Check duplicate removal from an array
    expect(out).toContain('Original array: [1, 2, 2, 3, 4, 4, 5]');
    expect(out).toContain('Unique values: [1, 2, 3, 4, 5]');

    // Ensure no errors were printed to console or uncaught exceptions occurred
    expect(consoleErrors.length, `Console errors while running Native Set demo: ${consoleErrors.join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Page errors while running Native Set demo: ${pageErrors.join(' | ')}`).toBe(0);
  });

  // Test Clear Output button: should replace output with 'Output cleared...' text
  test('Clear Output button replaces output with cleared message', async ({ page }) => {
    const app = new SetDemoPage(page);
    await app.goto();

    // Pre-fill the output by clicking a demo button
    await app.clickBasic();
    await expect(app.output).toContainText('Basic Set Operations');

    // Now clear the output
    await app.clickClear();

    // The output area should contain the cleared message exactly as specified in the page
    await expect(app.output).toHaveText('Output cleared...');

    // No errors should have occurred during clearing
    expect(consoleErrors.length, `Console errors while clearing output: ${consoleErrors.join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Page errors while clearing output: ${pageErrors.join(' | ')}`).toBe(0);
  });

  // Edge case tests: clicking buttons multiple times, verifying idempotence and consistent behavior
  test('Repeated interactions: idempotent behavior and consistent output when clicking repeatedly', async ({ page }) => {
    const app = new SetDemoPage(page);
    await app.goto();

    // Click Basic Operations twice; output should still be valid and consistent
    await app.clickBasic();
    const first = await app.getOutputHTML();

    await app.clickBasic();
    const second = await app.getOutputHTML();

    // Outputs should be identical (the demo recreates the MySet and writes the same content)
    expect(first).toBe(second);

    // Click Set Operations twice and validate consistent result
    await app.clickSetOperations();
    const setOpsFirst = await app.getOutputHTML();
    await app.clickSetOperations();
    const setOpsSecond = await app.getOutputHTML();
    expect(setOpsFirst).toBe(setOpsSecond);

    // No console errors or page errors observed during repeated interactions
    expect(consoleErrors.length, `Console errors during repeated interactions: ${consoleErrors.join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Page errors during repeated interactions: ${pageErrors.join(' | ')}`).toBe(0);
  });

  // Final test: sanity check that the code block and styles are present and that buttons are accessible
  test('Accessibility & presence checks: buttons are visible and code block contains expected methods', async ({ page }) => {
    const app = new SetDemoPage(page);
    await app.goto();

    // Buttons should be visible and enabled
    await expect(app.basicBtn).toBeVisible();
    await expect(app.setOpsBtn).toBeVisible();
    await expect(app.nativeBtn).toBeVisible();
    await expect(app.clearBtn).toBeVisible();

    // Confirm the code block contains references to core methods implemented by MySet
    const codeText = await app.codeBlock.textContent();
    expect(codeText).toContain('add(element)');
    expect(codeText).toContain('delete(element)');
    expect(codeText).toContain('isSubset(otherSet)');
    expect(codeText).toContain('toString()');

    // No console errors or page errors during these checks
    expect(consoleErrors.length, `Console errors during accessibility checks: ${consoleErrors.join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Page errors during accessibility checks: ${pageErrors.join(' | ')}`).toBe(0);
  });
});