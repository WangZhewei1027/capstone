import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80ba982-d1c9-11f0-9efc-d1db1618a544.html';

// Page object encapsulating common interactions and queries for the Knapsack demo
class KnapsackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.capacity = page.locator('#capacity');
    this.newWeight = page.locator('#newWeight');
    this.newValue = page.locator('#newValue');
    this.addItemBtn = page.locator('#addItemBtn');
    this.removeLastBtn = page.locator('#removeLastBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.randomBtn = page.locator('#randomBtn');
    this.autoFillBtn = page.locator('#autoFillBtn');
    this.solveBtn = page.locator('#solveBtn');
    this.stepBtn = page.locator('#stepBtn');
    this.stopBtn = page.locator('#stopBtn');
    this.showTakenBtn = page.locator('#showTakenBtn');
    this.highlightTraceBtn = page.locator('#highlightTraceBtn');
    this.clearHighlightsBtn = page.locator('#clearHighlightsBtn');

    this.itemsDiv = page.locator('#itemsDiv');
    this.tableContainer = page.locator('#tableContainer');
    this.results = page.locator('#results');
    this.fracDiv = page.locator('#fracDiv');
    this.dpTable = page.locator('#dpTable');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  // Adds an item via the UI (weight and value)
  async addItem(weight, value) {
    await this.newWeight.fill(String(weight));
    await this.newValue.fill(String(value));
    await this.addItemBtn.click();
  }

  // Returns number of <li> items shown in the items list (0 if "No items" text)
  async getItemsCount() {
    // itemsDiv may contain <ul> with <li> or <em>No items</em>
    const html = await this.itemsDiv.innerHTML();
    if (html.includes('No items')) return 0;
    // count occurrences of <li>
    const matches = html.match(/<li>/g);
    return matches ? matches.length : 0;
  }

  async clickSolve() {
    await this.solveBtn.click();
  }

  async clickStep() {
    await this.stepBtn.click();
  }

  async clickStop() {
    await this.stopBtn.click();
  }

  async clickShowTaken() {
    await this.showTakenBtn.click();
  }

  async clickHighlightTrace() {
    await this.highlightTraceBtn.click();
  }

  async clickClearHighlights() {
    await this.clearHighlightsBtn.click();
  }

  async clickRandom() {
    await this.randomBtn.click();
  }

  async clickClearItems() {
    await this.clearBtn.click();
  }

  async clickRemoveLast() {
    await this.removeLastBtn.click();
  }

  async clickAutoFill() {
    await this.autoFillBtn.click();
  }

  // get text content of results area
  async getResultsText() {
    return (await this.results.innerText()).trim();
  }

  async getFractionalText() {
    return (await this.fracDiv.innerText()).trim();
  }

  // Returns value shown inside a dp table cell's .cell-value for given i and w
  async getCellValue(i, w) {
    const sel = `#cell-${i}-${w} .cell-value`;
    const el = this.page.locator(sel);
    if (await el.count() === 0) return null;
    return (await el.innerText()).trim();
  }

  // Count of cells with a CSS class (e.g., 'taken', 'trace')
  async countCellsWithClass(cls) {
    return await this.page.locator(`#tableContainer td.${cls}`).count();
  }

  // Force a 'change' event on capacity to trigger capacity change logic
  async setCapacityAndTriggerChange(value) {
    await this.capacity.fill(String(value));
    await this.page.evaluate(() => {
      // dispatch change on the capacity element
      const el = document.getElementById('capacity');
      if (el) el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
}

test.describe('Knapsack Problem — Interactive 0/1 DP Demo (d80ba982...)', () => {
  let page;
  let knapsack;
  let consoleMessages;
  let pageErrors;

  // Setup a fresh page for each test and capture console + page errors.
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    consoleMessages = [];
    pageErrors = [];

    // collect console messages
    page.on('console', msg => {
      consoleMessages.push(msg);
    });
    // collect page-level errors (uncaught exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // auto-accept any alert/confirm/dialog so UI flows continue (we must not alter page code)
    page.on('dialog', async dialog => {
      try {
        await dialog.accept();
      } catch (e) {
        // ignore errors accepting dialog; we still want tests to run
      }
    });

    knapsack = new KnapsackPage(page);
    await knapsack.goto();
  });

  test.afterEach(async () => {
    // Ensure we close the page to release resources
    await page.close();
  });

  // Helper assertion to ensure no console or page errors were emitted during the test.
  async function assertNoConsoleOrPageErrors() {
    // Fail if any console messages of type 'error' present
    const errorConsoles = consoleMessages.filter(m => m.type && m.type() === 'error');
    if (errorConsoles.length > 0) {
      // Print debug messages for test failure context
      console.error('Console error messages encountered during test:');
      for (const c of errorConsoles) {
        console.error(c.text());
      }
    }
    // Assert none
    expect(errorConsoles.length, `No console.error() messages expected, found ${errorConsoles.length}`).toBe(0);

    // Page errors (uncaught exceptions)
    if (pageErrors.length > 0) {
      console.error('Page errors encountered during test:');
      for (const e of pageErrors) console.error(String(e));
    }
    expect(pageErrors.length, `No uncaught page errors expected, found ${pageErrors.length}`).toBe(0);
  }

  test('Initial load: controls are visible and default items rendered', async () => {
    // Purpose: Verify page loads and shows default UI elements and default item list
    await expect(knapsack.capacity).toHaveValue('20');
    // itemsDiv should contain the initialized items (4 items)
    const count = await knapsack.getItemsCount();
    expect(count).toBe(4);
    // No DP table rendered initially (tableContainer empty or no dpTable)
    const dpExists = await knapsack.dpTable.count();
    expect(dpExists).toBe(0);
    // results and fractional areas empty
    const resultsText = await knapsack.getResultsText();
    expect(resultsText).toBe('');
    const fracText = await knapsack.getFractionalText();
    expect(fracText).toBe('');

    // Check expected buttons exist and are visible
    await expect(knapsack.solveBtn).toBeVisible();
    await expect(knapsack.stepBtn).toBeVisible();
    await expect(knapsack.randomBtn).toBeVisible();
    await expect(knapsack.clearBtn).toBeVisible();

    // Ensure no console or page errors occurred during initial load
    await assertNoConsoleOrPageErrors();
  });

  test('Add item validation and add/remove flow works', async () => {
    // Purpose: Verify adding invalid item triggers alert and does not change items;
    // then adding valid item updates the items list, and remove last reverts it.
    const initialCount = await knapsack.getItemsCount();
    // Attempt to add invalid weight (0) — UI shows alert which is auto-accepted
    await knapsack.addItem(0, 5);
    // Items count should remain unchanged
    const afterInvalid = await knapsack.getItemsCount();
    expect(afterInvalid).toBe(initialCount);

    // Add a valid item
    await knapsack.addItem(5, 20);
    const afterAdd = await knapsack.getItemsCount();
    expect(afterAdd).toBe(initialCount + 1);

    // Verify the itemsDiv text contains the new item with weight and value
    const itemsHtml = await knapsack.itemsDiv.innerHTML();
    expect(itemsHtml).toContain('weight=5');
    expect(itemsHtml).toContain('value=20');

    // Remove last item
    await knapsack.clickRemoveLast();
    const afterRemove = await knapsack.getItemsCount();
    expect(afterRemove).toBe(initialCount);

    // Ensure no console or page errors
    await assertNoConsoleOrPageErrors();
  });

  test('Solve (DP) computes table, yields expected optimal value, and fractional text appears', async () => {
    // Purpose: Run Solve and verify dp table renders and the final optimal value matches expected.
    // With default items and capacity 20, the optimal value should be 69 (all items fit).
    await knapsack.clickSolve();

    // wait for dpTable to be created
    await knapsack.dpTable.waitFor({ state: 'visible', timeout: 2000 });

    // dp table final row is i=4 (4 items), capacity 20 -> cell-4-20 should be 69
    const val = await knapsack.getCellValue(4, 20);
    expect(val).toBe('69');

    // results area should report optimal value 69
    const res = await knapsack.getResultsText();
    expect(res).toMatch(/Optimal value:.*69/);

    // fractional greedy result should be present and contain the phrase 'Fractional (greedy) optimum'
    const frac = await knapsack.getFractionalText();
    expect(frac).toContain('Fractional (greedy) optimum');

    // Ensure no console or page errors occurred during solve
    await assertNoConsoleOrPageErrors();
  });

  test('Show selected items and highlight reconstruction trace apply expected classes', async () => {
    // Purpose: After computing DP, ensure that "Show Selected Items" marks cells with .taken
    // and "Highlight Reconstruction Path" marks cells with .trace.
    await knapsack.clickSolve();
    await knapsack.dpTable.waitFor({ state: 'visible', timeout: 2000 });

    // Initially no taken/trace classes
    const takenBefore = await knapsack.countCellsWithClass('taken');
    const traceBefore = await knapsack.countCellsWithClass('trace');
    expect(takenBefore).toBe(0);
    expect(traceBefore).toBe(0);

    // Click show selected
    await knapsack.clickShowTaken();
    // At least one 'taken' cell should now exist
    const takenAfter = await knapsack.countCellsWithClass('taken');
    expect(takenAfter).toBeGreaterThan(0);

    // Click highlight trace
    await knapsack.clickHighlightTrace();
    const traceAfter = await knapsack.countCellsWithClass('trace');
    expect(traceAfter).toBeGreaterThan(0);

    // Clear highlights should remove both classes
    await knapsack.clickClearHighlights();
    const takenCleared = await knapsack.countCellsWithClass('taken');
    const traceCleared = await knapsack.countCellsWithClass('trace');
    expect(takenCleared).toBe(0);
    expect(traceCleared).toBe(0);

    await assertNoConsoleOrPageErrors();
  });

  test('Step-by-step mode computes rows and Stop returns to final state', async () => {
    // Purpose: Enter step mode, observe intermediate "Computing row i=..." message,
    // then stop the animation and ensure final DP table and results are rendered.
    // Ensure step mode can be started and stopped without runtime errors.
    await knapsack.clickStep();

    // Wait for a short while until a "Computing row i=" text appears in results.
    await page.waitForFunction(() => {
      const el = document.getElementById('results');
      return el && /Computing row i=/.test(el.innerText);
    }, { timeout: 2000 });

    // Wait a little to allow at least one row update, then click stop to end the interval.
    await page.waitForTimeout(700);
    // stopBtn should be visible when running; click it to cease step mode
    await knapsack.clickStop();

    // After stopping, dpTable should render final table and results should include 'Optimal value'
    await knapsack.dpTable.waitFor({ state: 'visible', timeout: 2000 });
    const resText = await knapsack.getResultsText();
    expect(resText).toMatch(/Optimal value:/);

    // fractional text should be present
    const frac = await knapsack.getFractionalText();
    expect(frac.length).toBeGreaterThan(0);

    await assertNoConsoleOrPageErrors();
  });

  test('Random items populates items list and Clear Items confirms and empties list', async () => {
    // Purpose: Ensure Random generates a non-empty list and Clear Items (with confirm) empties it.
    await knapsack.clickRandom();

    // after random, at least 4 items should be present according to implementation
    const randomCount = await knapsack.getItemsCount();
    expect(randomCount).toBeGreaterThanOrEqual(4);

    // Call clear and the page confirms; dialog auto-accepted in test setup.
    await knapsack.clickClearItems();

    // After clear, 'No items' should be displayed
    const afterClearCount = await knapsack.getItemsCount();
    expect(afterClearCount).toBe(0);

    // results and fracDiv should be cleared after clearing items
    expect(await knapsack.getResultsText()).toBe('');
    expect(await knapsack.getFractionalText()).toBe('');

    await assertNoConsoleOrPageErrors();
  });

  test('AutoFill example sets expected items and capacity, then computing produces correct result', async () => {
    // Purpose: Use the Fill Example (classic) to set a known dataset and verify DP result.
    await knapsack.clickAutoFill();

    // The autofill sets capacity to 15 and five items; items count should be 5
    const cnt = await knapsack.getItemsCount();
    expect(cnt).toBe(5);
    // Capacity should reflect the autofill change
    await expect(knapsack.capacity).toHaveValue('15');

    // Solve this classic example
    await knapsack.clickSolve();
    await knapsack.dpTable.waitFor({ state: 'visible', timeout: 2000 });

    // For the example, verify that the table exists and results mention capacity 15
    const res = await knapsack.getResultsText();
    expect(res).toContain('W=15');

    await assertNoConsoleOrPageErrors();
  });

  test('Capacity input clamps values and clears DP on change', async () => {
    // Purpose: Check capacity clamping (min 1, max 500) and that changing capacity clears previous DP.
    // First compute dp so that table exists
    await knapsack.clickSolve();
    await knapsack.dpTable.waitFor({ state: 'visible', timeout: 2000 });

    // Now set capacity to an extremely large value and dispatch change to trigger clamping
    await knapsack.setCapacityAndTriggerChange(600);

    // After change, capacity input should be clamped to 500 (per clampCapacityVal in page script)
    await expect(knapsack.capacity).toHaveValue('500');

    // After capacity change, dp should be cleared (no dpTable present)
    const dpCountAfterChange = await knapsack.dpTable.count();
    // The script clears tableContainer.innerHTML on capacity change; dpTable should not exist now.
    expect(dpCountAfterChange).toBe(0);

    // Also try setting negative value, which should clamp to minimum 1
    await knapsack.setCapacityAndTriggerChange(-5);
    await expect(knapsack.capacity).toHaveValue('1');

    await assertNoConsoleOrPageErrors();
  });
});