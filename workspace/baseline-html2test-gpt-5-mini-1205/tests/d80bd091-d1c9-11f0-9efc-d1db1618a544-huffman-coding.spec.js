import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80bd091-d1c9-11f0-9efc-d1db1618a544.html';

test.describe('Huffman Coding Interactive Demo — d80bd091-d1c9-11f0-9efc-d1db1618a544', () => {
  // Arrays to collect console errors and page errors for each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the demo page
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });

    // Wait for the main UI elements to be present
    await expect(page.locator('h1')).toHaveText(/Huffman Coding/i);
    await expect(page.locator('#inputText')).toBeVisible();
    await expect(page.locator('#analyzeBtn')).toBeVisible();
  });

  test.afterEach(async () => {
    // Assert there are no console errors or uncaught page errors
    // (We observe console/page errors and assert that none occurred during the test run)
    expect(consoleErrors.length, 'No console.error calls should have occurred').toBe(0);
    expect(pageErrors.length, 'No uncaught page errors should have occurred').toBe(0);
  });

  test.describe('Initial load and default state', () => {
    test('page loads with initial analysis and renders frequency table, codes, and visualization', async ({ page }) => {
      // The demo runs analyzeInput on load; wait for frequency table and codes table to appear
      const freqTable = page.locator('#freqArea table');
      await expect(freqTable).toBeVisible();

      const codesTable = page.locator('#codesArea table');
      await expect(codesTable).toBeVisible();

      // Queue area and SVG should also be present
      await expect(page.locator('#queueArea')).toBeVisible();
      await expect(page.locator('svg#treeSvg')).toBeVisible();

      // Step numbers should be initialized
      await expect(page.locator('#stepNum')).toHaveText('0');
      // stepTotal should be a numeric string (>= 0)
      const stepTotalText = await page.locator('#stepTotal').innerText();
      expect(Number(stepTotalText)).toBeGreaterThanOrEqual(0);

      // Codes area should contain at least one symbol/code row
      const codesRows = page.locator('#codesArea table tbody tr');
      await expect(codesRows).toHaveCountGreaterThan(0);

      // Ensure the bit string textarea is present and empty by default
      await expect(page.locator('#bitString')).toBeVisible();
      const bitStringValue = await page.locator('#bitString').inputValue();
      expect(bitStringValue).toBe('');

      // Node details initial text
      await expect(page.locator('#nodeDetails')).toHaveText(/Click a node in the tree to see details\./i);
    });
  });

  test.describe('Interactive controls and state transitions', () => {
    test('analyzing custom input updates frequency table and codes (ignore spaces behavior)', async ({ page }) => {
      // Replace input text with a small deterministic string and analyze
      const input = page.locator('#inputText');
      await input.fill('a a b c');

      // Ensure "Ignore spaces" is checked (default) so spaces get ignored and not counted as symbols
      const ignoreSpacesCheckbox = page.locator('#ignoreSpaces');
      await expect(ignoreSpacesCheckbox).toBeChecked();

      await page.click('#analyzeBtn');

      // Frequency table should include 'a', 'b', 'c' and not include a space row
      const freqRows = page.locator('#freqArea table tbody tr');
      await expect(freqRows).toHaveCount(3);

      // The frequencies should reflect two 'a', one 'b', one 'c'
      const rowTexts = await freqRows.allInnerTexts();
      const flattened = rowTexts.join(' ');
      expect(flattened).toContain('a');
      expect(flattened).toContain('b');
      expect(flattened).toContain('c');

      // Toggle ignoreSpaces off and analyze a string with only spaces to test edge handling
      await ignoreSpacesCheckbox.uncheck();
      await input.fill('   '); // three spaces
      await page.click('#analyzeBtn');

      // When all characters are spaces and ignoreSpaces is unchecked, frequency table should show space symbol
      const freqText = await page.locator('#freqArea').innerText();
      expect(freqText).toContain('␣ (space)');
      // Should show count equal to 3 (three spaces)
      expect(freqText).toMatch(/3/);
    });

    test('step navigation controls (Prev, Next, Finish) update displayed step', async ({ page }) => {
      // Click analyze to ensure we have fresh steps
      await page.click('#analyzeBtn');

      // Wait for steps list to populate
      await page.waitForSelector('#stepsList li');

      // Record initial step and total
      const initialStep = await page.locator('#stepNum').innerText();
      const stepTotalText = await page.locator('#stepTotal').innerText();
      const stepTotal = Number(stepTotalText);

      expect(Number(initialStep)).toBeGreaterThanOrEqual(0);
      expect(stepTotal).toBeGreaterThanOrEqual(0);

      // Click Next (may be a no-op if only initial state) and verify stepNum increases or stays same but remains in range
      await page.click('#stepNextBtn');
      const afterNext = Number(await page.locator('#stepNum').innerText());
      expect(afterNext).toBeGreaterThanOrEqual(0);
      expect(afterNext).toBeLessThanOrEqual(stepTotal);

      // Click Prev to go back
      await page.click('#stepBackBtn');
      const afterPrev = Number(await page.locator('#stepNum').innerText());
      expect(afterPrev).toBeGreaterThanOrEqual(0);
      expect(afterPrev).toBeLessThanOrEqual(stepTotal);

      // Click Finish (fast forward) to go to final step
      await page.click('#fastForwardBtn');
      const afterFinish = Number(await page.locator('#stepNum').innerText());
      expect(afterFinish).toBe(stepTotal);
    });

    test('auto-play toggles and advances steps', async ({ page }) => {
      // Ensure we have steps by analyzing
      await page.click('#analyzeBtn');
      await page.waitForSelector('#stepsList li');

      // Start autoplay
      const autoBtn = page.locator('#autoPlayBtn');
      await autoBtn.click();

      // Button text should change to Stop (as per implementation)
      await expect(autoBtn).toHaveText(/Stop/i);

      // Wait briefly to allow at least one step advancement
      await page.waitForTimeout(800);

      // Stop autoplay
      await autoBtn.click();
      await expect(autoBtn).toHaveText(/Auto-play/i);

      // Verify stepNum is within valid range after autoplay
      const stepNum = Number(await page.locator('#stepNum').innerText());
      const stepTotal = Number(await page.locator('#stepTotal').innerText());
      expect(stepNum).toBeGreaterThanOrEqual(0);
      expect(stepNum).toBeLessThanOrEqual(stepTotal);
    });

    test('encode and decode roundtrip preserves original input', async ({ page }) => {
      // Use a simple string without spaces to avoid complications with ignoreSpaces
      const input = page.locator('#inputText');
      await input.fill('abba');

      // Ensure ignoreSpaces is checked so spaces are ignored (not relevant here)
      await page.locator('#ignoreSpaces').check();

      // Analyze and then encode
      await page.click('#analyzeBtn');
      await page.click('#encodeBtn');

      // After encoding, bitString should be non-empty
      const bits = await page.locator('#bitString').inputValue();
      expect(bits.length).toBeGreaterThan(0);

      // Capture original sizes displayed
      const origSize = await page.locator('#origSize').innerText();
      const huffSize = await page.locator('#huffSize').innerText();
      expect(origSize).toMatch(/\bbits\b/);
      expect(huffSize).toMatch(/\bbits\b/);

      // Decode the generated bits; this should replace the inputText with the decoded output and re-analyze
      await page.click('#decodeBtn');

      // Wait a moment for decode/analyze to run
      await page.waitForTimeout(400);

      // The inputText should now equal the original string 'abba'
      const decoded = await page.locator('#inputText').inputValue();
      expect(decoded).toBe('abba');
    });

    test('clicking a node in the SVG shows node details', async ({ page }) => {
      // Ensure analysis has run and svg nodes are drawn
      await page.click('#analyzeBtn');

      // Wait for at least one node group to exist in SVG
      await page.waitForSelector('svg#treeSvg g.node');

      // Click the first node (leaf or internal) and verify nodeDetails updates
      const firstNode = page.locator('svg#treeSvg g.node').first();
      await firstNode.click();

      // nodeDetails should now contain "Node ID" and "Weight" at least
      await expect(page.locator('#nodeDetails')).toContainText('Node ID');
      await expect(page.locator('#nodeDetails')).toContainText('Weight');
    });

    test('decode with empty bit string triggers an alert dialog', async ({ page }) => {
      // Ensure we have a built tree
      await page.click('#analyzeBtn');

      // Ensure bitString is empty
      await page.locator('#bitString').fill('');

      // Listen for dialog and capture message
      let dialogMessage = '';
      page.once('dialog', async dialog => {
        dialogMessage = dialog.message();
        await dialog.dismiss();
      });

      // Click decode which should pop an alert for empty bit string
      await page.click('#decodeBtn');

      // Give a moment for dialog to be handled
      await page.waitForTimeout(200);

      expect(dialogMessage).toBe('Enter a bit string to decode.');
    });

    test('reset button clears input and UI state', async ({ page }) => {
      // Modify input and analyze
      await page.locator('#inputText').fill('xyz');
      await page.click('#analyzeBtn');

      // Ensure freq area has content
      await expect(page.locator('#freqArea')).not.toHaveText('');

      // Click reset
      await page.click('#resetBtn');

      // Input should be cleared
      const inputValue = await page.locator('#inputText').inputValue();
      expect(inputValue).toBe('');

      // UI panels should be reset (freqArea empty or not containing table)
      const freqHtml = await page.locator('#freqArea').innerHTML();
      expect(freqHtml.trim().length).toBeLessThanOrEqual(0);
    });
  });

  test.describe('Edge cases and accessibility checks', () => {
    test('analyzing a single-symbol input assigns a code of length 1 (special-case handling)', async ({ page }) => {
      // Single symbol input
      await page.locator('#inputText').fill('XXXXX');

      // Analyze
      await page.click('#analyzeBtn');

      // There should be exactly one row in frequency table
      const freqRows = page.locator('#freqArea table tbody tr');
      await expect(freqRows).toHaveCount(1);

      // The codes table should show a single code; special-case in code assigns '0' for single symbol
      const codeCell = page.locator('#codesArea table tbody tr td.codecell').first();
      const codeText = await codeCell.innerText();
      expect(codeText).toBe('0');
    });

    test('space-only input when "Ignore spaces" is checked falls back to include spaces', async ({ page }) => {
      // Ensure ignoreSpaces is checked
      await page.locator('#ignoreSpaces').check();

      // Fill with only spaces
      await page.locator('#inputText').fill('    '); // 4 spaces

      // Analyze
      await page.click('#analyzeBtn');

      // When everything was spaces and ignoreSpaces was checked, implementation sets frequency of space to length
      const freqText = await page.locator('#freqArea').innerText();
      expect(freqText).toContain('␣ (space)');
      expect(freqText).toMatch(/4/);
    });
  });
});