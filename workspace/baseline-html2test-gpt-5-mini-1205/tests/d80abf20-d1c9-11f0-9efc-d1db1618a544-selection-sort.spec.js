import { test, expect } from '@playwright/test';

test.describe('Selection Sort Visualizer (d80abf20-d1c9-11f0-9efc-d1db1618a544)', () => {
  const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80abf20-d1c9-11f0-9efc-d1db1618a544.html';

  // Helper to attach listeners to capture console errors and page errors for assertions
  async function attachErrorCollectors(page) {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
    return { consoleMessages, pageErrors };
  }

  // Helper to read numeric badge text and return integer or -1 for '-'
  async function readBadgeNumber(page, selector) {
    const txt = (await page.locator(selector).textContent()) || '';
    if (txt.trim() === '-' || txt.trim() === '') return -1;
    return parseInt(txt.trim(), 10);
  }

  // Helper to read text content of a locator
  async function textOf(page, selector) {
    return (await page.locator(selector).textContent()) || '';
  }

  // Helper to read bars' data-values as array of strings
  async function barsValues(page) {
    return page.$$eval('.bar', els => els.map(e => e.getAttribute('data-value')));
  }

  test.beforeEach(async ({ page }) => {
    // Give a slightly larger timeout for page loads in case of slow local server
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1200, height: 800 });
  });

  test('Initial page load: structure, default state and no runtime errors', async ({ page }) => {
    // Purpose: Verify the app loads with expected DOM, default controls states and no console/page errors
    const { consoleMessages, pageErrors } = await attachErrorCollectors(page);

    await page.goto(APP_URL, { waitUntil: 'load' });

    // Basic page elements
    await expect(page.locator('h1')).toHaveText(/Selection Sort/i);
    await expect(page.locator('#btnNew')).toBeVisible();
    await expect(page.locator('#btnShuffle')).toBeVisible();
    await expect(page.locator('#btnPlay')).toBeVisible();
    await expect(page.locator('#btnPause')).toBeVisible();
    await expect(page.locator('#btnStep')).toBeVisible();
    await expect(page.locator('#btnReset')).toBeVisible();

    // Default control states: Play enabled, Pause disabled (app initializes paused)
    const playDisabled = await page.locator('#btnPlay').getAttribute('disabled');
    const pauseDisabled = await page.locator('#btnPause').getAttribute('disabled');
    // attribute presence returns "true" or null; we assert expected disabledness
    expect(playDisabled).toBeNull(); // Play should not be disabled
    expect(pauseDisabled === 'true' || pauseDisabled === '' || pauseDisabled !== null).toBeTruthy(); // Pause is disabled

    // Default size and speed displays
    await expect(page.locator('#sizeVal')).toHaveText('18');
    await expect(page.locator('#speedVal')).toHaveText(/220ms/);

    // Bars rendered equal to default size (18)
    await expect(page.locator('.bar')).toHaveCount(18);

    // Badges default values
    await expect(page.locator('#cmp')).toHaveText('0');
    await expect(page.locator('#swp')).toHaveText('0');
    await expect(page.locator('#iidx')).toHaveText('-');
    await expect(page.locator('#minidx')).toHaveText('-');
    await expect(page.locator('#jidx')).toHaveText('-');

    // Pseudocode lines exist and none should be active initially
    for (let i = 0; i <= 6; i++) {
      const line = page.locator(`#code${i}`);
      await expect(line).toBeVisible();
      await expect(line).not.toHaveClass(/active/);
    }

    // Accessibility attributes
    await expect(page.locator('[role="main"]')).toHaveAttribute('aria-label', /Selection Sort Visualizer/);
    await expect(page.locator('#bars')).toHaveAttribute('role', 'img');

    // Ensure no uncaught page errors or console.error messages occurred during load
    // We allow informational console messages but fail if any console items are of type 'error' or any pageErrors captured
    const consoleErrors = consoleMessages.filter(m => m.type === 'error' || /error|referenceerror|typeerror|syntaxerror/i.test(m.text));
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Step button advances algorithm by one comparison (cmp increments and indices update)', async ({ page }) => {
    // Purpose: Validate that clicking "Step" resolves a single wait point in the algorithm,
    // resulting in exactly one comparison increment and proper i/j/min badge updates.
    const { consoleMessages, pageErrors } = await attachErrorCollectors(page);
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Ensure initial badge states
    await expect(page.locator('#cmp')).toHaveText('0');
    await expect(page.locator('#swp')).toHaveText('0');
    await expect(page.locator('#iidx')).toHaveText('-');

    // Click Step once: this should allow the algorithm to progress to the first comparison and pause,
    // causing comparisons to become 1, i=0, j=1 (first inner loop compare)
    await page.click('#btnStep');

    // Wait until comparisons badge updates to 1
    await expect(page.locator('#cmp')).toHaveText('1', { timeout: 5000 });

    // Verify index badges: i should be 0, j should be 1, min should be 0 (initial)
    await expect(page.locator('#iidx')).toHaveText('0');
    await expect(page.locator('#jidx')).toHaveText('1');
    await expect(page.locator('#minidx')).toHaveText('0');

    // Pseudocode line for comparison (code3) should be active after that step
    await expect(page.locator('#code3')).toHaveClass(/active/);

    // No unexpected page errors
    const consoleErrors = consoleMessages.filter(m => m.type === 'error' || /error|referenceerror|typeerror|syntaxerror/i.test(m.text));
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Play resumes execution and Pause halts; comparisons increase while running', async ({ page }) => {
    // Purpose: Test play/pause toggle behavior and that counts increase while running
    const { consoleMessages, pageErrors } = await attachErrorCollectors(page);
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Speed up the automatic progression by lowering the delay (set to 50ms)
    await page.locator('#speed').evaluate((el) => {
      el.value = '50';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    // Confirm speedVal label updated
    await expect(page.locator('#speedVal')).toHaveText(/50ms/);

    // Start running
    await page.click('#btnPlay');

    // Play button should be disabled, Pause enabled
    await expect(page.locator('#btnPlay')).toBeDisabled();
    await expect(page.locator('#btnPause')).toBeEnabled();

    // Let it run briefly to accrue some comparisons
    await page.waitForTimeout(700);

    // Pause the run
    await page.click('#btnPause');

    // After pause, Play should be enabled again
    await expect(page.locator('#btnPlay')).toBeEnabled();

    // Read comparisons; should be greater than or equal to 1
    const cmpText = await textOf(page, '#cmp');
    const cmpVal = parseInt(cmpText || '0', 10);
    expect(cmpVal).toBeGreaterThanOrEqual(1);

    // Basic sanity: swaps should be >= 0
    const swpText = await textOf(page, '#swp');
    expect(parseInt(swpText || '0', 10)).toBeGreaterThanOrEqual(0);

    // No uncaught errors occurred while running
    const consoleErrors = consoleMessages.filter(m => m.type === 'error' || /error|referenceerror|typeerror|syntaxerror/i.test(m.text));
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Changing Size control generates new array of requested length', async ({ page }) => {
    // Purpose: Verify that changing the size input triggers array reinitialization with the expected number of bars
    const { consoleMessages, pageErrors } = await attachErrorCollectors(page);
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Change the size slider to 10 and dispatch change event to trigger initArray
    await page.locator('#size').evaluate((el) => {
      el.value = '10';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // sizeVal should reflect new value
    await expect(page.locator('#sizeVal')).toHaveText('10');
    // Bars count should update to 10
    await expect(page.locator('.bar')).toHaveCount(10);

    // Counters should be reset to zero
    await expect(page.locator('#cmp')).toHaveText('0');
    await expect(page.locator('#swp')).toHaveText('0');

    // No page errors
    const consoleErrors = consoleMessages.filter(m => m.type === 'error' || /error|referenceerror|typeerror|syntaxerror/i.test(m.text));
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Shuffle resets counters and preserves array length', async ({ page }) => {
    // Purpose: Ensure Shuffle cancels waiting, stops play, resets counts and does not change array length
    const { consoleMessages, pageErrors } = await attachErrorCollectors(page);
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Ensure there is an initial length
    const initialCount = await page.locator('.bar').count();
    expect(initialCount).toBeGreaterThan(0);

    // Make one step to change comparison count
    await page.click('#btnStep');
    await expect(page.locator('#cmp')).toHaveText('1');

    // Click Shuffle which should cancel waiting and reset counts
    await page.click('#btnShuffle');

    // After shuffle, counts reset to 0
    await expect(page.locator('#cmp')).toHaveText('0');
    await expect(page.locator('#swp')).toHaveText('0');

    // Length remains the same (size not changed)
    await expect(page.locator('.bar')).toHaveCount(initialCount);

    // No uncaught errors
    const consoleErrors = consoleMessages.filter(m => m.type === 'error' || /error|referenceerror|typeerror|syntaxerror/i.test(m.text));
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Reset restores the original snapshot after swaps have occurred', async ({ page }) => {
    // Purpose: Capture the initial array snapshot, let the algorithm perform at least one swap,
    // then call Reset and assert the bars are restored to the original snapshot.
    const { consoleMessages, pageErrors } = await attachErrorCollectors(page);
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Capture initial bar values (this is the snapshot recorded at init)
    const initialSnapshot = await barsValues(page);
    expect(initialSnapshot.length).toBeGreaterThan(0);

    // Speed up to make swaps occur sooner
    await page.locator('#speed').evaluate((el) => {
      el.value = '50';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Start running until at least one swap occurs (swp > 0)
    await page.click('#btnPlay');

    // Wait until swaps badge increments to > 0 or timeout after some time
    await expect.poll(async () => {
      const swpText = await textOf(page, '#swp');
      return parseInt(swpText || '0', 10);
    }, { timeout: 10_000 }).toBeGreaterThan(0);

    // Pause the algorithm (not strictly necessary but keeps test deterministic)
    await page.click('#btnPause');

    // Confirm that a swap did occur by checking swp badge
    const swpAfter = parseInt((await textOf(page, '#swp')) || '0', 10);
    expect(swpAfter).toBeGreaterThan(0);

    // Now click Reset - this should restore to the initial snapshot recorded at init
    await page.click('#btnReset');

    // After reset, read bar values and compare to initialSnapshot
    const afterResetValues = await barsValues(page);

    // They should match element-wise (reset restores the array to snapshot)
    expect(afterResetValues).toEqual(initialSnapshot);

    // No uncaught errors were observed
    const consoleErrors = consoleMessages.filter(m => m.type === 'error' || /error|referenceerror|typeerror|syntaxerror/i.test(m.text));
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Pseudocode highlights change during execution (visual feedback)', async ({ page }) => {
    // Purpose: Ensure that pseudocode lines gain the "active" class as the algorithm progresses.
    const { consoleMessages, pageErrors } = await attachErrorCollectors(page);
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Initially none active
    for (let i = 0; i <= 6; i++) {
      await expect(page.locator(`#code${i}`)).not.toHaveClass(/active/);
    }

    // Step a few times and ensure at least one code line becomes active
    await page.click('#btnStep'); // progress to first comparison
    await expect(page.locator('#code3')).toHaveClass(/active/);

    // Step again; pseudocode may move to other lines; assert that some line is active
    await page.click('#btnStep');
    const anyActive = await page.$$eval('.code-line.active', els => els.length > 0);
    expect(anyActive).toBe(true);

    // No runtime errors
    const consoleErrors = consoleMessages.filter(m => m.type === 'error' || /error|referenceerror|typeerror|syntaxerror/i.test(m.text));
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });
});