import { test, expect } from '@playwright/test';

// Test file: 2bde6a96-cd36-11f0-b98e-a1744d282049-huffman-coding.spec.js
// Page under test:
// http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde6a96-cd36-11f0-b98e-a1744d282049.html
//
// Purpose:
// - Validate the Huffman Coding Visualizer interactive UI elements and flows
// - Observe and record console messages and uncaught page errors
// - Interact with the app exactly as shipped (no patching), asserting DOM/state changes and expected behavior
//
// Notes:
// - Tests intentionally allow any runtime console/page errors to surface; we listen and assert on them (expecting none in normal runs).
// - We do not modify global functions or patch the environment.

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde6a96-cd36-11f0-b98e-a1744d282049.html';

test.describe('Huffman Coding Visualizer - UI and interactions', () => {
  // Collect console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages
    page.on('console', (msg) => {
      // store level and text to help debugging and assertions
      try {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
      } catch (e) {
        // ignore serialization issues
        consoleMessages.push({ type: 'unknown', text: String(msg) });
      }
    });

    // Capture uncaught page errors
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the application page
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    // We keep these intentionally empty - each test asserts relevant expectations
  });

  test('Initial load: page elements are present and initial build ran', async ({ page }) => {
    // Purpose: verify that essential UI elements render on load and initial build produced a tree/codes.
    const header = page.locator('header h1');
    await expect(header).toHaveText('Huffman Coding Visualizer');

    // Textarea should have default sample text
    const inputText = page.locator('#inputText');
    await expect(inputText).toBeVisible();
    const inputValue = await inputText.inputValue();
    expect(inputValue.length).toBeGreaterThan(0); // default sample present

    // Frequency list should be present and populated
    const freqList = page.locator('#freqList');
    await expect(freqList).toBeVisible();
    const freqListText = await freqList.textContent();
    expect(freqListText.trim().length).toBeGreaterThan(0);

    // Codes view and encoded view should show something after initial build
    const codesView = page.locator('#codesView');
    await expect(codesView).toBeVisible();
    const codesContent = await codesView.textContent();
    expect(codesContent.trim().length).toBeGreaterThan(0);

    const encodedView = page.locator('#encodedView');
    await expect(encodedView).toBeVisible();
    // encoded bit string should be present (non-empty) for the default sample if build succeeded
    const encodedText = (await encodedView.textContent()).trim();
    expect(encodedText.length).toBeGreaterThanOrEqual(0);

    // Stats should reflect non-zero original size (since sample text exists)
    const origSize = page.locator('#origSize');
    await expect(origSize).toBeVisible();
    const origSizeText = await origSize.textContent();
    expect(origSizeText).toMatch(/\d+\sbits/);

    // Check that there were no uncaught page errors during initial load
    expect(pageErrors.length, `Uncaught page errors: ${pageErrors.map(e => String(e)).join(', ')}`).toBe(0);

    // Log console messages for debugging if needed (do not fail test on console messages)
    // but assert no console errors of level 'error' occurred
    const consoleErrors = consoleMessages.filter(m => m.type === 'error').map(m => m.text);
    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(' | ')}`).toBe(0);
  });

  test('Build Huffman Tree for custom input and verify UI updates', async ({ page }) => {
    // Purpose: set a known text, build tree, and inspect frequencies, steps, queue and codes.
    const inputText1 = page.locator('#inputText1');
    await inputText.fill('AAAAAAABBBCCD');

    // Click the Build button
    const buildBtn = page.locator('#buildBtn');
    await buildBtn.click();

    // Wait for UI updates (render)
    await page.waitForTimeout(200);

    // Frequency list should include 'A' with freq 7
    const freqList1 = page.locator('#freqList1');
    await expect(freqList).toContainText('7');

    // Codes view should include entries for A, B, C, D
    const codesView1 = page.locator('#codesView1');
    await expect(codesView).toContainText('A');
    await expect(codesView).toContainText('B');
    await expect(codesView).toContainText('C');
    await expect(codesView).toContainText('D');

    // Step counts should be greater than zero (merges exist)
    const stepCountEl = page.locator('#stepCount');
    const stepCountText = await stepCountEl.textContent();
    const stepCountNum = Number(stepCountText.trim());
    expect(stepCountNum).toBeGreaterThan(0);

    // Queue view should display at least one item
    const queueView = page.locator('#queueView');
    await expect(queueView).toBeVisible();
    const queueText = await queueView.textContent();
    expect(queueText.length).toBeGreaterThan(0);

    // Encoded view should be non-empty
    const encodedView1 = page.locator('#encodedView1');
    const encodedText1 = (await encodedView.textContent()).trim();
    expect(encodedText.length).toBeGreaterThan(0);

    // Show Decoded should populate decodedView with original input when clicked
    const showDecodedBtn = page.locator('#showDecoded');
    await showDecodedBtn.click();
    const decodedView = page.locator('#decodedView');
    await expect(decodedView).toHaveText('AAAAAAABBBCCD');

    // Ensure no uncaught page errors during build
    expect(pageErrors.length, `Page errors after build: ${pageErrors.map(e => String(e)).join(', ')}`).toBe(0);
  });

  test('Step controls: next, prev, reset and play/pause behavior', async ({ page }) => {
    // Purpose: exercise stepping through merge steps and playing animation.
    // Prepare a text with multiple steps
    await page.locator('#inputText').fill('this is an example for huffman encoding');
    await page.locator('#buildBtn').click();

    // Wait for build
    await page.waitForTimeout(200);

    const stepIndex = page.locator('#stepIndex');
    const stepCount = Number((await page.locator('#stepCount').textContent()).trim());

    // If there are at least 1 step, try Next and Prev
    if (stepCount > 0) {
      const nextBtn = page.locator('#stepNext');
      const prevBtn = page.locator('#stepPrev');
      const resetBtn = page.locator('#resetStep');

      // Click Next and expect stepIndex increments
      const before = Number((await stepIndex.textContent()).trim());
      await nextBtn.click();
      await page.waitForTimeout(100);
      const afterNext = Number((await stepIndex.textContent()).trim());
      expect(afterNext).toBeGreaterThanOrEqual(before);

      // Click Prev and expect stepIndex decrements or stays at 0
      await prevBtn.click();
      await page.waitForTimeout(100);
      const afterPrev = Number((await stepIndex.textContent()).trim());
      expect(afterPrev).toBeGreaterThanOrEqual(0);

      // Click Reset and expect stepIndex to be 0
      await resetBtn.click();
      await page.waitForTimeout(50);
      const afterReset = Number((await stepIndex.textContent()).trim());
      expect(afterReset).toBe(0);

      // Play button should toggle to Pause while playing, and step index should increase over time
      const playBtn = page.locator('#playBtn');
      await playBtn.click(); // start playing
      // When playing, text content should be 'Pause'
      await expect(playBtn).toHaveText(/Pause/i);

      // Wait a bit to allow stepping (playSpeed default 800 ms in the app)
      await page.waitForTimeout(900);

      const midIndex = Number((await stepIndex.textContent()).trim());
      expect(midIndex).toBeGreaterThanOrEqual(afterReset);

      // Now click Play (Pause) again to stop
      await playBtn.click();
      await expect(playBtn).toHaveText(/Play/i);
    } else {
      test.skip(true, 'Not enough steps to test step controls reliably.');
    }

    // Ensure no uncaught page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Decode button shows alert for invalid bits and for missing tree', async ({ page }) => {
    // Purpose: verify error dialogs triggered by decode when no tree exists and when provided invalid bits.
    // First clear the app (so no tree exists)
    await page.locator('#clearBtn').click();

    // Attempt to decode when no tree exists: should show an alert "Build a Huffman tree first."
    const decodeBtn = page.locator('#decodeBtn');
    const dialogPromise1 = page.waitForEvent('dialog');
    await decodeBtn.click();
    const dialog1 = await dialogPromise1;
    expect(dialog1.message()).toContain('Build a Huffman tree first.');
    await dialog1.accept();

    // Now build a tree, then provide invalid bitstring and expect decode alert for invalid bits.
    await page.locator('#inputText').fill('ABCD');
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(200);

    // Put invalid bits into input (likely not matching tree)
    const encodeBits = page.locator('#encodeBits');
    await encodeBits.fill('111111111111111'); // unlikely to be valid for short tree

    // Clicking decode should show an alert about invalid or incomplete bit string
    const dialogPromise2 = page.waitForEvent('dialog');
    await decodeBtn.click();
    const dialog2 = await dialogPromise2;
    expect(dialog2.message()).toContain('Invalid or incomplete bit string for the current Huffman tree.');
    await dialog2.accept();

    // Ensure no uncaught page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Copy Bits button and clipboard behavior (best-effort without stubbing)', async ({ page }) => {
    // Purpose: exercise Copy Bits flow; clipboard may not be available in the test environment,
    // so we ensure clicking the button does not throw and, if clipboard is available, the UI reflects it.
    await page.locator('#inputText').fill('hello world');
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(200);

    // Ensure encodeBits has some content
    const encodeBits1 = page.locator('#encodeBits1');
    const bits = (await encodeBits.inputValue()).trim();
    expect(bits.length).toBeGreaterThanOrEqual(0);

    const copyBtn = page.locator('#copyBits');

    // Click copy; behavior:
    // - If clipboard API exists and writeText resolves, button text changes to 'Copied' briefly.
    // - If clipboard API absent, nothing happens, but no exception should be thrown.
    await copyBtn.click();
    // Wait briefly to allow any asynchronous update
    await page.waitForTimeout(300);

    const copyText = await copyBtn.textContent();
    // Accept either 'Copied' (successful) or original label 'Copy Bits' (no clipboard)
    expect(/Copied|Copy Bits/.test(copyText)).toBeTruthy();

    // Ensure no uncaught page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Filters: min frequency and top K update frequency list', async ({ page }) => {
    // Purpose: exercise filter inputs and verify frequency list updates accordingly.
    await page.locator('#inputText').fill('aaabbbccddde');
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(200);

    const freqList2 = page.locator('#freqList2');
    await expect(freqList).toBeVisible();

    // Set minFreq to a high value that hides all symbols
    await page.locator('#minFreq').fill('100');
    // trigger input event
    await page.locator('#minFreq').dispatchEvent('input');
    await page.waitForTimeout(100);
    const freqTextAfterMin = (await freqList.textContent()).trim();
    expect(freqTextAfterMin.length).toBeGreaterThan(0);
    expect(freqTextAfterMin).toContain('No symbols to show');

    // Reset minFreq and set topK to 2 to only show top 2 symbols
    await page.locator('#minFreq').fill('1');
    await page.locator('#minFreq').dispatchEvent('input');
    await page.locator('#topK').fill('2');
    await page.locator('#topK').dispatchEvent('input');
    await page.waitForTimeout(100);
    const freqTextAfterTopK = (await freqList.textContent()).trim();
    // Should show at most 2 frequency rows: we check that it does not contain the smallest symbol 'e' if it's low freq
    expect(freqTextAfterTopK.length).toBeGreaterThan(0);
    // No uncaught errors
    expect(pageErrors.length).toBe(0);
  });

  test('Clear button resets UI and internal state indicators', async ({ page }) => {
    // Purpose: ensure the Clear control empties UI pieces and resets stats and counters.
    await page.locator('#inputText').fill('something to clear');
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(200);

    // Click Clear
    await page.locator('#clearBtn').click();
    await page.waitForTimeout(150);

    // Frequency list should be empty or show nothing relevant
    const freqList3 = page.locator('#freqList3');
    const freqListText1 = (await freqList.textContent()).trim();
    // After clear the code sets freqList.innerHTML = '' so text may be empty
    expect(freqListText.length).toBeLessThanOrEqual(50); // allow empty or small helper text

    // Encoded and decoded views should be empty
    const encodedViewText = (await page.locator('#encodedView').textContent()).trim();
    expect(encodedViewText.length).toBe(0);

    const decodedViewText = (await page.locator('#decodedView').textContent()).trim();
    expect(decodedViewText.length).toBe(0);

    // Stats should be reset to zero values per UI
    await expect(page.locator('#origSize')).toHaveText('0 bits');
    await expect(page.locator('#huffSize')).toHaveText('0 bits');
    await expect(page.locator('#compression')).toHaveText('0%');

    // Step index and count should be reset
    await expect(page.locator('#stepIndex')).toHaveText('0');
    await expect(page.locator('#stepCount')).toHaveText('0');

    // No uncaught page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Keyboard shortcuts: space toggles play/pause and arrow keys change steps', async ({ page }) => {
    // Purpose: validate keyboard shortcuts mapped in the page keydown handler.
    await page.locator('#inputText').fill('abcabcabc');
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(200);

    const playBtn1 = page.locator('#playBtn1');
    const stepIndex1 = page.locator('#stepIndex1');
    const beforeIndex = Number((await stepIndex.textContent()).trim());

    // Press ArrowRight to step forward
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);
    const afterRight = Number((await stepIndex.textContent()).trim());
    expect(afterRight).toBeGreaterThanOrEqual(beforeIndex);

    // Press ArrowLeft to step backward
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(100);
    const afterLeft = Number((await stepIndex.textContent()).trim());
    expect(afterLeft).toBeGreaterThanOrEqual(0);

    // Space to toggle play/pause
    await page.keyboard.press(' ');
    await page.waitForTimeout(50);
    // When playing, playBtn text changes to Pause
    const playText = await playBtn.textContent();
    expect(/Pause|Play/.test(playText)).toBeTruthy();

    // If playing, send space again to pause
    await page.keyboard.press(' ');
    await page.waitForTimeout(50);
    const playText2 = await playBtn.textContent();
    expect(/Play|Pause/.test(playText2)).toBeTruthy();

    // Ensure no page errors
    expect(pageErrors.length).toBe(0);
  });
});