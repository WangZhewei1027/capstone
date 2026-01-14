import { test, expect } from '@playwright/test';

//
// Test suite for the Union-Find (Disjoint Set) interactive HTML application.
// File: 90f6cdf0-d5a1-11f0-80b9-e1f86cea383f-union-find-disjoint-set.spec.js
//
// These tests intentionally load the page "as-is" and assert that the known runtime
// errors in the provided implementation occur. The tests do NOT patch or modify
// the page code — they observe runtime exceptions and DOM changes produced by the page.
//
// Application URL:
// http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f6cdf0-d5a1-11f0-80b9-e1f86cea383f.html
//

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f6cdf0-d5a1-11f0-80b9-e1f86cea383f.html';

// Page object encapsulating common actions on the app.
class UnionFindPage {
  constructor(page) {
    this.page = page;
    this.input = page.locator('#num-vertices');
    this.generateButton = page.locator('#generate-graph');
    this.graphDiv = page.locator('#graph');
    this.title = page.locator('h1');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async fillNumVertices(value) {
    // Fill the number input which triggers the 'input' event handler in the page.
    await this.input.fill(value);
  }

  async clickGenerate() {
    await this.generateButton.click();
  }

  async graphInnerHTML() {
    // Return the innerHTML of the #graph div
    return await this.page.$eval('#graph', (el) => el.innerHTML);
  }
}

test.describe('Union-Find (Disjoint Set) application', () => {
  // Test initial page load and default state
  test('Initial page load shows expected controls and empty graph', async ({ page }) => {
    const app = new UnionFindPage(page);
    // Navigate to the app
    await app.goto();

    // Verify page title (header) is present
    await expect(app.title).toHaveText(/Union-Find/i);

    // Verify input and button are visible
    await expect(app.input).toBeVisible();
    await expect(app.generateButton).toBeVisible();

    // Verify the graph container exists and starts empty
    const graphHtml = await app.graphInnerHTML();
    expect(graphHtml).toBe('', 'Graph should be empty on initial load');

    // There should be no runtime page errors on plain load (listeners are defined but not executed yet).
    // We will not fail the test if there *are* errors, but assert there is no immediate exception thrown synchronously.
    // page.waitForEvent would time out here if no event — we avoid waiting; this test only validates visible DOM.
  });

  test.describe('Interactions produce runtime errors due to buggy implementation', () => {
    // Test the 'input' event handler behavior when given non-numeric input
    test('Entering a non-numeric value into the vertices input triggers a RangeError (invalid array length)', async ({ page }) => {
      const app1 = new UnionFindPage(page);
      await app.goto();

      // Prepare to capture the next pageerror (runtime exception)
      const waitForError = page.waitForEvent('pageerror');

      // Trigger the input event by filling a non-numeric value
      await app.fillNumVertices('abc');

      // Expect a runtime error to occur from the handler (new Array(numVertices) where numVertices === NaN)
      const error = await waitForError;
      expect(error).toBeTruthy();
      // The buggy code will attempt new Array(NaN) which typically triggers a RangeError: "Invalid array length"
      // Assert error message or name contains indication of RangeError / invalid array length
      const msg = String(error.message || error);
      expect(msg).toMatch(/Invalid array length|RangeError|invalid array length/i);
      // Ensure the graph was not populated (still empty)
      const graphHtml1 = await app.graphInnerHTML();
      expect(graphHtml).toBe('', 'Graph should remain empty after the failing input event');
    });

    // Test clicking the generate button with no value provided (empty input)
    test('Clicking Generate with empty input triggers a RangeError (Invalid array length)', async ({ page }) => {
      const app2 = new UnionFindPage(page);
      await app.goto();

      // Ensure input is empty
      await app.fillNumVertices('');

      // Prepare to capture the next pageerror
      const waitForError1 = page.waitForEvent('pageerror');

      // Click the generate button which will run the same code path as input and attempt new Array(NaN)
      await app.clickGenerate();

      const error1 = await waitForError;
      expect(error).toBeTruthy();
      const msg1 = String(error.message || error);
      expect(msg).toMatch(/Invalid array length|RangeError|invalid array length/i);

      // Confirm graph remains empty (the update code is not reached due to the exception)
      const graphHtml2 = await app.graphInnerHTML();
      expect(graphHtml).toBe('', 'Graph should remain empty after clicking generate with empty input');
    });

    // Test clicking generate with a valid numeric value to exercise the union/find logic which contains TypeError
    test('Clicking Generate with a valid number triggers TypeError due to misuse of Set API in find()', async ({ page }) => {
      const app3 = new UnionFindPage(page);
      await app.goto();

      // Fill a valid number to avoid the RangeError from new Array(NaN)
      await app.fillNumVertices('3');

      // Prepare to capture the next pageerror (the find() function uses Set.prototype.set/get causing a TypeError)
      const waitForError2 = page.waitForEvent('pageerror');

      // Click the generate button - code will attempt to run union/find and is expected to throw a TypeError
      await app.clickGenerate();

      const error2 = await waitForError;
      expect(error).toBeTruthy();
      const msg2 = String(error.message || error);
      // The buggy find uses unionSet[x].set which does not exist on Set -> "is not a function" message is likely
      expect(msg).toMatch(/is not a function|TypeError/i);

      // Because the runtime error happens before DOM update, the graph div should still be empty
      const graphHtml3 = await app.graphInnerHTML();
      expect(graphHtml).toBe('', 'Graph should remain empty when TypeError occurs during processing');
    });

    // Test that typing into the input (which triggers the 'input' handler) on a numeric value also triggers TypeError in find()
    test('Typing a valid numeric value into the number input triggers the union/find TypeError via the input handler', async ({ page }) => {
      const app4 = new UnionFindPage(page);
      await app.goto();

      // Prepare to capture pageerror before performing the action
      const waitForError3 = page.waitForEvent('pageerror');

      // Fill a valid numeric string - this triggers the 'input' event and its handler
      await app.fillNumVertices('2');

      // Wait for the resulting runtime error from the input event handler
      const error3 = await waitForError;
      expect(error).toBeTruthy();
      const msg3 = String(error.message || error);
      expect(msg).toMatch(/is not a function|TypeError|Invalid array length|RangeError/i);

      // Graph should not have been updated due to the error
      const graphHtml4 = await app.graphInnerHTML();
      expect(graphHtml).toBe('', 'Graph should remain empty after the failing input event');
    });
  });

  // Additional sanity checks: ensure interactive elements remain present after errors
  test('UI remains responsive (controls visible) even after runtime errors', async ({ page }) => {
    const app5 = new UnionFindPage(page);
    await app.goto();

    // Cause an error by clicking generate with empty input and wait for it
    const errPromise = page.waitForEvent('pageerror');
    await app.clickGenerate();
    const error4 = await errPromise;
    expect(error).toBeTruthy();

    // After the error, inputs and buttons should still be visible and enabled
    await expect(app.input).toBeVisible();
    await expect(app.generateButton).toBeVisible();
    // Try filling input again (this may trigger another error, but the UI should accept input)
    await app.fillNumVertices('1');
    // Confirm the value is present in the input element
    const inputValue = await page.$eval('#num-vertices', el => el.value);
    expect(inputValue).toBe('1');
  });

  // Edge case: extremely large number (to exercise potential range/array allocation errors)
  test('Entering a very large number can trigger runtime allocation or range errors', async ({ page }) => {
    const app6 = new UnionFindPage(page);
    await app.goto();

    // Prepare to capture the next pageerror
    const waitForError4 = page.waitForEvent('pageerror');

    // Use an extremely large number string - this may cause RangeError or memory-related exception
    await app.fillNumVertices('1000000000');

    // Wait for error; we accept either RangeError/Invalid array length or a different runtime error
    const error5 = await waitForError;
    expect(error).toBeTruthy();
    const msg4 = String(error.message || error);
    // Assert that some form of allocation or range related error occurred OR generic TypeError from other parts
    expect(msg.length).toBeGreaterThan(0);

    // Graph should remain unchanged
    const graphHtml5 = await app.graphInnerHTML();
    expect(graphHtml).toBe('', 'Graph should remain empty after the failing large-number input handling');
  });
});