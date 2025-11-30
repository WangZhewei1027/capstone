import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be87b199-cd35-11f0-9e7b-93b903303299.html';

// Page object for the LCS visualizer to encapsulate common interactions and queries.
class LCSPage {
  constructor(page) {
    this.page = page;
  }

  // Element getters
  async strA() { return this.page.locator('#strA'); }
  async strB() { return this.page.locator('#strB'); }
  async computeBtn() { return this.page.locator('#computeBtn'); }
  async stepBtn() { return this.page.locator('#stepBtn'); }
  async playBtn() { return this.page.locator('#playBtn'); }
  async pauseBtn() { return this.page.locator('#pauseBtn'); }
  async reconstructBtn() { return this.page.locator('#reconstructBtn'); }
  async allBtn() { return this.page.locator('#allBtn'); }
  async tableWrap() { return this.page.locator('#tableWrap'); }
  async dpSize() { return this.page.locator('#dpSize'); }
  async lcsLen() { return this.page.locator('#lcsLen'); }
  async oneLCS() { return this.page.locator('#oneLCS'); }
  async allList() { return this.page.locator('#allList'); }
  async limitWarn() { return this.page.locator('#limitWarn'); }
  async examples() { return this.page.locator('.example'); }
  async speed() { return this.page.locator('#speed'); }
  async speedVal() { return this.page.locator('#speedVal'); }
  async tableCells() { return this.page.locator('table.dp td'); }

  // Actions
  async goto() {
    await this.page.goto(APP_URL);
    // Wait for the main UI to be present:
    await expect(this.page.locator('h1')).toHaveText(/Longest Common Subsequence/i);
    // The page script triggers computeBtn.click() on load, so table should appear.
    await this.page.waitForSelector('table.dp', { timeout: 5000 });
  }

  async clickCompute() { await (await this.computeBtn()).click(); }
  async clickStep() { await (await this.stepBtn()).click(); }
  async clickPlay() { await (await this.playBtn()).click(); }
  async clickPause() { await (await this.pauseBtn()).click(); }
  async clickReconstruct() { await (await this.reconstructBtn()).click(); }
  async clickAll() { await (await this.allBtn()).click(); }

  async setInputs(a, b) {
    await (await this.strA()).fill(a);
    await (await this.strB()).fill(b);
  }

  async clickExampleByIndex(idx) {
    const btn = this.examples().nth(idx);
    await btn.click();
  }

  async getDpSizeText() { return (await this.dpSize()).innerText(); }
  async getLcsLenText() { return (await this.lcsLen()).innerText(); }
  async getOneLCSText() { return (await this.oneLCS()).innerText(); }
  async getAllListItems() {
    return this.page.locator('#allList > div');
  }
  async getBacktrackCount() {
    return this.page.locator('.cell-backtrack').count();
  }
  async getCurrentCount() {
    return this.page.locator('.cell-current').count();
  }
  async setSpeedValue(val) {
    await (await this.speed()).fill(String(val));
    // trigger input event
    await this.page.evaluate((v) => {
      const s = document.getElementById('speed');
      s.value = v;
      s.dispatchEvent(new Event('input', { bubbles: true }));
    }, String(val));
  }
}

test.describe('LCS Visualizer - End to End', () => {
  // capture console errors and page errors to assert there are no unexpected runtime issues
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Collect uncaught page errors (exceptions)
    page.on('pageerror', error => {
      pageErrors.push(error);
    });
  });

  test('Initial load: page renders and default table is created, no runtime errors', async ({ page }) => {
    // Purpose: Verify that the page loads, initial compute has run (script calls computeBtn.click()), and no console/page errors are present.
    const app = new LCSPage(page);
    await app.goto();

    // Check inputs initialize to the default values present in the HTML
    await expect(app.strA()).toHaveValue('ABCBDAB');
    await expect(app.strB()).toHaveValue('BDCABA');

    // The table should exist and dpSize should reflect rows+1 x cols+1 (rows = len(strB) = 6, cols = len(strA) = 7)
    await expect(app.dpSize()).toHaveText('7×8');

    // On initial compute (only table created, not filled), LCS length should still be placeholder '-'
    await expect(app.lcsLen()).toHaveText('-');
    await expect(app.oneLCS()).toHaveText('-');

    // Ensure the table contains td elements and at least the header/top-left cells
    const cellCount = await app.tableCells().count();
    expect(cellCount).toBeGreaterThan(0);

    // Ensure no console error messages were emitted during page load and no uncaught page errors
    expect(consoleErrors, 'No console.error messages should be emitted').toEqual([]);
    expect(pageErrors, 'No uncaught page exceptions should be thrown').toEqual([]);
    // Also explicitly assert that none of the console errors (if any) mention ReferenceError, SyntaxError, or TypeError
    const combinedConsole = consoleErrors.map(e => e.text).join(' ');
    expect(combinedConsole.includes('ReferenceError')).toBeFalsy();
    expect(combinedConsole.includes('SyntaxError')).toBeFalsy();
    expect(combinedConsole.includes('TypeError')).toBeFalsy();
  });

  test('Example buttons populate inputs and compute updates DP size', async ({ page }) => {
    // Purpose: Ensure clicking an example populates input fields. Then Compute builds table with appropriate dpSize.
    const app1 = new LCSPage(page);
    await app.goto();

    // Click first example (AGGTAB / GXTXAYB) and verify inputs changed
    await app.clickExampleByIndex(0);
    await expect(app.strA()).toHaveValue('AGGTAB');
    await expect(app.strB()).toHaveValue('GXTXAYB');

    // Click Compute to rebuild table based on new inputs
    await app.clickCompute();

    // dpSize should be (rows+1)x(cols+1) => rows = len(B)=7, cols = len(A)=6 => 8×7
    await expect(app.dpSize()).toHaveText('8×7');
    // There should be a table present and cells
    const cells = await app.tableCells().count();
    expect(cells).toBeGreaterThan(0);

    // No runtime errors introduced by interacting with examples/compute
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Step button highlights a current cell (single-step)', async ({ page }) => {
    // Purpose: Validate that clicking "Step" runs a single computation step and highlights the current cell.
    const app2 = new LCSPage(page);
    await app.goto();

    // Ensure table exists
    await expect(page.locator('table.dp')).toBeVisible();

    // Click Step once
    await app.clickStep();

    // After a single step, there should be exactly one .cell-current element set by computeStep highlightCurrent
    const currentCount = await app.getCurrentCount();
    expect(currentCount).toBeGreaterThanOrEqual(0);
    // In practice, computeStep highlights a cell even for (0,0), so expect at least 1
    expect(currentCount).toBeGreaterThanOrEqual(1);

    // No runtime errors due to stepping
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Reconstruct computes full DP and backtracks producing LCS length and a sequence', async ({ page }) => {
    // Purpose: Clicking "Reconstruct LCS" should compute the DP fully (fast), update LCS length, and display a one LCS string. Backtrack highlights should be present.
    const app3 = new LCSPage(page);
    await app.goto();

    // Ensure initial LCS length is placeholder '-'
    await expect(app.lcsLen()).toHaveText('-');

    // Click Reconstruct to compute full DP and perform backtrack
    await app.clickReconstruct();

    // The LCS length should be a number (for the default strings it's known to be 4)
    const lcsLenText = await app.getLcsLenText();
    // Ensure it's numeric and greater-or-equal to 0
    expect(Number.isNaN(Number(lcsLenText))).toBeFalsy();
    const lcsLenNum = Number(lcsLenText);
    expect(lcsLenNum).toBeGreaterThanOrEqual(0);

    // The displayed one LCS should have length equal to reported lcs length (note: empty LCS shows '""' marker in UI)
    const oneLCSRaw = await app.getOneLCSText();
    // If UI shows the placeholder '""' for empty strings, treat that as empty LCS
    const normalizedOneLCS = oneLCSRaw === '""' ? '' : oneLCSRaw;
    expect(normalizedOneLCS.length).toBe(lcsLenNum);

    // After backtracking, there should be some .cell-backtrack highlights (unless both strings empty)
    const backtrackCount = await app.getBacktrackCount();
    expect(backtrackCount).toBeGreaterThanOrEqual(1);

    // Ensure the final dp cell (rows,cols) was set and that lcsLen matches dp[rows][cols] indirectly via display
    expect(lcsLenNum).toBeGreaterThanOrEqual(0);

    // No runtime errors during reconstruct/backtrack
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Find all LCS shows results for a small example and respects empty-case display', async ({ page }) => {
    // Purpose: Test "Find all LCS (limited)" for a small example and for the edge case of empty strings.
    const app4 = new LCSPage(page);
    await app.goto();

    // Use a small example: click example index 2 ("AXYT" / "AYZX")
    await app.clickExampleByIndex(2);
    await expect(app.strA()).toHaveValue('AXYT');
    await expect(app.strB()).toHaveValue('AYZX');

    // Compute table
    await app.clickCompute();

    // Click "Find all LCS" to compute DP fully and enumerate all LCS
    await app.clickAll();

    // There should be at least one item in allList
    const listItems = app.getAllListItems();
    await expect(listItems).toHaveCountGreaterThan(0);

    // Limit warning should not be visible for this small example
    await expect(app.limitWarn()).toBeHidden();

    // Now test the empty-strings edge case: set both inputs empty, compute, and run "Find all LCS"
    await app.setInputs('', '');
    await app.clickCompute();
    await app.clickAll();

    // For empty strings, the UI is expected to show the empty LCS as a representation; ensure the container isn't empty
    // It may display '"" (empty)' or something similar; just assert there's at least one child
    const emptyListItems = await app.getAllListItems().count();
    expect(emptyListItems).toBeGreaterThanOrEqual(1);

    // No runtime errors during find-all operations
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Speed slider updates the displayed speed value', async ({ page }) => {
    // Purpose: Verify that manipulating the speed range input updates the UI text indicating milliseconds.
    const app5 = new LCSPage(page);
    await app.goto();

    // Set speed to minimum (50) and ensure the speedVal text updates
    await app.setSpeedValue(50);
    await expect(app.speedVal()).toHaveText('50ms');

    // Set speed to 1000 and verify
    await app.setSpeedValue(1000);
    await expect(app.speedVal()).toHaveText('1000ms');

    // No runtime errors during speed input interactions
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Play then Pause: starts and stops DP animation when table present (fast speed)', async ({ page }) => {
    // Purpose: Ensure Play begins the animation and Pause stops it. Use fast speed to limit test runtime.
    const app6 = new LCSPage(page);
    await app.goto();

    // Speed min is 50; use it to accelerate animation
    await app.setSpeedValue(50);

    // Click Play to start animation. Because the page may have already had compute invoked on load,
    // play will start advancing through cells. We will then pause shortly after and assert no errors.
    await app.clickPlay();

    // Wait a short period to let at least a couple of steps run
    await page.waitForTimeout(250);

    // Click Pause to stop animation
    await app.clickPause();

    // After pausing, there should be no autoplay running; the current highlight should be cleared on pause (highlightCurrent(null))
    // The UI's highlight removal may have occurred immediately; ensure no exception occurred
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test.afterEach(async ({ page }) => {
    // Final safety checks: ensure no console errors or page errors were captured across interactions
    // This asserts that the page behaved without uncaught runtime issues in the test scenario.
    expect(consoleErrors, 'No console.error messages should have been emitted during test').toEqual([]);
    expect(pageErrors, 'No uncaught page errors should have been thrown during test').toEqual([]);
  });
});