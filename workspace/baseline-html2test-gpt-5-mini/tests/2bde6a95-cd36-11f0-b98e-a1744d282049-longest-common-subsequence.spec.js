import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde6a95-cd36-11f0-b98e-a1744d282049.html';

test.describe('LCS Visualizer - Longest Common Subsequence (UI & behavior)', () => {
  // Keep lists of console messages and page errors observed during each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages for later assertions
    page.on('console', msg => {
      try {
        consoleMessages.push(`${msg.type()}: ${msg.text()}`);
      } catch (e) {
        consoleMessages.push(`console: <could not read message>`);
      }
    });

    // Capture uncaught page errors
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the app
    await page.goto(APP_URL);
    // Wait for basic UI to render - the container should be present
    await page.waitForSelector('.container', { state: 'visible' });
  });

  test.afterEach(async ({ }, testInfo) => {
    // If pageErrors occurred, serialize them into test output for debugging
    if (pageErrors.length) {
      // Attach in test output (Playwright will show console)
      for (const e of pageErrors) {
        testInfo.attach('pageerror', { body: String(e) });
      }
    }
  });

  test('Initial load: default inputs and computed summary / DP matrix render', async ({ page }) => {
    // Verify the default textareas have expected default strings
    const strA = await page.locator('#strA').inputValue();
    const strB = await page.locator('#strB').inputValue();
    expect(strA).toBe('AGGTAB');
    expect(strB).toBe('GXTXAYB');

    // The initial renderAll() runs on load. Expect the summary to show LCS length and a greedy badge.
    const summary = page.locator('#summary');
    await expect(summary).toContainText('LCS length');
    // The LCS length for the default strings AGGTAB & GXTXAYB should be 4 (a well-known example).
    // Locate the first badge inside summary which holds the length.
    const badges = summary.locator('.badge');
    await expect(badges).toHaveCount(2); // length and greedy example badges
    await expect(badges.nth(0)).toHaveText('4');

    // Matrix should be present
    const table = page.locator('table.matrix');
    await expect(table).toBeVisible();

    // Verify header row includes the characters of B in order
    const headerRow = table.locator('thead tr').first();
    const headerTexts = await headerRow.allTextContents();
    // headerTexts might include empty and '∅' plus B characters concatenated. Check for B letters presence.
    for (const ch of ['G','X','T','X','A','Y','B']) {
      expect(headerTexts.join('')).toContain(ch);
    }

    // There should be 'match' cells for matching characters. For this example expect at least 4 match-markers present (some matches along path).
    const matchCells = page.locator('table.matrix td.match');
    await expect(matchCells.count()).toBeGreaterThanOrEqual(4);

    // Ensure no unexpected uncaught page errors on load
    expect(pageErrors.length, `Page errors during initial load: ${pageErrors.map(String).join('; ')}`).toBe(0);

    // Confirm the console contains a friendly startup message
    const anyConsole = consoleMessages.join('\n');
    expect(anyConsole).toContain('LCS Visualizer ready');
  });

  test('Compute LCS after changing inputs: updates summary, matrix, and match cells', async ({ page }) => {
    // Set both inputs to identical small strings to exercise matches
    await page.locator('#strA').fill('ABC');
    await page.locator('#strB').fill('ABC');

    // Click Compute
    await page.locator('#computeBtn').click();

    // Expect the summary to update with length = 3
    const summary1 = page.locator('#summary1');
    await expect(summary).toContainText('LCS length');
    const lengthBadge = summary.locator('.badge').first();
    await expect(lengthBadge).toHaveText('3');

    // The greedy example badge should show 'ABC'
    const greedyBadge = summary.locator('.badge').nth(1);
    await expect(greedyBadge).toHaveText('ABC');

    // Matrix match cells should be 3 (diagonal matches)
    const matchCells1 = page.locator('table.matrix td.match');
    await expect(matchCells).toHaveCount(3);

    // The bottom-right cell (full dp value) should show 3
    const bottomRight = page.locator('table.matrix td[data-i="3"][data-j="3"]');
    await expect(bottomRight).toHaveText('3');

    // Verify no page errors produced during compute
    expect(pageErrors.length).toBe(0);
  });

  test('Show all distinct LCS strings when "Show all" is toggled (small example with multiple LCS)', async ({ page }) => {
    // Use strings that produce two distinct LCS of length 1: "AG" and "GA" -> possible LCS 'A' and 'G'
    await page.locator('#strA').fill('AG');
    await page.locator('#strB').fill('GA');

    // Toggle "Show all" and set a large limit
    await page.locator('#showAll').check();
    await page.locator('#limit').fill('100');
    await page.locator('#computeBtn').click();

    // lcsList should contain chips for the distinct LCS strings
    const chips = page.locator('#lcsList .chip');
    // There should be at least two distinct chips ('A' and 'G')
    await expect(chips).toHaveCount(2);

    // Collect chip texts and assert they include 'A' and 'G' (order not guaranteed)
    const chipTexts = await chips.allTextContents();
    expect(new Set(chipTexts)).toEqual(new Set(['A','G']));

    // Click the first chip to attempt to highlight its path - should not throw
    await chips.first().click();

    // After clicking a chip, foot may indicate failure to locate exhaustive path or be silent; ensure no uncaught page error occurred
    expect(pageErrors.length).toBe(0);
  });

  test('Backtracking controls: highlight greedy path, step backtracking and reset', async ({ page }) => {
    // Use default strings that were loaded on page load (AGGTAB / GXTXAYB) but recompute to ensure state
    await page.locator('#strA').fill('AGGTAB');
    await page.locator('#strB').fill('GXTXAYB');
    await page.locator('#computeBtn').click();

    // Click highlight button to toggle greedy path highlighting
    const highlightBtn = page.locator('#highlightBtn');
    await highlightBtn.click();

    // Some TDs should now have the 'path' class
    const pathCells = page.locator('table.matrix td.path');
    // There should be at least one highlighted cell
    await expect(pathCells.count()).toBeGreaterThan(0);

    // Click step backtracking - should update metaInfo to include 'Backtracking step'
    await page.locator('#stepBtn').click();
    const metaInfo = page.locator('#metaInfo');
    await expect(metaInfo).toContainText('Backtracking step');

    // Click reset step: should clear highlighting and set metaInfo text to 'Backtracking reset.'
    await page.locator('#resetStep').click();
    await expect(metaInfo).toHaveText('Backtracking reset.');

    // After reset, there should be zero td.path cells
    await expect(page.locator('table.matrix td.path').count()).toBe(0);

    // No uncaught page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Clicking on DP cells reconstructs greedy LCS from that cell and updates summary', async ({ page }) => {
    // Prepare a known small example
    await page.locator('#strA').fill('ABC');
    await page.locator('#strB').fill('ABC');
    await page.locator('#computeBtn').click();

    // Click the full dp cell (3,3) — greedy from (3,3) should be "ABC"
    const fullCell = page.locator('table.matrix td[data-i="3"][data-j="3"]');
    await fullCell.click();

    // Summary should reflect greedy from (3,3) => "ABC"
    const summary2 = page.locator('#summary2');
    await expect(summary).toContainText('Greedy from (3,3)');
    await expect(summary).toContainText('"ABC"');

    // Click an empty upper-left cell (0,0) which should produce empty LCS
    const emptyCell = page.locator('table.matrix td[data-i="0"][data-j="0"]');
    await emptyCell.click();
    await expect(summary).toContainText('Greedy from (0,0) => empty LCS');

    // Ensure no page errors were thrown by cell clicks
    expect(pageErrors.length).toBe(0);
  });

  test('Random example button populates inputs and triggers computation', async ({ page }) => {
    // Click random example
    await page.locator('#randomBtn').click();

    // After clicking, the textareas should be populated with non-empty strings
    const aVal = await page.locator('#strA').inputValue();
    const bVal = await page.locator('#strB').inputValue();
    expect(aVal.length).toBeGreaterThanOrEqual(6);
    expect(bVal.length).toBeGreaterThanOrEqual(6);

    // Summary should reflect an LCS length badge (a number)
    const lengthBadge1 = page.locator('#summary .badge').first();
    await expect(lengthBadge).toHaveText(/^\d+$/);

    // Matrix should exist
    await expect(page.locator('table.matrix')).toBeVisible();

    // No uncaught page errors from random generation
    expect(pageErrors.length).toBe(0);
  });

  test('Edge case: empty input strings show a danger message and clear UI', async ({ page }) => {
    // Clear inputs to empty
    await page.locator('#strA').fill('');
    await page.locator('#strB').fill('');
    await page.locator('#computeBtn').click();

    // Summary should contain the danger message
    const summary3 = page.locator('#summary3');
    await expect(summary).toContainText('Both strings must be non-empty to compute LCS.');

    // Matrix should be cleared
    await expect(page.locator('#matrixContainer').locator('table.matrix').count()).toBe(0);

    // metaInfo and lcsList should be empty
    await expect(page.locator('#metaInfo')).toHaveText('');
    await expect(page.locator('#lcsList')).toHaveText('');

    // No page errors
    expect(pageErrors.length).toBe(0);
  });
});