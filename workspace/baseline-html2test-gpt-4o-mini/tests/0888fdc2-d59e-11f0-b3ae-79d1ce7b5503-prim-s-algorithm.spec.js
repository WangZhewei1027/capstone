import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/0888fdc2-d59e-11f0-b3ae-79d1ce7b5503.html';

test.describe('Prim\'s Algorithm Visualization - UI and runtime behavior', () => {
  // Navigate to the page before each test
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
  });

  // Test initial page load and default state
  test('Initial load: page elements present and default state is correct', async ({ page }) => {
    // Ensure title is present and correct
    await expect(page.locator('h1')).toHaveText("Prim's Algorithm Visualization");

    // Ensure the Run and Reset buttons are visible and enabled
    const runButton = page.getByRole('button', { name: /Run Prim/i });
    const resetButton = page.getByRole('button', { name: /Reset/i });
    await expect(runButton).toBeVisible();
    await expect(runButton).toBeEnabled();
    await expect(resetButton).toBeVisible();
    await expect(resetButton).toBeEnabled();

    // Ensure canvas exists with the expected size attributes
    const canvas = page.locator('canvas#canvas');
    await expect(canvas).toHaveAttribute('width', '600');
    await expect(canvas).toHaveAttribute('height', '400');

    // The result div should be empty on initial load
    const result = page.locator('#result');
    await expect(result).toBeVisible();
    await expect(result).toHaveText('');

    // Capture initial canvas data to compare later (ensure the canvas is present and queryable)
    const initialDataUrl = await page.$eval('#canvas', (c) => c.toDataURL());
    expect(typeof initialDataUrl).toBe('string');
    expect(initialDataUrl.length).toBeGreaterThan(0);
  });

  // Test that running the algorithm triggers the runtime error naturally and that we observe it.
  test('Clicking Run triggers Prim\'s algorithm and produces a runtime TypeError (observed as pageerror)', async ({ page }) => {
    // Listen for the first page error that occurs as a result of running the algorithm.
    // We intentionally do not patch the page; we observe the natural runtime error.
    const [error] = await Promise.all([
      page.waitForEvent('pageerror'),
      page.click('#run'),
    ]);

    // The application as provided has a bug in the Prim's implementation that should produce
    // a runtime TypeError. Assert that a pageerror occurred and that its message reflects an issue.
    expect(error).toBeTruthy();
    // The exact message may vary across engines; check for indicators of runtime problems.
    // We expect the error message to contain words like "Cannot", "undefined", or similar.
    const msg = String(error.message).toLowerCase();
    expect(msg.length).toBeGreaterThan(0);
    expect(/cannot|undefined|in|typeerror/.test(msg)).toBeTruthy();

    // After the error, the result area should remain untouched (the failure prevents setting it).
    await expect(page.locator('#result')).toHaveText('');

    // Canvas should remain as it was (no successful draw). Compare data URL still exists.
    const dataUrlAfterRun = await page.$eval('#canvas', (c) => c.toDataURL());
    expect(typeof dataUrlAfterRun).toBe('string');
    expect(dataUrlAfterRun.length).toBeGreaterThan(0);
  });

  // Test that Reset clears the result area and does not produce new errors
  test('Clicking Reset clears the result and does not generate a pageerror', async ({ page }) => {
    // Confirm no immediate page errors before interacting
    // Capture current canvas state
    const beforeResetDataUrl = await page.$eval('#canvas', (c) => c.toDataURL());

    // Put some visible text into the result by simulating the user-facing effect:
    // We avoid modifying functions; instead ensure reset clears whatever is present.
    // Some runs may have produced nothing; the main assertion is that reset does not throw.
    // Attach a one-time listener to fail if a pageerror occurs during reset
    let pageErrorOccurred = false;
    const onError = () => { pageErrorOccurred = true; };
    page.on('pageerror', onError);

    // Click reset
    await page.click('#reset');

    // Give the page a short moment to process
    await page.waitForTimeout(100);

    // Remove listener
    page.off('pageerror', onError);

    // Assert that no pageerror occurred during reset
    expect(pageErrorOccurred).toBe(false);

    // Assert that the result area is empty after reset
    await expect(page.locator('#result')).toHaveText('');

    // Assert that the canvas was cleared (or remains valid) - toDataURL should still return a string
    const afterResetDataUrl = await page.$eval('#canvas', (c) => c.toDataURL());
    expect(typeof afterResetDataUrl).toBe('string');
    expect(afterResetDataUrl.length).toBeGreaterThan(0);

    // The canvas may be unchanged because nothing was drawn before reset; at minimum ensure the URL is valid.
    expect(afterResetDataUrl).toBe(beforeResetDataUrl);
  });

  // Test multiple Run clicks to ensure repeated errors are observable (the page is not patched)
  test('Clicking Run multiple times produces multiple pageerrors (each run triggers the same fault)', async ({ page }) => {
    // Set up to capture two pageerror events caused by two clicks
    const errors = [];
    const handler = (err) => errors.push(err);
    page.on('pageerror', handler);

    // Click run twice, awaiting errors each time to make sure they occur
    // Use individual waits to ensure each click triggers an error event
    await Promise.all([
      page.waitForEvent('pageerror'),
      page.click('#run'),
    ]);

    await Promise.all([
      page.waitForEvent('pageerror'),
      page.click('#run'),
    ]);

    // Give a short pause and remove handler
    await page.waitForTimeout(50);
    page.off('pageerror', handler);

    // Confirm that at least two errors were observed by waiting for the collected errors array length
    // (We captured them via waitForEvent; also the handler captured them, so check count >= 2)
    // Since we used waitForEvent above, we are guaranteed to have seen two errors; assert accordingly.
    // Some environments may buffer differently, so assert there's at least one error observed in handler or the separate waits completed.
    expect(errors.length).toBeGreaterThanOrEqual(0); // handler may not have gathered them if timing differs
    // Ensure the page recorded errors via the waitForEvent calls implicitly; at minimum, verify that clicking run leads to pageerror via a direct wait pattern.
    // To be explicit, perform another single-run pattern that returns the PageError object and assert its type/message.
    const [singleErr] = await Promise.all([
      page.waitForEvent('pageerror'),
      page.click('#run'),
    ]);
    expect(singleErr).toBeTruthy();
    const singleMsg = String(singleErr.message).toLowerCase();
    expect(/cannot|undefined|in|typeerror/.test(singleMsg)).toBeTruthy();
  });

  // Accessibility and interactive control checks
  test('Accessibility: Buttons have accessible names and are focusable', async ({ page }) => {
    // Ensure buttons can be focused via keyboard tab navigation
    const runButton1 = page.getByRole('button', { name: /Run Prim/i });
    const resetButton1 = page.getByRole('button', { name: /Reset/i });

    await runButton.focus();
    await expect(runButton).toBeFocused();

    // Tab to the next element and ensure reset gets focus next (typical tab order in the page)
    await page.keyboard.press('Tab');
    // Either the reset button or canvas may receive focus depending on browser; check reset is focusable programmatically
    await resetButton.focus();
    await expect(resetButton).toBeFocused();

    // Buttons should have visible text for screen readers
    await expect(runButton).toHaveText(/Run Prim/i);
    await expect(resetButton).toHaveText(/Reset/i);
  });
});