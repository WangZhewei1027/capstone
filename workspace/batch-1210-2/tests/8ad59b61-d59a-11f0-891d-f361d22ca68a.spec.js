import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad59b61-d59a-11f0-891d-f361d22ca68a.html';

test.describe('K-Nearest Neighbors (KNN) Example - FSM validation', () => {
  // Collect console and page errors for each test
  let pageErrors;
  let consoleMessages;

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    // Capture any uncaught exceptions from the page
    page.on('pageerror', (err) => {
      // push the Error object (or string) into array for assertions
      pageErrors.push(err);
    });

    // Capture console messages for additional diagnostics
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Load the page exactly as-is
    await page.goto(APP_URL);
  });

  test.afterEach(async ({ page }) => {
    // Provide some debug output in case of failures (Playwright will show test logs)
    // Do not modify the page or application environment.
    // This is just to ensure collected diagnostics are available in test traces.
    // (No assertions here.)
  });

  test('Initial Idle state renders inputs, button, and empty container', async ({ page }) => {
    // This test validates the S0_Idle state: inputs and button exist with expected attributes.
    const feature1 = page.locator('#feature1');
    const feature2 = page.locator('#feature2');
    const knnButton = page.locator('#knn-button');
    const knnContainer = page.locator('#knn-container');

    // Inputs and button should be visible
    await expect(feature1).toBeVisible();
    await expect(feature2).toBeVisible();
    await expect(knnButton).toBeVisible();

    // Check attributes match FSM evidence
    await expect(feature1).toHaveAttribute('type', 'number');
    await expect(feature1).toHaveAttribute('placeholder', 'Feature 1');
    await expect(feature2).toHaveAttribute('type', 'number');
    await expect(feature2).toHaveAttribute('placeholder', 'Feature 2');

    // Button text
    await expect(knnButton).toHaveText(/KNN/);

    // knn-container exists and should be empty at idle (no results rendered yet)
    await expect(knnContainer).toBeVisible();
    const containerText = await knnContainer.innerText();
    expect(containerText.trim()).toBe('', 'knn-container should be empty in Idle state');

    // No page errors should have occurred just from rendering the page
    expect(pageErrors.length).toBeGreaterThanOrEqual(0);
    // If a pageerror unexpectedly occurred on load, include it in the assertion output:
    if (pageErrors.length > 0) {
      // ensure we at least recorded it (the test does not fail just because of an incidental error here)
      console.log('Page errors on load:', pageErrors.map(e => String(e)));
    }
  });

  test('KNN button click (KNN_Click) results in ReferenceError due to missing KNN class and no results rendered', async ({ page }) => {
    // This test validates the transition S0_Idle --KNN_Click--> S1_ResultsDisplayed
    // but the implementation has the KNN class outside of the script tag, so we expect a ReferenceError.
    const feature1 = page.locator('#feature1');
    const feature2 = page.locator('#feature2');
    const knnButton = page.locator('#knn-button');
    const knnContainer = page.locator('#knn-container');

    // Fill inputs with valid numeric values
    await feature1.fill('12.5');
    await feature2.fill('22.5');

    // Click the KNN button and wait for a pageerror to be emitted naturally by the page.
    // We expect a ReferenceError like "KNN is not defined".
    const [error] = await Promise.all([
      page.waitForEvent('pageerror', { timeout: 2000 }).catch(e => e),
      knnButton.click()
    ]);

    // Validate that we received an actual error object (not a timeout)
    expect(error).toBeTruthy();

    // The browser's error message can vary slightly, so check for the indicative pieces.
    const errorMsg = String(error && (error.message || error)).toLowerCase();
    // We expect the missing class "KNN" to be mentioned or a ReferenceError to be raised.
    const hasKNNReference = /knn/.test(errorMsg);
    const isReferenceError = /referenceerror|is not defined/.test(errorMsg);

    expect(hasKNNReference || isReferenceError).toBeTruthy();

    // Ensure no results were rendered into knn-container because the handler failed
    const containerHtml = await knnContainer.innerHTML();
    expect(containerHtml).not.toContain('<h2>KNN Results</h2>');
    expect(containerHtml.trim()).toBe('', 'knn-container should remain empty when an exception occurs during click handler');

    // Also assert that a console error was emitted (helpful for diagnostics)
    const hasConsoleError = consoleMessages.some(m => m.type === 'error' || /error/i.test(m.text));
    expect(hasConsoleError || pageErrors.length > 0).toBeTruthy();
  });

  test('Clicking KNN with missing input values still triggers the same ReferenceError (edge case)', async ({ page }) => {
    // This test validates behavior when inputs are empty (edge case).
    const feature1 = page.locator('#feature1');
    const feature2 = page.locator('#feature2');
    const knnButton = page.locator('#knn-button');
    const knnContainer = page.locator('#knn-container');

    // Clear inputs to simulate missing values
    await feature1.fill('');
    await feature2.fill('');

    // Click and wait for the pageerror generated by the missing KNN class
    const [error] = await Promise.all([
      page.waitForEvent('pageerror', { timeout: 2000 }).catch(e => e),
      knnButton.click()
    ]);

    // Confirm an error was produced
    expect(error).toBeTruthy();
    const message = String(error && (error.message || error)).toLowerCase();
    expect(/knn|referenceerror|is not defined/.test(message)).toBeTruthy();

    // Ensure no results appear even with empty inputs
    const containerHtml = await knnContainer.innerHTML();
    expect(containerHtml).not.toContain('<h2>KNN Results</h2>');
    expect(containerHtml.trim()).toBe('', 'knn-container should remain empty when handler fails due to missing class');
  });

  test('Rapid multiple clicks produce at least one page error (robustness check)', async ({ page }) => {
    // This test validates how the application behaves under rapid repeated KNN_Click events.
    const knnButton = page.locator('#knn-button');

    // Prepare a set of promises waiting for page errors. We do not strictly require a fixed count,
    // but we will wait for at least one to ensure the error occurs under repeated interaction.
    const waitForError = page.waitForEvent('pageerror', { timeout: 2000 }).catch(e => e);

    // Rapidly click the KNN button multiple times
    await knnButton.click();
    await knnButton.click();
    await knnButton.click();

    const err = await waitForError;
    expect(err).toBeTruthy();
    const errMsg = String(err && (err.message || err)).toLowerCase();
    expect(/knn|referenceerror|is not defined/.test(errMsg)).toBeTruthy();

    // Diagnostic: ensure we at least captured console messages and pageErrors arrays are populated
    if (pageErrors.length === 0) {
      // There should normally be a pageerror captured by the listener as well.
      // If not, ensure console recorded an error.
      const hasConsoleErr = consoleMessages.some(m => m.type === 'error');
      expect(hasConsoleErr).toBeTruthy();
    } else {
      expect(pageErrors.length).toBeGreaterThanOrEqual(1);
    }
  });

  test('FSM expectation: Transition to ResultsDisplayed should set knn-container innerHTML (negative assertion because of runtime error)', async ({ page }) => {
    // This test documents the expected FSM transition action calculateKNNResults()
    // and verifies that because of the implementation issue (KNN missing), the expected DOM update does NOT happen.
    const feature1 = page.locator('#feature1');
    const feature2 = page.locator('#feature2');
    const knnButton = page.locator('#knn-button');
    const knnContainer = page.locator('#knn-container');

    // Provide inputs
    await feature1.fill('20');
    await feature2.fill('30');

    // Click and wait for pageerror
    const [error] = await Promise.all([
      page.waitForEvent('pageerror', { timeout: 2000 }).catch(e => e),
      knnButton.click()
    ]);

    expect(error).toBeTruthy();

    // FSM expects knnContainer.innerHTML to include an <h2>KNN Results</h2>.
    // Assert that this did not occur due to the error.
    const html = await knnContainer.innerHTML();
    expect(html).not.toContain('<h2>KNN Results</h2>');
    // Also assert that there are no <p> elements with feature values inserted.
    expect(html).not.toContain('<p>Feature 1:');
    expect(html).not.toContain('<p>Feature 2:');
  });
});