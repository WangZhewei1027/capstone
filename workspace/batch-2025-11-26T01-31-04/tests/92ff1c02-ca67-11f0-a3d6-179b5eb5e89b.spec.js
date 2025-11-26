import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92ff1c02-ca67-11f0-a3d6-179b5eb5e89b.html';

test.describe('Huffman Coding Demonstration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('Initial state is Idle', async ({ page }) => {
    const errorMsg = await page.locator('#errorMsg').innerText();
    expect(errorMsg).toBe('');
    const outputVisible = await page.locator('#output').isVisible();
    expect(outputVisible).toBe(false);
  });

  test('Error message displayed when input is empty', async ({ page }) => {
    await page.click('#generateBtn');
    const errorMsg = await page.locator('#errorMsg').innerText();
    expect(errorMsg).toBe('Please enter some text to encode.');
  });

  test('Generates Huffman codes successfully', async ({ page }) => {
    await page.fill('#inputText', 'this is an example for huffman encoding');
    await page.click('#generateBtn');

    // Check that the output is now visible
    const outputVisible = await page.locator('#output').isVisible();
    expect(outputVisible).toBe(true);

    // Check frequency table is populated
    const freqTableRows = await page.locator('#freqTable tbody tr').count();
    expect(freqTableRows).toBeGreaterThan(0);

    // Check codes table is populated
    const codesTableRows = await page.locator('#codesTable tbody tr').count();
    expect(codesTableRows).toBeGreaterThan(0);

    // Check encoded output is displayed
    const encodedOutput = await page.locator('#encodedOutput').innerText();
    expect(encodedOutput).not.toBe('');
  });

  test('Displays error when input is empty and generate is clicked again', async ({ page }) => {
    await page.fill('#inputText', '');
    await page.click('#generateBtn');
    const errorMsg = await page.locator('#errorMsg').innerText();
    expect(errorMsg).toBe('Please enter some text to encode.');

    // Clear the error message
    await page.click('#generateBtn');
    const clearedErrorMsg = await page.locator('#errorMsg').innerText();
    expect(clearedErrorMsg).toBe(''); // Error message should be cleared
  });

  test('Check visual feedback of the Huffman tree', async ({ page }) => {
    await page.fill('#inputText', 'test');
    await page.click('#generateBtn');

    // Check if the tree SVG is rendered
    const treeContainerVisible = await page.locator('#treeSVGContainer').isVisible();
    expect(treeContainerVisible).toBe(true);
  });

  test('Check compression ratio calculation', async ({ page }) => {
    await page.fill('#inputText', 'this is a test for huffman coding');
    await page.click('#generateBtn');

    const origBits = await page.locator('#origBits').innerText();
    const encodedBits = await page.locator('#encodedBits').innerText();
    const compressionRatio = await page.locator('#compressionRatio').innerText();

    expect(origBits).toMatch(/\d+ bits/);
    expect(encodedBits).toMatch(/\d+ bits/);
    expect(compressionRatio).toMatch(/[\d.]+ \(.*%\s+size reduction\)/);
  });
});