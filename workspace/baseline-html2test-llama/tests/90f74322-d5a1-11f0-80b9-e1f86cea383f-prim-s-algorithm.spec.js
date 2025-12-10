import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f74322-d5a1-11f0-80b9-e1f86cea383f.html';

// Utility to wait until a condition becomes true or timeout (ms) elapses
async function waitForCondition(conditionFn, timeout = 2000, interval = 50) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await conditionFn()) return true;
    await new Promise((r) => setTimeout(r, interval));
  }
  return false;
}

test.describe("Prim's Algorithm application (90f74322-d5a1-11f0-80b9-e1f86cea383f)", () => {
  // We'll collect console.error messages and page errors for assertions.
  test.beforeEach(async ({ page }) => {
    // Attach listeners before navigation so we catch errors during load.
    page.context()._collectedConsoleErrors = [];
    page.context()._collectedConsoleMessages = [];
    page.context()._collectedPageErrors = [];

    page.on('console', (msg) => {
      // Collect console errors separately from other console messages.
      if (msg.type() === 'error') {
        page.context()._collectedConsoleErrors.push(String(msg.text()));
      } else {
        page.context()._collectedConsoleMessages.push(String(msg.text()));
      }
    });
    page.on('pageerror', (err) => {
      // pageerror is raised for uncaught exceptions (ReferenceError, TypeError, etc.).
      page.context()._collectedPageErrors.push(String(err && err.message ? err.message : String(err)));
    });

    // Load the page under test.
    await page.goto(APP_URL);
  });

  // Test initial page load and default UI state
  test('Initial page load: UI elements present and default values are correct', async ({ page }) => {
    // Verify the document title and main heading are present
    await expect(page).toHaveTitle(/Prim's Algorithm/);
    const heading = page.locator('h1');
    await expect(heading).toHaveText("Prim's Algorithm");

    // Verify canvas exists and has expected attributes
    const canvas = page.locator('canvas#graph');
    await expect(canvas).toHaveCount(1);
    await expect(canvas).toBeVisible();
    // Check width and height attributes on the element
    const width = await canvas.getAttribute('width');
    const height = await canvas.getAttribute('height');
    expect(width).toBe('400');
    expect(height).toBe('400');

    // Check computed style for the border defined in the page's style block
    const borderStyle = await page.evaluate(() => {
      const el = document.querySelector('#graph');
      if (!el) return null;
      return window.getComputedStyle(el).border;
    });
    // The page defines: border: 1px solid black; We assert that border contains '1px' and 'solid'
    expect(borderStyle && borderStyle.includes('1px')).toBeTruthy();
    expect(borderStyle && borderStyle.includes('solid')).toBeTruthy();

    // Verify input for number of vertices exists and default value is '6'
    const numVertices = page.locator('input#numVertices');
    await expect(numVertices).toHaveCount(1);
    await expect(numVertices).toBeVisible();
    await expect(numVertices).toHaveValue('6');

    // Verify run button exists and is enabled
    const runButton = page.locator('button#runButton');
    await expect(runButton).toHaveCount(1);
    await expect(runButton).toBeVisible();
    await expect(runButton).toBeEnabled();
  });

  // Test clicking the Run button after changing the number of vertices:
  // We observe console errors and uncaught exceptions if present and assert they occurred (per requirement)
  test('Clicking Run after changing vertices: input updates, click succeeds, and runtime errors (if any) are reported', async ({ page }) => {
    const context = page.context();
    const numVertices1 = page.locator('input#numVertices1');
    const runButton1 = page.locator('button#runButton1');

    // Change the number of vertices to a different valid value
    await numVertices.fill('8');
    await expect(numVertices).toHaveValue('8');

    // Click the Run button
    await runButton.click();

    // Wait briefly to capture any console errors or page errors produced by the click handler or script
    const sawError = await waitForCondition(() => {
      return (context._collectedConsoleErrors && context._collectedConsoleErrors.length > 0)
        || (context._collectedPageErrors && context._collectedPageErrors.length > 0);
    }, 2000);

    // We assert that the page remains at the expected URL (no unexpected navigation)
    await expect(page).toHaveURL(APP_URL);

    // The DOM should still contain the canvas and the updated input value after the click
    await expect(page.locator('canvas#graph')).toBeVisible();
    await expect(numVertices).toHaveValue('8');

    // Per instructions: observe and assert runtime errors happen naturally.
    // This test expects at least one console.error or pageerror to have been captured after the Run click.
    // If none occurred, this expectation will fail, revealing that the page did not produce runtime errors.
    expect(sawError, `Expected runtime errors (console.error or pageerror) to occur after clicking Run; collected console errors: ${JSON.stringify(context._collectedConsoleErrors || [])}, page errors: ${JSON.stringify(context._collectedPageErrors || [])}`).toBeTruthy();
  });

  // Edge case tests: invalid input values and ensuring the app either handles them or reports errors
  test('Edge case inputs for numVertices (0, negative, non-integer) trigger expected DOM behavior and report errors', async ({ page }) => {
    const context1 = page.context1();
    const numVertices2 = page.locator('input#numVertices2');
    const runButton2 = page.locator('button#runButton2');

    // Helper to try a value, click Run, and check for errors
    async function tryValueAndExpectErrors(value) {
      await numVertices.fill(String(value));
      await expect(numVertices).toHaveValue(String(value));
      await runButton.click();

      // wait for an error to appear (if any) after the click
      const sawError1 = await waitForCondition(() => {
        return (context._collectedConsoleErrors && context._collectedConsoleErrors.length > 0)
          || (context._collectedPageErrors && context._collectedPageErrors.length > 0);
      }, 1500);

      // We do not enforce that an error must occur for every case, but per the instructions,
      // we will assert that the app reports an error in at least one of these edge attempts.
      // Return whether an error was observed so caller can assert across attempts.
      return sawError;
    }

    // Try zero
    const sawErrorZero = await tryValueAndExpectErrors(0);

    // Try negative
    const sawErrorNegative = await tryValueAndExpectErrors(-3);

    // Try non-integer (Playwright fill will set the value attribute to the string)
    const sawErrorNonInt = await tryValueAndExpectErrors('abc');

    // At least one of the invalid attempts should produce runtime errors or console errors per the requirement
    const anyError = sawErrorZero || sawErrorNegative || sawErrorNonInt;
    expect(anyError, 'Expected at least one edge-case interaction to produce a console error or page error').toBeTruthy();
  });

  // Accessibility and basic role checks
  test('Accessibility: Run button has accessible name and input is reachable', async ({ page }) => {
    // The run button should have role 'button' and accessible name 'Run'
    const runButtonByRole = page.getByRole('button', { name: 'Run' });
    await expect(runButtonByRole).toHaveCount(1);
    await expect(runButtonByRole).toBeVisible();

    // The input should be tabbable (focusable)
    const numVertices3 = page.locator('input#numVertices3');
    await numVertices.focus();
    // After focus, active element should be the input
    const activeId = await page.evaluate(() => document.activeElement && document.activeElement.id);
    expect(activeId).toBe('numVertices');
  });

  // Test that console and page errors that occurred during load are observable and contain useful information
  test('Console and page errors during load are captured and reported', async ({ page }) => {
    const context2 = page.context2();
    // At this point, listeners were attached before navigation in beforeEach.
    // Wait a short time for any asynchronous errors to be captured
    await waitForCondition(() => {
      return (context._collectedConsoleErrors && context._collectedConsoleErrors.length > 0)
        || (context._collectedPageErrors && context._collectedPageErrors.length > 0);
    }, 1500);

    // Build a human-readable summary of captured errors
    const consoleErrors = context._collectedConsoleErrors || [];
    const pageErrors = context._collectedPageErrors || [];

    // The test expects that at least one console error or page error occurred during load.
    // This asserts that runtime problems (ReferenceError, TypeError, SyntaxError, etc.) were observed.
    expect((consoleErrors.length + pageErrors.length) > 0, `Expected at least one console.error or pageerror during page load. consoleErrors: ${JSON.stringify(consoleErrors)}, pageErrors: ${JSON.stringify(pageErrors)}`).toBeTruthy();

    // Optionally assert that error messages contain likely indicators of runtime issues (ReferenceError, TypeError, SyntaxError)
    const combined = consoleErrors.concat(pageErrors).join(' | ');
    const hasCommonJS = /ReferenceError|TypeError|SyntaxError|Uncaught|is not defined|failed/i.test(combined);
    expect(hasCommonJS, `Captured errors should indicate a runtime or load problem. Captured: ${combined}`).toBeTruthy();
  });
});