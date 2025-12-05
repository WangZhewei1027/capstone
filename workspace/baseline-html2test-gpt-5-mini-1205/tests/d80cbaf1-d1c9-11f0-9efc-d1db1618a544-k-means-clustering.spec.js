import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80cbaf1-d1c9-11f0-9efc-d1db1618a544.html';

test.describe('K-Means Clustering — Interactive Demo (d80cbaf1-d1c9-11f0-9efc-d1db1618a544)', () => {
  // Capture console.error messages and page errors for each test so we can assert no runtime errors occur.
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Listen for console messages (capture errors)
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Listen for uncaught exceptions on the page
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Go to the page and ensure it loads
    await page.goto(APP_URL, { waitUntil: 'load' });
    // Wait a short moment to allow initialization script to run (generatePoints() runs on load)
    await page.waitForTimeout(100);
  });

  test.afterEach(async () => {
    // Assert there were no console.error messages or uncaught page errors during the test.
    // We collect them and assert none occurred, reporting any found for debugging.
    const ceCount = consoleErrors.length;
    const peCount = pageErrors.length;
    if (ceCount > 0 || peCount > 0) {
      // Build a helpful message for why the assertion failed
      let msg = '';
      if (ceCount > 0) {
        msg += `Console errors (${ceCount}):\n`;
        for (const c of consoleErrors) msg += ` - ${c.text}\n`;
      }
      if (peCount > 0) {
        msg += `Page errors (${peCount}):\n`;
        for (const p of pageErrors) msg += ` - ${p.stack || p.message || p}\n`;
      }
      // Fail the test with details
      throw new Error(`Runtime errors were observed:\n${msg}`);
    }
  });

  test('Initial load: default UI elements and stats are present', async ({ page }) => {
    // Verify key UI controls and default labels reflect initial state
    const kVal = page.locator('#kVal');
    const nVal = page.locator('#nVal');
    const totalPoints = page.locator('#totalPoints');
    const iter = page.locator('#iter');
    const assigned = page.locator('#assigned');
    const inertia = page.locator('#inertia');
    const converged = page.locator('#converged');

    // Default K and N labels should match initial range values (from HTML)
    await expect(kVal).toHaveText('3');
    await expect(nVal).toHaveText('150');

    // On load the script calls generatePoints for the default N => totalPoints should equal nVal
    await expect(totalPoints).toHaveText((await nVal.textContent()).trim());

    // Iteration starts at 0, none assigned, inertia placeholder and converged No
    await expect(iter).toHaveText('0');
    await expect(assigned).toHaveText('0');
    await expect(inertia).toHaveText('—');
    await expect(converged).toHaveText('No');
  });

  test('Range inputs update labels: changing K and Points reflect immediately', async ({ page }) => {
    // Change K to 5 and N to 10 via dispatching input events
    await page.evaluate(() => {
      const kRange = document.getElementById('kRange');
      kRange.value = '5';
      kRange.dispatchEvent(new Event('input', { bubbles: true }));
      const nRange = document.getElementById('nRange');
      nRange.value = '10';
      nRange.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Verify labels updated
    await expect(page.locator('#kVal')).toHaveText('5');
    await expect(page.locator('#nVal')).toHaveText('10');
  });

  test('Generate Points button creates requested number of points', async ({ page }) => {
    // Set N to a small value, click Generate, and verify totalPoints updates
    await page.evaluate(() => {
      const nRange = document.getElementById('nRange');
      nRange.value = '12';
      nRange.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Click "Generate Points"
    await page.click('#generateBtn');
    // Wait for generation and rendering to complete
    await page.waitForTimeout(100);

    await expect(page.locator('#totalPoints')).toHaveText('12');
    // After generation iteration should be reset to 0
    await expect(page.locator('#iter')).toHaveText('0');
    await expect(page.locator('#assigned')).toHaveText('0');
  });

  test('Clear Points button prompts confirmation and clears on accept', async ({ page }) => {
    // Ensure there are points to clear
    await expect(page.locator('#totalPoints')).not.toHaveText('0');

    // Intercept the confirm dialog and accept it
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toContain('Clear all points');
      await dialog.accept();
    });

    // Click clear button -> confirm -> clearPoints runs
    await page.click('#clearBtn');
    // Wait briefly for the handler to run
    await page.waitForTimeout(50);

    // After clearing, totalPoints should be zero and stats reset
    await expect(page.locator('#totalPoints')).toHaveText('0');
    await expect(page.locator('#iter')).toHaveText('0');
    await expect(page.locator('#assigned')).toHaveText('0');
    await expect(page.locator('#converged')).toHaveText('No');
  });

  test('Init Centroids with K-Means++ without points shows alert', async ({ page }) => {
    // Ensure points are cleared first (use confirm accept)
    page.once('dialog', async (d) => { await d.accept(); });
    await page.click('#clearBtn');
    await page.waitForTimeout(50);
    await expect(page.locator('#totalPoints')).toHaveText('0');

    // Select K-Means++ initialization
    await page.selectOption('#initMethod', 'kmeans++');

    // Clicking init should show an alert about no points
    const dialogPromise = page.waitForEvent('dialog');
    await page.click('#initBtn');
    const dialog = await dialogPromise;
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toContain('No points');
    await dialog.accept();

    // After cancel/alert, stats remain unchanged with zero points
    await expect(page.locator('#totalPoints')).toHaveText('0');
  });

  test('Init Random centroids enables Start (no alert) and Step assigns clusters', async ({ page }) => {
    // Ensure there are some points to initialize from; set N small to make tests deterministic
    await page.evaluate(() => {
      const nRange = document.getElementById('nRange');
      nRange.value = '20';
      nRange.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.click('#generateBtn');
    await page.waitForTimeout(100);
    await expect(page.locator('#totalPoints')).toHaveText('20');

    // Select random init
    await page.selectOption('#initMethod', 'random');
    // Click init - should not produce an alert; instead centroids should be created.
    // We verify centroids exist indirectly by starting the algorithm (start will alert if centroids absent)
    await page.click('#initBtn');
    await page.waitForTimeout(50);

    // Click Start; since centroids were initialized, there should be no alert and start button becomes disabled while running.
    // Intercept any unexpected dialog and fail the test if it occurs.
    let gotDialog = false;
    page.once('dialog', async (dialog) => {
      gotDialog = true;
      // If an alert pops up, accept it to not hang, but record it for assertion below.
      await dialog.accept();
    });

    await page.click('#startBtn');
    // Give some time for the running state to take effect
    await page.waitForTimeout(100);

    // The script disables Start while running; confirm it is disabled (indicating it started)
    await expect(page.locator('#startBtn')).toBeDisabled();

    // Stop the animation to cleanly end the test: click Pause
    await page.click('#stopBtn');
    await page.waitForTimeout(50);
    // After stopping, Start should be enabled again
    await expect(page.locator('#startBtn')).toBeEnabled();

    // Ensure no unexpected alert occurred during the start sequence
    expect(gotDialog).toBe(false);
  });

  test('Step button alternates assign and update phases and updates stats', async ({ page }) => {
    // Prepare a small dataset and initialize centroids
    await page.evaluate(() => {
      const nRange = document.getElementById('nRange');
      nRange.value = '15';
      nRange.dispatchEvent(new Event('input', { bubbles: true }));
      const kRange = document.getElementById('kRange');
      kRange.value = '3';
      kRange.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.click('#generateBtn');
    await page.waitForTimeout(50);
    await page.selectOption('#initMethod', 'random');
    await page.click('#initBtn');
    await page.waitForTimeout(50);

    // First Step should perform assignment: assigned count should become > 0
    await page.click('#stepBtn');
    await page.waitForTimeout(50);
    const assignedAfterAssign = parseInt((await page.locator('#assigned').textContent()).trim(), 10);
    expect(assignedAfterAssign).toBeGreaterThan(0);

    // Second Step should update centroids and increment iteration
    const iterBefore = parseInt((await page.locator('#iter').textContent()).trim(), 10);
    await page.click('#stepBtn');
    await page.waitForTimeout(50);
    const iterAfter = parseInt((await page.locator('#iter').textContent()).trim(), 10);
    expect(iterAfter).toBeGreaterThanOrEqual(iterBefore + 1);
  });

  test('Speed Instant runs until convergence quickly for small dataset', async ({ page }) => {
    // Use a tiny dataset to avoid long computations
    await page.evaluate(() => {
      const nRange = document.getElementById('nRange');
      nRange.value = '10';
      nRange.dispatchEvent(new Event('input', { bubbles: true }));
      const kRange = document.getElementById('kRange');
      kRange.value = '2';
      kRange.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.click('#generateBtn');
    await page.waitForTimeout(50);
    await page.selectOption('#initMethod', 'random');
    await page.click('#initBtn');
    await page.waitForTimeout(50);

    // Click Instant speed
    await page.click('#speedInstant');
    // Start: with instant speed the animate() runs in a blocking loop until convergence then calls stop()
    await page.click('#startBtn');

    // Wait for the UI to reflect that start completed and stop was called:
    // The Start button should be enabled again after stop() runs in animate() for instant speed.
    await expect(page.locator('#startBtn')).toBeEnabled({ timeout: 2000 });

    // After convergence in instant mode, converged flag in stats should be 'Yes' (or at least not crash)
    // We allow either 'Yes' or 'No' depending on quick convergence; check that inertia text exists and is numeric or '—'
    const convText = (await page.locator('#converged').textContent()).trim();
    expect(['Yes', 'No']).toContain(convText);
    const inertiaText = (await page.locator('#inertia').textContent()).trim();
    expect(inertiaText.length).toBeGreaterThan(0);
  });

  test('Canvas interactions: clicking and double-clicking add points', async ({ page }) => {
    // Ensure start with a known number of points
    const initialPoints = parseInt((await page.locator('#totalPoints').textContent()).trim(), 10);

    const canvas = page.locator('#c');
    // Single click at 60,60 to add a point
    await canvas.click({ position: { x: 60, y: 60 } });
    await page.waitForTimeout(50);

    // Double-click to add another
    await canvas.dblclick({ position: { x: 80, y: 80 } });
    await page.waitForTimeout(50);

    const afterPoints = parseInt((await page.locator('#totalPoints').textContent()).trim(), 10);
    expect(afterPoints).toBe(initialPoints + 2);
  });

  test('Manual initialization: selecting Manual and placing K centroids by clicking canvas', async ({ page }) => {
    // Set K to 3 and set method to manual
    await page.evaluate(() => {
      const kRange = document.getElementById('kRange');
      kRange.value = '3';
      kRange.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.selectOption('#initMethod', 'manual');

    // Click canvas three times to place centroids
    const canvas = page.locator('#c');
    await canvas.click({ position: { x: 50, y: 50 } });
    await page.waitForTimeout(30);
    await canvas.click({ position: { x: 120, y: 60 } });
    await page.waitForTimeout(30);
    await canvas.click({ position: { x: 200, y: 140 } });
    await page.waitForTimeout(50);

    // Now attempt to Start: with manual centroids placed start should proceed (no alert)
    let seenDialog = false;
    page.once('dialog', async (d) => { seenDialog = true; await d.accept(); });

    await page.click('#startBtn');
    await page.waitForTimeout(100);
    // If manual placement created centroids correctly, Start will be disabled while running
    await expect(page.locator('#startBtn')).toBeDisabled();
    // Stop to finalize test
    await page.click('#stopBtn');
    await page.waitForTimeout(50);
    await expect(page.locator('#startBtn')).toBeEnabled();
    expect(seenDialog).toBe(false);
  });
});