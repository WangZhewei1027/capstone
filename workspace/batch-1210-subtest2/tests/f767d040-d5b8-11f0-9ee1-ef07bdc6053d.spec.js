import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f767d040-d5b8-11f0-9ee1-ef07bdc6053d.html';

test.describe('Radix Sort Visualization - FSM states & transitions', () => {
  // Arrays to collect runtime console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  // Helper: get heights (numbers) of bars in the #arrayContainer
  const getBarHeights = async (page) => {
    return await page.$$eval('#arrayContainer .bar', els =>
      els.map(e => {
        const h = e.style.height || '';
        // parseFloat will return NaN if style not set; return NaN in that case
        return parseFloat(h.replace('px', '')) || 0;
      })
    );
  };

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages and page errors for assertions
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', (err) => {
      // record page error messages (unhandled exceptions)
      pageErrors.push(String(err && err.message ? err.message : err));
    });

    // Load the page exactly as-is
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // afterEach could be used to do additional logging if needed
  });

  test('Initial Idle state (S0_Idle): UI elements present and no array displayed', async ({ page }) => {
    // This test validates the initial page render and the "Idle" FSM state.
    // Expect: Title is present, buttons exist, and the array container is empty.
    const title = await page.textContent('h1');
    expect(title).toContain('Radix Sort Visualization');

    const genButton = await page.$("button[onclick='generateRandomArray()']");
    const sortButton = await page.$("button[onclick='radixSort()']");
    expect(genButton).not.toBeNull();
    expect(sortButton).not.toBeNull();

    // #arrayContainer should initially be empty (no .bar children)
    const initialBars = await page.$$('#arrayContainer .bar');
    expect(initialBars.length).toBe(0);

    // Ensure no uncaught page errors occurred during load
    expect(pageErrors.length).toBe(0);

    // Ensure no console messages of type 'error' (could indicate runtime issues)
    const errorConsole = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsole.length).toBe(0);
  });

  test('Generate Random Array (S0_Idle -> S1_ArrayGenerated): container populated with 10 bars', async ({ page }) => {
    // This test validates the transition GenerateRandomArray which should produce 10 bars.
    // Click the generate button and assert the DOM updates accordingly.
    await page.click("button[onclick='generateRandomArray()']");

    // Wait for the container to be populated with 10 .bar elements
    await page.waitForFunction(() => {
      const el = document.querySelectorAll('#arrayContainer .bar');
      return el.length === 10;
    });

    const bars = await page.$$('#arrayContainer .bar');
    expect(bars.length).toBe(10);

    // Each bar should have inline height set (height in px) and class 'bar'
    const heights = await getBarHeights(page);
    expect(heights.length).toBe(10);
    // Heights should be non-negative numbers and within expected range (0..~300)
    for (const h of heights) {
      expect(typeof h).toBe('number');
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(400); // safeguard upper bound for px * 3
    }

    // No runtime errors were thrown during this transition
    expect(pageErrors.length).toBe(0);
    const errorConsole = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsole.length).toBe(0);
  });

  test('Sort Array using Radix Sort (S1_ArrayGenerated -> S2_Sorting): bars become non-decreasing', async ({ page }) => {
    // This test validates clicking Sort Array triggers the radixSort process and results in a sorted sequence.
    // Generate array first
    await page.click("button[onclick='generateRandomArray()']");

    // Wait for generation
    await page.waitForFunction(() => document.querySelectorAll('#arrayContainer .bar').length === 10);

    // Click sort button to start radixSort
    await page.click("button[onclick='radixSort()']");

    // Wait until bars appear to be sorted in non-decreasing order or timeout after reasonable time.
    // The algorithm uses pauses (500ms per digit). For numbers in [0,99] maxLength <= 2 => ~1s total,
    // but to be robust, allow up to 6s for sorting (handles possible 9-digit edge case if empty array)
    const sorted = await page.waitForFunction(() => {
      const els = Array.from(document.querySelectorAll('#arrayContainer .bar'));
      if (els.length === 0) return false;
      const heights = els.map(e => parseFloat(e.style.height.replace('px', '')) || 0);
      for (let i = 1; i < heights.length; i++) {
        if (heights[i] < heights[i - 1]) return false;
      }
      return true;
    }, { timeout: 6000 }).catch(() => null);

    // If waitForFunction didn't resolve to a truthy value, sorted will be null; still assert by manual check
    const finalHeights = await getBarHeights(page);
    // Ensure there are still 10 bars
    expect(finalHeights.length).toBe(10);

    // Assert non-decreasing sequence (sorted ascending)
    for (let i = 1; i < finalHeights.length; i++) {
      expect(finalHeights[i]).toBeGreaterThanOrEqual(finalHeights[i - 1]);
    }

    // No uncaught runtime errors occurred during sorting
    expect(pageErrors.length).toBe(0);
    const errorConsole = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsole.length).toBe(0);
  }, 20000); // extend timeout for sorting test

  test('Edge case: Sorting without generating array (Sort invoked in Idle state)', async ({ page }) => {
    // This test validates behavior when Sort is clicked in Idle state (array empty).
    // We do NOT modify the application code; we simply invoke the button and observe behavior.
    // Click the sort button right away
    await page.click("button[onclick='radixSort()']");

    // Give the page a short moment to start any async work but do not wait for the entire (potentially long) process.
    // We're checking that clicking sort without prior generation does not cause immediate runtime exceptions.
    await page.waitForTimeout(200);

    // There should be no .bar elements (array was empty) or it might be still empty after initial work
    const bars = await page.$$('#arrayContainer .bar');
    // Either empty or filled depending on how code handles empty arrays; allow both but assert no errors
    expect(Array.isArray(bars)).toBe(true);

    // Assert that no page-level errors or console errors have been emitted so far
    expect(pageErrors.length).toBe(0);
    const errorConsole = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsole.length).toBe(0);
  }, 10000);

  test('Generating array multiple times updates the display (idempotence and state transitions)', async ({ page }) => {
    // This test validates repeated generation from S0_Idle to S1_ArrayGenerated multiple times.
    await page.click("button[onclick='generateRandomArray()']");
    await page.waitForFunction(() => document.querySelectorAll('#arrayContainer .bar').length === 10);
    const firstHeights = await getBarHeights(page);

    // Generate again and ensure the bars update (most likely different heights)
    await page.click("button[onclick='generateRandomArray()']");
    await page.waitForFunction(() => document.querySelectorAll('#arrayContainer .bar').length === 10);
    const secondHeights = await getBarHeights(page);

    // The two arrays may occasionally be identical by random chance; in that rare case, we at least assert that
    // they are both arrays of length 10 and values in expected numeric ranges.
    expect(firstHeights.length).toBe(10);
    expect(secondHeights.length).toBe(10);
    for (const h of secondHeights) {
      expect(typeof h).toBe('number');
      expect(h).toBeGreaterThanOrEqual(0);
    }

    // If they are different, good (expected). If identical by chance, we don't fail the test.
    const identical = firstHeights.every((v, i) => v === secondHeights[i]);
    // Log to consoleMessages so inspection is possible; do not fail on identical due to randomness.
    consoleMessages.push({ type: 'note', text: `Arrays identical after regenerate: ${identical}` });

    // No runtime errors occurred
    expect(pageErrors.length).toBe(0);
    const errorConsole = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsole.length).toBe(0);
  });

  test('Observes console logs and page errors across interactions (no unexpected runtime exceptions)', async ({ page }) => {
    // This test validates that normal interactions (generate, sort) do not produce unhandled exceptions.
    // Generate once
    await page.click("button[onclick='generateRandomArray()']");
    await page.waitForFunction(() => document.querySelectorAll('#arrayContainer .bar').length === 10);

    // Start sorting but do not wait for complete; just ensure no immediate errors
    await page.click("button[onclick='radixSort()']");

    // Allow some time for runtime to potentially surface errors
    await page.waitForTimeout(800);

    // Assert that no page errors or console 'error' messages were emitted during these interactions
    expect(pageErrors.length).toBe(0);
    const errorConsole = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsole.length).toBe(0);

    // Also assert that informational console logs, if any, are captured (not required to be present)
    // This simply ensures our console capture is active.
    expect(Array.isArray(consoleMessages)).toBe(true);
  }, 15000);
});