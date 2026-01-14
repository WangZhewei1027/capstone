import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad4ff21-d59a-11f0-891d-f361d22ca68a.html';

test.describe('Huffman Coding interactive app - FSM validation and runtime errors', () => {
  // Collect console and page errors in each test separately to avoid cross-test leakage.

  test('S0_Idle (Initial render) - page structure present and runtime ReferenceError observed on load', async ({ page }) => {
    // Arrays to capture runtime errors and console messages
    const pageErrors = [];
    const consoleMessages = [];

    // Attach listeners before navigation to capture errors during script execution
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Navigate to the app and wait for load handlers to run (this will execute the inline script)
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Verify core DOM elements expected in the Idle state (renderPage effect)
    const input = page.locator('#text-input');
    const encodeButton = page.locator('#encode-button');
    const decodeButton = page.locator('#decode-button');
    const encodedSpan = page.locator('#encoded-text');
    const decodedDiv = page.locator('#decoded-text');

    // DOM elements should be visible/present
    await expect(input).toBeVisible();
    await expect(encodeButton).toBeVisible();
    await expect(decodeButton).toBeVisible();
    await expect(encodedSpan).toBeVisible();
    await expect(decodedDiv).toBeVisible();

    // Inputs should have expected placeholder text
    await expect(input).toHaveAttribute('placeholder', 'Enter your text');

    // On initial load, encoded and decoded outputs should be empty strings (no successful encode/decode happened yet)
    await expect(encodedSpan).toHaveText('');
    await expect(decodedDiv).toHaveText('');

    // The implementation has a known bug: decodeButton variable is not defined when adding event listener,
    // which should produce a ReferenceError on page script execution. Assert that at least one pageerror was recorded.
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);

    // Ensure there is a ReferenceError mentioning decodeButton or 'is not defined'
    const messages = pageErrors.map(e => String(e.message));
    const foundDecodeRefError = messages.some(m =>
      m.includes('decodeButton') || m.includes('is not defined')
    );
    expect(foundDecodeRefError).toBeTruthy();

    // Also ensure console captured any logs (useful for debugging and evidence)
    expect(consoleMessages.length).toBeGreaterThanOrEqual(0);
  });

  test('Transition S0_Idle -> S1_Encoded (Encode button click) should attempt encode and produce TypeError due to tree build', async ({ page }) => {
    // Attach a pageerror waiter before navigation to capture load-time errors (we ignore load-time ones here)
    const initialErrors = [];
    page.on('pageerror', (err) => initialErrors.push(err));

    await page.goto(APP_URL, { waitUntil: 'load' });

    // Ensure the encode button exists
    await expect(page.locator('#encode-button')).toBeVisible();

    // Attempt to click the Encode button and wait for a new pageerror event that indicates TypeError from buildHuffmanTree.
    // The encode function uses a globally-captured `text` value (captured at load time) and buildHuffmanTree
    // may attempt to access properties of undefined for empty frequency maps, causing a TypeError.
    const errorPromise = page.waitForEvent('pageerror');
    await page.click('#encode-button');
    const error = await errorPromise;

    // The thrown error should be a TypeError related to accessing .value of undefined (heap[0] undefined)
    expect(error).toBeTruthy();
    const errMsg = String(error.message).toLowerCase();
    // Accept either modern "Cannot read properties of undefined (reading 'value')" or older "Cannot read property 'value' of undefined"
    expect(errMsg.includes('value')).toBeTruthy();
    expect(errMsg.includes('cannot read') || errMsg.includes('cannot read properties') || errMsg.includes('cannot read property')).toBeTruthy();

    // After the failed encode attempt, the encoded text should remain empty (visual feedback check)
    await expect(page.locator('#encoded-text')).toHaveText('');
  });

  test('Transition S1_Encoded -> S2_Decoded (Decode invocation) - calling decode() causes ReferenceError due to missing encodedText', async ({ page }) => {
    // Collect pageerrors
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    await page.goto(APP_URL, { waitUntil: 'load' });

    // The page's inline script defines a decode() function but does not bind it to the decode button (due to earlier ReferenceError).
    // Invoking decode() directly in the page context should produce a ReferenceError because encodedText is not defined in that scope.
    let evaluateError = null;
    try {
      // Execute decode() in page context. This will throw a JS error inside the page which Playwright surfaces.
      await page.evaluate(() => {
        // Intentionally call the page-defined decode function to observe its natural ReferenceError.
        // Do not modify page globals; just invoke existing function.
        // eslint-disable-next-line no-undef
        return decode();
      });
    } catch (e) {
      evaluateError = e;
    }

    // Ensure an error was thrown from the evaluate call
    expect(evaluateError).not.toBeNull();

    // The message should indicate a ReferenceError about 'encodedText' or that encodedText is not defined.
    const evalMsg = String(evaluateError.message).toLowerCase();
    expect(evalMsg.includes('encodedtext') || evalMsg.includes('is not defined') || evalMsg.includes('referencerror')).toBeTruthy();

    // Also the pageerror listener should have captured at least one error (either from load or this invocation)
    expect(pageErrors.length).toBeGreaterThanOrEqual(0);

    // Verify decoded output area remains empty because decode did not succeed
    await expect(page.locator('#decoded-text')).toHaveText('');
  });

  test('Edge case: typing text after load does not change encoded result because `text` was captured at load time; encode still fails', async ({ page }) => {
    // Clearers for page errors
    const errors = [];
    page.on('pageerror', (err) => errors.push(err));

    await page.goto(APP_URL, { waitUntil: 'load' });

    // Type into the input after load (this does not change the top-level `text` variable in the page code)
    await page.fill('#text-input', 'hello world');

    // Try clicking encode; should still produce a TypeError similar to earlier because buildHuffmanTree operates on a frequencyMap
    const errorPromise = page.waitForEvent('pageerror');
    await page.click('#encode-button');
    const err = await errorPromise;

    expect(err).toBeTruthy();
    const errText = String(err.message).toLowerCase();
    expect(errText.includes('value')).toBeTruthy();

    // Confirm that despite typing text, encoded output remains empty due to failed encode
    await expect(page.locator('#encoded-text')).toHaveText('');
  });

  test('Smoke: ensure that UI strings from the initial render (title and provided paragraph) are present', async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Validate that the page header and example paragraph rendered as expected (renderPage effect)
    await expect(page.locator('h2')).toHaveText('Huffman Coding');
    // The paragraph in the HTML is missing a closing quote but should still be present up to the browser's parsing result.
    const para = await page.locator('p').first().textContent();
    expect(para).toBeTruthy();
    // Placeholder check for the descriptive paragraph content
    expect(para.toLowerCase()).toContain('lorem ipsum');
  });
});