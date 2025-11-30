import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be87d8a3-cd35-11f0-9e7b-93b903303299.html';

test.describe('Sliding Window — Interactive Demo (be87d8a3-cd35-11f0-9e7b-93b903303299)', () => {
  // Capture console errors and uncaught page errors for assertions
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console messages and page errors before navigation so we catch load-time errors.
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });
    page.on('pageerror', err => {
      pageErrors.push(String(err));
    });

    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    // Ensure the app's initial rendering settles
    await page.waitForTimeout(50);
  });

  test.afterEach(async () => {
    // No teardown needed for this simple static page beyond Playwright's own cleanup.
  });

  test('Initial page load shows expected default state and summary stats', async ({ page }) => {
    // Verify page title and key UI elements are present
    await expect(page.locator('h1')).toHaveText('Sliding Window — Interactive Demo');
    await expect(page.locator('#lenDisplay')).toHaveText('12'); // default array length
    await expect(page.locator('#kDisplay')).toHaveText('3'); // default k
    await expect(page.locator('#targetDisplay')).toHaveText('15'); // default target

    // Check bars rendered (12)
    const bars = page.locator('#bars .bar');
    await expect(bars).toHaveCount(12);

    // Verify summary stats are computed from the default array [5,1,3,7,2,8,6,4,9,2,5,3]
    await expect(page.locator('#sumVal')).toHaveText('55'); // sum
    await expect(page.locator('#avgVal')).toHaveText('4.58'); // avg formatted to 2 decimals
    await expect(page.locator('#maxVal')).toHaveText('9');
    await expect(page.locator('#minVal')).toHaveText('1');
    await expect(page.locator('#bestFixed')).toHaveText('9 (pos 0)');
    await expect(page.locator('#bestVar')).toHaveText('—');

    // Ensure no console or page errors were logged during load
    expect(consoleErrors, `Console errors during load: ${JSON.stringify(consoleErrors)}`).toEqual([]);
    expect(pageErrors, `Page errors during load: ${JSON.stringify(pageErrors)}`).toEqual([]);
  });

  test.describe('Array controls: randomize, add, remove, preset, and editing a bar', () => {
    test('Randomize updates numbers and summary stats', async ({ page }) => {
      const sumBefore = await page.locator('#sumVal').innerText();
      // Click Randomize - should keep length same but change values/sum
      await page.click('#randBtn');
      await page.waitForTimeout(50);

      // Length should still be 12 (randomize keeps same length)
      await expect(page.locator('#lenDisplay')).toHaveText('12');

      const sumAfter = await page.locator('#sumVal').innerText();
      expect(sumAfter).not.toBe(''); // sum must be present
      // It is possible sumBefore == sumAfter by chance, but at least ensure a numeric string
      expect(Number(sumAfter)).not.toBeNaN();

      // no console/page errors caused by randomize
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('Add and Remove buttons change array length and update UI', async ({ page }) => {
      const lenBefore = Number(await page.locator('#lenDisplay').innerText());
      // Add
      await page.click('#addBtn');
      await page.waitForTimeout(50);
      const lenAfterAdd = Number(await page.locator('#lenDisplay').innerText());
      expect(lenAfterAdd).toBe(lenBefore + 1);
      await expect(page.locator('#bars .bar')).toHaveCount(lenAfterAdd);

      // Remove
      await page.click('#remBtn');
      await page.waitForTimeout(50);
      const lenAfterRem = Number(await page.locator('#lenDisplay').innerText());
      expect(lenAfterRem).toBe(lenBefore);
      await expect(page.locator('#bars .bar')).toHaveCount(lenAfterRem);
    });

    test('Preset button loads the preset array and updates bar values and summaries', async ({ page }) => {
      await page.click('#presetBtn');
      await page.waitForTimeout(50);

      // After preset, first bar value should be 2 (preset array starts with 2)
      const firstBarVal = await page.locator('#bars .bar >> nth=0 .val').innerText();
      expect(firstBarVal).toBe('2');

      // Sum for the preset array is 42
      await expect(page.locator('#sumVal')).toHaveText('42');
      await expect(page.locator('#avgVal')).toHaveText('3.50');
      await expect(page.locator('#maxVal')).toHaveText('8');
      await expect(page.locator('#minVal')).toHaveText('1');

      // Ensure no console/page errors
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('Clicking a bar opens prompt and updates its value (handles dialog)', async ({ page }) => {
      // Use initial default state (we know initial sum is 55). Click the first bar and change value via prompt.
      // Attach a dialog handler to provide the new value "10"
      page.once('dialog', async dialog => {
        // It should be a prompt; accept with new value
        await dialog.accept('10');
      });

      // Click bar 0
      await page.click('#bars .bar >> nth=0');
      // Give time for prompt handler & UI updates
      await page.waitForTimeout(50);

      // Verify the first bar now displays 10
      await expect(page.locator('#bars .bar >> nth=0 .val')).toHaveText('10');

      // Sum should have updated: original 55 -> new 55 - 5 + 10 = 60
      await expect(page.locator('#sumVal')).toHaveText('60');
      await expect(page.locator('#avgVal')).toHaveText('5.00');

      // Verify title attribute updated to include 'value 10'
      const title = await page.locator('#bars .bar >> nth=0').getAttribute('title');
      expect(title).toContain('value 10');

      // Ensure no console/page errors
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });

  test.describe('Fixed-size sliding window controls and behavior', () => {
    test('Step fixed window initializes and advances, updating highlights and best', async ({ page }) => {
      // Make sure we are in a known state: set first bar to 10 by clicking and accepting prompt (if not already changed)
      // We'll try to click and accept but if the prompt is not shown (because value is already 10) it will still be safe.
      page.once('dialog', async dialog => await dialog.accept('10'));
      await page.click('#bars .bar >> nth=0').catch(() => {}); // ignore if click doesn't open a dialog
      await page.waitForTimeout(50);

      // First step: initialize fixed window
      await page.click('#stepFixed');
      await page.waitForTimeout(20);
      const op1 = await page.locator('#operation').innerText();
      // Should mention initial sum for arr[0..K-1] where K default is 3. With arr[0]=10, arr[1]=1, arr[2]=3 => 14
      expect(op1).toContain('Fixed window initialized');
      expect(op1).toContain('= 14');

      // Second step: move window by 1 (subtract 10, add next element 7). Expect new sum = 11
      await page.click('#stepFixed');
      await page.waitForTimeout(20);
      const op2 = await page.locator('#operation').innerText();
      expect(op2).toContain('Shift window');
      expect(op2).toContain('subtract 10');
      expect(op2).toContain('add 7');
      expect(op2).toContain('new sum = 11');

      // Verify highlight classes: after moving, fixedPos should be 1, K=3 -> indices 1,2,3 have 'range' and focus index 3 has 'current'
      const bar1Classes = await page.locator('#bars .bar >> nth=1').getAttribute('class');
      const bar2Classes = await page.locator('#bars .bar >> nth=2').getAttribute('class');
      const bar3Classes = await page.locator('#bars .bar >> nth=3').getAttribute('class');
      expect(bar1Classes).toMatch(/range/);
      expect(bar2Classes).toMatch(/range/);
      expect(bar3Classes).toMatch(/range/);
      expect(bar3Classes).toMatch(/current/);

      // Verify bestFixed updated appropriately (best found so far)
      // Since initial best was set at initialization, it should be present in the summary text
      const bestFixedTxt = await page.locator('#bestFixed').innerText();
      expect(bestFixedTxt).toContain('pos');
      // Ensure no console/page errors
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('Play button toggles to Pause and back to Play (start/stop animation indicator)', async ({ page }) => {
      const playBtn = page.locator('#playFixed');

      // Start playing
      await playBtn.click();
      // The code toggles button text to 'Pause'
      await expect(playBtn).toHaveText('Pause');
      await expect(playBtn).toHaveClass(/primary/);

      // Pause playing
      await playBtn.click();
      await expect(playBtn).toHaveText('Play');
      // primary class should be removed
      const classes = await playBtn.getAttribute('class');
      expect(classes).not.toContain('primary');

      // Ensure no console/page errors
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('Changing K via range input updates kDisplay and resets fixed window', async ({ page }) => {
      const kRange = page.locator('#kRange');
      const kDisplay = page.locator('#kDisplay');

      // Set K to 5
      await kRange.evaluate((el) => { el.value = '5'; el.dispatchEvent(new Event('input', { bubbles: true })); });
      await page.waitForTimeout(50);
      await expect(kDisplay).toHaveText('5');

      // Step fixed should initialize with K=5 (sum of first 5 elements)
      await page.click('#stepFixed');
      await page.waitForTimeout(20);
      const op = await page.locator('#operation').innerText();
      expect(op).toContain('Fixed window initialized');
      // We cannot hardcode sum now (array might have changed), but the text must mention arr[0..4]
      expect(op).toContain('arr[0..4]');
    });
  });

  test.describe('Variable-size sliding window controls and behavior', () => {
    test('Step variable window expands right until target reached and then shrinks left', async ({ page }) => {
      // Reset variable to a known state
      await page.click('#resetVar');
      await page.waitForTimeout(20);

      // First click starts variable algorithm
      await page.click('#stepVar');
      await page.waitForTimeout(20);
      const opStart = await page.locator('#operation').innerText();
      expect(opStart).toContain('Start variable sliding');

      // Expand right a few times: each subsequent click should expand and increase right index
      // We'll click until sum >= target (target default 15). We will observe the operation text for 'sum ≥ target'
      let reached = false;
      for (let i = 0; i < 8; i++) {
        await page.click('#stepVar');
        await page.waitForTimeout(30);
        const op11 = await page.locator('#operation').innerText();
        if (op.includes('sum ≥ target') || /sum≥target/i.test(op) || op.includes('sum=>')) {
          reached = true;
          break;
        }
      }
      expect(reached).toBeTruthy();

      // Now perform another step which should perform shrink action (when sum >= target)
      await page.click('#stepVar');
      await page.waitForTimeout(30);
      const opAfterShrink = await page.locator('#operation').innerText();
      // When shrinking, the code emits "Subtract arr[<left>]=<val>"
      expect(opAfterShrink).toMatch(/Subtract arr\[\d+\]=\d+/);

      // Check that highlighting is applied for left and right when varStarted
      const leftMarked = await page.locator('#bars .bar.left').count();
      const rightMarked = await page.locator('#bars .bar.right').count();
      // At least one left and one right should be marked at this point (the shrinking step sets left++ and right remains)
      expect(leftMarked + rightMarked).toBeGreaterThanOrEqual(1);

      // Ensure no console/page errors
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('Play variable animation toggles button text and eventually can be paused', async ({ page }) => {
      const playBtn1 = page.locator('#playVar');

      // Start play (it uses setInterval). We will start and then pause quickly.
      await playBtn.click();
      await page.waitForTimeout(20);
      await expect(playBtn).toHaveText('Pause');
      await expect(playBtn).toHaveClass(/primary/);

      // Pause
      await playBtn.click();
      await page.waitForTimeout(20);
      await expect(playBtn).toHaveText('Play');
      const classes1 = await playBtn.getAttribute('class');
      expect(classes).not.toContain('primary');

      // Ensure no console/page errors resulting from playing/pausing
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('Changing target via range input updates display and resets variable window', async ({ page }) => {
      const targetRange = page.locator('#targetRange');
      const targetDisplay = page.locator('#targetDisplay');

      // Set target to a known value, e.g., 20
      await targetRange.evaluate((el) => { el.value = '20'; el.dispatchEvent(new Event('input', { bubbles: true })); });
      await page.waitForTimeout(20);
      await expect(targetDisplay).toHaveText('20');

      // After changing target, resetVar should have been called. Operation should reflect reset
      const op21 = await page.locator('#operation').innerText();
      // The reset sets operation to 'Variable window reset.' when resetVar is used; but changing input calls resetVar -> so we allow either initialized or reset text
      expect(op.length).toBeGreaterThan(0);
      // Ensure no console/page errors
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });

  test('Reset buttons restore expected idle texts and clear animation indicators', async ({ page }) => {
    // Start both plays to set states
    await page.click('#playFixed');
    await page.click('#playVar');
    await page.waitForTimeout(20);

    // Reset fixed
    await page.click('#resetFixed');
    await page.waitForTimeout(10);
    await expect(page.locator('#operation')).toHaveText(/Fixed window reset\.|Idle — no animation running\./i);

    // Reset var
    await page.click('#resetVar');
    await page.waitForTimeout(10);
    const opText = await page.locator('#operation').innerText();
    expect(opText.length).toBeGreaterThan(0);

    // Ensure play buttons text are 'Play' and primary class removed
    await expect(page.locator('#playFixed')).toHaveText('Play');
    await expect(page.locator('#playVar')).toHaveText('Play');
    expect((await page.locator('#playFixed').getAttribute('class'))).not.toContain('primary');
    expect((await page.locator('#playVar').getAttribute('class'))).not.toContain('primary');

    // Ensure no console/page errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Accessibility: interactive elements are present and reachable', async ({ page }) => {
    // Ensure all key buttons and inputs are visible and enabled
    const controls = [
      '#randBtn', '#addBtn', '#remBtn', '#presetBtn',
      '#playFixed', '#stepFixed', '#resetFixed',
      '#playVar', '#stepVar', '#resetVar',
      '#kRange', '#targetRange', '#speedFixed', '#speedVar'
    ];
    for (const selector of controls) {
      const el = page.locator(selector);
      await expect(el).toBeVisible();
      // Range inputs are not "enabled" in the button sense, but should be enabled
      // Buttons should not be disabled
      const disabled = await el.getAttribute('disabled');
      expect(disabled).toBeNull();
    }

    // Ensure each bar has a title attribute for screen readers / hover
    const bars1 = page.locator('#bars1 .bar');
    const count = await bars.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(5, count); i++) {
      const title1 = await bars.nth(i).getAttribute('title1');
      expect(title).toMatch(/Index \d+ value \d+/);
    }

    // Ensure no console/page errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});