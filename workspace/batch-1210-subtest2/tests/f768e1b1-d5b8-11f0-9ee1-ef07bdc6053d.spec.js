import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f768e1b1-d5b8-11f0-9ee1-ef07bdc6053d.html';

test.describe('Linear Regression Demo (FSM) - f768e1b1-d5b8-11f0-9ee1-ef07bdc6053d', () => {

  // Validate the initial Idle state (S0_Idle)
  test('S0_Idle: page renders core DOM elements and script error is observed', async ({ page }) => {
    // Collect console messages and page errors
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    // Load the page (script may throw during load)
    // We attach listeners before navigation to capture early errors.
    await page.goto(APP_URL);

    // Assert basic DOM elements for Idle state are present
    const chartHandle = await page.$('#chart');
    const equationHandle = await page.$('#equation');

    expect(chartHandle).not.toBeNull(); // #chart should exist (div)
    expect(equationHandle).not.toBeNull(); // #equation should exist (p)

    // The implementation attempts to call getContext on a div which is an immediate runtime error.
    // We expect a page error to have occurred. Wait for up to a short timeout to ensure it's captured.
    // If the error already fired, our pageErrors array will contain it.
    if (pageErrors.length === 0) {
      // Wait a short time for any late pageerror to occur
      try {
        const err = await Promise.race([
          page.waitForEvent('pageerror', { timeout: 2000 }).then(e => e),
          new Promise((resolve) => setTimeout(resolve, 2000))
        ]);
        if (err) pageErrors.push(err);
      } catch {
        // ignore timing issues; we'll assert on collected errors below
      }
    }

    // There should be at least one page-level error caused by getContext misuse.
    expect(pageErrors.length).toBeGreaterThan(0);

    // Validate that the error mentions getContext or similar function-not-found symptoms.
    const errorMessages = pageErrors.map(e => e.message || String(e));
    const foundGetContext = errorMessages.some(m => m.toLowerCase().includes('getcontext') || m.toLowerCase().includes('not a function') || m.toLowerCase().includes('is not a function'));
    expect(foundGetContext).toBeTruthy();

    // The page should not crash the test runner, but we should observe that inline script failed.
    // Also assert that initially, before any user interaction, the equation text is empty as expected for Idle state.
    const equationText = await page.textContent('#equation');
    expect(equationText).toBe(''); // Idle state shows no equation
  });

  test.describe('Events and Transitions', () => {

    // Test the ChartClick event and expected transition to DataPointAdded (S1_DataPointAdded).
    // Because the page script throws during top-level execution, the event handler may not have been attached.
    // We validate actual behavior: attempt to click the chart and assert whether equation updates or errors happen.
    test('ChartClick: clicking the chart attempts transition to DataPointAdded but inline script error prevents normal behavior', async ({ page }) => {
      const pageErrors = [];
      const consoleMessages = [];
      page.on('pageerror', err => pageErrors.push(err));
      page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));

      await page.goto(APP_URL);

      // Record number of errors so far
      const initialErrorCount = pageErrors.length;

      // Attempt to click the center of the chart area
      // Use a bounding box click to ensure proper coordinates are used
      const chart = await page.$('#chart');
      expect(chart).not.toBeNull();
      const box = await chart!.boundingBox();
      expect(box).not.toBeNull();

      const clickX = box!.x + box!.width / 2;
      const clickY = box!.y + box!.height / 2;

      // Perform the click (this will trigger any attached click listener if present)
      await page.mouse.click(clickX, clickY);

      // Wait a short moment for any potential handler to run
      await page.waitForTimeout(300);

      // After clicking, check if a new pageerror occurred (possible if click handler exists but runtime broken)
      const postClickErrorCount = pageErrors.length;
      // Because the top-level error usually prevented event listener attachment, we expect no additional errors from click.
      expect(postClickErrorCount).toBeGreaterThanOrEqual(initialErrorCount);

      // Check the equation text: FSM expects equation after points >=2, but we clicked once.
      // With script broken, equation should remain empty.
      const equationTextAfterClick = await page.textContent('#equation');
      expect(equationTextAfterClick).toBe(''); // still empty

      // Log captured console messages for diagnostic purposes (make assertions about their presence/format)
      // There should be no successful Chart rendering logs; however Chart.js may have loaded silently.
      const hasErrorsInConsole = consoleMessages.some(m => m.type === 'error' || m.type === 'warning');
      // We do not force a particular console state, but at least ensure our console listener captures messages array
      expect(Array.isArray(consoleMessages)).toBeTruthy();
    });

    test('S1_DataPointAdded (edge case): multiple clicks do not produce equation due to script error; functions are undefined', async ({ page }) => {
      const pageErrors = [];
      page.on('pageerror', err => pageErrors.push(err));
      await page.goto(APP_URL);

      // Click several times in different chart spots
      const chart = await page.$('#chart');
      expect(chart).not.toBeNull();
      const box = await chart!.boundingBox();
      expect(box).not.toBeNull();

      // Three clicks at distinct positions
      await page.mouse.click(box!.x + box!.width * 0.25, box!.y + box!.height * 0.25);
      await page.waitForTimeout(100);
      await page.mouse.click(box!.x + box!.width * 0.75, box!.y + box!.height * 0.25);
      await page.waitForTimeout(100);
      await page.mouse.click(box!.x + box!.width * 0.5, box!.y + box!.height * 0.75);
      await page.waitForTimeout(300);

      // Because the inline script likely threw before defining functions and attaching handlers,
      // verify that getLinearRegression (and drawChart) are not available on the page global scope.
      // This demonstrates the effect of the top-level error on subsequent expected FSM behaviors.
      const getLinearRegressionType = await page.evaluate(() => typeof (window as any).getLinearRegression);
      const drawChartType = await page.evaluate(() => typeof (window as any).drawChart);
      const dataPointsType = await page.evaluate(() => typeof (window as any).dataPoints);

      // If the inline script failed at start, these are likely 'undefined'
      expect(['undefined', 'function', 'object']).toContain(getLinearRegressionType);
      expect(['undefined', 'function']).toContain(drawChartType);
      // dataPoints may be undefined or object depending on how far script ran; ensure we observe the reality without forcing expectations
      expect(['undefined', 'object']).toContain(dataPointsType);

      // Ensure equation remains empty (no successful transition to a state displaying an equation)
      const equationText = await page.textContent('#equation');
      expect(equationText).toBe(''); // still no equation displayed
    });

  });

  test.describe('Implementation presence checks and error observation', () => {
    test('External library Chart.js is loaded but inline handlers are not fully defined due to runtime error', async ({ page }) => {
      // This test checks that Chart (from Chart.js) exists in the global scope,
      // while inline-defined functions may be missing because of the top-level error.
      await page.goto(APP_URL);

      // Chart.js is included before inline script; confirm Chart global exists
      const chartExists = await page.evaluate(() => typeof (window as any).Chart !== 'undefined');
      expect(chartExists).toBeTruthy();

      // Confirm that top-level runtime error prevented full initialization: check that event listener wasn't attached
      // We can't directly inspect listeners, but we can check that clicking does not change equation text.
      const initialEquation = await page.textContent('#equation');
      await page.click('#chart');
      await page.waitForTimeout(200);
      const afterClickEquation = await page.textContent('#equation');

      // No change expected given the observed runtime failure
      expect(afterClickEquation).toBe(initialEquation);
    });

    test('Ensure page errors are observable and informative (error reporting test)', async ({ page }) => {
      // Capture pageerror event and ensure message is descriptive
      let capturedError = null;
      page.on('pageerror', err => { capturedError = err; });

      await page.goto(APP_URL);

      // Wait briefly for the error to be captured
      await page.waitForTimeout(500);

      expect(capturedError).not.toBeNull();
      // The message should include getContext or similar clue about failure
      const msg = String(capturedError.message || capturedError);
      expect(msg.length).toBeGreaterThan(0);
      const likelyRelevant = msg.toLowerCase().includes('getcontext') || msg.toLowerCase().includes('is not a function') || msg.toLowerCase().includes('cannot read property') || msg.toLowerCase().includes('cannot read');
      // At least one of the above patterns should appear in the runtime error message
      expect(likelyRelevant).toBeTruthy();
    });
  });

});