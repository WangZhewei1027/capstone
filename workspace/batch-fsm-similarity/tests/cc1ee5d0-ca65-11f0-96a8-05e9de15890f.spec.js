import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1ee5d0-ca65-11f0-96a8-05e9de15890f.html';

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe('Longest Common Subsequence Visualizer', () => {

  test('should compute DP table and transition to DPComputed state', async ({ page }) => {
    // Input two strings
    await page.fill('#a', 'ABCBDAB');
    await page.fill('#b', 'BDCAB');
    
    // Click the Compute button
    await page.click('#compute');

    // Verify the DP table is rendered
    const tableExists = await page.isVisible('table.lcs');
    expect(tableExists).toBe(true);

    // Verify the length badge is updated
    const lengthBadge = await page.textContent('#lengthBadge');
    expect(lengthBadge).toMatch(/LCS length: \d+/);

    // Verify the one LCS display is updated
    const oneLCS = await page.textContent('#oneLCS');
    expect(oneLCS).toMatch(/Sequence: .+/);
  });

  test('should randomize inputs and compute DP table', async ({ page }) => {
    // Click the Random Strings button
    await page.click('#random');

    // Verify that the inputs are filled with random strings
    const inputA = await page.inputValue('#a');
    const inputB = await page.inputValue('#b');
    expect(inputA.length).toBeGreaterThan(0);
    expect(inputB.length).toBeGreaterThan(0);

    // Click the Compute button
    await page.click('#compute');

    // Verify the DP table is rendered
    const tableExists = await page.isVisible('table.lcs');
    expect(tableExists).toBe(true);
  });

  test('should clear the input and reset the state', async ({ page }) => {
    // Fill inputs and compute DP
    await page.fill('#a', 'ABCBDAB');
    await page.fill('#b', 'BDCAB');
    await page.click('#compute');

    // Click the Clear button
    await page.click('#clear');

    // Verify that the inputs are cleared
    const inputA = await page.inputValue('#a');
    const inputB = await page.inputValue('#b');
    expect(inputA).toBe('');
    expect(inputB).toBe('');

    // Verify that the DP table is cleared
    const tableExists = await page.isVisible('table.lcs');
    expect(tableExists).toBe(false);
  });

  test('should step through backtrack path', async ({ page }) => {
    // Input two strings and compute DP
    await page.fill('#a', 'ABCBDAB');
    await page.fill('#b', 'BDCAB');
    await page.click('#compute');

    // Click the Step Backtrack button
    await page.click('#step');

    // Verify that the current cell is highlighted
    const currentCell = await page.isVisible('td.current');
    expect(currentCell).toBe(true);
  });

  test('should play backtrack animation', async ({ page }) => {
    // Input two strings and compute DP
    await page.fill('#a', 'ABCBDAB');
    await page.fill('#b', 'BDCAB');
    await page.click('#compute');

    // Click the Play button
    await page.click('#play');

    // Wait for a short duration to allow animation to play
    await page.waitForTimeout(500);

    // Verify that the play button text changes to "Stop"
    const playButtonText = await page.textContent('#play');
    expect(playButtonText).toBe('Stop');
  });

  test('should reset highlights', async ({ page }) => {
    // Input two strings and compute DP
    await page.fill('#a', 'ABCBDAB');
    await page.fill('#b', 'BDCAB');
    await page.click('#compute');

    // Click the Step Backtrack button
    await page.click('#step');

    // Click the Reset Highlights button
    await page.click('#resetHighlight');

    // Verify that no cell is highlighted
    const currentCell = await page.isVisible('td.current');
    expect(currentCell).toBe(false);
  });

  test('should find all LCS', async ({ page }) => {
    // Input two strings and compute DP
    await page.fill('#a', 'ABCBDAB');
    await page.fill('#b', 'BDCAB');
    await page.click('#compute');

    // Click the Find All LCS button
    await page.click('#findAll');

    // Wait for results to be computed
    await page.waitForTimeout(100);

    // Verify that results are displayed
    const allResults = await page.textContent('#allResults');
    expect(allResults).not.toMatch(/Press "Find All LCS" to enumerate sequences/);
  });

  test('should change tie-breaker and update LCS', async ({ page }) => {
    // Input two strings and compute DP
    await page.fill('#a', 'ABCBDAB');
    await page.fill('#b', 'BDCAB');
    await page.click('#compute');

    // Change the tie-breaker
    await page.selectOption('#tiebreaker', 'up');

    // Verify that the one LCS display is updated
    const oneLCS = await page.textContent('#oneLCS');
    expect(oneLCS).toMatch(/Sequence: .+/);
  });

  test('should toggle autoplay', async ({ page }) => {
    // Input two strings and compute DP
    await page.fill('#a', 'ABCBDAB');
    await page.fill('#b', 'BDCAB');
    await page.click('#compute');

    // Toggle the autoplay checkbox
    await page.check('#autoplay');

    // Verify that the autoplay checkbox is checked
    const isChecked = await page.isChecked('#autoplay');
    expect(isChecked).toBe(true);
  });

  test('should change speed slider', async ({ page }) => {
    // Input two strings and compute DP
    await page.fill('#a', 'ABCBDAB');
    await page.fill('#b', 'BDCAB');
    await page.click('#compute');

    // Change the speed slider
    await page.fill('#speed', '800');

    // Verify that the speed input value is updated
    const speedValue = await page.inputValue('#speed');
    expect(speedValue).toBe('800');
  });

  test('should highlight a cell when clicked', async ({ page }) => {
    // Input two strings and compute DP
    await page.fill('#a', 'ABCBDAB');
    await page.fill('#b', 'BDCAB');
    await page.click('#compute');

    // Click on a cell in the DP table
    await page.click('table.lcs td');

    // Verify that the cell is highlighted
    const highlightedCell = await page.isVisible('td.current');
    expect(highlightedCell).toBe(true);
  });

});