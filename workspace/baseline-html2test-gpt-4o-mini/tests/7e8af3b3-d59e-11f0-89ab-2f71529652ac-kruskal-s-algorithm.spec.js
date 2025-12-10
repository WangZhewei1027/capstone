import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8af3b3-d59e-11f0-89ab-2f71529652ac.html';

// Test file for Kruskal's Algorithm visualization
// Filename requirement: 7e8af3b3-d59e-11f0-89ab-2f71529652ac-kruskal-s-algorithm.spec.js
// These tests validate page load, presence of interactive elements, and interactions with the algorithm.
// They also observe console and page errors (if any) and assert on them.

test.describe('Kruskal\'s Algorithm Visualization - Initial load and UI', () => {
  // Arrays to collect runtime errors and console error messages for assertions
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console error-level messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Collect uncaught exceptions reported by the page
    page.on('pageerror', error => {
      // capture the message so tests can assert on presence/absence
      pageErrors.push(error && error.message ? error.message : String(error));
    });

    // Load the application page exactly as-is
    await page.goto(APP_URL);
  });

  test('Page loads and displays title, canvas, and Run button', async ({ page }) => {
    // Verify the document title text is present
    const heading = await page.locator('h1').innerText();
    expect(heading).toMatch(/Kruskal's Algorithm Visualization/i);

    // Verify canvas element is present and visible
    const canvas = page.locator('canvas#canvas');
    await expect(canvas).toBeVisible();

    // Verify the run button exists and has the expected accessible name
    const runButton = page.getByRole('button', { name: /Run Kruskal/i });
    await expect(runButton).toBeVisible();
    await expect(runButton).toHaveText(/Run Kruskal's Algorithm/i);

    // Assert that there were no console errors or uncaught page errors on initial load
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Top-level algorithm functions are exposed and callable', async ({ page }) => {
    // Verify that the runKruskal function exists in page global scope (function declared at top-level)
    const typeOfRun = await page.evaluate(() => typeof runKruskal);
    expect(typeOfRun).toBe('function');

    // Verify helper functions find and union are available as functions
    const typeFind = await page.evaluate(() => typeof find);
    const typeUnion = await page.evaluate(() => typeof union);
    expect(typeFind).toBe('function');
    expect(typeUnion).toBe('function');

    // No console errors or page errors should have been emitted by simply exposing functions
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});

test.describe('Kruskal algorithm interactions and behavior', () => {
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      pageErrors.push(error && error.message ? error.message : String(error));
    });

    await page.goto(APP_URL);
  });

  test('Clicking "Run Kruskal\'s Algorithm" executes without throwing and does not emit errors', async ({ page }) => {
    // Comment: Ensure button invocation can be performed by a user
    const runButton1 = page.getByRole('button', { name: /Run Kruskal/i });
    await expect(runButton).toBeVisible();

    // Click the button which triggers runKruskal() via onclick attribute
    await runButton.click();

    // Wait briefly to allow drawing and algorithm execution to complete
    await page.waitForTimeout(150); // short wait; drawing operations are synchronous but allow event loop to settle

    // Ensure runKruskal when invoked via click did not cause uncaught page errors
    expect(pageErrors).toEqual([]);
    // Also no console error-level messages
    expect(consoleErrors).toEqual([]);

    // Confirm that calling runKruskal directly from page context returns (undefined) and doesn't throw
    const rv = await page.evaluate(() => {
      try {
        return { result: runKruskal(), threw: false };
      } catch (e) {
        return { result: String(e), threw: true };
      }
    });
    expect(rv.threw).toBe(false);
    // runKruskal returns undefined; assert explicit undefined result
    expect(rv.result).toBeUndefined();
  });

  test('Invoking helper functions find and union operate correctly when used manually', async ({ page }) => {
    // Comment: Test union-find behavior in isolation using arrays created in page context
    const result = await page.evaluate(() => {
      // Create parent and rank arrays similar to runKruskal initialization
      const parent = [0, 1, 2, 3];
      const rank = [0, 0, 0, 0];

      // Use the global union and find functions defined by the app
      // Initially, each node is its own parent
      const beforeFind0 = find(parent, 0);
      const beforeFind1 = find(parent, 1);

      // Union nodes 0 and 1 via their indices - union expects roots but handles find internally in the app's implementation
      union(parent, rank, 0, 1);

      const afterFind0 = find(parent, 0);
      const afterFind1 = find(parent, 1);

      // Now union 2 and 3
      union(parent, rank, 2, 3);
      const afterFind2 = find(parent, 2);
      const afterFind3 = find(parent, 3);

      // Finally union the two sets (roots of 0 and 2)
      union(parent, rank, afterFind0, afterFind2);
      const finalRoot0 = find(parent, 0);
      const finalRoot3 = find(parent, 3);

      return {
        beforeFind0,
        beforeFind1,
        afterFind0,
        afterFind1,
        afterFind2,
        afterFind3,
        finalRoot0,
        finalRoot3,
        parentSnapshot: parent,
        rankSnapshot: rank
      };
    });

    // Assertions to verify union-find produced merged sets as expected
    expect(result.beforeFind0).toBe(0);
    expect(result.beforeFind1).toBe(1);

    // After union(0,1) the roots of 0 and 1 should be equal
    expect(result.afterFind0).toBe(result.afterFind1);

    // After union(2,3) roots should be equal
    expect(result.afterFind2).toBe(result.afterFind3);

    // After union of the two sets, final roots for 0 and 3 should be equal
    expect(result.finalRoot0).toBe(result.finalRoot3);

    // Ensure internal parent and rank arrays have been mutated (sanity check)
    expect(Array.isArray(result.parentSnapshot)).toBe(true);
    expect(Array.isArray(result.rankSnapshot)).toBe(true);

    // No unexpected page errors or console errors emitted during helper invocation
    const consoleErrs = await page.evaluate(() => 0); // no-op to ensure state stabilized
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Clicking the Run button multiple times is idempotent and produces no uncaught exceptions', async ({ page }) => {
    // Comment: Some implementations might throw when algorithm mutates shared state; test repeated invocations
    const runButton2 = page.getByRole('button', { name: /Run Kruskal/i });
    await expect(runButton).toBeVisible();

    // Click the button a few times with small delays
    await runButton.click();
    await page.waitForTimeout(50);
    await runButton.click();
    await page.waitForTimeout(50);
    await runButton.click();
    await page.waitForTimeout(100);

    // Assert no uncaught page errors were emitted
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});

test.describe('Visual and DOM checks after algorithm execution', () => {
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      pageErrors.push(error && error.message ? error.message : String(error));
    });

    await page.goto(APP_URL);
  });

  test('Canvas element remains present and has drawing operations after running algorithm', async ({ page }) => {
    // Comment: We can't directly inspect the drawn pixels reliably given CSS vs internal canvas size,
    // but we can call toDataURL and ensure it returns a non-empty data URL after running the algorithm.
    const runButton3 = page.getByRole('button', { name: /Run Kruskal/i });
    await runButton.click();

    // Allow drawing to complete
    await page.waitForTimeout(150);

    // Request a data URL representing the canvas bitmap
    const dataUrl = await page.evaluate(() => {
      const canvas1 = document.getElementById('canvas1');
      // toDataURL may still succeed even if some drawing is off-canvas; ensure it returns a string that starts with data:
      try {
        return canvas.toDataURL();
      } catch (e) {
        return `ERROR:${String(e)}`;
      }
    });

    // Assert that we got a data URL back (or at least not an error string)
    expect(typeof dataUrl).toBe('string');
    expect(dataUrl.length).toBeGreaterThan(0);
    expect(dataUrl.startsWith('data:')).toBeTruthy();

    // Ensure no page-level errors occurred during drawing
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('Accessibility check: Run button accessible by role and name', async ({ page }) => {
    // Comment: Verify that the interactive control is discoverable by accessible role and label
    const runButton4 = page.getByRole('button', { name: /Run Kruskal/i });
    await expect(runButton).toBeVisible();
    await expect(runButton).toBeEnabled();
    // Keyboard focus should be possible
    await runButton.focus();
    expect(await runButton.evaluate((el) => document.activeElement === el)).toBe(true);

    // No errors produced by focusing
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});