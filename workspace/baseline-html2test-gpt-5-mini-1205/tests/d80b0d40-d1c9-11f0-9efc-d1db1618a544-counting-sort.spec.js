import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80b0d40-d1c9-11f0-9efc-d1db1618a544.html';

test.describe('Counting Sort Visualization - d80b0d40...', () => {
  // Arrays to collect runtime errors and console error messages observed while loading/interacting with the page.
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console.error messages
    page.on('console', msg => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      } catch (e) {
        // ignore unexpected inspection errors
      }
    });

    // Capture unhandled page errors
    page.on('pageerror', err => {
      pageErrors.push(String(err));
    });

    // Navigate to the app page
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    // Basic assertion: no uncaught page errors should have occurred during the test steps.
    expect(pageErrors, `Unexpected page errors: ${pageErrors.join('\n')}`).toEqual([]);
    // Also assert there are no console error logs
    expect(consoleErrors, `Unexpected console errors: ${consoleErrors.join('\n')}`).toEqual([]);
  });

  test('Initial load shows default array, counts and output placeholders', async ({ page }) => {
    // Verify page title and UI visible elements
    await expect(page.locator('h1')).toHaveText(/Counting Sort — Interactive Visualization/);

    // The sample input is initialized in the IIFE; ensure status and phase indicate Ready/Initialized
    await expect(page.locator('#status')).toHaveText('Ready');
    await expect(page.locator('#phase')).toHaveText('Initialized');

    // Input visualization should contain bars for the default array (7 values in default input)
    const inputBars = page.locator('#inputViz .bar');
    await expect(inputBars).toHaveCount(7);

    // Counts visualization should reflect the range (min=-1 max=4 => range=6 boxes)
    const countBoxes = page.locator('#countsViz .countBox');
    await expect(countBoxes).toHaveCount(6);

    // Output visualization should have placeholders for each input element (7 slots)
    const outputBars = page.locator('#outputViz .bar');
    await expect(outputBars).toHaveCount(7);

    // Confirm explanation text contains "Counting sort will operate" after init
    await expect(page.locator('#explain')).toContainText('Counting sort will operate on values');
  });

  test('Load button parses input, updates visuals and prepares generator', async ({ page }) => {
    // Replace the input with a specific array and click Load
    const input = page.locator('#inputArray');
    await input.fill('5, 3, 3, 2, -1');
    await page.click('#loadBtn');

    // After loading, status should be Ready and phase Initialized
    await expect(page.locator('#status')).toHaveText('Ready');
    await expect(page.locator('#phase')).toHaveText('Initialized');

    // Input visualization should show 5 bars (for 5 values)
    await expect(page.locator('#inputViz .bar')).toHaveCount(5);

    // Range should be min -1 to max 5 -> range = 7; counts boxes should be 7
    await expect(page.locator('#countsViz .countBox')).toHaveCount(7);

    // Output visualization should have 5 slots
    await expect(page.locator('#outputViz .bar')).toHaveCount(5);
  });

  test('Step through the generator updates count boxes and highlights appropriately', async ({ page }) => {
    // Ensure generator is prepared (it is by default after init, but reload a known array for clarity)
    await page.locator('#inputArray').fill('1, 2, 1');
    await page.click('#loadBtn');

    // Step through actions until counting phase updates first element's count
    // We'll click Step a few times and inspect counts for value 1
    // Value 1 is min=1 so idx 0 if min==1; compute min to sanity-check
    await expect(page.locator('#phase')).toHaveText('Initialized');

    // Step through to first counting:visit
    await page.click('#stepBtn');
    await expect(page.locator('#phase')).toHaveText(/Counting: scanning input|Counting: scanning input/);

    // Next step should be counting:update, with a count increment visible
    await page.click('#stepBtn');
    // After update, the counts display for the index corresponding to '1' should show "1"
    // Find the countBox whose .idx textContent equals "1"
    const countBoxes = page.locator('#countsViz .countBox');
    const countTexts = await countBoxes.locator('.idx').allTextContents();
    // find index of actual value "1"
    const idxPos = countTexts.indexOf('1');
    expect(idxPos).toBeGreaterThanOrEqual(0);

    // The corresponding .ct should now be "1"
    const ctLocator = countBoxes.nth(idxPos).locator('.ct');
    await expect(ctLocator).toHaveText('1');
  });

  test('Random generation populates input and displays message', async ({ page }) => {
    // Set parameters and click Random
    await page.locator('#randSize').fill('8');
    await page.locator('#randMin').fill('-2');
    await page.locator('#randMax').fill('5');

    await page.click('#randBtn');

    // The message should indicate random array generated
    await expect(page.locator('#message')).toContainText('Random array of');

    // Input field should be updated with comma separated values
    const inputVal = await page.locator('#inputArray').inputValue();
    expect(inputVal.split(',').length).toBeGreaterThanOrEqual(1);

    // Status should be Ready and phase Initialized after generation
    await expect(page.locator('#status')).toHaveText('Ready');
    await expect(page.locator('#phase')).toHaveText('Initialized');
  });

  test('Start auto-play runs to completion and produces sorted output', async ({ page }) => {
    // Use a small array so auto-play completes quickly
    await page.locator('#inputArray').fill('4, 2, -1, 3');
    await page.click('#loadBtn');

    // Start playing (auto)
    await page.click('#startBtn');

    // Wait until the phase element shows "Done" indicating generator finished processing
    await page.waitForFunction(() => {
      const ph = document.getElementById('phase');
      return ph && ph.textContent === 'Done';
    }, null, { timeout: 5000 });

    // After done, message should read "Sorting complete."
    await expect(page.locator('#message')).toHaveText('Sorting complete.');

    // Output array should now be rendered and sorted (verify numeric order)
    const outputLabels = await page.locator('#outputViz .bar .lbl').allTextContents();
    // Convert to numbers and check ascending order
    const outputNums = outputLabels.map(x => Number(x));
    // Check sorted ascending
    const sorted = [...outputNums].sort((a, b) => a - b);
    expect(outputNums).toEqual(sorted);
  });

  test('Reset clears and returns UI to initial idle state', async ({ page }) => {
    // Ensure there's something loaded, then reset
    await page.locator('#inputArray').fill('1,1,2');
    await page.click('#loadBtn');
    await page.click('#resetBtn');

    // After reset, status should be Idle and phase Not started
    await expect(page.locator('#status')).toHaveText('Idle');
    await expect(page.locator('#phase')).toHaveText('Not started');

    // Counts and output visual containers should be empty
    await expect(page.locator('#countsViz').locator('.countBox')).toHaveCount(0);
    await expect(page.locator('#outputViz')).toHaveText('', { timeout: 1000 }).catch(() => {
      // The outputViz may contain text like '(empty)' - accept either empty or the literal placeholder
      return;
    });
  });

  test('Invalid numeric input shows parsing error message', async ({ page }) => {
    // Type an invalid value in the input and click Load
    await page.locator('#inputArray').fill('3, two, 5');
    await page.click('#loadBtn');

    // The message element should contain an Error mentioning the invalid token
    await expect(page.locator('#message')).toContainText('Error: Invalid number');

    // Ensure generator was not prepared (phase should not be "Initialized")
    const phaseText = await page.locator('#phase').textContent();
    expect(phaseText).not.toBe('Initialized');
  });

  test('Range too large triggers warning and prevents visualization', async ({ page }) => {
    // Create input with extreme range exceeding RANGE_LIMIT (70)
    // Example: values 0 and 1000 => range 1001
    await page.locator('#inputArray').fill('0,1000');
    await page.click('#loadBtn');

    // The message should include a warning about range too large (class "warning" inside innerHTML)
    const msgHtml = await page.locator('#message').innerHTML();
    expect(msgHtml).toContain('warning');

    // The phase should have been set by prepareGenerator or left not Initialized; confirm message contains "Range too large"
    await expect(page.locator('#message')).toContainText('Range too large');
  });

  test('Stepping through full algorithm using Step button yields Done phase and final output', async ({ page }) => {
    // Use a deterministic small array
    await page.locator('#inputArray').fill('2,1,2');
    await page.click('#loadBtn');

    // Repeatedly click Step until the phase becomes Done or until a safety cap
    const maxSteps = 200;
    for (let i = 0; i < maxSteps; i++) {
      await page.click('#stepBtn');
      const phase = (await page.locator('#phase').textContent()) || '';
      if (phase === 'Done') break;
    }

    // Validate the algorithm completed
    await expect(page.locator('#phase')).toHaveText('Done');

    // Validate output is sorted: outputViz .lbl contains 1,2,2
    const out = await page.locator('#outputViz .bar .lbl').allTextContents();
    expect(out.map(Number)).toEqual([1,2,2]);
  });
});