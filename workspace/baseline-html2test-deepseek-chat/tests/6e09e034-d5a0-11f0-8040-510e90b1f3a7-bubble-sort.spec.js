import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e09e034-d5a0-11f0-8040-510e90b1f3a7.html';

test.describe('Bubble Sort Visualization - 6e09e034-d5a0-11f0-8040-510e90b1f3a7', () => {
  // Each test gets a fresh page. We'll capture console errors and page errors for assertions.
  test.beforeEach(async ({ page }) => {
    // Collect console error messages and page errors
    page.setDefaultTimeout(30000);
  });

  // Helper to attach listeners and return collected arrays
  async function collectErrors(page) {
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    return { consoleErrors, pageErrors };
  }

  // Page object-like helpers
  const selectors = {
    arrayInput: '#arrayInput',
    resetBtn: '#resetBtn',
    randomBtn: '#randomBtn',
    sortBtn: '#sortBtn',
    pauseBtn: '#pauseBtn',
    stepBtn: '#stepBtn',
    speedSlider: '#speedSlider',
    speedValue: '#speedValue',
    barsContainer: '#barsContainer',
    comparisonText: '#comparisonText',
    stepsText: '#stepsText',
    bar: '.array-bar',
  };

  test('Page loads with default array and initial UI state', async ({ page }) => {
    // Purpose: Validate initial load, default array, UI elements presence and no unexpected JS errors
    const { consoleErrors, pageErrors } = await collectErrors(page);

    await page.goto(APP_URL);

    // Basic UI elements are visible
    await expect(page.locator(selectors.arrayInput)).toBeVisible();
    await expect(page.locator(selectors.resetBtn)).toBeVisible();
    await expect(page.locator(selectors.randomBtn)).toBeVisible();
    await expect(page.locator(selectors.sortBtn)).toBeVisible();
    await expect(page.locator(selectors.pauseBtn)).toBeVisible();
    await expect(page.locator(selectors.stepBtn)).toBeVisible();
    await expect(page.locator(selectors.speedSlider)).toBeVisible();
    await expect(page.locator(selectors.speedValue)).toBeVisible();
    await expect(page.locator(selectors.barsContainer)).toBeVisible();

    // Default array input value should be "5, 3, 8, 4, 2"
    const inputVal = await page.locator(selectors.arrayInput).inputValue();
    expect(inputVal.replace(/\s+/g, '')).toBe('5,3,8,4,2');

    // There should be 5 bars rendered initially
    const bars = page.locator(selectors.bar);
    await expect(bars).toHaveCount(5);

    // Steps text should display initial counters (Steps: 0 | Comparisons: 0 | Swaps: 0)
    await expect(page.locator(selectors.stepsText)).toHaveText(/Steps:\s*0\s*\|\s*Comparisons:\s*0\s*\|\s*Swaps:\s*0/);

    // Speed value default is "Medium" for default slider=5
    await expect(page.locator(selectors.speedValue)).toHaveText(/Medium/);

    // Assert no uncaught page errors of critical types (ReferenceError|SyntaxError|TypeError)
    // We allow console logs, but no console errors should be present
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.filter(e => /(ReferenceError|SyntaxError|TypeError)/.test(String(e))).length).toBe(0);
  });

  test('Reset array with valid and invalid input and handles alert on invalid input', async ({ page }) => {
    // Purpose: Verify Reset button updates DOM for valid input and shows alert for invalid input
    const { consoleErrors, pageErrors } = await collectErrors(page);

    await page.goto(APP_URL);

    // Enter a valid array and click Reset Array
    await page.fill(selectors.arrayInput, '4, 2, 1');
    await page.click(selectors.resetBtn);

    // Bars should update to length 3 and show values 4,2,1
    await expect(page.locator(selectors.bar)).toHaveCount(3);
    const texts = await page.locator(selectors.bar).allTextContents();
    expect(texts.map(t => t.trim())).toEqual(['4', '2', '1']);

    // Steps should be reset to 0
    await expect(page.locator(selectors.stepsText)).toHaveText(/Steps:\s*0\s*\|\s*Comparisons:\s*0\s*\|\s*Swaps:\s*0/);

    // Now test invalid input: clear and input invalid content then click Reset -> expect alert dialog
    await page.fill(selectors.arrayInput, 'a, b, , ');
    // Listen for dialog once (alert)
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      page.click(selectors.resetBtn),
    ]);
    expect(dialog.type()).toBe('alert');
    // The alert message should prompt to enter valid numbers
    expect(dialog.message()).toMatch(/Please enter valid numbers/i);
    await dialog.dismiss();

    // No unexpected console errors or page errors should have occurred
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.filter(e => /(ReferenceError|SyntaxError|TypeError)/.test(String(e))).length).toBe(0);
  });

  test('Generate random array updates input value and bars count', async ({ page }) => {
    // Purpose: Ensure Random Array generates an array of length 8 and updates the UI accordingly
    const { consoleErrors, pageErrors } = await collectErrors(page);

    await page.goto(APP_URL);

    await page.click(selectors.randomBtn);

    // arrayInput should now contain 8 comma separated numbers
    const val = await page.locator(selectors.arrayInput).inputValue();
    const entries = val.split(',').map(s => s.trim()).filter(s => s.length > 0);
    expect(entries.length).toBe(8);
    // All entries should be numeric
    expect(entries.every(e => /^\d+$/.test(e))).toBe(true);

    // Bars container should have 8 bars
    await expect(page.locator(selectors.bar)).toHaveCount(8);

    // No console or page errors
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.filter(e => /(ReferenceError|SyntaxError|TypeError)/.test(String(e))).length).toBe(0);
  });

  test('Speed slider updates label to Slow/Medium/Fast appropriately', async ({ page }) => {
    // Purpose: Validate that changing the slider updates the speed label
    const { consoleErrors, pageErrors } = await collectErrors(page);

    await page.goto(APP_URL);

    const valueLocator = page.locator(selectors.speedValue);
    const slider = page.locator(selectors.speedSlider);

    // Set to slow (<=3)
    await slider.fill('2'); // direct fill may not emit input for range; use evaluate
    await page.evaluate(() => { document.getElementById('speedSlider').value = '2'; document.getElementById('speedSlider').dispatchEvent(new Event('input')); });
    await expect(valueLocator).toHaveText(/Slow/);

    // Set to medium (4..7)
    await page.evaluate(() => { document.getElementById('speedSlider').value = '5'; document.getElementById('speedSlider').dispatchEvent(new Event('input')); });
    await expect(valueLocator).toHaveText(/Medium/);

    // Set to fast (>7)
    await page.evaluate(() => { document.getElementById('speedSlider').value = '9'; document.getElementById('speedSlider').dispatchEvent(new Event('input')); });
    await expect(valueLocator).toHaveText(/Fast/);

    // No console/page errors
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.filter(e => /(ReferenceError|SyntaxError|TypeError)/.test(String(e))).length).toBe(0);
  });

  test('Full bubble sort completes and marks all bars as sorted (small array)', async ({ page }) => {
    // Purpose: Start sorting on a small array and wait until the UI indicates completion.
    // This verifies algorithm progress, steps stats, and final visual marking.
    const { consoleErrors, pageErrors } = await collectErrors(page);

    await page.goto(APP_URL);

    // Set a small array to keep run-time short
    await page.fill(selectors.arrayInput, '3,1,2');
    await page.click(selectors.resetBtn);

    // Start bubble sort
    await page.click(selectors.sortBtn);

    // Wait until the comparison text indicates the array is sorted
    await page.waitForFunction(() => {
      const el = document.getElementById('comparisonText');
      return el && el.textContent && el.textContent.includes('Array is sorted!');
    }, null, { timeout: 20000 });

    // All bars should have the sorted-bar class
    const barCount = await page.locator(selectors.bar).count();
    for (let i = 0; i < barCount; i++) {
      const cls = await page.locator(`${selectors.bar}:nth-child(${i + 1})`).getAttribute('class');
      expect(cls).toContain('sorted-bar');
    }

    // Steps text should show comparisons and swaps (numbers greater or equal to zero)
    const stepsText = await page.locator(selectors.stepsText).textContent();
    expect(stepsText).toMatch(/Steps:\s*\d+\s*\|\s*Comparisons:\s*\d+\s*\|\s*Swaps:\s*\d+/);

    // Buttons should be reset: sortBtn enabled, pauseBtn disabled, stepBtn disabled
    await expect(page.locator(selectors.sortBtn)).toBeEnabled();
    await expect(page.locator(selectors.pauseBtn)).toBeDisabled();
    await expect(page.locator(selectors.stepBtn)).toBeDisabled();

    // No console/page errors
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.filter(e => /(ReferenceError|SyntaxError|TypeError)/.test(String(e))).length).toBe(0);
  });

  test('Pause and Step-by-step controls allow controlled sorting until completion', async ({ page }) => {
    // Purpose: Start sorting, pause it, then use Next Step to advance the algorithm until sorted.
    const { consoleErrors, pageErrors } = await collectErrors(page);

    await page.goto(APP_URL);

    // Use array of 4 elements to exercise multiple steps but keep runtime reasonable
    await page.fill(selectors.arrayInput, '4,3,2,1');
    await page.click(selectors.resetBtn);

    // Start sorting
    await page.click(selectors.sortBtn);

    // Click Pause to enable step-by-step mode; this toggles isPaused and enables stepBtn
    await page.click(selectors.pauseBtn);

    // Pause button text should now be 'Resume' (indicating paused state)
    await expect(page.locator(selectors.pauseBtn)).toHaveText(/Resume/);
    await expect(page.locator(selectors.stepBtn)).toBeEnabled();

    // Now click "Next Step" repeatedly until we see "Array is sorted!" or reach a sane iteration cap.
    const comparisonLocator = page.locator(selectors.comparisonText);
    let isSorted = false;
    const maxSteps = 50;
    for (let i = 0; i < maxSteps; i++) {
      // Click step (this triggers executeSortStep synchronously)
      await page.click(selectors.stepBtn);

      // Small wait to let DOM update after executing a step
      await page.waitForTimeout(50);

      const txt = (await comparisonLocator.textContent()) || '';
      if (txt.includes('Array is sorted!')) {
        isSorted = true;
        break;
      }
      // Continue clicking step until sorted
    }

    expect(isSorted).toBe(true);

    // After completion, stepBtn should be disabled and pauseBtn disabled, sortBtn enabled
    await expect(page.locator(selectors.stepBtn)).toBeDisabled();
    await expect(page.locator(selectors.pauseBtn)).toBeDisabled();
    await expect(page.locator(selectors.sortBtn)).toBeEnabled();

    // Verify all bars are sorted
    const barCount = await page.locator(selectors.bar).count();
    for (let i = 0; i < barCount; i++) {
      const cls = await page.locator(`${selectors.bar}:nth-child(${i + 1})`).getAttribute('class');
      expect(cls).toContain('sorted-bar');
    }

    // No critical console/page errors
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.filter(e => /(ReferenceError|SyntaxError|TypeError)/.test(String(e))).length).toBe(0);
  });

  test('Visual highlighting: active and compared bars applied during a comparison', async ({ page }) => {
    // Purpose: Verify that highlightBars assigns active-bar and compared-bar classes during comparisons
    const { consoleErrors, pageErrors } = await collectErrors(page);

    await page.goto(APP_URL);

    // Use a 3-element array so we can trigger a comparison via step mode
    await page.fill(selectors.arrayInput, '2,1,3');
    await page.click(selectors.resetBtn);

    // Start sorting and pause immediately to control with steps
    await page.click(selectors.sortBtn);
    await page.click(selectors.pauseBtn);

    // Execute one step to trigger a comparison between index 0 and 1
    await page.click(selectors.stepBtn);

    // The first two bars should have classes active-bar and compared-bar respectively
    const bar0Class = await page.locator('#bar-0').getAttribute('class');
    const bar1Class = await page.locator('#bar-1').getAttribute('class');

    // One should include active-bar and the other compared-bar. It's possible that a swap occured and classes re-applied,
    // so we just assert that among the two, the classes include these modifiers.
    const hasActive = bar0Class.includes('active-bar') || bar1Class.includes('active-bar');
    const hasCompared = bar0Class.includes('compared-bar') || bar1Class.includes('compared-bar');

    expect(hasActive).toBe(true);
    expect(hasCompared).toBe(true);

    // No critical console/page errors
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.filter(e => /(ReferenceError|SyntaxError|TypeError)/.test(String(e))).length).toBe(0);
  });

});