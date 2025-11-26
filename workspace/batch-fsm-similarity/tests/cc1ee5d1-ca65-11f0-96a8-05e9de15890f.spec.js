import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1ee5d1-ca65-11f0-96a8-05e9de15890f.html';

test.describe('Huffman Coding Demonstration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should initialize in Idle state', async ({ page }) => {
    const inputText = await page.locator('#inputText');
    const decodedOutput = await page.locator('#decodedOutput');
    
    // Verify initial state
    await expect(inputText).toHaveValue('this is an example for huffman encoding');
    await expect(decodedOutput).toHaveText('');
  });

  test('should show error when building with no input', async ({ page }) => {
    const buildBtn = await page.locator('#buildBtn');
    await page.fill('#inputText', ''); // Clear input
    await buildBtn.click();

    // Verify error alert
    await page.waitForTimeout(500); // Wait for alert to show
    const alertText = await page.evaluate(() => window.alert);
    expect(alertText).toContain('Please enter some text.');
  });

  test('should build Huffman tree and encode text', async ({ page }) => {
    const buildBtn = await page.locator('#buildBtn');
    await page.fill('#inputText', 'hello world'); // Input text
    await buildBtn.click();

    // Verify frequency table is populated
    const freqTable = await page.locator('#freqTable tbody tr');
    await expect(freqTable).toHaveCount(10); // Check for unique characters

    // Verify code table is populated
    const codeTable = await page.locator('#codeTable tbody tr');
    await expect(codeTable).toHaveCount(10); // Check for unique characters

    // Verify bitstring is generated
    const bitstringBox = await page.locator('#bitstringBox');
    await expect(bitstringBox).not.toHaveText('(empty)');
  });

  test('should load sample text', async ({ page }) => {
    const sampleBtn = await page.locator('#sampleBtn');
    await sampleBtn.click();

    // Verify sample text is loaded
    const inputText = await page.locator('#inputText');
    await expect(inputText).toHaveValue('Huffman coding is a compression algorithm that assigns shorter codes to more frequent symbols.');
  });

  test('should clear input and reset display', async ({ page }) => {
    const clearBtn = await page.locator('#clearBtn');
    await clearBtn.click();

    // Verify input is cleared and display is reset
    const inputText = await page.locator('#inputText');
    await expect(inputText).toHaveValue('');
    const freqTable = await page.locator('#freqTable tbody tr');
    await expect(freqTable).toHaveCount(0); // Frequency table should be empty
  });

  test('should decode valid bitstring', async ({ page }) => {
    const buildBtn = await page.locator('#buildBtn');
    await page.fill('#inputText', 'hello world');
    await buildBtn.click();

    const decodeBits = await page.locator('#decodeBits');
    await decodeBits.fill('101100111'); // Example bitstring
    const decodeBtn = await page.locator('#decodeBtn');
    await decodeBtn.click();

    // Verify decoded output
    const decodedOutput = await page.locator('#decodedOutput');
    await expect(decodedOutput).not.toHaveText('(no output)');
  });

  test('should show error for empty decode input', async ({ page }) => {
    const decodeBtn = await page.locator('#decodeBtn');
    await decodeBtn.click();

    // Verify empty decode output
    const decodedOutput = await page.locator('#decodedOutput');
    await expect(decodedOutput).toHaveText('(empty)');
  });

  test('should show error for invalid bitstring', async ({ page }) => {
    const decodeBits = await page.locator('#decodeBits');
    await decodeBits.fill('abc123'); // Invalid input
    const decodeBtn = await page.locator('#decodeBtn');
    await decodeBtn.click();

    // Verify error message
    const decodedOutput = await page.locator('#decodedOutput');
    await expect(decodedOutput).toHaveText('Invalid bits (only 0/1 allowed).');
  });

  test('should copy bits to clipboard', async ({ page }) => {
    const buildBtn = await page.locator('#buildBtn');
    await page.fill('#inputText', 'hello world');
    await buildBtn.click();

    const copyBits = await page.locator('#copyBits');
    await copyBits.click();

    // Verify copy success message
    await expect(copyBits).toHaveText('Copied!');
  });

  test('should download bits as text file', async ({ page }) => {
    const buildBtn = await page.locator('#buildBtn');
    await page.fill('#inputText', 'hello world');
    await buildBtn.click();

    const downloadBits = await page.locator('#downloadBits');
    await downloadBits.click();

    // Verify download link is created (this may require additional handling in a real test)
    const downloadLink = await page.locator('a[download="huffman_bits.txt"]');
    await expect(downloadLink).toBeVisible();
  });

  test('should reset view to final step', async ({ page }) => {
    const buildBtn = await page.locator('#buildBtn');
    await page.fill('#inputText', 'hello world');
    await buildBtn.click();

    const resetBtn = await page.locator('#resetBtn');
    await resetBtn.click();

    // Verify that the current step is reset to the final step
    const currStep = await page.locator('#currStep');
    const totalSteps = await page.locator('#totalSteps');
    await expect(currStep).toHaveText(totalSteps);
  });
});