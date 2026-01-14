import { test, expect } from '@playwright/test';

test.describe('Huffman Coding Demo - UI and functionality tests', () => {
  // URL under test
  const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e0a0750-d5a0-11f0-8040-510e90b1f3a7.html';

  // containers to capture console errors and page errors during a test
  let consoleErrors;
  let pageErrors;

  // Set up listeners and navigate before each test
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages of type 'error'
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture unhandled page errors
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    await page.goto(APP_URL);
    // Ensure page loaded and main elements are present
    await expect(page.locator('h1')).toHaveText('Huffman Coding Demo');
    await expect(page.locator('#inputText')).toBeVisible();
    await expect(page.locator('button', { hasText: 'Encode Text' })).toBeVisible();
  });

  // After each test ensure there were no uncaught errors reported on the page
  test.afterEach(async () => {
    // Assert no console.error messages were emitted
    expect(consoleErrors, `Console errors: ${consoleErrors.join(' | ')}`).toHaveLength(0);
    // Assert no unhandled page errors occurred
    expect(pageErrors, `Page errors: ${pageErrors.join(' | ')}`).toHaveLength(0);
  });

  test.describe('Initial state and basic UI', () => {
    test('Initial page load shows the pre-filled example text', async ({ page }) => {
      // Verify the textarea has the initialized example text set by the script at the end of the page
      const input = page.locator('#inputText');
      await expect(input).toBeVisible();

      const value = await input.inputValue();
      // The script at the bottom sets the value to this exact string
      const expected = 'Huffman coding is a lossless data compression algorithm.';
      expect(value).toBe(expected);
    });

    test('Clear button empties input, output, tree and stats', async ({ page }) => {
      // First ensure content exists by encoding once
      await page.click('button:has-text("Encode Text")');
      await expect(page.locator('#output')).toContainText('Original Text:');

      // Click Clear and verify all areas are emptied
      await page.click('button:has-text("Clear")');

      await expect(page.locator('#inputText')).toHaveValue('');
      await expect(page.locator('#output')).toHaveText('');
      await expect(page.locator('#tree')).toHaveText('');
      await expect(page.locator('#stats')).toHaveText('');
    });
  });

  test.describe('Encoding flow and visual output', () => {
    test('Encode Text builds tree, shows encoded/decoded values and compression stats', async ({ page }) => {
      // Use the default pre-filled input
      const inputText = await page.locator('#inputText').inputValue();
      expect(inputText.length).toBeGreaterThan(0);

      // Click encode
      await page.click('button:has-text("Encode Text")');

      // The output should include Original Text and Decoded Text and verification success
      const output = page.locator('#output');
      await expect(output).toContainText(`Original Text: "${inputText}"`);
      await expect(output).toContainText('Encoded Binary:');
      await expect(output).toContainText('Decoded Text:');
      await expect(output).toContainText('Verification: ✓ Success');

      // Tree visualization should be present and contain 'Huffman Tree' header
      const tree = page.locator('#tree');
      await expect(tree).toContainText('Huffman Tree:');
      // Tree visualization should show at least one 'Char' or 'Node Freq'
      await expect(tree).toMatchText(/(Char:|Node Freq:)/);

      // Stats area should include Binary Codes header and at least one node with a code
      const stats = page.locator('#stats');
      await expect(stats).toContainText('Binary Codes:');
      const firstCode = page.locator('#stats .code').first();
      await expect(firstCode).toBeVisible();
      const codeText = (await firstCode.textContent()).trim();
      expect(codeText.length).toBeGreaterThan(0);

      // Verify compression stats are present in the output area
      await expect(output).toContainText('Compression Statistics:');
      await expect(output).toMatchText(/Original Size: \d+ bits/);
      await expect(output).toMatchText(/Compressed Size: \d+ bits/);
      await expect(output).toMatchText(/Compression Ratio: .*%/);
    });
  });

  test.describe('Decoding interactions and edge cases', () => {
    test('Decode Text via prompt decodes the encoded string and updates output', async ({ page }) => {
      // Encode first to ensure Huffman tree is built
      await page.click('button:has-text("Encode Text")');

      // Extract the encoded binary string from the output area
      const outputText = await page.locator('#output').textContent();
      // Use regex to capture the encoded binary after 'Encoded Binary: '
      const match = outputText.match(/Encoded Binary:\s*([01]+)/m);
      expect(match, 'Encoded binary should be present in output after encoding').not.toBeNull();
      const encodedBinary = match[1];

      // Handle the prompt by supplying the encoded binary, then accept the dialog
      page.once('dialog', async (dialog) => {
        expect(dialog.type()).toBe('prompt');
        await dialog.accept(encodedBinary);
      });

      // Click decode and wait for output update
      await page.click('button:has-text("Decode Text")');

      // After decoding, the output should contain Decoded Text matching the original input
      const finalOutput = page.locator('#output');
      await expect(finalOutput).toContainText(`Encoded Binary: ${encodedBinary}`);
      // The decoded text should match the original input value
      const originalInput = await page.locator('#inputText').inputValue();
      await expect(finalOutput).toContainText(`Decoded Text: "${originalInput}"`);
    });

    test('Decode Text with invalid binary (non 0/1) shows validation alert', async ({ page }) => {
      // Ensure Huffman tree exists by encoding once (not strictly required for this path)
      await page.click('button:has-text("Encode Text")');

      // Sequence:
      // 1) A prompt dialog appears where we will provide an invalid string 'abc'
      // 2) The page will then show an alert notifying invalid input
      // We register two sequential dialog handlers via once()

      // First dialog (prompt) - supply invalid content
      page.once('dialog', async (dialog) => {
        expect(dialog.type()).toBe('prompt');
        await dialog.accept('abc'); // invalid: contains non-binary characters
      });

      // Second dialog (alert) - verify message and accept
      const alertPromise = page.waitForEvent('dialog');
      await page.click('button:has-text("Decode Text")');

      const alertDialog = await alertPromise;
      expect(alertDialog.type()).toBe('alert');
      expect(alertDialog.message()).toContain('Please enter a valid binary string');
      await alertDialog.accept();
    });

    test('Encode with empty input triggers an alert asking user to enter text', async ({ page }) => {
      // Clear the input first
      await page.click('button:has-text("Clear")');

      // Clicking encode should produce an alert that asks the user to enter some text
      const dialogPromise = page.waitForEvent('dialog');
      await page.click('button:has-text("Encode Text")');

      const dialog = await dialogPromise;
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toContain('Please enter some text to encode.');
      await dialog.accept();
    });
  });

  test.describe('DOM content and accessibility checks', () => {
    test('Binary code nodes render readable character labels and code blocks', async ({ page }) => {
      // Trigger encoding to populate the .node leaf elements
      await page.click('button:has-text("Encode Text")');

      // Ensure there are node elements with class 'leaf' inside #stats
      const leafNodes = page.locator('#stats .node.leaf');
      await expect(leafNodes).toHaveCountGreaterThan(0);

      // Check that each leaf node contains a .character and .code element
      const count = await leafNodes.count();
      for (let i = 0; i < Math.min(5, count); i++) {
        const node = leafNodes.nth(i);
        await expect(node.locator('.character')).toBeVisible();
        await expect(node.locator('.code')).toBeVisible();

        const charText = (await node.locator('.character').textContent()).trim();
        const codeText = (await node.locator('.code').textContent()).trim();

        // Character label should be non-empty and code should be a binary string
        expect(charText.length).toBeGreaterThan(0);
        expect(/^[01]+$/.test(codeText)).toBeTruthy();
      }
    });
  });
});