import { test, expect } from '@playwright/test';

const URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be87b197-cd35-11f0-9e7b-93b903303299.html';

test.describe('Fibonacci Sequence Explorer - be87b197-cd35-11f0-9e7b-93b903303299', () => {
  // Shared variables to capture console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // initialize collectors
    consoleMessages = [];
    pageErrors = [];

    // capture console messages
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // capture uncaught exceptions from the page
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // load the page exactly as-is
    await page.goto(URL);
    // ensure the page is loaded and initial script executed
    await expect(page.locator('h1')).toHaveText('Fibonacci Sequence Explorer');
  });

  test.afterEach(async () => {
    // After each test we assert no unexpected page errors were emitted
    // If there are page errors, we fail the test clearly with collected error messages
    if (pageErrors.length > 0) {
      const messages = pageErrors.map(e => e.stack || e.message || String(e)).join('\n---\n');
      throw new Error(`Page emitted errors:\n${messages}`);
    }
    // Also assert that there were no console.error entries (treat them as failures)
    const errorConsole = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    if (errorConsole.length > 0) {
      const msgs = errorConsole.map(m => `[${m.type}] ${m.text}`).join('\n');
      throw new Error(`Page emitted console errors/warnings:\n${msgs}`);
    }
  });

  test.describe('Initial load and default state', () => {
    test('should load with expected default controls and labels', async ({ page }) => {
      // Verify default input values and visible labels on initial load
      const nInput = page.locator('#n');
      await expect(nInput).toHaveValue('20');

      const iterativeRadio = page.locator('input[name="method"][value="iterative"]');
      await expect(iterativeRadio).toBeChecked();

      const binetLimit = page.locator('#binetLimit');
      await expect(binetLimit).toHaveText('70');

      const stats = page.locator('#stats');
      await expect(stats).toHaveText('No computation yet.');

      const seq = page.locator('#sequence');
      await expect(seq).toBeEmpty();

      const canvas = page.locator('#chart');
      await expect(canvas).toBeVisible();

      // accessibility check: sequence area should be live region
      await expect(seq).toHaveAttribute('aria-live', 'polite');
    });

    test('should draw initial empty chart state text', async ({ page }) => {
      // The script calls drawChart([]) on init; ensure canvas exists and script ran without throwing
      const canvas1 = page.locator('#chart');
      await expect(canvas).toBeVisible();
      // The stats area remains "No computation yet."
      await expect(page.locator('#stats')).toHaveText('No computation yet.');
    });
  });

  test.describe('Core interactions: generate, clear, methods', () => {
    test('Generate (iterative) should compute 20 terms and update sequence, ratios, and stats', async ({ page }) => {
      // Click Generate with default settings (iterative, n=20)
      await page.click('#generateBtn');

      // Wait for the sequence container to populate with many lines including the 000 index
      const seq1 = page.locator('#sequence');
      await expect(seq).toContainText('000: 0');
      await expect(seq).toContainText('001: 1');

      // Stats should indicate Iterative method and 20 computed terms
      const stats1 = page.locator('#stats1');
      await expect(stats).toContainText('Method:');
      await expect(stats).toContainText('Computed terms: 20');

      // ratios area should show "Last ratios" text
      const ratios = page.locator('#ratios');
      await expect(ratios).toContainText('Last ratios');

      // Chart should have plotting metadata attached by drawChart (chart._plot)
      // We can't access window.chart._plot directly via locator, but we can evaluate in page context
      const hasPlot = await page.evaluate(() => {
        const canvas2 = document.getElementById('chart');
        return !!(canvas && canvas._plot && canvas._plot.n > 0);
      });
      expect(hasPlot).toBe(true);
    });

    test('Clear button should clear sequence and update stats to "Cleared."', async ({ page }) => {
      // First generate to populate content
      await page.click('#generateBtn');
      await expect(page.locator('#sequence')).not.toBeEmpty();

      // Click Clear and validate
      await page.click('#clearBtn');
      await expect(page.locator('#sequence')).toBeEmpty();
      await expect(page.locator('#ratios')).toBeEmpty();
      await expect(page.locator('#stats')).toHaveText('Cleared.');
    });

    test('Memoized recursion should compute small n and report function calls', async ({ page }) => {
      // Set n to 10 and select memo method
      await page.fill('#n', '10');
      await page.click('input[name="method"][value="memo"]');
      await page.click('#generateBtn');

      // Sequence should contain indices up to 009
      await expect(page.locator('#sequence')).toContainText('009:');

      // Stats should mention Memoized recursion and include Function calls label
      await expect(page.locator('#stats')).toContainText('Memoized recursion');
      await expect(page.locator('#stats')).toContainText('Function calls');
    });

    test('Naive recursion cancel via confirm should prevent heavy computation', async ({ page }) => {
      // Set n above the NAIVE_RECURSION_LIMIT (40) to trigger confirm
      await page.fill('#n', '41');
      await page.click('input[name="method"][value="naive"]');

      // Intercept the confirm dialog and dismiss (simulate clicking "Cancel")
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        await dialog.dismiss(); // simulate user cancelling the expensive computation
      });

      // Ensure clicking Generate does not start computation (sequence should remain empty)
      await page.click('#generateBtn');

      // Slight pause to allow any script to proceed if it incorrectly ignores the confirm
      await page.waitForTimeout(200);
      await expect(page.locator('#sequence')).toBeEmpty();
    });

    test('Binet formula confirm handling: accept to proceed and compute large n (small test n to keep fast)', async ({ page }) => {
      // Binet limit is 70; pick n=71 to trigger confirm
      await page.fill('#n', '71');
      await page.click('input[name="method"][value="binet"]');

      // Intercept the confirm and accept it so build proceeds
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        await dialog.accept();
      });

      // Click generate and wait for result (Binet will compute array quickly)
      await page.click('#generateBtn');

      // Validate that the sequence has been populated (first and last printed entries exist)
      const seq2 = page.locator('#sequence');
      // Because display limits may show only first/last items, check for index 000 and index 070
      await expect(seq).toContainText('000: 0');
      await expect(seq).toContainText('070:'); // last index should be printed as part of the tail
      await expect(page.locator('#stats')).toContainText("Binet");
    });
  });

  test.describe('Animation and interactive chart hover', () => {
    test('Animate option reveals terms gradually and completes', async ({ page }) => {
      // Use small n and enable animate
      await page.fill('#n', '8');
      await page.check('#animate');
      await page.click('#generateBtn');

      // With animate enabled buildAndDisplay returns a Promise only when it's done (the script uses setInterval)
      // Wait until final index 007 is present (padded indices used in display)
      const seq3 = page.locator('#sequence');
      await expect(seq).toContainText('007:');
      // Verify stats show computed terms = 8
      await expect(page.locator('#stats')).toContainText('Computed terms: 8');

      // disable animate for following tests (not strictly necessary due to page reload in next test)
      await page.uncheck('#animate');
    });

    test('Hovering over the chart should temporarily update stats with index tooltip and restore on mouseleave', async ({ page }) => {
      // Generate a moderate sequence to have data plotted
      await page.fill('#n', '20');
      await page.click('#generateBtn');

      // Grab current stats HTML to compare restoration later
      const initialStatsHTML = await page.locator('#stats').innerHTML();

      // Move mouse over center of canvas to trigger mousemove tooltip logic
      const canvas3 = page.locator('#chart');
      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;

      // Move mouse to center to fire mousemove event that the page listens to
      await page.mouse.move(centerX, centerY);
      // Allow small time for event handler to update stats
      await page.waitForTimeout(150);

      // The stats area should now contain "Index " from the tooltip
      await expect(page.locator('#stats')).toContainText('Index');

      // Move mouse out to fire mouseleave and allow it to restore the old stats
      await page.mouse.move(box.x - 20, box.y - 20);
      await page.waitForTimeout(100);

      // Stats should be restored to the previous content
      const restoredStatsHTML = await page.locator('#stats').innerHTML();
      expect(restoredStatsHTML).toBe(initialStatsHTML);
    });
  });

  test.describe('Edge cases and keyboard interactions', () => {
    test('Pressing Enter in n input triggers generation (keydown handler)', async ({ page }) => {
      // Set small n and focus input then press Enter
      await page.fill('#n', '6');
      await page.focus('#n');
      await page.keyboard.press('Enter');

      // Sequence should populate
      await expect(page.locator('#sequence')).toContainText('005:');
      await expect(page.locator('#stats')).toContainText('Computed terms: 6');
    });

    test('Using BigInt checkbox affects displayed values for large n iterative', async ({ page }) => {
      // Choose n small enough to show difference but enable BigInt to ensure no exceptions
      await page.fill('#n', '12');
      await page.check('#useBigInt');
      await page.click('#generateBtn');

      // Values should be displayed without trailing ".0" etc and be strings; ensure at least one BigInt-like formatting appears (no decimal point)
      const seqText = await page.locator('#sequence').innerText();
      // check some known value e.g., index 010: 34 -> "010: 55" etc, ensure no decimal characters like '.'
      expect(seqText).toContain('010:');
      expect(seqText).not.toContain('.'); // BigInt outputs are integers with no decimal point
    });
  });
});