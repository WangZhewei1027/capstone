import { test, expect } from '@playwright/test';

test.describe('Huffman Coding — Interactive Demonstration (be87d8a0-cd35-11f0-9e7b-93b903303299)', () => {
  const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be87d8a0-cd35-11f0-9e7b-93b903303299.html';

  // Collect console errors and page errors to assert no unexpected runtime exceptions
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console error messages and page errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    await page.goto(APP_URL);
    // ensure page has loaded and initial script executed
    await expect(page.locator('h1')).toHaveText(/Huffman Coding/);
  });

  test.afterEach(async () => {
    // Assert no uncaught page errors or console errors happened during the test.
    // This helps catch runtime ReferenceError / TypeError etc.
    expect(pageErrors, 'No uncaught page errors should occur').toHaveLength(0);
    expect(consoleErrors, 'No console.error messages should be emitted').toHaveLength(0);
  });

  // Page object helpers
  function els(page) {
    return {
      textarea: page.locator('#inputText'),
      buildBtn: page.locator('#buildBtn'),
      randomBtn: page.locator('#randomBtn'),
      clearBtn: page.locator('#clearBtn'),
      toggleSpaces: page.locator('#toggleSpaces'),
      freqSection: page.locator('#freqSection'),
      freqRows: page.locator('#freqTable tbody tr'),
      totalBits: page.locator('#totalBits'),
      avgBits: page.locator('#avgBits'),
      entropy: page.locator('#entropy'),
      ratio: page.locator('#ratio'),
      noteText: page.locator('#noteText'),
      svg: page.locator('#huffmanSVG'),
      svgContainer: page.locator('#svgContainer'),
      encodeBtn: page.locator('#encodeBtn'),
      decodeBtn: page.locator('#decodeBtn'),
      stepBtn: page.locator('#stepBtn'),
      copyBitsBtn: page.locator('#copyBits'),
      bitsDiv: page.locator('#bits'),
      decodedDiv: page.locator('#decoded'),
      freqTableBody: page.locator('#freqTable tbody'),
    };
  }

  test('Initial load: default input present and frequency table / tree rendered', async ({ page }) => {
    // Verify initial textarea contains the expected default sample and frequency UI is visible
    const e = els(page);
    const text = await e.textarea.inputValue();
    expect(text).toContain('this is an example for huffman coding');

    // The page's buildFromInput runs on load; frequency section should be visible and populated
    await expect(e.freqSection).toBeVisible();
    const rowCount = await e.freqRows.count();
    expect(rowCount).toBeGreaterThan(1);

    // Total bits should not be the placeholder em dash and bits/decoded should display placeholders
    await expect(e.totalBits).not.toHaveText(/—/);
    await expect(e.bitsDiv).toHaveText('—');
    await expect(e.decodedDiv).toHaveText('—');

    // The SVG should contain some nodes (circles). At least one circle element present
    const circleCount = await page.locator('svg circle').count();
    expect(circleCount).toBeGreaterThan(0);
  });

  test('Toggle invisible characters updates symbol rendering in frequency table', async ({ page }) => {
    const e1 = els(page);

    // Ensure initial table contains a "[space]" or similar representation for space
    const firstSymbol = await page.locator('#freqTable tbody tr td:first-child').first().innerText();
    // It should contain either a visible symbol or a placeholder like "[space]" (default uses "[space]")
    expect(firstSymbol.length).toBeGreaterThan(0);

    // Click the toggle to change invisible char rendering (showInvisible toggles)
    await e.toggleSpaces.click();

    // After toggling, at least one symbol cell should contain the visible "␣" symbol for spaces if present
    const allSymbols = await page.locator('#freqTable tbody tr td:first-child').allInnerTexts();
    // It's acceptable if none are spaces in particular sample; but for this default sample there are spaces.
    const foundVisibleSpace = allSymbols.some(s => s.includes('␣'));
    expect(foundVisibleSpace).toBe(true);
  });

  test('Clear button resets input, hides frequency section, and clears outputs', async ({ page }) => {
    const e2 = els(page);

    // Click Clear to empty the textarea and rebuild
    await e.clearBtn.click();

    // Frequency section should be hidden for empty input
    await expect(e.freqSection).not.toBeVisible();

    // Bits and decoded areas should be reset to placeholders
    await expect(e.bitsDiv).toHaveText('—');
    await expect(e.decodedDiv).toHaveText('—');

    // Textarea should be empty
    const val = await e.textarea.inputValue();
    expect(val).toBe('');
  });

  test('Random sample loads into textarea and frequency table updates', async ({ page }) => {
    const e3 = els(page);

    // Click Random Sample to load a random sample and rebuild
    await e.randomBtn.click();

    // The textarea should contain something non-empty
    const val1 = await e.textarea.inputValue();
    expect(val.length).toBeGreaterThan(0);

    // Frequency section should be visible and have rows
    await expect(e.freqSection).toBeVisible();
    const rc = await e.freqRows.count();
    expect(rc).toBeGreaterThan(0);
  });

  test('Copy bits with no encoded bits triggers "No bits to copy" alert', async ({ page }) => {
    const e4 = els(page);

    // Ensure no encoded bits currently exist (initial state)
    await expect(e.bitsDiv).toHaveText('—');

    // Clicking copy should produce an alert stating "No bits to copy"
    const dialogPromise = page.waitForEvent('dialog');
    await e.copyBitsBtn.click();
    const dialog = await dialogPromise;
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toContain('No bits to copy');
    await dialog.accept();
  });

  test('Encode input produces bit string, and Decode (prompt empty) decodes the current encoded bits back to original text', async ({ page }) => {
    const e5 = els(page);

    // Set a small non-trivial input to keep bit strings manageable
    await e.textarea.fill('hi');

    // Click Build to ensure codes are constructed deterministically for test
    await e.buildBtn.click();

    // Encode the input
    await e.encodeBtn.click();

    // Bits area should now contain a grouped bits string not equal to placeholder
    const bitsText = await e.bitsDiv.textContent();
    expect(bitsText).not.toBeNull();
    expect(bitsText).not.toContain('—');
    // Should contain at least one '0' or '1'
    expect(bitsText).toMatch(/[01]/);

    // When clicking Decode, the app will prompt. We choose to pass an empty prompt so it decodes the current bits.
    // First handle the prompt and accept with empty string; then no alert should occur and decodedDiv should equal input.
    page.once('dialog', async (dialog) => {
      // This is the prompt dialog
      expect(dialog.type()).toBe('prompt');
      await dialog.accept(''); // instruct to decode current displayed bits
    });

    // Click decode — the prompt will be handled above
    await e.decodeBtn.click();

    // After decode completes, decodedDiv should equal original input text
    await expect(e.decodedDiv).toHaveText('hi');
  });

  test('Decode with no encoded bits (but tree built) shows "No bits to decode" alert', async ({ page }) => {
    const e6 = els(page);

    // Use a sample that ensures a tree exists but no bits encoded yet
    await e.textarea.fill('abc');
    await e.buildBtn.click();

    // Ensure bits area is placeholder
    await expect(e.bitsDiv).toHaveText('—');

    // Clicking decode will show a prompt; we accept empty string which should then cause an alert "No bits to decode"
    // Attach two dialog handlers in sequence: first for prompt (accept with empty string), then for resulting alert
    const promptPromise = page.waitForEvent('dialog');
    await e.decodeBtn.click();
    const promptDialog = await promptPromise;
    expect(promptDialog.type()).toBe('prompt');
    await promptDialog.accept(''); // user provided empty string to indicate decode current bits

    // Now expect an alert indicating there were no bits to decode
    const alertDialog = await page.waitForEvent('dialog');
    expect(alertDialog.type()).toBe('alert');
    expect(alertDialog.message()).toContain('No bits to decode');
    await alertDialog.accept();
  });

  test('Step decoding animates and produces decoded output for a small sample', async ({ page }) => {
    const e7 = els(page);

    // Use a tiny single-symbol sample to keep animation short
    await e.textarea.fill('aa');
    // Build codes
    await e.buildBtn.click();

    // Encode input to populate bitsDiv
    await e.encodeBtn.click();

    // Sanity check bits exist
    const bits = await e.bitsDiv.textContent();
    expect(bits).toMatch(/[01]/);

    // Click step decode to animate. The animation uses timeouts; wait until decodedDiv equals 'aa'
    await e.stepBtn.click();

    // Wait up to 7s for animation to finish (safe margin; two symbols => ~700-1000ms typically)
    await page.waitForFunction(
      () => {
        const d = document.getElementById('decoded');
        return d && d.textContent === 'aa';
      },
      null,
      { timeout: 7000 }
    );

    // Verify decodedDiv contains expected decoded text
    await expect(e.decodedDiv).toHaveText('aa');
  }, { timeout: 10000 });

  test('Hovering a frequency table row highlights the corresponding leaf in the SVG', async ({ page }) => {
    const e8 = els(page);

    // Use default input and ensure built
    await e.buildBtn.click();

    // Pick the first frequency table row that has a data-char attribute
    const row = page.locator('#freqTable tbody tr').first();
    await expect(row).toBeVisible();

    // Hover the table row to trigger the mouseenter handler which should re-render the SVG with a highlighted leaf
    await row.hover();

    // After hover, there should be at least one circle in the SVG with the orange stroke set by highlight ('#fb923c')
    // Wait briefly for rerender to occur
    await page.waitForTimeout(200);

    const highlighted = await page.locator('svg circle[stroke="#fb923c"]').count();
    expect(highlighted).toBeGreaterThan(0);

    // Move mouse away to allow mouseleave rendering back to normal
    await page.mouse.move(0, 0);
    await page.waitForTimeout(100);
  });

});